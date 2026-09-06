import { decode } from "@msgpack/msgpack";
import { describe, expect, it } from "vitest";

import { respond } from "@/lib/server/api/respond";

describe("respond", () => {
	it("returns JSON by default", async () => {
		const response = respond(new Request("http://localhost/api/config"), { ok: true });

		expect(await response.json()).toEqual({ ok: true });
		expect(response.headers.get("Content-Type")).toBe("application/json");
		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
	});

	it("returns MessagePack when requested", async () => {
		const request = new Request("http://localhost/api/config", {
			headers: { Accept: "application/msgpack, application/json;q=0.9" }
		});
		const response = respond(request, { ok: true, missing: undefined });

		expect(decode(new Uint8Array(await response.arrayBuffer()))).toEqual({ ok: true });
		expect(response.headers.get("Content-Type")).toBe("application/msgpack");
	});

	it("honors media type quality", async () => {
		const request = new Request("http://localhost/api/config", {
			headers: { Accept: "application/msgpack;q=0, application/json" }
		});
		const response = respond(request, { ok: true });

		expect(response.headers.get("Content-Type")).toBe("application/json");
	});

	it("preserves response headers", () => {
		const response = respond(
			new Request("http://localhost/api/config"),
			{},
			{
				headers: { "Cache-Control": "public, max-age=60", Vary: "Origin" }
			}
		);

		expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
		expect(response.headers.get("Vary")).toBe("Origin, Accept");
	});
});
