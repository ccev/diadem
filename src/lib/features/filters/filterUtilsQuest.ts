import * as m from "@/lib/paraglide/messages";

export enum QuestArType {
	AR = "ar",
	NOAR = "noar"
}

export function getAttributeLabelAr(ar: QuestArType | undefined) {
	if (ar === QuestArType.AR) return m.quest_ar_tag();
	if (ar === QuestArType.NOAR) return m.quest_noar_tag();
	return m.both();
}
