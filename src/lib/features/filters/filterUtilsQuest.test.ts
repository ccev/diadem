import { describe, it, expect } from "vitest";
import { getAttributeLabelAr, QuestArType } from "./filterUtilsQuest";

describe("getAttributeLabelAr", () => {
	it("returns quest_ar_tag for AR", () => {
		expect(getAttributeLabelAr(QuestArType.AR)).toBe("quest_ar_tag");
	});

	it("returns quest_noar_tag for NOAR", () => {
		expect(getAttributeLabelAr(QuestArType.NOAR)).toBe("quest_noar_tag");
	});

	it("returns both for undefined", () => {
		expect(getAttributeLabelAr(undefined)).toBe("both");
	});
});
