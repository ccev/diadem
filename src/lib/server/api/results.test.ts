import { describe, it, expect } from "vitest";
import { result } from "./results";

describe("result", () => {
	it("returns undefined result and error by default", () => {
		expect(result()).toEqual({ result: undefined, error: undefined });
	});

	it("returns provided result", () => {
		expect(result({ data: 1 })).toEqual({ result: { data: 1 }, error: undefined });
	});

	it("returns provided error", () => {
		expect(result(undefined, "fail")).toEqual({ result: undefined, error: "fail" });
	});

	it("returns both result and error", () => {
		expect(result([1, 2], "partial")).toEqual({ result: [1, 2], error: "partial" });
	});
});
