import type { UiconSet } from "@/lib/services/config/configTypes";
import type {
	BaseFilterset,
	FiltersetInvasion,
	FiltersetModifiers,
	FiltersetPokemon,
	FiltersetQuest,
	FiltersetRaid
} from "@/lib/features/filters/filtersets";
import type { getModifiers } from "@/lib/map/modifierLayout";
import type { MapObjectFeature } from "./featureBuilders";

export type RenderContext = {
	styles: CSSStyleDeclaration;
	timestamp: number;
	selectedScale: number;
	isSelectedOverwrite: boolean;
	isSelected: boolean;
	modifiers: ReturnType<typeof getModifiers>;
	userIconSet: UiconSet | undefined;
	pokemonFiltersets: FiltersetPokemon[];
	raidFiltersets: FiltersetRaid[];
	questFiltersets: FiltersetQuest[];
	invasionFiltersets: FiltersetInvasion[];
	showAllPokestops: boolean;
	showLures: boolean;
	showQuests: boolean;
	showInvasions: boolean;
	showAllGyms: boolean;
};

export type RenderResult = {
	subFeatures: MapObjectFeature[];
	showThis: boolean;
	expires: number | null;
	overwriteIcon?: string;
	iconFiltersetModifiers?: FiltersetModifiers;
	matchedFiltersetIcon?: BaseFilterset["icon"];
	pokemonRenderStateKey?: string;
};
