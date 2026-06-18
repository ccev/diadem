export type MinMax = { min: number; max: number };

/** A single alert rule. Lean, self-contained — NOT the map-filter Filterset. */
export type PushAlertRule = {
	id: string;
	enabled: boolean;
	name?: string;
	pokemon?: { pokemon_id: number; form?: number }[];
	iv?: MinMax;
	level?: MinMax;
	cp?: MinMax;
	size?: MinMax;
	gender?: number[];
};
