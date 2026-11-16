import { randomUUID } from "node:crypto";
import { STATS_CHANNEL, StatsCoordinator, type Snapshot } from "./statsCoordinator.mjs";

type Message = {
	op: "get" | "publish" | "fail";
	key: string;
	refreshMs?: number;
	staleMs?: number;
	token?: string;
	value?: number | Record<string, number>;
};

const standalone = new StatsCoordinator();
const pending = new Map<
	string,
	{ resolve: (value: Snapshot) => void; reject: (cause: Error) => void; timer: NodeJS.Timeout }
>();
const unavailable = () => new Error("Stats coordination unavailable");

if (process.env.DIADEM_STATS_IPC === "1") {
	process.on("message", (input: unknown) => {
		const msg = input as { channel?: string; id?: string; result: Snapshot; failed?: boolean };
		if (msg?.channel !== STATS_CHANNEL || typeof msg.id !== "string") return;
		const call = pending.get(msg.id);
		if (!call) return;
		pending.delete(msg.id);
		clearTimeout(call.timer);
		if (msg.failed) call.reject(unavailable());
		else call.resolve(msg.result);
	});
	process.on("disconnect", () => {
		for (const call of pending.values()) {
			clearTimeout(call.timer);
			call.reject(unavailable());
		}
		pending.clear();
	});
}

export async function statsRequest(message: Message): Promise<Snapshot> {
	if (process.env.DIADEM_STATS_IPC !== "1") return standalone.handle("standalone", message);
	// Never fall back to independent refreshes after an IPC failure in a managed cluster.
	if (!process.send || !process.connected || pending.size >= 32) throw unavailable();
	return new Promise((resolve, reject) => {
		const id = randomUUID();
		const fail = () => {
			const call = pending.get(id);
			if (!call) return;
			clearTimeout(call.timer);
			pending.delete(id);
			reject(unavailable());
		};
		const timer = setTimeout(fail, 1000);
		pending.set(id, { resolve, reject, timer });
		try {
			process.send!({ ...message, channel: STATS_CHANNEL, id }, (cause) => {
				if (cause) fail();
			});
		} catch {
			fail();
		}
	});
}
