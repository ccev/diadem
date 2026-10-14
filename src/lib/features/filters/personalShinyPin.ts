import type { FiltersetPokemon } from "@/lib/features/filters/filtersets";

/** The user's trainer, if they have exactly one that finished linking. */
export function onlyLinkedTrainerId(
	trainers: { id: string; status: string }[]
): string | undefined {
	const complete = trainers.filter((trainer) => trainer.status === "complete");
	return complete.length === 1 ? complete[0].id : undefined;
}

/**
 * Pin personal-shiny filtersets that never had a trainer chosen (personalShinyTrainers
 * absent) to `trainerId`. An explicit [] ("all linked trainers") is left alone.
 * Returns how many changed.
 */
export function pinUnchosenFiltersets(filtersets: FiltersetPokemon[], trainerId: string): number {
	let changed = 0;
	for (const filterset of filtersets) {
		if (filterset.personalShiny && filterset.personalShinyTrainers === undefined) {
			filterset.personalShinyTrainers = [trainerId];
			changed++;
		}
	}
	return changed;
}
