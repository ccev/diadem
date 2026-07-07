import { describe, expect, it } from "vitest";
import { parseChangelog } from "./resolve-changelog.mjs";

describe("parseChangelog", () => {
	it("uses an unstructured changelog for both outputs", () => {
		const parsed = parseChangelog("- Fix one\n- Add two");

		expect(parsed.publicBody).toBe("- Fix one\n- Add two");
		expect(parsed.storeBody).toBe("- Fix one\n- Add two");
		expect(parsed.hasPublicSection).toBe(false);
		expect(parsed.hasStoreSection).toBe(false);
	});

	it("splits GitHub/Discord and app-store sections", () => {
		const parsed = parseChangelog(`
## GitHub / Discord

- Detailed release note
- With [links](https://example.com)

## App Stores

Short store changelog.
`);

		expect(parsed.publicBody).toBe("- Detailed release note\n- With [links](https://example.com)");
		expect(parsed.storeBody).toBe("Short store changelog.");
		expect(parsed.hasPublicSection).toBe(true);
		expect(parsed.hasStoreSection).toBe(true);
	});

	it("falls back to public text when the store section is missing", () => {
		const parsed = parseChangelog(`
## Release Notes

- Shared changelog
`);

		expect(parsed.publicBody).toBe("- Shared changelog");
		expect(parsed.storeBody).toBe("- Shared changelog");
	});

	it("parses release and app-store sections", () => {
		const parsed = parseChangelog(`
## Release
- change

## App Stores
- change
`);

		expect(parsed.publicBody).toBe("- change");
		expect(parsed.storeBody).toBe("- change");
		expect(parsed.hasPublicSection).toBe(true);
		expect(parsed.hasStoreSection).toBe(true);
	});

	it("supports multiple matching sections", () => {
		const parsed = parseChangelog(`
## GitHub
One

## App Store
Store one

## GitHub / Discord
Two

## Google Play
Store two
`);

		expect(parsed.publicBody).toBe("One\n\nTwo");
		expect(parsed.storeBody).toBe("Store one\n\nStore two");
	});

	it("stops a section at unrelated headings of the same or higher level", () => {
		const parsed = parseChangelog(`
## GitHub / Discord
Public note

### Detail
Included detail

## Internal Notes
Not included

## App Stores
Store note

## Checklist
Not included either
`);

		expect(parsed.publicBody).toBe("Public note\n\n### Detail\nIncluded detail");
		expect(parsed.storeBody).toBe("Store note");
	});
});
