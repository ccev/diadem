import type {
	FiltersetInvasion,
	FiltersetMaxBattle,
	FiltersetPokemon,
	FiltersetQuest,
	FiltersetRaid
} from "@/lib/features/filters/filtersets";

export type { MinMax } from "@/lib/features/filters/filtersets";

/** Per-category push alert rules. Reuses the app's filterset shapes (same as
 *  map filters) but stored separately under user.pushAlerts. */
export type PushAlertRules = {
	pokemon: FiltersetPokemon[];
	raid: FiltersetRaid[];
	quest: FiltersetQuest[];
	invasion: FiltersetInvasion[];
	maxBattle: FiltersetMaxBattle[];
};

export type PushAlertCategory = keyof PushAlertRules;

export function emptyPushAlertRules(): PushAlertRules {
	return { pokemon: [], raid: [], quest: [], invasion: [], maxBattle: [] };
}
