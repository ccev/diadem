import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	parseQuestReward,
	hasFortActiveLure,
	isIncidentInvasion,
	isIncidentGold,
	isIncidentKecleon,
	isIncidentContest,
	RewardType,
	rewardTypeLabel,
	getQuestKey,
	INCIDENT_DISPLAY_GOLD,
	INCIDENT_DISPLAY_KECLEON,
	INCIDENT_DISPLAY_CONTEST
} from "./pokestopUtils";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import type { Incident } from "@/lib/types/mapObjectData/pokestop";

const mockTimestamp = vi.mocked(currentTimestamp);

function makeIncident(overrides: Partial<Incident> = {}): Incident {
	return {
		id: "inc-1",
		pokestop_id: "stop-1",
		start: 0,
		expiration: 9999999999,
		display_type: 1,
		style: 0,
		character: 1,
		updated: 0,
		confirmed: false,
		...overrides
	};
}

describe("parseQuestReward", () => {
	it("returns undefined for empty array", () => {
		expect(parseQuestReward("[]")).toBeUndefined();
	});

	it("returns undefined for null/undefined input", () => {
		expect(parseQuestReward(null)).toBeUndefined();
		expect(parseQuestReward(undefined)).toBeUndefined();
	});

	it("parses a stardust reward", () => {
		const reward = JSON.stringify([{ type: 3, info: { amount: 500 } }]);
		const result = parseQuestReward(reward);
		expect(result?.type).toBe(RewardType.STARDUST);
		expect((result?.info as any).amount).toBe(500);
	});

	it("parses a pokemon reward and normalizes form_id to form", () => {
		const reward = JSON.stringify([{
			type: 7,
			info: { pokemon_id: 25, form_id: 808 }
		}]);
		const result = parseQuestReward(reward);
		expect(result?.type).toBe(RewardType.POKEMON);
		// getNormalizedForm returns formId ?? 0 when no master pokemon (mock returns undefined)
		expect((result?.info as any).form).toBe(808);
		expect(result?.info).not.toHaveProperty("form_id");
	});

	it("returns first reward only", () => {
		const reward = JSON.stringify([
			{ type: 3, info: { amount: 100 } },
			{ type: 1, info: { amount: 500 } }
		]);
		const result = parseQuestReward(reward);
		expect(result?.type).toBe(RewardType.STARDUST);
	});
});

describe("hasFortActiveLure", () => {
	beforeEach(() => {
		mockTimestamp.mockReturnValue(1000);
	});

	it("returns truthy when lure is active", () => {
		expect(hasFortActiveLure({ lure_id: 501, lure_expire_timestamp: 1500 })).toBeTruthy();
	});

	it("returns falsy when lure has expired", () => {
		expect(hasFortActiveLure({ lure_id: 501, lure_expire_timestamp: 500 })).toBeFalsy();
	});

	it("returns falsy when no lure_id", () => {
		expect(hasFortActiveLure({ lure_expire_timestamp: 1500 })).toBeFalsy();
	});

	it("returns falsy when no lure_expire_timestamp", () => {
		expect(hasFortActiveLure({ lure_id: 501 })).toBeFalsy();
	});
});

describe("incident type checks", () => {
	it("isIncidentInvasion detects display types 1, 2, 3", () => {
		expect(isIncidentInvasion(makeIncident({ display_type: 1 }))).toBe(true);
		expect(isIncidentInvasion(makeIncident({ display_type: 2 }))).toBe(true);
		expect(isIncidentInvasion(makeIncident({ display_type: 3 }))).toBe(true);
		expect(isIncidentInvasion(makeIncident({ display_type: 7 }))).toBe(false);
		expect(isIncidentInvasion(makeIncident({ display_type: 8 }))).toBe(false);
	});

	it("isIncidentGold detects display type 7", () => {
		expect(isIncidentGold(makeIncident({ display_type: INCIDENT_DISPLAY_GOLD }))).toBe(true);
		expect(isIncidentGold(makeIncident({ display_type: 1 }))).toBe(false);
	});

	it("isIncidentKecleon detects display type 8", () => {
		expect(isIncidentKecleon(makeIncident({ display_type: INCIDENT_DISPLAY_KECLEON }))).toBe(true);
		expect(isIncidentKecleon(makeIncident({ display_type: 1 }))).toBe(false);
	});

	it("isIncidentContest detects display type 9", () => {
		expect(isIncidentContest(makeIncident({ display_type: INCIDENT_DISPLAY_CONTEST }))).toBe(true);
		expect(isIncidentContest(makeIncident({ display_type: 1 }))).toBe(false);
	});
});

describe("rewardTypeLabel", () => {
	it("returns correct labels for all reward types", () => {
		expect(rewardTypeLabel(RewardType.XP)).toBe("xp");
		expect(rewardTypeLabel(RewardType.ITEM)).toBe("items");
		expect(rewardTypeLabel(RewardType.STARDUST)).toBe("stardust");
		expect(rewardTypeLabel(RewardType.CANDY)).toBe("candy");
		expect(rewardTypeLabel(RewardType.AVATAR_CLOTHING)).toBe("reward_avatar_clothing");
		expect(rewardTypeLabel(RewardType.QUEST)).toBe("reward_quest");
		expect(rewardTypeLabel(RewardType.POKEMON)).toBe("pogo_pokemon");
		expect(rewardTypeLabel(RewardType.POKECOINS)).toBe("reward_pokecoins");
		expect(rewardTypeLabel(RewardType.XL_CANDY)).toBe("xl_candy");
		expect(rewardTypeLabel(RewardType.LEVEL_CAP)).toBe("reward_level_cap");
		expect(rewardTypeLabel(RewardType.STICKER)).toBe("reward_sticker");
		expect(rewardTypeLabel(RewardType.MEGA_ENERGY)).toBe("mega_energy");
		expect(rewardTypeLabel(RewardType.INCIDENT)).toBe("reward_incident");
		expect(rewardTypeLabel(RewardType.PLAYER_ATTRIBUTE)).toBe("reward_player_attribute");
		expect(rewardTypeLabel(RewardType.EVENT_BADGE)).toBe("reward_event_badge");
		expect(rewardTypeLabel(RewardType.POKEMON_EGG)).toBe("reward_egg");
	});

	it("returns empty string for unknown type", () => {
		expect(rewardTypeLabel(99 as any)).toBe("");
	});
});

describe("getQuestKey", () => {
	it("creates a slash-separated key", () => {
		expect(getQuestKey("reward-data", "catch_pokemon", 5)).toBe("reward-data/catch_pokemon/5");
	});
});

describe("RewardType enum", () => {
	it("has correct values", () => {
		expect(RewardType.XP).toBe(1);
		expect(RewardType.ITEM).toBe(2);
		expect(RewardType.STARDUST).toBe(3);
		expect(RewardType.CANDY).toBe(4);
		expect(RewardType.POKEMON).toBe(7);
		expect(RewardType.XL_CANDY).toBe(9);
		expect(RewardType.MEGA_ENERGY).toBe(12);
		expect(RewardType.POKEMON_EGG).toBe(16);
	});
});

// --- Display Logic Tests ---

import {
	getRewardText,
	getContestText,
	getContestIcon,
	shouldDisplayQuest,
	shouldDisplayIncidient,
	shouldDisplayLure,
	shouldDisplayContest,
	getDefaultPokestopFilter
} from "./pokestopUtils";

describe("getContestIcon", () => {
	it("returns pokemon icon for pokemon focus", () => {
		expect(getContestIcon({ type: "pokemon", pokemon_id: 25, pokemon_form: 0 })).toBe("icon-pokemon");
	});

	it("returns type icon for type focus", () => {
		expect(getContestIcon({ type: "type", pokemon_type_1: 10 })).toBe("icon-type");
	});

	it("returns default contest icon for undefined focus", () => {
		expect(getContestIcon(undefined)).toBe("icon-contest");
	});

	it("returns default contest icon for non-pokemon/type focus", () => {
		expect(getContestIcon({ type: "buddy", min_level: 3 } as any)).toBe("icon-contest");
	});
});
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { isCurrentSelectedOverwrite } from "@/lib/mapObjects/currentSelectedState.svelte";
import { getActiveSearch } from "@/lib/features/activeSearch.svelte";
import { QuestArType } from "@/lib/features/filters/filterUtilsQuest";
import type { PokestopData, QuestReward } from "@/lib/types/mapObjectData/pokestop";
import type { FilterPokestop } from "@/lib/features/filters/filters";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

const mockGetUserSettings = vi.mocked(getUserSettings);
const mockIsOverwrite = vi.mocked(isCurrentSelectedOverwrite);
const mockGetActiveSearch = vi.mocked(getActiveSearch);

function makePokestopData(overrides: Partial<PokestopData> = {}): PokestopData {
	return {
		id: "stop-1",
		mapId: "pokestop-stop-1",
		type: MapObjectType.POKESTOP,
		lat: 0,
		lon: 0,
		incident: [],
		updated: 1000,
		deleted: 0,
		first_seen_timestamp: 0,
		...overrides
	};
}

function makeFilterPokestop(overrides: Partial<FilterPokestop> = {}): FilterPokestop {
	return {
		category: "pokestop",
		enabled: true,
		filters: [] as never[],
		pokestopPlain: { category: "pokestopPlain", enabled: true, filters: [] },
		quest: { category: "quest", enabled: true, filters: [] },
		invasion: { category: "invasion", enabled: true, filters: [] },
		contest: { category: "contest", enabled: true, filters: [] },
		kecleon: { category: "kecleon", enabled: true, filters: [] as never[] },
		goldPokestop: { category: "goldPokestop", enabled: true, filters: [] as never[] },
		lure: { category: "lure", enabled: true, filters: [] },
		...overrides
	} as FilterPokestop;
}

function setFilters(pokestop: Partial<FilterPokestop>) {
	const filter = makeFilterPokestop(pokestop);
	mockGetUserSettings.mockReturnValue({ filters: { pokestop: filter } } as any);
}

describe("getRewardText", () => {
	it("returns XP text with amount", () => {
		const result = getRewardText({ type: 1, info: { amount: 500 } } as QuestReward);
		expect(result).toContain("500");
	});

	it("returns XP label when no amount", () => {
		const result = getRewardText({ type: 1, info: { amount: 0 } } as QuestReward);
		expect(result).toBe("xp");
	});

	it("returns item text with amount", () => {
		const result = getRewardText({ type: 2, info: { item_id: 1, amount: 3 } } as QuestReward);
		expect(result).toContain("3");
	});

	it("returns item name when no amount", () => {
		const result = getRewardText({ type: 2, info: { item_id: 1, amount: 0 } } as QuestReward);
		expect(result).toContain("item:1");
	});

	it("returns stardust text with amount", () => {
		const result = getRewardText({ type: 3, info: { amount: 1000 } } as QuestReward);
		expect(result).toContain("1000");
	});

	it("returns stardust label when no amount", () => {
		const result = getRewardText({ type: 3, info: { amount: 0 } } as QuestReward);
		expect(result).toBe("stardust");
	});

	it("returns candy text with pokemon name", () => {
		const result = getRewardText({ type: 4, info: { amount: 5, pokemon_id: 25 } } as QuestReward);
		expect(result).toContain("5");
	});

	it("returns candy label when no amount", () => {
		const result = getRewardText({ type: 4, info: { amount: 0, pokemon_id: 25 } } as QuestReward);
		expect(result).toContain("pokemon:25");
	});

	it("returns pokemon name for pokemon reward", () => {
		const result = getRewardText({ type: 7, info: { pokemon_id: 150, form: 0 } } as QuestReward);
		expect(result).toBe("pokemon:150:0");
	});

	it("returns XL candy text with amount", () => {
		const result = getRewardText({ type: 9, info: { amount: 3, pokemon_id: 25 } } as QuestReward);
		expect(result).toContain("3");
	});

	it("returns XL candy label when no amount", () => {
		const result = getRewardText({ type: 9, info: { amount: 0, pokemon_id: 25 } } as QuestReward);
		expect(result).toContain("pokemon:25");
	});

	it("returns mega energy text with amount", () => {
		const result = getRewardText({ type: 12, info: { amount: 50, pokemon_id: 3 } } as QuestReward);
		expect(result).toContain("50");
	});

	it("returns mega energy label when no amount", () => {
		const result = getRewardText({ type: 12, info: { amount: 0, pokemon_id: 3 } } as QuestReward);
		expect(result).toContain("pokemon:3");
	});

	it("returns reward type label for unknown types", () => {
		const result = getRewardText({ type: 5, info: {} } as QuestReward);
		expect(result).toBe("reward_avatar_clothing");
	});
});

describe("getContestText", () => {
	it("returns biggest metric by default (rankingStandard != 1)", () => {
		const result = getContestText(0, { type: "pokemon", pokemon_id: 25 });
		expect(result).toContain("pokemon:25");
	});

	it("returns smallest metric when rankingStandard is 1", () => {
		const result = getContestText(1, { type: "pokemon", pokemon_id: 25 });
		expect(result).toContain("pokemon:25");
	});

	it("returns metric with empty name when focus is falsy", () => {
		const result = getContestText(0, undefined as any);
		expect(typeof result).toBe("string");
	});

	it("handles type focus with single type", () => {
		const result = getContestText(0, { type: "type", pokemon_type_1: 10 });
		expect(result).toContain("type:10");
	});

	it("handles type focus with dual types", () => {
		const result = getContestText(0, { type: "type", pokemon_type_1: 10, pokemon_type_2: 11 });
		expect(result).toContain("type:10");
		expect(result).toContain("type:11");
	});

	it("handles buddy focus", () => {
		const result = getContestText(0, { type: "buddy", min_level: 3 });
		expect(result).toContain("3");
	});

	it("handles alignment focus", () => {
		const result = getContestText(0, { type: "alignment", pokemon_alignment: 2 });
		expect(result).toContain("alignment:2");
	});

	it("handles class focus", () => {
		const result = getContestText(0, { type: "class", pokemon_class: 1 });
		expect(typeof result).toBe("string");
	});

	it("handles family focus", () => {
		const result = getContestText(0, { type: "family", pokemon_family: 1 });
		expect(result).toContain("pokemon:1");
	});

	it("handles generation focus", () => {
		const result = getContestText(0, { type: "generation", generation: 3 });
		expect(result).toContain("gen:3");
	});

	it("handles hatched focus (true)", () => {
		const result = getContestText(0, { type: "hatched", hatched: true });
		expect(result).toContain("contest_hatched");
	});

	it("handles hatched focus (false)", () => {
		const result = getContestText(0, { type: "hatched", hatched: false });
		expect(result).toContain("contest_not_hatched");
	});

	it("handles mega focus (restriction 1)", () => {
		const result = getContestText(0, { type: "mega", temp_evolution: 1, restriction: 1 });
		expect(result).toContain("contest_mega_evolution");
	});

	it("handles mega focus (not mega)", () => {
		const result = getContestText(0, { type: "mega", temp_evolution: 0, restriction: 0 });
		expect(result).toContain("contest_not_mega_evolution");
	});

	it("handles shiny focus (true)", () => {
		const result = getContestText(0, { type: "shiny", shiny: true });
		expect(result).toContain("contest_shiny");
	});

	it("handles shiny focus (false)", () => {
		const result = getContestText(0, { type: "shiny", shiny: false });
		expect(result).toContain("contest_not_shiny");
	});
});

describe("shouldDisplayQuest", () => {
	beforeEach(() => {
		mockTimestamp.mockReturnValue(1000);
		mockIsOverwrite.mockReturnValue(false);
		mockGetActiveSearch.mockReturnValue(undefined);
		setFilters({});
	});

	const reward: QuestReward = { type: 3, info: { amount: 500 } } as QuestReward;

	it("returns true when current selected overwrite", () => {
		mockIsOverwrite.mockReturnValue(true);
		expect(shouldDisplayQuest(reward, "task", 1, false, makePokestopData())).toBe(true);
	});

	it("returns false when pokestop filter disabled", () => {
		setFilters({ enabled: false });
		expect(shouldDisplayQuest(reward, "task", 1, false, makePokestopData())).toBe(false);
	});

	it("returns false when quest sub-filter disabled", () => {
		setFilters({ quest: { category: "quest", enabled: false, filters: [] } });
		expect(shouldDisplayQuest(reward, "task", 1, false, makePokestopData())).toBe(false);
	});

	it("returns true when no enabled filters (show all)", () => {
		setFilters({ quest: { category: "quest", enabled: true, filters: [] } });
		expect(shouldDisplayQuest(reward, "task", 1, false, makePokestopData())).toBe(true);
	});

	it("matches stardust reward filter", () => {
		setFilters({
			quest: {
				category: "quest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					stardust: { min: 100, max: 1000 }
				}]
			}
		});
		expect(shouldDisplayQuest(reward, "task", 1, false, makePokestopData())).toBe(true);
	});

	it("rejects stardust reward outside range", () => {
		setFilters({
			quest: {
				category: "quest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					stardust: { min: 600, max: 1000 }
				}]
			}
		});
		expect(shouldDisplayQuest(reward, "task", 1, false, makePokestopData())).toBe(false);
	});

	it("matches XP reward filter", () => {
		const xpReward: QuestReward = { type: 1, info: { amount: 200 } } as QuestReward;
		setFilters({
			quest: {
				category: "quest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					xp: { min: 100, max: 500 }
				}]
			}
		});
		expect(shouldDisplayQuest(xpReward, "task", 1, false, makePokestopData())).toBe(true);
	});

	it("matches pokemon reward filter", () => {
		const pokemonReward: QuestReward = { type: 7, info: { pokemon_id: 25, form: 0 } } as QuestReward;
		setFilters({
			quest: {
				category: "quest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					pokemon: [{ pokemon_id: 25, form: 0 }]
				}]
			}
		});
		expect(shouldDisplayQuest(pokemonReward, "task", 1, false, makePokestopData())).toBe(true);
	});

	it("rejects pokemon reward when pokemon_id doesn't match", () => {
		const pokemonReward: QuestReward = { type: 7, info: { pokemon_id: 25, form: 0 } } as QuestReward;
		setFilters({
			quest: {
				category: "quest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					pokemon: [{ pokemon_id: 150, form: 0 }]
				}]
			}
		});
		expect(shouldDisplayQuest(pokemonReward, "task", 1, false, makePokestopData())).toBe(false);
	});

	it("matches item reward filter by id", () => {
		const itemReward: QuestReward = { type: 2, info: { item_id: 1, amount: 5 } } as QuestReward;
		setFilters({
			quest: {
				category: "quest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					item: [{ id: "1" }]
				}]
			}
		});
		expect(shouldDisplayQuest(itemReward, "task", 1, false, makePokestopData())).toBe(true);
	});

	it("matches item reward filter by amount", () => {
		const itemReward: QuestReward = { type: 2, info: { item_id: 1, amount: 5 } } as QuestReward;
		setFilters({
			quest: {
				category: "quest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					item: [{ id: "99", amount: 5 }]
				}]
			}
		});
		expect(shouldDisplayQuest(itemReward, "task", 1, false, makePokestopData())).toBe(true);
	});

	it("matches mega resource filter", () => {
		const megaReward: QuestReward = { type: 12, info: { pokemon_id: 3, amount: 50 } } as QuestReward;
		setFilters({
			quest: {
				category: "quest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					megaResource: [{ id: "3" }]
				}]
			}
		});
		expect(shouldDisplayQuest(megaReward, "task", 1, false, makePokestopData())).toBe(true);
	});

	it("matches candy filter", () => {
		const candyReward: QuestReward = { type: 4, info: { pokemon_id: 25, amount: 3 } } as QuestReward;
		setFilters({
			quest: {
				category: "quest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					candy: [{ id: "25" }]
				}]
			}
		});
		expect(shouldDisplayQuest(candyReward, "task", 1, false, makePokestopData())).toBe(true);
	});

	it("matches XL candy filter", () => {
		const xlReward: QuestReward = { type: 9, info: { pokemon_id: 25, amount: 1 } } as QuestReward;
		setFilters({
			quest: {
				category: "quest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					xlCandy: [{ id: "25" }]
				}]
			}
		});
		expect(shouldDisplayQuest(xlReward, "task", 1, false, makePokestopData())).toBe(true);
	});

	it("respects AR filter (AR only, quest is not AR)", () => {
		setFilters({
			quest: {
				category: "quest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					ar: QuestArType.AR,
					stardust: { min: 0, max: 9999 }
				}]
			}
		});
		expect(shouldDisplayQuest(reward, "task", 1, false, makePokestopData())).toBe(false);
	});

	it("respects AR filter (AR only, quest is AR)", () => {
		setFilters({
			quest: {
				category: "quest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					ar: QuestArType.AR,
					stardust: { min: 0, max: 9999 }
				}]
			}
		});
		expect(shouldDisplayQuest(reward, "task", 1, true, makePokestopData())).toBe(true);
	});

	it("respects NOAR filter", () => {
		setFilters({
			quest: {
				category: "quest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					ar: QuestArType.NOAR,
					stardust: { min: 0, max: 9999 }
				}]
			}
		});
		// quest IS AR, filter says NOAR only → skip
		expect(shouldDisplayQuest(reward, "task", 1, true, makePokestopData())).toBe(false);
	});

	it("respects task filter", () => {
		setFilters({
			quest: {
				category: "quest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					tasks: [{ title: "catch_pokemon", target: 5 }],
					stardust: { min: 0, max: 9999 }
				}]
			}
		});
		expect(shouldDisplayQuest(reward, "catch_pokemon", 5, false, makePokestopData())).toBe(true);
		expect(shouldDisplayQuest(reward, "wrong_task", 5, false, makePokestopData())).toBe(false);
	});

	it("uses active search filter when active", () => {
		const searchFilter = makeFilterPokestop({
			enabled: true,
			quest: { category: "quest", enabled: false, filters: [] }
		});
		mockGetActiveSearch.mockReturnValue({
			mapObject: MapObjectType.POKESTOP,
			filter: searchFilter,
			entries: []
		} as any);
		expect(shouldDisplayQuest(reward, "task", 1, false, makePokestopData())).toBe(false);
	});
});

describe("shouldDisplayIncidient", () => {
	beforeEach(() => {
		mockTimestamp.mockReturnValue(1000);
		mockIsOverwrite.mockReturnValue(false);
		mockGetActiveSearch.mockReturnValue(undefined);
		setFilters({});
	});

	it("returns false when incident is expired", () => {
		const incident = makeIncident({ expiration: 500 });
		expect(shouldDisplayIncidient(incident, makePokestopData())).toBe(false);
	});

	it("returns true when current selected overwrite", () => {
		mockIsOverwrite.mockReturnValue(true);
		const incident = makeIncident({ expiration: 2000 });
		expect(shouldDisplayIncidient(incident, makePokestopData())).toBe(true);
	});

	it("returns false when pokestop filter disabled", () => {
		setFilters({ enabled: false });
		const incident = makeIncident({ expiration: 2000 });
		expect(shouldDisplayIncidient(incident, makePokestopData())).toBe(false);
	});

	it("returns true for gold pokestop when goldPokestop enabled", () => {
		setFilters({ goldPokestop: { category: "goldPokestop", enabled: true, filters: [] as never[] } });
		const incident = makeIncident({ expiration: 2000, display_type: INCIDENT_DISPLAY_GOLD });
		expect(shouldDisplayIncidient(incident, makePokestopData())).toBe(true);
	});

	it("returns false for gold pokestop when goldPokestop disabled", () => {
		setFilters({ goldPokestop: { category: "goldPokestop", enabled: false, filters: [] as never[] } });
		const incident = makeIncident({ expiration: 2000, display_type: INCIDENT_DISPLAY_GOLD });
		// Still might match other filters, but gold specifically is disabled
		// The invasion filter is enabled by default but display_type 7 is not an invasion
		expect(shouldDisplayIncidient(incident, makePokestopData())).toBe(false);
	});

	it("returns true for kecleon when kecleon enabled", () => {
		const incident = makeIncident({ expiration: 2000, display_type: INCIDENT_DISPLAY_KECLEON });
		expect(shouldDisplayIncidient(incident, makePokestopData())).toBe(true);
	});

	it("returns true for invasion with no character filters", () => {
		const incident = makeIncident({ expiration: 2000, display_type: 1, character: 10 });
		setFilters({ invasion: { category: "invasion", enabled: true, filters: [] } });
		expect(shouldDisplayIncidient(incident, makePokestopData())).toBe(true);
	});

	it("returns true for invasion matching character filter", () => {
		const incident = makeIncident({ expiration: 2000, display_type: 1, character: 10 });
		setFilters({
			invasion: {
				category: "invasion",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					characters: [10, 20]
				}]
			}
		});
		expect(shouldDisplayIncidient(incident, makePokestopData())).toBe(true);
	});

	it("returns false for invasion not matching character filter", () => {
		const incident = makeIncident({ expiration: 2000, display_type: 1, character: 30 });
		setFilters({
			invasion: {
				category: "invasion",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					characters: [10, 20]
				}]
			}
		});
		expect(shouldDisplayIncidient(incident, makePokestopData())).toBe(false);
	});

	it("returns false for invasion when invasion disabled", () => {
		const incident = makeIncident({ expiration: 2000, display_type: 1 });
		setFilters({ invasion: { category: "invasion", enabled: false, filters: [] } });
		expect(shouldDisplayIncidient(incident, makePokestopData())).toBe(false);
	});

	it("returns false for unknown display type when nothing matches", () => {
		const incident = makeIncident({ expiration: 2000, display_type: 99 });
		expect(shouldDisplayIncidient(incident, makePokestopData())).toBe(false);
	});

	it("returns true for contest when contest enabled and showcase active", () => {
		setFilters({ contest: { category: "contest", enabled: true, filters: [] } });
		const incident = makeIncident({ expiration: 2000, display_type: INCIDENT_DISPLAY_CONTEST });
		expect(shouldDisplayIncidient(incident, makePokestopData({ showcase_expiry: 2000 }))).toBe(true);
	});

	it("returns false for contest when contest disabled", () => {
		setFilters({ contest: { category: "contest", enabled: false, filters: [] } });
		const incident = makeIncident({ expiration: 2000, display_type: INCIDENT_DISPLAY_CONTEST });
		expect(shouldDisplayIncidient(incident, makePokestopData({ showcase_expiry: 2000 }))).toBe(false);
	});

	it("returns false for contest when showcase expired", () => {
		setFilters({ contest: { category: "contest", enabled: true, filters: [] } });
		const incident = makeIncident({ expiration: 2000, display_type: INCIDENT_DISPLAY_CONTEST });
		expect(shouldDisplayIncidient(incident, makePokestopData({ showcase_expiry: 500 }))).toBe(false);
	});
});

describe("shouldDisplayLure", () => {
	beforeEach(() => {
		mockTimestamp.mockReturnValue(1000);
		mockIsOverwrite.mockReturnValue(false);
		mockGetActiveSearch.mockReturnValue(undefined);
		setFilters({});
	});

	it("returns false when lure is not active", () => {
		expect(shouldDisplayLure(makePokestopData({ lure_id: 501, lure_expire_timestamp: 500 }))).toBe(false);
	});

	it("returns false when no lure_id", () => {
		expect(shouldDisplayLure(makePokestopData({}))).toBe(false);
	});

	it("returns true when current selected overwrite", () => {
		mockIsOverwrite.mockReturnValue(true);
		expect(shouldDisplayLure(makePokestopData({ lure_id: 501, lure_expire_timestamp: 2000 }))).toBe(true);
	});

	it("returns false when pokestop filter disabled", () => {
		setFilters({ enabled: false });
		expect(shouldDisplayLure(makePokestopData({ lure_id: 501, lure_expire_timestamp: 2000 }))).toBe(false);
	});

	it("returns false when lure sub-filter disabled", () => {
		setFilters({ lure: { category: "lure", enabled: false, filters: [] } });
		expect(shouldDisplayLure(makePokestopData({ lure_id: 501, lure_expire_timestamp: 2000 }))).toBe(false);
	});

	it("returns true when no lure filters (show all)", () => {
		setFilters({ lure: { category: "lure", enabled: true, filters: [] } });
		expect(shouldDisplayLure(makePokestopData({ lure_id: 501, lure_expire_timestamp: 2000 }))).toBe(true);
	});

	it("returns true when lure matches filter", () => {
		setFilters({
			lure: {
				category: "lure",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					items: [501, 502]
				}]
			}
		});
		expect(shouldDisplayLure(makePokestopData({ lure_id: 501, lure_expire_timestamp: 2000 }))).toBe(true);
	});

	it("returns false when lure doesn't match filter", () => {
		setFilters({
			lure: {
				category: "lure",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					items: [502, 503]
				}]
			}
		});
		expect(shouldDisplayLure(makePokestopData({ lure_id: 501, lure_expire_timestamp: 2000 }))).toBe(false);
	});
});

describe("shouldDisplayContest", () => {
	beforeEach(() => {
		mockTimestamp.mockReturnValue(1000);
		mockIsOverwrite.mockReturnValue(false);
		mockGetActiveSearch.mockReturnValue(undefined);
		setFilters({});
	});

	it("returns false when contest is expired", () => {
		expect(shouldDisplayContest(makePokestopData({ showcase_expiry: 500 }))).toBe(false);
	});

	it("returns true when current selected overwrite", () => {
		mockIsOverwrite.mockReturnValue(true);
		expect(shouldDisplayContest(makePokestopData({ showcase_expiry: 2000 }))).toBe(true);
	});

	it("returns false when pokestop filter disabled", () => {
		setFilters({ enabled: false });
		expect(shouldDisplayContest(makePokestopData({ showcase_expiry: 2000 }))).toBe(false);
	});

	it("returns false when contest sub-filter disabled", () => {
		setFilters({ contest: { category: "contest", enabled: false, filters: [] } });
		expect(shouldDisplayContest(makePokestopData({ showcase_expiry: 2000 }))).toBe(false);
	});

	it("returns true when no contest filters (show all)", () => {
		setFilters({ contest: { category: "contest", enabled: true, filters: [] } });
		expect(shouldDisplayContest(makePokestopData({ showcase_expiry: 2000 }))).toBe(true);
	});

	it("returns true when all filter criteria match", () => {
		setFilters({
			contest: {
				category: "contest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					rankingStandard: 0,
					focus: { pokemon_id: 25 }
				}]
			}
		});
		expect(shouldDisplayContest(makePokestopData({
			showcase_expiry: 2000,
			showcase_ranking_standard: 0,
			showcase_pokemon_id: 25
		}))).toBe(true);
	});

	it("returns false when ranking standard doesn't match", () => {
		setFilters({
			contest: {
				category: "contest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					rankingStandard: 1,
					focus: {}
				}]
			}
		});
		expect(shouldDisplayContest(makePokestopData({
			showcase_expiry: 2000,
			showcase_ranking_standard: 0
		}))).toBe(false);
	});

	it("returns false when pokemon_id doesn't match", () => {
		setFilters({
			contest: {
				category: "contest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					rankingStandard: 0,
					focus: { pokemon_id: 150 }
				}]
			}
		});
		expect(shouldDisplayContest(makePokestopData({
			showcase_expiry: 2000,
			showcase_ranking_standard: 0,
			showcase_pokemon_id: 25
		}))).toBe(false);
	});

	it("returns false when form doesn't match", () => {
		setFilters({
			contest: {
				category: "contest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					rankingStandard: 0,
					focus: { form: 1 }
				}]
			}
		});
		expect(shouldDisplayContest(makePokestopData({
			showcase_expiry: 2000,
			showcase_ranking_standard: 0,
			showcase_pokemon_form_id: 2
		}))).toBe(false);
	});

	it("returns false when type_id doesn't match", () => {
		setFilters({
			contest: {
				category: "contest",
				enabled: true,
				filters: [{
					id: "f1", title: { message: "" }, enabled: true, icon: { isUserSelected: false },
					rankingStandard: 0,
					focus: { type_id: 10 }
				}]
			}
		});
		expect(shouldDisplayContest(makePokestopData({
			showcase_expiry: 2000,
			showcase_ranking_standard: 0,
			showcase_pokemon_type_id: 11
		}))).toBe(false);
	});
});
