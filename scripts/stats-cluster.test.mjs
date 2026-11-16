import cluster from "node:cluster";
import { once } from "node:events";
import { afterEach, expect, it } from "vitest";
import { installStatsCoordinator } from "../src/lib/server/coordination/statsCoordinator.mjs";

/** @type {import("node:cluster").Worker[]} */
let workers = [];
/** @type {(() => void)[]} */
let cleanups = [];
afterEach(async () => {
	await Promise.all(
		workers.map(async (worker) => {
			if (worker.isDead()) return;
			const exited = once(worker, "exit");
			worker.kill();
			await exited;
		})
	);
	workers = [];
	for (const cleanup of cleanups) cleanup();
	cleanups = [];
});

it("coordinates two real IPC workers and reclaims a dead worker's lease", async () => {
	const events = ["message", "exit", "disconnect"];
	const previous = new Map(events.map((event) => [event, cluster.listeners(event)]));
	installStatsCoordinator(cluster);
	cleanups.push(() => {
		for (const event of events) {
			for (const listener of cluster.listeners(event)) {
				if (!previous.get(event)?.includes(listener)) cluster.removeListener(event, listener);
			}
		}
	});
	cluster.setupPrimary({
		exec: new URL("./fixtures/stats-worker.mjs", import.meta.url).pathname,
		execArgv: []
	});
	for (let i = 0; i < 2; i++) {
		const worker = cluster.fork({ DIADEM_STATS_IPC: "1" });
		workers.push(worker);
		await once(worker, "message"); // fixture ready
	}
	let sequence = 0;
	const request = (
		/** @type {import("node:cluster").Worker} */ worker,
		/** @type {object} */ body
	) =>
		new Promise((resolve, reject) => {
			const id = ++sequence;
			const timer = setTimeout(() => {
				worker.off("message", listener);
				reject(new Error("Mock worker request timed out"));
			}, 3000);
			const listener = (/** @type {any} */ msg) => {
				if (msg?.test !== "result" || msg.id !== id) return;
				clearTimeout(timer);
				worker.off("message", listener);
				resolve(msg);
			};
			worker.on("message", listener);
			worker.send({ test: "request", id, request: body });
		});
	const key = `live:v1:${"a".repeat(64)}:pokemon`;
	const get = { op: "get", key, refreshMs: 120_000, staleMs: 3_600_000 };
	const replies = /** @type {any[]} */ (await Promise.all(workers.map((w) => request(w, get))));
	const ownerIndex = replies.findIndex((r) => r.result.token);
	expect(replies.filter((r) => r.result.token)).toHaveLength(1);
	const owner = workers[ownerIndex];
	const other = workers[1 - ownerIndex];
	await request(owner, { op: "publish", key, token: replies[ownerIndex].result.token, value: 123 });
	expect(await request(other, get)).toMatchObject({ result: { value: 123 } });

	const otherKey = key.replace(":pokemon", ":forts");
	const lease = /** @type {any} */ (await request(owner, { ...get, key: otherKey }));
	expect(lease.result.token).toBeDefined();
	const exited = once(owner, "exit");
	owner.kill();
	await exited;
	const recovered = /** @type {any} */ (await request(other, { ...get, key: otherKey }));
	expect(recovered.result.token).toBeDefined();
}, 10_000);
