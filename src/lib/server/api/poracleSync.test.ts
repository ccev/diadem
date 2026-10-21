import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({
	poracle: undefined as { url: string; secret?: string; syncLinkedTrainers?: boolean } | undefined
}));
vi.mock("@/lib/services/config/config.server", () => ({ getServerConfig: () => config }));

import {
	addLinkedTrainerToPoracle,
	poracleLabel,
	removeLinkedTrainerFromPoracle,
	resetPoracleSyncState,
	resyncLinkedTrainersToPoracle
} from "@/lib/server/api/poracleSync";

type Call = { method: string; path: string; body?: unknown; secret?: string };

function json(status: number, body: unknown) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" }
	});
}

// Answers like PoracleNG: /health with the given capability, then the queued responses in order
function mockPoracle(personalShiny: boolean, ...responses: Response[]) {
	const calls: Call[] = [];
	const fetchMock = vi.fn(async (url: URL, init: RequestInit) => {
		const headers = init.headers as Record<string, string>;
		calls.push({
			method: init.method ?? "GET",
			path: url.pathname,
			body: init.body ? JSON.parse(init.body as string) : undefined,
			secret: headers["X-Poracle-Secret"]
		});
		if (url.pathname === "/health") return json(200, { capabilities: { personalShiny } });
		return responses.shift() ?? json(500, {});
	});
	vi.stubGlobal("fetch", fetchMock);
	return calls;
}

beforeEach(() => {
	resetPoracleSyncState();
	config.poracle = { url: "http://poracle:3030", secret: "s3cret", syncLinkedTrainers: true };
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("addLinkedTrainerToPoracle", () => {
	it("does nothing unless syncLinkedTrainers is enabled", async () => {
		const calls = mockPoracle(true, json(201, {}));
		config.poracle = { url: "http://poracle:3030", secret: "s3cret" };
		await addLinkedTrainerToPoracle("123", { playerId: "abc123", trainerName: "Ash" });
		config.poracle = undefined;
		await addLinkedTrainerToPoracle("123", { playerId: "abc123", trainerName: "Ash" });
		expect(calls).toEqual([]);
	});

	it("adds the player id with the trainer name as label", async () => {
		const calls = mockPoracle(true, json(201, {}));
		await addLinkedTrainerToPoracle("123", { playerId: "abc123", trainerName: "Ash" });
		expect(calls).toEqual([
			{ method: "GET", path: "/health", body: undefined, secret: "s3cret" },
			{
				method: "POST",
				path: "/api/v2/humans/123/accounts",
				body: { player_id: "abc123", label: "Ash" },
				secret: "s3cret"
			}
		]);
	});

	it("skips a Poracle without linked accounts", async () => {
		const calls = mockPoracle(false, json(201, {}));
		await addLinkedTrainerToPoracle("123", { playerId: "abc123", trainerName: "Ash" });
		expect(calls.map((c) => c.path)).toEqual(["/health"]);
	});

	it("retries without a label when the label is taken", async () => {
		const calls = mockPoracle(
			true,
			json(409, { status: 409, detail: "label already in use" }),
			json(201, {})
		);
		await addLinkedTrainerToPoracle("123", { playerId: "abc123", trainerName: "Ash" });
		expect(calls.slice(1).map((c) => c.body)).toEqual([
			{ player_id: "abc123", label: "Ash" },
			{ player_id: "abc123" }
		]);
	});

	it("treats an already linked player id as done", async () => {
		const calls = mockPoracle(true, json(409, { status: 409, detail: "player id already linked" }));
		await addLinkedTrainerToPoracle("123", { playerId: "abc123", trainerName: "Ash" });
		expect(calls).toHaveLength(2);
	});

	it("skips player ids Poracle would reject", async () => {
		const calls = mockPoracle(true, json(201, {}));
		await addLinkedTrainerToPoracle("123", { playerId: "not-valid!", trainerName: "Ash" });
		expect(calls.map((c) => c.path)).toEqual(["/health"]);
	});

	it("never throws when Poracle is unreachable", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("ECONNREFUSED");
			})
		);
		await expect(
			addLinkedTrainerToPoracle("123", { playerId: "abc123", trainerName: "Ash" })
		).resolves.toBeUndefined();
	});
});

describe("removeLinkedTrainerFromPoracle", () => {
	it("deletes the player id", async () => {
		const calls = mockPoracle(true, json(200, { status: "ok" }));
		await removeLinkedTrainerFromPoracle("123", "abc123");
		expect(calls[1]).toMatchObject({
			method: "DELETE",
			path: "/api/v2/humans/123/accounts/abc123"
		});
	});
});

describe("resyncLinkedTrainersToPoracle", () => {
	it("adds only the trainers Poracle is missing, at most once an hour", async () => {
		const calls = mockPoracle(
			true,
			json(200, { accounts: [{ player_id: "abc123", label: "Ash", created_at: "" }] }),
			json(201, {})
		);
		const trainers = [
			{ playerId: "abc123", trainerName: "Ash" },
			{ playerId: "def456", trainerName: "Misty" }
		];
		await resyncLinkedTrainersToPoracle("123", trainers);
		await resyncLinkedTrainersToPoracle("123", trainers);
		expect(calls.slice(1).map((c) => [c.method, c.body])).toEqual([
			["GET", undefined],
			["POST", { player_id: "def456", label: "Misty" }]
		]);
	});
});

describe("poracleLabel", () => {
	it("trims, caps at 64 characters and drops empty names", () => {
		expect(poracleLabel("  Ash ")).toBe("Ash");
		expect(poracleLabel("x".repeat(80))).toHaveLength(64);
		expect(poracleLabel("  ")).toBeUndefined();
		expect(poracleLabel(null)).toBeUndefined();
	});
});
