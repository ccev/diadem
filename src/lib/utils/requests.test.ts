import { encode } from "@msgpack/msgpack";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clientConfig = vi.hoisted(() => ({
	general: { msgpack: undefined as boolean | undefined }
}));
vi.mock("@/lib/services/config/config", () => ({ getConfig: () => clientConfig }));
vi.mock("@/lib/native/runtime", () => ({ isNative: () => false }));

import { encodeRequestBody, getHeaders, parseResponse } from "@/lib/utils/requests";

describe("request utilities", () => {
	beforeEach(() => {
		clientConfig.general.msgpack = undefined;
	});

	it("only sets Content-Type for requests with a body", () => {
		expect(getHeaders().has("Content-Type")).toBe(false);
		expect(getHeaders("application/msgpack").get("Content-Type")).toBe("application/msgpack");
	});

	it("prefers msgpack by default and sends msgpack bodies", () => {
		expect(getHeaders().get("Accept")).toBe("application/msgpack, application/json;q=0.9");
		expect(encodeRequestBody({ ok: true }).contentType).toBe("application/msgpack");
	});

	it("uses JSON in both directions when client.general.msgpack is false", () => {
		clientConfig.general.msgpack = false;
		expect(getHeaders().get("Accept")).toBe("application/json");
		const encoded = encodeRequestBody({ ok: true });
		expect(encoded.contentType).toBe("application/json");
		expect(encoded.body).toBe('{"ok":true}');
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
