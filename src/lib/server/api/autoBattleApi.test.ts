import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({
		bots: {
			enableAutoBattle: true,
			autoBattleHost: "https://auto-battle.example/api/v1/",
			autoBattleKey: "test-key"
		}
	})
}));

import { enrichAutoBattleResponse, proxyAutoBattleRequest } from "@/lib/server/api/autoBattleApi";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("enrichAutoBattleResponse", () => {
	it("preserves battle moves from the Auto Battle service", async () => {
		const response = await enrichAutoBattleResponse(
			Response.json({
				session_id: "session",
				battle: {
					id: "battle",
					move_1: 14,
					move_2: 15
				}
			})
		);

		expect(await response.json()).toMatchObject({
			battle: { move_1: 14, move_2: 15 }
		});
	});

	it("retries an upstream gateway timeout with the same idempotency key", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response("Gateway timeout", { status: 504 }))
			.mockResolvedValueOnce(Response.json({ session_id: "session" }, { status: 202 }));
		vi.stubGlobal("fetch", fetchMock);

		const response = await proxyAutoBattleRequest(
			new Request("http://localhost", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ boss: { pokemon_id: 150 } })
			}),
			"battle",
			true
		);

		expect(response.status).toBe(202);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[0][1].headers.get("Idempotency-Key")).toBe(
			fetchMock.mock.calls[1][1].headers.get("Idempotency-Key")
		);
	});
});
