// Mock counter producer: no app, configuration, network or database is loaded.
import { statsRequest } from "../../src/lib/server/coordination/statsTransport.ts";

process.on("message", async (msg) => {
	if (msg?.test !== "request") return;
	try {
		const result = await statsRequest(msg.request);
		process.send?.({ test: "result", id: msg.id, result });
	} catch {
		process.send?.({ test: "result", id: msg.id, failed: true });
	}
});
process.send?.({ test: "ready" });
