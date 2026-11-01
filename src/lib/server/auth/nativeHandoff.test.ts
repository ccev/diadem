import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { consumeNativeCode } from "./nativeHandoff";

const mocks = vi.hoisted(() => ({ select: vi.fn(), remove: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/server/db/internal", () => {
	const tx = {
		select: () => ({
			from: () => ({ where: () => ({ limit: () => ({ for: mocks.select }) }) })
		}),
		delete: () => ({ where: mocks.remove })
	};
	return {
		db: {
			transaction: mocks.transaction.mockImplementation(
				(callback: (tx: unknown) => Promise<unknown>) => callback(tx)
			)
		}
	};
});

const code = "c".repeat(43);
const verifier = "native-verifier-".padEnd(43, "x");
const challenge = createHash("sha256").update(verifier).digest("base64url");

beforeEach(() => {
	vi.clearAllMocks();
	mocks.select.mockResolvedValue([
		{
			id: "row",
			value: JSON.stringify({ token: "session-token", challenge }),
			expiresAt: new Date(Date.now() + 120000)
		}
	]);
});

describe("native login handoff validation", () => {
	it("returns the session for the matching verifier", async () => {
		expect(await consumeNativeCode(code, verifier)).toBe("session-token");
	});

	it("returns null for an unknown code", async () => {
		mocks.select.mockResolvedValue([]);
		expect(await consumeNativeCode(code, verifier)).toBeNull();
		expect(mocks.remove).not.toHaveBeenCalled();
	});

	it.each([
		["invalid", verifier],
		[code, "invalid"]
	])("rejects malformed credentials before querying: %s / %s", async (code, verifier) => {
		expect(await consumeNativeCode(code, verifier)).toBeNull();
		expect(mocks.transaction).not.toHaveBeenCalled();
	});

	it("rejects a mismatched verifier and deletes the handoff", async () => {
		expect(await consumeNativeCode(code, "wrong".padEnd(43, "x"))).toBeNull();
		expect(mocks.remove).toHaveBeenCalledOnce();
	});

	it.each([
		"{broken",
		"null",
		JSON.stringify({ token: 42, challenge }),
		JSON.stringify({ token: "session-token", challenge: "short" })
	])("rejects malformed stored data and deletes the handoff: %s", async (value) => {
		mocks.select.mockResolvedValue([
			{ id: "row", value, expiresAt: new Date(Date.now() + 120000) }
		]);
		expect(await consumeNativeCode(code, verifier)).toBeNull();
		expect(mocks.remove).toHaveBeenCalledOnce();
	});
});
