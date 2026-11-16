import cluster from "node:cluster";
import os from "node:os";
import { installStatsCoordinator } from "./build/server/coordination/statsCoordinator.mjs";

const workerEnv = process.env.DIADEM_WORKERS ?? "auto";
const availableWorkers = Math.max(1, os.availableParallelism?.() ?? os.cpus().length);

function parseWorkerCount(value) {
	if (value === "auto" || value === "max") return availableWorkers;

	const parsed = Number.parseInt(value, 10);
	if (Number.isFinite(parsed) && parsed > 0) return parsed;

	throw new Error(
		`Invalid DIADEM_WORKERS value "${value}". Use "auto", "max", or a positive integer.`
	);
}

const workerCount = parseWorkerCount(workerEnv);

if (workerCount === 1) {
	delete process.env.DIADEM_STATS_IPC;
	await import("./build/index.js");
} else if (cluster.isPrimary) {
	process.title = "Diadem cluster";
	cluster.schedulingPolicy = cluster.SCHED_RR;
	cluster.setupPrimary({ exec: "./build/index.js" });
	installStatsCoordinator(cluster);

	let shuttingDown = false;

	console.log(`Starting Diadem cluster with ${workerCount} workers`);
	for (let i = 0; i < workerCount; i += 1) cluster.fork({ DIADEM_STATS_IPC: "1" });

	cluster.on("exit", (worker, code, signal) => {
		if (shuttingDown) return;
		console.error(
			`Diadem worker ${worker.process.pid ?? "<unknown>"} exited (${signal ?? code}); restarting`
		);
		cluster.fork({ DIADEM_STATS_IPC: "1" });
	});

	const shutdown = (signal) => {
		if (shuttingDown) return;
		shuttingDown = true;
		console.log(`Received ${signal}; stopping Diadem workers`);

		cluster.disconnect(() => process.exit(0));
		setTimeout(() => {
			for (const worker of Object.values(cluster.workers)) worker?.kill("SIGTERM");
			process.exit(0);
		}, 10_000).unref();
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
}
