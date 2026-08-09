import { decode } from "@msgpack/msgpack";

/**
 * Bounds on what a single body may decode to. msgpack states a collection's
 * length up front and the decoder allocates for it before reading any element,
 * so without these a five-byte body declaring a 33M-element array allocates
 * hundreds of megabytes before failing. JSON has no equivalent amplification.
 *
 * These are far above any real request: a poll body is a bounding box, a
 * timestamp and a hash, and the largest filter the server will even cache is
 * 16 KB.
 */
const DECODE_LIMITS = {
	maxArrayLength: 100_000,
	maxMapLength: 100_000,
	maxStrLength: 64 * 1024,
	maxBinLength: 64 * 1024,
	maxExtLength: 64 * 1024
};

/** Nesting beyond this is rejected rather than recursed into. Filters nest ~6 deep. */
const MAX_DEPTH = 64;

/**
 * Raw bytes buffered before decoding. The decode ceilings above can't apply
 * until the whole body is in memory, so this is what actually bounds that.
 *
 * Matches adapter-node's BODY_SIZE_LIMIT, which defaults to 512K and rejects a
 * larger body with a 413 before any handler runs — so a cap above it would
 * never be the thing that fires. Raise both together, or neither.
 */
const MAX_BODY_BYTES = 512 * 1024;

export type ReadBodyOptions = {
	/**
	 * Keep null properties instead of dropping them. Set this for bodies that are
	 * stored rather than interpreted — a null there is the client's data, and
	 * dropping it silently loses a field on its way to the database.
	 */
	keepNulls?: boolean;
	/** Override the byte cap, for endpoints that legitimately carry more. */
	maxBytes?: number;
};

/**
 * Read a request body as msgpack or JSON, depending on its Content-Type.
 * Clients send msgpack where they can — it is roughly half the size of the
 * equivalent JSON and request bodies are never compressed by the browser.
 */
export async function readRequestBody<T>(
	request: Request,
	options: ReadBodyOptions = {}
): Promise<T> {
	const contentType = request.headers.get("Content-Type") ?? "";
	const raw = await readCapped(request, options.maxBytes ?? MAX_BODY_BYTES);
	const isMsgpack = contentType.includes("application/msgpack");

	const body = isMsgpack ? decode(raw, DECODE_LIMITS) : JSON.parse(new TextDecoder().decode(raw));

	// msgpack has no undefined, so an absent optional field arrives as null and
	// would defeat `!== undefined` guards such as the `since` delta cursor. Only
	// the msgpack path needs that: in JSON an absent field is genuinely absent,
	// so a null there was written deliberately.
	//
	// Both paths are depth-checked. JSON.parse is iterative and swallows nesting
	// that later blows the stack in stableStringify or JSON.stringify — a body
	// well under the byte cap can carry tens of thousands of levels.
	if (isMsgpack && !options.keepNulls) dropNulls(body, 0);
	else checkDepth(body, 0);

	return body as T;
}

/**
 * Read the body, refusing to buffer more than the cap. Checking a length after
 * arrayBuffer() would be too late — the allocation has already happened — and
 * Content-Length is absent on a chunked body, so neither bounds anything on its
 * own. Reading the stream does, whatever the client claims.
 */
async function readCapped(request: Request, maxBytes: number): Promise<Uint8Array> {
	const declared = Number(request.headers.get("Content-Length"));
	if (Number.isFinite(declared) && declared > maxBytes) {
		throw new Error("Request body too large");
	}

	const reader = request.body?.getReader();
	if (!reader) return new Uint8Array();

	const chunks: Uint8Array[] = [];
	let size = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > maxBytes) {
			await reader.cancel();
			throw new Error("Request body too large");
		}
		chunks.push(value);
	}

	const body = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return body;
}

/** The depth bound still applies when nulls are kept; nothing else walks the body. */
function checkDepth(value: unknown, depth: number): void {
	if (!value || typeof value !== "object") return;
	if (depth >= MAX_DEPTH) throw new Error("Request body nested too deeply");

	if (Array.isArray(value)) {
		for (const item of value) checkDepth(item, depth + 1);
		return;
	}
	for (const entry of Object.values(value)) checkDepth(entry, depth + 1);
}

function dropNulls(value: unknown, depth: number): void {
	if (!value || typeof value !== "object") return;
	if (depth >= MAX_DEPTH) throw new Error("Request body nested too deeply");

	if (Array.isArray(value)) {
		for (const item of value) dropNulls(item, depth + 1);
		return;
	}

	for (const [key, entry] of Object.entries(value)) {
		if (entry === null) delete (value as Record<string, unknown>)[key];
		else dropNulls(entry, depth + 1);
	}
}
