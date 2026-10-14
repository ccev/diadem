<script lang="ts">
	import ToggleGroup from "@/components/ui/input/selectgroup/ToggleGroup.svelte";
	import SelectGroupItem from "@/components/ui/input/selectgroup/SelectGroupItem.svelte";
	import type { FiltersetPokemon } from "@/lib/features/filters/filtersets";
	import { updateDetailsCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { getCompleteTrainers } from "@/lib/services/linkedTrainers.svelte";
	import { CircleDashed, User, Users } from "@lucide/svelte";

	let { data }: { data: FiltersetPokemon } = $props();

	const OFF = "off";
	const ALL = "all";

	// A trainer that was unlinked stays listed so the filterset doesn't silently widen
	let trainers = $derived.by(() => {
		const linked = getCompleteTrainers().map((t) => ({
			value: t.id,
			label: t.trainerName ?? m.linked_trainers_unnamed()
		}));
		for (const id of data.personalShinyTrainers ?? []) {
			if (!linked.some((o) => o.value === id)) {
				linked.push({ value: id, label: m.personal_shiny_trainer_missing() });
			}
		}
		return linked;
	});

	function currentValues(): string[] {
		if (!data.personalShiny) return [OFF];
		return data.personalShinyTrainers?.length ? [...data.personalShinyTrainers] : [ALL];
	}

	// Off and All are exclusive shortcuts; trainers can be combined
	let values = $derived(currentValues());

	function onchange(next: string[]) {
		const added = next.filter((v) => !values.includes(v));
		const picked = next.filter((v) => v !== OFF && v !== ALL);

		if (added.includes(OFF) || (!added.includes(ALL) && picked.length === 0)) {
			delete data.personalShiny;
			delete data.personalShinyTrainers;
		} else if (added.includes(ALL)) {
			data.personalShiny = true;
			// [] = explicitly all trainers, which (unlike "not chosen") is never pinned
			data.personalShinyTrainers = [];
		} else {
			data.personalShiny = true;
			data.personalShinyTrainers = picked;
		}
		values = currentValues();
		updateDetailsCurrentSelectedFilterset();
	}
</script>

<div>
	<div class="text-base font-semibold mb-2">
		{m.personal_shiny_filter()}
	</div>

	<ToggleGroup {values} {onchange} class="w-full">
		<SelectGroupItem type="toggle" value={OFF} class="p-2 flex-1 min-w-32">
			<CircleDashed size="20" />
			{m.personal_shiny_off()}
		</SelectGroupItem>
		<SelectGroupItem type="toggle" value={ALL} class="p-2 flex-1 min-w-32">
			<Users size="20" />
			{m.personal_shiny_all_trainers()}
		</SelectGroupItem>
		{#each trainers as trainer (trainer.value)}
			<SelectGroupItem type="toggle" value={trainer.value} class="p-2 flex-1 min-w-32">
				<User size="20" />
				{trainer.label}
			</SelectGroupItem>
		{/each}
	</ToggleGroup>
	{#if trainers.length > 1}
		<p class="text-sm text-muted-foreground mt-3">{m.personal_shiny_pick_several()}</p>
	{/if}
</div>
