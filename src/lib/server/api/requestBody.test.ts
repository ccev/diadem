import { encode } from "@msgpack/msgpack";
import { describe, expect, it } from "vitest";

import { readRequestBody } from "@/lib/server/api/requestBody";

function msgpackRequest(body: unknown, options?: { ignoreUndefined?: boolean }): Request {
	return new Request("http://localhost/api/pokemon", {
		method: "POST",
		body: encode(body, options) as unknown as BodyInit,
		headers: { "Content-Type": "application/msgpack" }
	});
}

describe("readRequestBody", () => {
	it("decodes msgpack bodies", async () => {
		const body = await readRequestBody<{ minLat: number }>(msgpackRequest({ minLat: 1.5 }));
		expect(body.minLat).toBe(1.5);
	});

	it("decodes json bodies", async () => {
		const request = new Request("http://localhost/api/pokemon", {
			method: "POST",
			body: JSON.stringify({ minLat: 1.5 }),
			headers: { "Content-Type": "application/json" }
		});
		expect((await readRequestBody<{ minLat: number }>(request)).minLat).toBe(1.5);
	});

	// msgpack has no undefined: an absent optional field encodes as nil and decodes
	// to null, which passes `since !== undefined` and appends `updated > NULL` to the
	// query — matching no rows at all.
	it("drops nulls so absent optionals stay undefined", async () => {
		const request = msgpackRequest({ minLat: 1, since: undefined, filter: undefined });
		const body = await readRequestBody<{ since?: number; filter?: unknown }>(request);

		expect(body.since).toBeUndefined();
		expect(body.filter).toBeUndefined();
		expect("since" in body).toBe(false);
	});

	it("drops nulls nested in arrays and objects", async () => {
		const request = msgpackRequest({ subs: [{ type: "pokemon", since: undefined }] });
		const body = await readRequestBody<{ subs: { since?: number }[] }>(request);

		expect(body.subs[0]!.since).toBeUndefined();
		expect("since" in body.subs[0]!).toBe(false);
	});

	it("keeps a real since value", async () => {
		const request = msgpackRequest({ since: 1700000000 }, { ignoreUndefined: true });
		expect((await readRequestBody<{ since?: number }>(request)).since).toBe(1700000000);
	});

	it("keeps explicit nulls in json bodies", async () => {
		const request = new Request("http://localhost/api/pokemon", {
			method: "POST",
			body: JSON.stringify({ filter: null }),
			headers: { "Content-Type": "application/json" }
		});
		expect((await readRequestBody<{ filter: unknown }>(request)).filter).toBeNull();
	});

	// A five-byte body declaring a 33M-element array allocated ~257 MB before
	// failing, because msgpack sizes the collection before reading any element.
	it("rejects an oversized declared length without allocating for it", async () => {
		const request = new Request("http://localhost/api/pokemon", {
			method: "POST",
			body: new Uint8Array([0xdd, 0x01, 0xff, 0xff, 0xff]),
			headers: { "Content-Type": "application/msgpack" }
		});
		await expect(readRequestBody(request)).rejects.toThrow(/maxArrayLength/);
	});

	// Checking a size after arrayBuffer() would be too late, and Content-Length is
	// absent on a chunked body, so the stream itself is what has to be bounded.
	it("refuses an oversized body that declares no length", async () => {
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				// Several chunks past the cap, so it has to trip mid-read rather than
				// on a declared length.
				for (let i = 0; i < 24; i++) controller.enqueue(new Uint8Array(64 * 1024));
				controller.close();
			}
		});
		const request = new Request("http://localhost/api/pokemon", {
			method: "POST",
			body: stream,
			headers: { "Content-Type": "application/msgpack" },
			// Required by fetch for a stream body, and absent from the DOM types.
			duplex: "half"
		} as RequestInit & { duplex: "half" });
		await expect(readRequestBody(request)).rejects.toThrow(/too large/);
	});

	// Stored bodies keep their nulls: dropping one silently loses a field the
	// client meant to save, on its way to the database.
	it("keeps nulls when asked to", async () => {
		const request = msgpackRequest({ mapStyle: null, isLeftHanded: false });
		const body = await readRequestBody<{ mapStyle: unknown }>(request, { keepNulls: true });
		expect(body.mapStyle).toBeNull();
	});

	it("still bounds depth when keeping nulls", async () => {
		let nested: unknown = 1;
		for (let i = 0; i < 80; i++) nested = { a: nested };
		await expect(readRequestBody(msgpackRequest(nested), { keepNulls: true })).rejects.toThrow(
			/nested too deeply/
		);
	});

	// JSON.parse is iterative and accepts nesting far past anything that later
	// walks the result — stableStringify and JSON.stringify both recurse — so the
	// depth bound has to apply to this path too, not just to msgpack.
	it("rejects a deeply nested json body", async () => {
		const request = new Request("http://localhost/api/pokemon", {
			method: "POST",
			body: `{"filter":${"[".repeat(5000)}${"]".repeat(5000)}}`,
			headers: { "Content-Type": "application/json" }
		});
		await expect(readRequestBody(request)).rejects.toThrow(/nested too deeply/);
	});

	it("rejects a body nested past the depth limit", async () => {
		// Below the encoder's own depth cap of 100, above the reader's limit of 64.
		let nested: unknown = 1;
		for (let i = 0; i < 80; i++) nested = { a: nested };
		await expect(readRequestBody(msgpackRequest(nested))).rejects.toThrow(/nested too deeply/);
	});
});
