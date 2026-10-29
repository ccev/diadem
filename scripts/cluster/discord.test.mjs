import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const member = { user: { id: "123" }, roles: ["456"] };
const fetchMock = vi.fn();

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	vi.stubEnv("DIADEM_CLUSTER_DISCORD", undefined);
	vi.stubGlobal("fetch", fetchMock);
	fetchMock.mockImplementation(async () => Response.json(member));
	vi.spyOn(performance, "now").mockReturnValue(0);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("Discord guild lookup coordination", () => {
	it("coalesces concurrent requests and expires successful results after 30 seconds", async () => {
		const { getDiscordGuildMember } = await import("./discord.mjs");
		const results = await Promise.all(
			Array.from({ length: 20 }, () => getDiscordGuildMember("guild", "token"))
		);
		expect(results).toEqual(Array.from({ length: 20 }, () => ({ status: 200, data: member })));
		expect(fetchMock).toHaveBeenCalledOnce();
		vi.mocked(performance.now).mockReturnValue(29_999);
		await getDiscordGuildMember("guild", "token");
		expect(fetchMock).toHaveBeenCalledOnce();
		vi.mocked(performance.now).mockReturnValue(30_000);
		fetchMock.mockImplementation(async () => Response.json({ ...member, roles: [] }));
		expect(await getDiscordGuildMember("guild", "token")).toMatchObject({ data: { roles: [] } });
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("isolates membership by guild and access token", async () => {
		const { getDiscordGuildMember } = await import("./discord.mjs");
		await getDiscordGuildMember("guild-a", "token-a");
		await getDiscordGuildMember("guild-b", "token-a");
		await getDiscordGuildMember("guild-a", "token-b");
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("only treats an explicit 404 as non-membership", async () => {
		const { getDiscordGuildMember } = await import("./discord.mjs");
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
		expect(await getDiscordGuildMember("guild", "token")).toEqual({
			status: 404,
			data: { roles: [] }
		});
		expect(await getDiscordGuildMember("guild", "token")).toEqual({
			status: 404,
			data: { roles: [] }
		});
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it.each([
		[Response.json({ retry_after: 7.2 }, { status: 429 }), 8],
		[new Response(null, { status: 429, headers: { "Retry-After": "8" } }), 8]
	])("shares the rate-limit cooldown and retries after it expires %#", async (response, delay) => {
		const { getDiscordGuildMember } = await import("./discord.mjs");
		fetchMock.mockResolvedValueOnce(response);
		expect(await getDiscordGuildMember("guild-a", "token-a")).toEqual({
			status: 429,
			retryAfter: delay
		});
		vi.mocked(performance.now).mockReturnValue(3000);
		expect(await getDiscordGuildMember("guild-b", "token-a")).toEqual({
			status: 429,
			retryAfter: 5
		});
		expect(fetchMock).toHaveBeenCalledOnce();
		// A different user's token is not blocked by this user's rate limit.
		expect(await getDiscordGuildMember("guild-a", "token-b")).toMatchObject({ status: 200 });
		vi.mocked(performance.now).mockReturnValue(delay * 1000);
		expect(await getDiscordGuildMember("guild-a", "token-a")).toMatchObject({
			status: 200,
			data: member
		});
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it.each([401, 403, 500, 503])("does not turn HTTP %s into non-membership", async (status) => {
		const { getDiscordGuildMember } = await import("./discord.mjs");
		fetchMock.mockResolvedValueOnce(new Response(null, { status }));
		expect(await getDiscordGuildMember("guild", "token")).toEqual({ status, retryAfter: 5 });
		vi.mocked(performance.now).mockReturnValue(5000);
		expect(await getDiscordGuildMember("guild", "token")).toMatchObject({
			status: 200,
			data: member
		});
	});

	it("does not shorten a cooldown when another in-flight guild lookup is rate-limited", async () => {
		const { getDiscordGuildMember } = await import("./discord.mjs");
		const later = Promise.withResolvers();
		fetchMock
			.mockResolvedValueOnce(Response.json({ retry_after: 20 }, { status: 429 }))
			.mockReturnValueOnce(later.promise);
		const first = getDiscordGuildMember("guild-a", "token");
		const second = getDiscordGuildMember("guild-b", "token");
		await first;
		later.resolve(Response.json({ retry_after: 5 }, { status: 429 }));
		expect(await second).toEqual({ status: 429, retryAfter: 20 });
		vi.mocked(performance.now).mockReturnValue(10_000);
		expect(await getDiscordGuildMember("guild-c", "token")).toEqual({
			status: 429,
			retryAfter: 10
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it.each(["network", "malformed"])(
		"recovers from %s failures without caching a denial",
		async (failure) => {
			const { getDiscordGuildMember } = await import("./discord.mjs");
			if (failure === "network") fetchMock.mockRejectedValueOnce(new Error("network failure"));
			else fetchMock.mockResolvedValueOnce(Response.json({ roles: [] }));
			expect(await getDiscordGuildMember("guild", "token")).toEqual({ status: 503, retryAfter: 5 });
			vi.mocked(performance.now).mockReturnValue(5000);
			expect(await getDiscordGuildMember("guild", "token")).toMatchObject({ status: 200 });
		}
	);

	it.each(["success", "rate-limit"])(
		"shares %s responses across real worker processes",
		async (mode) => {
			const { stdout } = await promisify(execFile)(
				process.execPath,
				[fileURLToPath(new URL("./fixtures/discord-workers.mjs", import.meta.url)), mode],
				{ timeout: 10_000 }
			);
			const result = JSON.parse(stdout);
			expect(result.fetches).toBe(1);
			// Includes a replacement worker started after the first two exit.
			expect(result.workers).toHaveLength(3);
			for (const replies of result.workers) {
				expect(replies).toHaveLength(2);
				for (const reply of replies) {
					if (mode === "success") expect(reply).toEqual({ status: 200, data: member });
					else {
						expect(reply.status).toBe(429);
						expect(reply.retryAfter).toBeGreaterThan(0);
						expect(reply.retryAfter).toBeLessThanOrEqual(20);
					}
				}
			}
		}
	);
});
