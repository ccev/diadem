import type { PoolConnection } from "mysql2/promise";
import { expect, it, vi } from "vitest";
import { deadlineRead, detectReadDialect } from "./readDeadline";
import { liveStatsSchema, readLoadSchema } from "@/lib/services/config/readLoadConfig";

it.each([
	["8.0.39", "mysql"],
	["5.7.8", "mysql"],
	["9.0.1", "mysql"],
	["10.11.6-MariaDB", "mariadb"],
	["5.5.5-10.6.17-MariaDB", "mariadb"]
])("detects supported stock server %s", (version, dialect) => {
	expect(detectReadDialect(version)).toBe(dialect);
});
it.each(["5.7.7", "5.6.51", "10.1.1-MariaDB", "unknown"])("fails closed for %s", (version) => {
	expect(() => detectReadDialect(version)).toThrow();
});

it.each([
	"SELECT * FROM gym",
	"WITH ids AS (SELECT id FROM gym) SELECT * FROM ids",
	"(SELECT id FROM gym) UNION ALL (SELECT id FROM pokestop)"
])("sets and resets a real MySQL deadline without rewriting the read: %s", async (sql) => {
	const conn = { query: vi.fn().mockResolvedValue([[], []]), destroy: vi.fn() };
	conn.query.mockResolvedValueOnce([[{ deadline: 0 }], []]);
	await deadlineRead(
		conn as unknown as PoolConnection,
		{ sql, nestTables: true },
		[5],
		"mysql",
		8000
	);
	expect(conn.query.mock.calls).toEqual([
		["SELECT @@SESSION.max_execution_time AS deadline"],
		["SET SESSION max_execution_time=8000"],
		[{ sql, nestTables: true }, [5]],
		["SET SESSION max_execution_time=0"]
	]);
});

it("restores MySQL session state after a statement timeout", async () => {
	const conn = { query: vi.fn().mockResolvedValue([[], []]), destroy: vi.fn() };
	conn.query
		.mockResolvedValueOnce([[{ deadline: 1250 }], []])
		.mockResolvedValueOnce([[], []])
		.mockRejectedValueOnce(new Error("timeout"));
	await expect(
		deadlineRead(conn as unknown as PoolConnection, { sql: "SELECT 1" }, [], "mysql", 100)
	).rejects.toThrow("timeout");
	expect(conn.query).toHaveBeenLastCalledWith("SET SESSION max_execution_time=1250");
});

it("does not relax a stricter inherited MySQL deadline", async () => {
	const conn = { query: vi.fn().mockResolvedValue([[], []]), destroy: vi.fn() };
	conn.query.mockResolvedValueOnce([[{ deadline: 25 }], []]);
	await deadlineRead(conn as unknown as PoolConnection, { sql: "SELECT 1" }, [], "mysql", 8000);
	expect(conn.query).toHaveBeenNthCalledWith(2, "SET SESSION max_execution_time=25");
	expect(conn.query).toHaveBeenLastCalledWith("SET SESSION max_execution_time=25");
});

it("fails closed if reading or installing the MySQL deadline fails", async () => {
	const conn = { query: vi.fn().mockResolvedValue([[], []]), destroy: vi.fn() };
	await expect(
		deadlineRead(conn as unknown as PoolConnection, { sql: "SELECT 1" }, [], "mysql", 100)
	).rejects.toThrow("Invalid MySQL session deadline");
	conn.query
		.mockClear()
		.mockResolvedValueOnce([[{ deadline: 0 }], []])
		.mockRejectedValueOnce(new Error("setup denied"))
		.mockResolvedValueOnce([[], []]);
	await expect(
		deadlineRead(conn as unknown as PoolConnection, { sql: "SELECT 1" }, [], "mysql", 100)
	).rejects.toThrow("setup denied");
	expect(conn.query.mock.calls.every(([sql]) => typeof sql === "string")).toBe(true);
});

it("destroys a connection if restoring session state fails", async () => {
	const conn = { query: vi.fn(), destroy: vi.fn() };
	conn.query
		.mockResolvedValueOnce([[{ deadline: 0 }], []])
		.mockResolvedValueOnce([[], []])
		.mockResolvedValueOnce([[], []])
		.mockRejectedValueOnce(new Error("connection lost"));
	await expect(
		deadlineRead(conn as unknown as PoolConnection, { sql: "SELECT 1" }, [], "mysql", 100)
	).rejects.toThrow();
	expect(conn.destroy).toHaveBeenCalledOnce();
});

it("uses MariaDB statement scope, seconds and the original bindings", async () => {
	const conn = { query: vi.fn().mockResolvedValue([[], []]) };
	await deadlineRead(
		conn as unknown as PoolConnection,
		{ sql: "WITH ids AS (SELECT ?) SELECT * FROM ids", nestTables: true },
		[5],
		"mariadb",
		1500
	);
	expect(conn.query).toHaveBeenCalledExactlyOnceWith(
		{
			sql: "SET STATEMENT max_statement_time=1.5 FOR WITH ids AS (SELECT ?) SELECT * FROM ids",
			nestTables: true
		},
		[5]
	);
});

it("validates all tuning and prevents disabled, NaN or unbounded deadlines", () => {
	expect(readLoadSchema.parse({})).toEqual({
		concurrency: 4,
		queueLimit: 16,
		queueTimeoutMs: 1000,
		statementTimeoutMs: 8000,
		deadline: "auto"
	});
	for (const value of [0, -1, NaN, Infinity, 0.5, "1000", 60001])
		expect(readLoadSchema.safeParse({ statementTimeoutMs: value }).success).toBe(false);
	expect(readLoadSchema.safeParse({ deadline: "off" }).success).toBe(false);
	expect(readLoadSchema.safeParse({ concurrency: 0 }).success).toBe(false);
	expect(readLoadSchema.safeParse({ queueLimit: -1 }).success).toBe(false);
	expect(readLoadSchema.safeParse({ queueTimeoutMs: 0 }).success).toBe(false);
	expect(liveStatsSchema.parse({})).toEqual({
		pokemonRefreshSeconds: 180,
		fortRefreshSeconds: 3600,
		staleSeconds: 86400
	});
	expect(liveStatsSchema.safeParse({ pokemonRefreshSeconds: 0 }).success).toBe(false);
});
