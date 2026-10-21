import { BiomesProvider } from "@/lib/server/provider/biomesProvider";
import type { ServerConfig } from "@/lib/services/config/configTypes";
import { beforeEach, describe, expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({ biomes: undefined as ServerConfig["biomes"] }));

vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => config
}));

beforeEach(() => {
	config.biomes = { url: "https://example.test/biomes", secret: "test-secret" };
});

const profile = (id: string) => ({
	cell_id: id,
	fields: {
		landform: 4,
		landcover: 5,
		temperature: 2,
		moisture: 3,
		features: [1, 1, 99],
		is_in_park: true,
		park_status: 99,
		settlement: 7
	},
	geography_updated_at: 1792417288,
	pools_updated_at: 1792452951
});

const cellId = (index: number) => (5160937946483785728n + BigInt(index) * (1n << 33n)).toString();

function profileFetch() {
	return vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
		const { cells } = JSON.parse(init!.body as string) as { cells: string[] };
		return Response.json({ biomes: cells.map(profile) });
	});
}

describe("BiomesProvider", () => {
	it("uses configured URLs and server-side bearer auth, sending all missing IDs in one request", async () => {
		const provider = new BiomesProvider();
		const fetcher = profileFetch();
		const ids = Array.from({ length: 2005 }, (_, index) => cellId(index));
		const result = await provider.getProfiles(ids, fetcher);
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(String(fetcher.mock.calls[0][0])).toBe("https://example.test/biomes/api/biomes");
		expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({
			"Content-Type": "application/json",
			Authorization: "Bearer test-secret"
		});
		expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({
			cells: ids
		});
		expect(result.map((entry) => entry.cell_id)).toEqual(ids);
		expect(result[0]).toEqual(profile(ids[0]));
	});

	it("requests 50,000 cell profiles without splitting the lookup", async () => {
		const provider = new BiomesProvider();
		const ids = Array.from({ length: 50_000 }, (_, index) => cellId(index));
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
			const { cells } = JSON.parse(init!.body as string) as { cells: string[] };
			return Response.json({ biomes: cells.map((cell_id) => ({ cell_id, fields: null })) });
		});
		const result = await provider.getProfiles(ids, fetcher);
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string).cells).toEqual(ids);
		expect(result.map((entry) => entry.cell_id)).toEqual(ids);
	});

	it.each([undefined, 0])("accepts an omitted or zero update timestamp (%s)", async (timestamp) => {
		const provider = new BiomesProvider();
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				Response.json({ biomes: [{ ...profile(cellId(0)), pools_updated_at: timestamp }] })
			);
		const [result] = await provider.getProfiles([cellId(0)], fetcher);
		expect(result.pools_updated_at).toBe(timestamp);
		expect(result.geography_updated_at).toBe(1792417288);
	});

	it("coalesces overlapping requests and caches negative profiles as well as discoveries", async () => {
		const provider = new BiomesProvider();
		const fetcher = profileFetch();
		fetcher.mockImplementation(async (_url, init) => {
			const { cells } = JSON.parse(init!.body as string) as { cells: string[] };
			return Response.json({
				biomes: cells.map((cell) => ({ ...profile(cell), fields: null }))
			});
		});
		const [first, second] = await Promise.all([
			provider.getProfiles([cellId(0)], fetcher),
			provider.getProfiles([cellId(0)], fetcher)
		]);
		expect(first).toEqual(second);
		expect(fetcher).toHaveBeenCalledTimes(1);
		await provider.getProfiles([cellId(0)], fetcher);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it("caps concurrent upstream requests across independent lookups", async () => {
		const provider = new BiomesProvider();
		let active = 0;
		let maximum = 0;
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
			active++;
			maximum = Math.max(maximum, active);
			await new Promise((resolve) => setTimeout(resolve, 2));
			active--;
			const { cells } = JSON.parse(init!.body as string) as { cells: string[] };
			return Response.json({ biomes: cells.map(profile) });
		});
		await Promise.all(
			Array.from({ length: 10 }, (_, index) => provider.getProfiles([cellId(index)], fetcher))
		);
		expect(fetcher).toHaveBeenCalledTimes(10);
		expect(maximum).toBe(4);
	});

	it("shares request slots between profiles and pools and releases them after failures", async () => {
		const provider = new BiomesProvider();
		const releases = Array.from({ length: 6 }, () => Promise.withResolvers<void>());
		let active = 0;
		let maximum = 0;
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
			const index = fetcher.mock.calls.length - 1;
			active++;
			maximum = Math.max(maximum, active);
			await releases[index]?.promise;
			active--;
			if (index === 0) throw new Error("Upstream unavailable");
			if (init?.method === "POST") {
				const { cells } = JSON.parse(init.body as string) as { cells: string[] };
				return Response.json({ biomes: cells.map(profile) });
			}
			return Response.json({
				cell_id: new URL(String(url)).pathname.split("/").at(-2),
				components: []
			});
		});
		const results = Promise.allSettled([
			provider.getPools(cellId(0), fetcher),
			provider.getProfiles([cellId(1)], fetcher),
			provider.getPools(cellId(2), fetcher),
			provider.getProfiles([cellId(3)], fetcher),
			provider.getPools(cellId(4), fetcher),
			provider.getProfiles([cellId(5)], fetcher)
		]);
		expect(fetcher).toHaveBeenCalledTimes(4);
		releases[0].resolve();
		await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(5));
		releases[1].resolve();
		await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(6));
		for (const release of releases.slice(2)) release.resolve();

		const settled = await results;
		expect(settled[0]).toMatchObject({ status: "rejected", reason: { status: 502 } });
		expect(settled.slice(1).every((result) => result.status === "fulfilled")).toBe(true);
		expect(maximum).toBe(4);
		expect(await provider.getPools(cellId(0), fetcher)).toEqual({
			cell_id: cellId(0),
			components: []
		});
	});

	it("clears every pending ID after a failed lookup so overlapping requests can retry", async () => {
		const provider = new BiomesProvider();
		const ids = [cellId(0), cellId(1)];
		const fetcher = profileFetch().mockResolvedValueOnce(Response.json({ biomes: [] }));
		const results = await Promise.allSettled([
			provider.getProfiles(ids, fetcher),
			provider.getProfiles([ids[1]], fetcher)
		]);
		for (const result of results) {
			expect(result).toMatchObject({ status: "rejected", reason: { status: 502 } });
		}
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect((await provider.getProfiles(ids, fetcher)).map((entry) => entry.cell_id)).toEqual(ids);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it("does not cache malformed profiles as undiscovered cells", async () => {
		const provider = new BiomesProvider();
		const fetcher = profileFetch().mockResolvedValueOnce(
			Response.json({
				biomes: [{ status: "storage_unavailable", http_status: 503, error: "Unavailable" }]
			})
		);
		await expect(provider.getProfiles([cellId(0)], fetcher)).rejects.toMatchObject({ status: 502 });
		expect((await provider.getProfiles([cellId(0)], fetcher))[0].cell_id).toBe(cellId(0));
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it("rejects mismatched batch order, truncation and non-JSON upstream errors", async () => {
		for (const response of [
			Response.json({ biomes: [profile("wrong-cell")] }),
			Response.json({ biomes: [] }),
			new Response("Unauthorized", { status: 401 })
		]) {
			const provider = new BiomesProvider();
			await expect(
				provider.getProfiles([cellId(0)], vi.fn<typeof fetch>().mockResolvedValue(response))
			).rejects.toMatchObject({ status: 502 });
		}
	});

	it("fetches contextual combined pools only on demand and caches them", async () => {
		const provider = new BiomesProvider();
		const pools = {
			cell_id: cellId(0),
			components: [
				{ name: "background", share: 0.931, spawns: [] },
				{
					name: "regional",
					share: 0.049,
					variants: [
						{ spawns: [{ pokemon_id: 122, form: 0, weight: 0.2 }] },
						{ spawns: [{ pokemon_id: 122, form: 0, weight: 0.4 }] }
					]
				},
				{ name: null, share: 0.01, spawns: [{ pokemon_id: 774, form: 3380, weight: 1 }] },
				{ name: null, share: 0.01, spawns: [] },
				{ name: "future-pool", share: 0.1, spawns: [] }
			]
		};
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(pools));
		const [first, second] = await Promise.all([
			provider.getPools(cellId(0), fetcher),
			provider.getPools(cellId(0), fetcher)
		]);
		expect(first).toEqual(pools);
		expect(second).toEqual(first);
		expect(String(fetcher.mock.calls[0][0])).toBe(
			`https://example.test/biomes/api/biomes/${cellId(0)}/pools`
		);
		expect(fetcher.mock.calls[0][1]?.method).toBe("GET");
		expect(fetcher.mock.calls[0][1]?.body).toBeUndefined();
		expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({
			Authorization: "Bearer test-secret"
		});
		await provider.getPools(cellId(0), fetcher);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it("preserves duplicate cell IDs and their order while caching unique lookups", async () => {
		const provider = new BiomesProvider();
		const fetcher = profileFetch();
		const ids = [cellId(1), cellId(0), cellId(0)];
		expect((await provider.getProfiles(ids, fetcher)).map((entry) => entry.cell_id)).toEqual(ids);
		expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({
			cells: [cellId(1), cellId(0)]
		});
		expect(
			(await provider.getProfiles([...ids].reverse(), fetcher)).map((entry) => entry.cell_id)
		).toEqual([...ids].reverse());
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it("does not contact the API for an empty profile batch", async () => {
		const fetcher = profileFetch();
		expect(await new BiomesProvider().getProfiles([], fetcher)).toEqual([]);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it("accepts partial geography without update timestamps", async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
			Response.json({
				biomes: [{ cell_id: cellId(0), fields: { landcover: 99, features: [4, 99, 4] } }]
			})
		);
		expect(await new BiomesProvider().getProfiles([cellId(0)], fetcher)).toEqual([
			{ cell_id: cellId(0), fields: { landcover: 99, features: [4, 99, 4] } }
		]);
	});

	it("rejects mismatched or malformed pool responses without caching them", async () => {
		const valid = {
			cell_id: cellId(0),
			components: [
				{ name: "background", share: 0.95, spawns: [] },
				{ name: "regional", share: 0.05, spawns: [] }
			]
		};
		for (const invalid of [
			{ ...valid, cell_id: cellId(1) },
			{ ...valid, cell_id: 123 },
			{ ...valid, components: {} },
			{ ...valid, components: [{ name: null, share: 0.1 }] },
			{ ...valid, components: [{ name: null, share: 1.1, spawns: [] }] },
			{
				...valid,
				components: [{ name: null, share: 0.1, spawns: [{ pokemon_id: 25, form: 0, weight: -1 }] }]
			}
		]) {
			const provider = new BiomesProvider();
			const fetcher = vi
				.fn<typeof fetch>()
				.mockResolvedValueOnce(Response.json(invalid))
				.mockResolvedValueOnce(Response.json(valid));
			await expect(provider.getPools(cellId(0), fetcher)).rejects.toMatchObject({ status: 502 });
			expect(await provider.getPools(cellId(0), fetcher)).toEqual(valid);
			expect(fetcher).toHaveBeenCalledTimes(2);
		}
	});

	it("does not cache upstream pool storage failures", async () => {
		const provider = new BiomesProvider();
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
			.mockResolvedValueOnce(Response.json({ cell_id: cellId(0), components: [] }));
		await expect(provider.getPools(cellId(0), fetcher)).rejects.toMatchObject({ status: 502 });
		expect(await provider.getPools(cellId(0), fetcher)).toEqual({
			cell_id: cellId(0),
			components: []
		});
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it.each([undefined, {}, { secret: "test-secret" }, { url: "" }, { url: " \t " }])(
		"disables biomes without an endpoint (%j)",
		async (biomes) => {
			config.biomes = biomes;
			const provider = new BiomesProvider();
			const fetcher = vi.fn<typeof fetch>();
			expect(provider.enabled).toBe(false);
			await expect(provider.getProfiles([cellId(0)], fetcher)).rejects.toMatchObject({
				status: 404
			});
			await expect(provider.getPools(cellId(0), fetcher)).rejects.toMatchObject({ status: 404 });
			expect(fetcher).not.toHaveBeenCalled();
		}
	);

	it("does not expose cached profiles or pools after the endpoint is removed", async () => {
		const provider = new BiomesProvider();
		const fetcher = profileFetch().mockResolvedValueOnce(
			Response.json({ cell_id: cellId(0), components: [] })
		);
		await provider.getPools(cellId(0), fetcher);
		await provider.getProfiles([cellId(0)], fetcher);
		config.biomes = undefined;
		await expect(provider.getProfiles([cellId(0)], fetcher)).rejects.toMatchObject({ status: 404 });
		await expect(provider.getPools(cellId(0), fetcher)).rejects.toMatchObject({ status: 404 });
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
});
