import { describe, it, expect } from "vitest";
import { mAny } from "./anyMessage";

describe("mAny", () => {
	it("returns message value for known key", () => {
		expect(mAny("both")).toBe("both");
	});

	it("returns empty string for unknown key", () => {
		expect(mAny("nonexistent_key_xyz")).toBe("");
	});

	it("returns message value for another known key", () => {
		expect(mAny("xp")).toBe("xp");
	});
});
