import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
	const conn = { query: vi.fn(), release: vi.fn(), destroy: vi.fn() };
	const pool = { getConnection: vi.fn(async () => conn) };
	return { conn, pool, createPool: vi.fn(() => pool) };
});
vi.mock("mysql2/promise", () => ({ default: { createPool: mocks.createPool } }));
vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({
		db: {},
		readLoad: { concurrency: 1, queueLimit: 1, queueTimeoutMs: 50, statementTimeoutMs: 100 }
	})
}));
vi.mock("@/lib/services/config/dbUri.server", () => ({ getDbUri: () => "mysql://unused" }));

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	mocks.conn.query.mockImplementation(async (options) => [
		typeof options === "string" && options.includes("VERSION")
			? [{ version: "8.0.39" }]
			: typeof options === "string" && options.includes("@@SESSION")
				? [{ deadline: 0 }]
				: [],
		[]
	]);
});
afterEach(() => vi.useRealTimers());

it("uses a bounded dedicated pool and maps saturation/queue expiry to 503 without running extra SQL", async () => {
	vi.useFakeTimers();
	const { query } = await import("./internalQuery");
	expect(mocks.createPool).toHaveBeenCalledWith(
		expect.objectContaining({
			connectionLimit: 1,
			waitForConnections: false,
			connectTimeout: 100
		})
	);
	let finish!: (value: unknown) => void;
	mocks.conn.query.mockImplementation(async (options) => {
		if (typeof options !== "string")
			return await new Promise((resolve) => {
				finish = resolve;
			});
		return [
			options.includes("VERSION")
				? [{ version: "8.0.39" }]
				: options.includes("@@SESSION")
					? [{ deadline: 0 }]
					: [],
			[]
		];
	});
	const first = query("SELECT id FROM gym");
	await vi.advanceTimersByTimeAsync(0);
	const queued = expect(query("SELECT id FROM pokestop")).rejects.toMatchObject({ status: 503 });
	await expect(query("SELECT id FROM station")).rejects.toMatchObject({ status: 503 });
	await vi.advanceTimersByTimeAsync(50);
	await queued;
	expect(mocks.pool.getConnection).toHaveBeenCalledOnce();
	finish([[{ id: "a" }], []]);
	expect(await first).toEqual([{ id: "a" }]);
	expect(mocks.conn.release).toHaveBeenCalledOnce();
});

it("groups incident children into distinct ordered objects without dropping children", async () => {
	const { queryJoined } = await import("./internalQuery");
	mocks.conn.query.mockImplementation(async (options) => {
		if (typeof options === "string")
			return [
				options.includes("VERSION")
					? [{ version: "8.0.39" }]
					: options.includes("@@SESSION")
						? [{ deadline: 0 }]
						: [],
				[]
			];
		expect(options.nestTables).toBe(true);
		return [
			[
				{ pokestop: { id: "a", name: "A" }, incident: { id: "1" } },
				{ pokestop: { id: "a", name: "A" }, incident: { id: "2" } },
				{ pokestop: { id: "b", name: "B" }, incident: { id: "3" } }
			],
			[]
		];
	});
	expect(await queryJoined("SELECT ... ORDER BY pokestop.id")).toEqual([
		{ id: "a", name: "A", incident: [{ id: "1" }, { id: "2" }] },
		{ id: "b", name: "B", incident: [{ id: "3" }] }
	]);
});

it("propagates a server timeout as 503, resets the session and does not retry", async () => {
	const { query } = await import("./internalQuery");
	mocks.conn.query.mockImplementation(async (options) => {
		if (typeof options !== "string") throw { code: "ER_QUERY_TIMEOUT" };
		return [
			options.includes("VERSION")
				? [{ version: "8.0.39" }]
				: options.includes("@@SESSION")
					? [{ deadline: 0 }]
					: [],
			[]
		];
	});
	await expect(query("SELECT id FROM gym")).rejects.toMatchObject({ status: 503 });
	expect(
		mocks.conn.query.mock.calls.filter(([options]) => typeof options !== "string")
	).toHaveLength(1);
	expect(mocks.conn.query).toHaveBeenLastCalledWith("SET SESSION max_execution_time=0");
	expect(mocks.conn.release).toHaveBeenCalledOnce();
});

it("fails closed before scanning data if server deadlines are unsupported", async () => {
	const { query } = await import("./internalQuery");
	mocks.conn.query.mockResolvedValue([[{ version: "5.6.51" }], []]);
	await expect(query("SELECT id FROM gym")).rejects.toMatchObject({ status: 503 });
	expect(mocks.conn.query).toHaveBeenCalledExactlyOnceWith("SELECT VERSION() AS version");
	expect(mocks.conn.release).toHaveBeenCalledOnce();
});

it("rejects invalid per-call deadline caps before acquiring a connection", async () => {
	const { query } = await import("./internalQuery");
	for (const cap of [0, -1, NaN, Infinity])
		await expect(query("SELECT id FROM gym", undefined, cap)).rejects.toMatchObject({
			status: 503
		});
	expect(mocks.pool.getConnection).not.toHaveBeenCalled();
});

it("destroys a hung transport instead of returning a busy pooled connection", async () => {
	vi.useFakeTimers();
	const { query } = await import("./internalQuery");
	mocks.conn.query.mockImplementation(async (options) => {
		if (typeof options !== "string") return await new Promise(() => {});
		return [
			options.includes("VERSION")
				? [{ version: "8.0.39" }]
				: options.includes("@@SESSION")
					? [{ deadline: 0 }]
					: [],
			[]
		];
	});
	const result = expect(query("SELECT id FROM gym")).rejects.toMatchObject({ status: 503 });
	await vi.advanceTimersByTimeAsync(1100);
	await result;
	expect(mocks.conn.destroy).toHaveBeenCalledOnce();
	expect(mocks.conn.release).not.toHaveBeenCalled();
});
