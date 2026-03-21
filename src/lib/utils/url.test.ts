import { describe, it, expect } from "vitest";
import { buildUrl } from "./url";

describe("buildUrl", () => {
	it("builds a simple URL with no options", () => {
		const url = buildUrl("https://example.com");
		expect(url.toString()).toBe("https://example.com/");
	});

	it("strips trailing slashes from base", () => {
		const url = buildUrl("https://example.com///");
		expect(url.toString()).toBe("https://example.com/");
	});

	it("appends a path", () => {
		const url = buildUrl("https://example.com", { path: "/api/v1" });
		expect(url.pathname).toBe("/api/v1");
	});

	it("handles path without leading slash", () => {
		const url = buildUrl("https://example.com", { path: "api/v1" });
		expect(url.pathname).toBe("/api/v1");
	});

	it("strips trailing slashes from path", () => {
		const url = buildUrl("https://example.com", { path: "/api/" });
		expect(url.pathname).toBe("/api");
	});

	it("adds query params", () => {
		const url = buildUrl("https://example.com", {
			params: { key: "value", num: 42 }
		});
		expect(url.searchParams.get("key")).toBe("value");
		expect(url.searchParams.get("num")).toBe("42");
	});

	it("combines base, path, and params", () => {
		const url = buildUrl("https://example.com/", {
			path: "api/search",
			params: { q: "test" }
		});
		expect(url.pathname).toBe("/api/search");
		expect(url.searchParams.get("q")).toBe("test");
	});
});
