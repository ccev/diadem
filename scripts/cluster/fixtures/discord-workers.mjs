import cluster from "node:cluster";
import { fileURLToPath } from "node:url";
import { getDiscordGuildMember, serveDiscordGuildLookups } from "../discord.mjs";

if (cluster.isPrimary) {
	let fetches = 0;
	globalThis.fetch = async () => {
		fetches++;
		return process.argv[2] === "rate-limit"
			? Response.json({ retry_after: 20 }, { status: 429 })
			: Response.json({ user: { id: "123" }, roles: ["456"] });
	};
	cluster.setupPrimary({ exec: fileURLToPath(import.meta.url) });
	serveDiscordGuildLookups(cluster);
	const runWorker = () =>
		new Promise((resolve, reject) => {
			const worker = cluster.fork({ DIADEM_CLUSTER_DISCORD: "1" });
			let result;
			worker.on("message", (message) => {
				if (message.testResult) result = message.testResult;
			});
			worker.on("error", reject);
			worker.on("exit", (code) => {
				if (code === 0 && result) resolve(result);
				else reject(new Error(`Worker exited before returning a result: ${code}`));
			});
		});
	try {
		const workers = await Promise.all([runWorker(), runWorker()]);
		workers.push(await runWorker());
		console.log(JSON.stringify({ fetches, workers }));
	} finally {
		cluster.disconnect();
	}
} else {
	// Any accidental per-worker fetch makes the integration test fail.
	globalThis.fetch = async () => {
		throw new Error("Worker must use the primary lookup service");
	};
	const testResult = await Promise.all([
		getDiscordGuildMember("guild", "token"),
		getDiscordGuildMember("guild", "token")
	]);
	process.send({ testResult }, () => process.disconnect());
}
