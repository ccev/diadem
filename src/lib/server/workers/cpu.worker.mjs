import { move, workerData } from "piscina";
import { intersectPermissionBounds } from "../../geometry/permissionBounds.mjs";
import { encryptEncounterId } from "../encounterIdCrypto.mjs";

const decoder = new TextDecoder();
const encoder = new TextEncoder();

/** @param {ArrayBuffer} buffer */
export default function (buffer) {
	if (!(buffer instanceof ArrayBuffer)) {
		throw new TypeError("CPU task input must be an ArrayBuffer");
	}
	if (buffer.byteLength > workerData.maxTaskBytes) {
		throw new RangeError("CPU task input exceeds maxTaskBytes");
	}

	/** @type {{type: 'geometry', polygons: import('geojson').Polygon[], bounds: import('../../geometry/permissionBounds.mjs').PermittedBounds['bounds']} | {type: 'encounterIds', ids: string[]}} */
	const task = JSON.parse(decoder.decode(buffer));
	let result;
	switch (task.type) {
		case "geometry":
			result = intersectPermissionBounds(task.polygons, task.bounds);
			break;
		case "encounterIds":
			if (!workerData.encounterIdKey) throw new Error("Encounter ID encryption is disabled");
			result = task.ids.map((id) => encryptEncounterId(id, workerData.encounterIdKey));
			break;
		default:
			throw new Error("Unknown CPU task");
	}
	const encoded = encoder.encode(JSON.stringify(result));
	if (encoded.byteLength > workerData.maxTaskBytes) {
		throw new RangeError("CPU task output exceeds maxTaskBytes");
	}

	return move(encoded.buffer);
}
