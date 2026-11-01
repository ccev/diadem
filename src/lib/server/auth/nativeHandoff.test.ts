import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Condition = { column?: string; value?: unknown; children?: Condition[]; kind: string };
type Row = Record<string, unknown>;
const shared = vi.hoisted(() => ({
	rows: new Map<string, Row>(),
	lock: vi.fn(),
	transaction: vi.fn(),
	queue: Promise.resolve() as Promise<unknown>
}));
vi.mock("drizzle-orm", () => ({
	eq: (column: string, value: unknown) => ({ kind: "eq", column, value }),
	lte: (column: string, value: unknown) => ({ kind: "lte", column, value }),
	like: (column: string, value: unknown) => ({ kind: "like", column, value }),
	and: (...children: Condition[]) => ({ kind: "and", children })
}));
vi.mock("@/lib/server/db/internal/schema", () => ({
	verification: { identifier: "identifier", expiresAt: "expiresAt", id: "id" }
}));
vi.mock("@/lib/server/db/internal", () => {
	const matches = (row: Row, condition: Condition): boolean => {
		if (condition.kind === "and") return condition.children!.every((child) => matches(row, child));
		const value = row[condition.column!];
		if (condition.kind === "eq") return value === condition.value;
		if (condition.kind === "like")
			return String(value).startsWith(String(condition.value).slice(0, -1));
		return (value as Date) <= (condition.value as Date);
	};
	const db = {
		delete: () => ({
			where: async (condition: Condition) => {
				for (const [id, row] of shared.rows) if (matches(row, condition)) shared.rows.delete(id);
			}
		}),
		insert: () => ({ values: async (row: Row) => shared.rows.set(row.id as string, row) }),
		select: () => ({
			from: () => ({
				where: (condition: Condition) => ({
					limit: (limit: number) => ({
						for: async (lock: string) => {
							shared.lock(lock);
							return [...shared.rows.values()]
								.filter((row) => matches(row, condition))
								.slice(0, limit);
						}
					})
				})
			})
		}),
		transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
			shared.transaction();
			const result = shared.queue.then(() => callback(db));
			shared.queue = result.catch(() => undefined);
			return result;
		}
	};
	return { db };
});

const verifier = "native-verifier-".padEnd(43, "x");
const challenge = createHash("sha256").update(verifier).digest("base64url");

beforeEach(() => {
	shared.rows.clear();
	shared.lock.mockClear();
	shared.transaction.mockClear();
	shared.queue = Promise.resolve();
	vi.useRealTimers();
	vi.resetModules();
});

describe("native login handoff", () => {
	it("exchanges a code issued by another worker using the shared database", async () => {
		const issuer = await import("./nativeHandoff");
		const code = await issuer.issueNativeCode("session-token", challenge);
		vi.resetModules();
		const otherWorker = await import("./nativeHandoff");
		expect(await otherWorker.consumeNativeCode(code, verifier)).toBe("session-token");
		expect(shared.rows.size).toBe(0);
		expect(shared.transaction).toHaveBeenCalledOnce();
		expect(shared.lock).toHaveBeenCalledWith("update");
	});

	it("allows only one exchange when two workers receive the same code", async () => {
		const { issueNativeCode, consumeNativeCode } = await import("./nativeHandoff");
		const code = await issueNativeCode("session-token", challenge);
		expect(
			await Promise.all([consumeNativeCode(code, verifier), consumeNativeCode(code, verifier)])
		).toEqual(["session-token", null]);
	});

	it("rejects a mismatched verifier and consumes the handoff", async () => {
		const { issueNativeCode, consumeNativeCode } = await import("./nativeHandoff");
		const code = await issueNativeCode("session-token", challenge);
		expect(await consumeNativeCode(code, "wrong".padEnd(43, "x"))).toBeNull();
		expect(await consumeNativeCode(code, verifier)).toBeNull();
	});

	it("rejects expired codes and cleans up expired handoffs without deleting other verifications", async () => {
		vi.useFakeTimers();
		const { issueNativeCode, consumeNativeCode } = await import("./nativeHandoff");
		const expired = await issueNativeCode("expired-token", challenge);
		vi.advanceTimersByTime(120001);
		expect(await consumeNativeCode(expired, verifier)).toBeNull();
		await issueNativeCode("another-expired-token", challenge);
		shared.rows.set("other", { id: "other", identifier: "other-provider", expiresAt: new Date(0) });
		vi.advanceTimersByTime(120001);
		const active = await issueNativeCode("active-token", challenge);
		expect(shared.rows.size).toBe(2);
		expect(shared.rows.has("other")).toBe(true);
		expect(await consumeNativeCode(active, verifier)).toBe("active-token");
	});
});
