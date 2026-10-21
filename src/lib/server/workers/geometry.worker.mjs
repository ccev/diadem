import { move, workerData } from "piscina";
import { intersectPermissionBounds } from "../../geometry/permissionBounds.mjs";

const decoder = new TextDecoder();
const encoder = new TextEncoder();

/** @param {ArrayBuffer} buffer */
export default function (buffer) {
	if (!(buffer instanceof ArrayBuffer)) {
		throw new TypeError("Geometry task input must be an ArrayBuffer");
	}
	if (buffer.byteLength > workerData.maxTaskBytes) {
		throw new RangeError("Geometry task input exceeds maxTaskBytes");
	}

	/** @type {{polygons: import('geojson').Polygon[], bounds: import('../../geometry/permissionBounds.mjs').PermittedBounds['bounds']}} */
	const { polygons, bounds } = JSON.parse(decoder.decode(buffer));
	const result = intersectPermissionBounds(polygons, bounds);
	const encoded = encoder.encode(JSON.stringify(result));
	if (encoded.byteLength > workerData.maxTaskBytes) {
		throw new RangeError("Geometry task output exceeds maxTaskBytes");
	}

	return move(encoded.buffer);
}
