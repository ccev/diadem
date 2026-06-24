import { describe, it, expect } from "vitest";
import { computeVersion, toSemver } from "./set-version.mjs";

// Minimal build.gradle snippet with the two version lines + a sibling line we
// assert is left untouched.
const gradle = (name, code) => `
    defaultConfig {
        applicationId "ee.malt.diadem"
        versionCode ${code}
        versionName "${name}"
    }
`;

describe("computeVersion", () => {
	it("auto-bumps the last component and increments versionCode", () => {
		const r = computeVersion(gradle("0.2", 2));
		expect(r).toMatchObject({ oldName: "0.2", oldCode: 2, newName: "0.3", newCode: 3 });
		expect(r.newSrc).toContain('versionName "0.3"');
		expect(r.newSrc).toContain("versionCode 3");
	});

	it("auto-bumps a multi-part version, carrying double digits", () => {
		expect(computeVersion(gradle("1.2.9", 9)).newName).toBe("1.2.10");
	});

	it("uses an explicit override but still increments versionCode", () => {
		const r = computeVersion(gradle("0.2", 2), "1.0");
		expect(r.newName).toBe("1.0");
		expect(r.newCode).toBe(3);
	});

	it("trims whitespace around an override", () => {
		expect(computeVersion(gradle("0.2", 2), "  1.5  ").newName).toBe("1.5");
	});

	it("treats a blank override as auto-bump (the CI 'leave blank' case)", () => {
		expect(computeVersion(gradle("0.2", 2), "").newName).toBe("0.3");
	});

	it("throws when auto-bumping a non-numeric last component", () => {
		expect(() => computeVersion(gradle("1.x", 2))).toThrow(/non-numeric/);
	});

	it("throws when the version fields are missing", () => {
		expect(() => computeVersion("android {}")).toThrow(/Could not find/);
	});

	it("only rewrites the version lines, leaving the rest intact", () => {
		const r = computeVersion(gradle("0.2", 2));
		expect(r.newSrc).toContain('applicationId "ee.malt.diadem"');
	});
});

describe("toSemver (package.json sync)", () => {
	it("pads a two-part version", () => {
		expect(toSemver("0.3")).toBe("0.3.0");
	});
	it("pads a one-part version", () => {
		expect(toSemver("1")).toBe("1.0.0");
	});
	it("leaves a full semver untouched", () => {
		expect(toSemver("1.2.3")).toBe("1.2.3");
	});
});
