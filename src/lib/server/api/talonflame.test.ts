import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({ talonflame: { url: "http://talon:9042/" } })
}));
let api: typeof import("./talonflame");
beforeEach(async () => {
	vi.resetModules();
	vi.useFakeTimers();
	api = await import("./talonflame");
});
afterEach(() => vi.useRealTimers());

describe("Talonflame shared HTTP cache", () => {
	it("deduplicates concurrent requests and caches the response", async () => {
		let resolve!: (response: Response) => void;
		const fetcher = vi.fn(
			(_input: RequestInfo | URL, _init?: RequestInit) =>
				new Promise<Response>((done) => {
					resolve = done;
				})
		);
		const first = api.fetchTalonflame("?id=1", fetcher as typeof fetch);
		const second = api.fetchTalonflame("?id=1", fetcher as typeof fetch);
		resolve(new Response(JSON.stringify({ data: [] }), { headers: { ETag: '"one"' } }));
		expect(await first).toEqual(await second);
		await api.fetchTalonflame("?id=1", fetcher as typeof fetch);
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(fetcher.mock.calls[0][0]).toBe("http://talon:9042/api/map/nests?id=1");
	});

	it("revalidates expired data with ETags and accepts changed empty snapshots", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(
				new Response('{"revision":"a","data":[{"id":"1"}]}', { headers: { ETag: '"a"' } })
			)
			.mockResolvedValueOnce(new Response(null, { status: 304 }))
			.mockResolvedValueOnce(
				new Response('{"revision":"b","data":[]}', { headers: { ETag: '"b"' } })
			);
		const first = await api.fetchTalonflame("?id=1", fetcher);
		vi.advanceTimersByTime(5001);
		expect(await api.fetchTalonflame("?id=1", fetcher)).toEqual(first);
		expect(fetcher.mock.calls[1][1].headers).toEqual({ "If-None-Match": '"a"' });
		vi.advanceTimersByTime(5001);
		expect(await api.fetchTalonflame("?id=1", fetcher)).toEqual({ revision: "b", data: [] });
	});

	it("bounds the cache and does not retain failed requests", async () => {
		const fetcher = vi.fn().mockImplementation(async () => new Response('{"data":[]}'));
		for (let i = 0; i < 129; i++) await api.fetchTalonflame(`?id=${i}`, fetcher);
		await api.fetchTalonflame("?id=0", fetcher);
		expect(fetcher).toHaveBeenCalledTimes(130);
		fetcher.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
		await expect(api.fetchTalonflame("?id=failed", fetcher)).rejects.toMatchObject({ status: 502 });
		await expect(api.fetchTalonflame("?id=failed", fetcher)).resolves.toEqual({ data: [] });
	});
});
