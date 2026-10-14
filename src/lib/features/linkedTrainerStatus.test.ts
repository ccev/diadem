import { isLinkPending } from "@/lib/features/linkedTrainerStatus";
import { describe, expect, it } from "vitest";

describe("isLinkPending", () => {
	it("treats end states as finished", () => {
		for (const status of ["complete", "invalid_code", "failed", "expired"])
			expect(isLinkPending(status)).toBe(false);
	});

	it("treats known and unknown in-progress states as pending", () => {
		for (const status of ["queued", "pending", "delayed", "something_new"]) {
			expect(isLinkPending(status)).toBe(true);
		}
	});
});
