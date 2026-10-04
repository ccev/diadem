import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRenderers, getConfigModifiers, getRenderer } from "@/lib/map/render/renderMapObjects";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { UiconSet } from "@/lib/services/config/configTypes";
import { isFeatureIcon } from "@/lib/map/render/featureTypes";

const state = vi.hoisted(() => ({ scale: 1, showRaid: true, iconSet: {} as UiconSet }));
vi.mock("@/lib/features/filterLogic/gym", () => ({
	shouldDisplayRaid: () => state.showRaid,
	matchRaidFilterset: () => ({ modifiers: { scale: state.scale } })
}));
vi.mock("@/lib/features/filterLogic/nest", () => ({}));
vi.mock("@/lib/features/filterLogic/pokemon", () => ({}));
vi.mock("@/lib/features/filterLogic/pokestop", () => ({}));
vi.mock("@/lib/features/filterLogic/station", () => ({}));
vi.mock("@/lib/features/filters/filtersetUtils.svelte", () => ({}));
vi.mock("@/lib/map/render/modifierBadge", () => ({ getBadgeFeature: () => undefined }));
vi.mock("@/lib/map/render/modifierUnderlay", () => ({ getUnderlayFeature: () => undefined }));
vi.mock("@/lib/services/assets", () => ({ resize: (url: string) => url }));
vi.mock("@/lib/services/uicons.svelte", () => ({
	getCurrentUiconSetDetailsAllTypes: () => ({ gym: state.iconSet }),
	getIconForMap: () => "gym.png",
	getIconGym: () => "neutral.png",
	getIconPokemon: () => "boss.png",
	getIconRaidEgg: () => "egg.png"
}));
vi.mock("@/lib/utils/gymUtils", () => ({
	getActiveGymFilter: () => ({ gymPlain: { enabled: true } }),
	getRaidPokemon: () => ({ pokemon_id: 25 })
}));
vi.mock("@/lib/utils/pokestopUtils", () => ({}));
vi.mock("@/lib/utils/stationUtils", () => ({}));
vi.mock("@/lib/utils/routeUtils", () => ({}));
vi.mock("@/lib/mapObjects/s2cells", () => ({}));
vi.mock("@/lib/services/userSettings.svelte", () => ({}));

const gym = {
	type: MapObjectType.GYM,
	id: "gym",
	mapId: "gym-gym",
	lat: 1,
	lon: 1,
	updated: 2000000000,
	raid_spawn_timestamp: 1,
	raid_end_timestamp: 2000001000,
	availble_slots: 1
} as GymData;
beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(2000000000 * 1000);
	vi.stubGlobal("document", { documentElement: {} });
	vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: () => "" }));
	state.scale = 1;
	state.showRaid = true;
	state.iconSet = {
		base: { scale: 0.5 },
		gym: { scale: 0.8, offsetY: -27 },
		pokemon: { scale: 0.4 },
		raid_pokemon: { scale: 1.6, offsetY: -40 },
		raid_egg: { scale: 0.3, offsetY: -62 }
	} as UiconSet;
	clearRenderers();
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("gym and raid scale", () => {
	it.each([0, 25])("scales the gym and raid together (boss id %s)", (raid_pokemon_id) => {
		state.scale = 1.6;
		const icons = getRenderer(MapObjectType.GYM)
			.render({ ...gym, raid_pokemon_id }, false, false)
			.filter(isFeatureIcon);
		expect(icons.find((f) => f.id === gym.mapId)?.properties.imageSize).toBeCloseTo(0.8 * 1.6);
		const raid = icons.find((f) => String(f.id).endsWith("-1"));
		expect(raid?.properties.imageSize).toBeCloseTo((raid_pokemon_id ? 0.4 * 1.6 : 0.3) * 1.6);
	});
	it("keeps plain gyms at their configured scale", () => {
		state.scale = 1.6;
		state.showRaid = false;
		const [icon] = getRenderer(MapObjectType.GYM).render(gym, false, false).filter(isFeatureIcon);
		expect(icon.properties.imageSize).toBe(0.8);
	});
	it("uses the full-gym boss modifier without requiring an egg override", () => {
		state.iconSet.raid_pokemon_6 = { default: false, scale: 2, offsetY: -90 };
		const icons = getRenderer(MapObjectType.GYM)
			.render({ ...gym, raid_pokemon_id: 25, availble_slots: 0 }, false, false)
			.filter(isFeatureIcon);
		const boss = icons.find((f) => f.id === "gym-gym-raidpokemon-1");
		expect(boss?.properties.imageSize).toBeCloseTo(0.4 * 2);
		expect(boss?.properties.imageOffset).toEqual([0, -117]);
	});
	it.each([undefined, true])("inherits base modifiers when the type is %s", (type) => {
		const set = { base: { scale: 0.7, offsetX: 2, offsetY: 3, spacing: 4 }, gym: type } as UiconSet;
		expect(getConfigModifiers(set, MapObjectType.GYM)).toEqual({
			scale: 0.7,
			offsetX: 2,
			offsetY: 3,
			spacing: 4
		});
	});
});
