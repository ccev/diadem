import { setTimeout as delay } from "node:timers/promises";
import { isMainThread } from "node:worker_threads";
import { move, workerData } from "piscina";

/** @param {ArrayBuffer} buffer */
export default async function (buffer) {
	if (isMainThread) throw new Error("The fixture must run in a worker thread");
	const bytes = new Uint8Array(buffer);
	// The header contains a command initial and a little-endian uint32 delay in milliseconds.
	switch (String.fromCharCode(bytes[0] ?? 0)) {
		case "d":
			await delay(new DataView(buffer).getUint32(1, true));
			break;
		case "t":
			throw new Error("Fixture task failed");
		case "c":
			process.exit(23);
		case "i":
			return { invalid: true };
		case "o":
			return move(new ArrayBuffer(workerData.maxTaskBytes + 1));
		case "m":
			bytes[bytes.length - 1]++;
			break;
	}
	return move(buffer);
}
