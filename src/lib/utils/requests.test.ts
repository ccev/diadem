import { encode } from "@msgpack/msgpack";
import { describe, expect, it } from "vitest";

import { getHeaders, parseResponse } from "@/lib/utils/requests";

describe("request utilities", () => {
	it("only sets Content-Type for requests with a body", () => {
		expect(getHeaders().has("Content-Type")).toBe(false);
		expect(getHeaders("application/msgpack").get("Content-Type")).toBe("application/msgpack");
	});

	it("parses JSON content type parameters", async () => {
		const response = new Response('{"ok":true}', {
			headers: { "Content-Type": "application/json; charset=utf-8" }
		});
		expect(await parseResponse(response)).toEqual({ ok: true });
	});

	it("parses MessagePack content type parameters", async () => {
		const response = new Response(encode({ ok: true }) as BodyInit, {
			headers: { "Content-Type": "application/msgpack; version=1" }
		});
		expect(await parseResponse(response)).toEqual({ ok: true });
	});
});
