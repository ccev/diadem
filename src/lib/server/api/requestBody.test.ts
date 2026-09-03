import { describe, expect, it } from "vitest";

import { readRequestBody } from "@/lib/server/api/requestBody";
import { encodeRequestBody } from "@/lib/utils/requests";

function structuredRequest(body: unknown): Request {
	const encoded = encodeRequestBody(body);
	return new Request("http://localhost/api/pokemon", {
		method: "POST",
		body: encoded.body,
		headers: { "Content-Type": encoded.contentType }
	});
}

describe("readRequestBody", () => {
	it("decodes msgpack bodies", async () => {
		const body = await readRequestBody<{ minLat: number }>(structuredRequest({ minLat: 1.5 }));
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

	it("matches JSON serialization semantics", async () => {
		const body = await readRequestBody<{
			missing?: unknown;
			nullValue: null;
			infinite: null;
			items: null[];
		}>(
			structuredRequest({
				missing: undefined,
				nullValue: null,
				infinite: Infinity,
				items: [undefined, NaN]
			})
		);

		expect(body).toEqual({ nullValue: null, infinite: null, items: [null, null] });
	});

	it("keeps explicit nulls in json bodies", async () => {
		const request = new Request("http://localhost/api/pokemon", {
			method: "POST",
			body: JSON.stringify({ filter: null }),
			headers: { "Content-Type": "application/json" }
		});
		expect((await readRequestBody<{ filter: unknown }>(request)).filter).toBeNull();
	});

	it("rejects an oversized declared array without allocating for it", async () => {
		const request = new Request("http://localhost/api/pokemon", {
			method: "POST",
			body: new Uint8Array([0xdd, 0x01, 0xff, 0xff, 0xff]),
			headers: { "Content-Type": "application/msgpack" }
		});
		await expect(readRequestBody(request)).rejects.toThrow(/maxArrayLength/);
	});

	it("rejects an oversized content length", async () => {
		const request = new Request("http://localhost/api/pokemon", {
			method: "POST",
			body: "{}",
			headers: {
				"Content-Length": String(512 * 1024 + 1),
				"Content-Type": "application/json"
			}
		});
		await expect(readRequestBody(request)).rejects.toThrow(/too large/);
	});

	it("refuses an oversized body that declares no length", async () => {
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				for (let i = 0; i < 24; i++) controller.enqueue(new Uint8Array(64 * 1024));
				controller.close();
			}
		});
		const request = new Request("http://localhost/api/pokemon", {
			method: "POST",
			body: stream,
			headers: { "Content-Type": "application/msgpack" },
			duplex: "half"
		} as RequestInit & { duplex: "half" });
		await expect(readRequestBody(request)).rejects.toThrow(/too large/);
	});

	it("rejects a deeply nested json body", async () => {
		const request = new Request("http://localhost/api/pokemon", {
			method: "POST",
			body: `{"filter":${"[".repeat(5000)}${"]".repeat(5000)}}`,
			headers: { "Content-Type": "application/json" }
		});
		await expect(readRequestBody(request)).rejects.toThrow(/nested too deeply/);
	});

	it("rejects a body nested past the depth limit", async () => {
		let nested: unknown = 1;
		for (let i = 0; i < 80; i++) nested = { a: nested };
		await expect(readRequestBody(structuredRequest(nested))).rejects.toThrow(/nested too deeply/);
	});
});
