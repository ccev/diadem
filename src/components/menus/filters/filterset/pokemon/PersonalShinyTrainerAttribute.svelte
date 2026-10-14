<script lang="ts">
	import Attribute from "@/components/menus/filters/filterset/Attribute.svelte";
	import AttributeChip from "@/components/menus/filters/filterset/AttributeChip.svelte";
	import PersonalShinyTrainerPage from "@/components/menus/filters/filterset/pokemon/PersonalShinyTrainerPage.svelte";
	import type { FiltersetPokemon } from "@/lib/features/filters/filtersets";
	import { updateDetailsCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte";
	import { personalShinyTrainerLabel } from "@/lib/features/filters/filterUtilsPokemon";
	import * as m from "@/lib/paraglide/messages";
	import { getCompleteTrainers, refreshLinkedTrainers } from "@/lib/services/linkedTrainers.svelte";
	import { onMount } from "svelte";

	let { data }: { data: FiltersetPokemon } = $props();

	// Off by default. On = all linked trainers or one trainer.
	let label = $derived(
		data.personalShiny
			? (personalShinyTrainerLabel(data) ?? m.personal_shiny_all_trainers())
			: undefined
	);

	// A shiny filterset with no trainer chosen yet (e.g. from the "My shinies" template), for a
	// user with one trainer: choose it, so it stays on this trainer if they link another later
	$effect(() => {
		const complete = getCompleteTrainers();
		if (data.personalShiny && data.personalShinyTrainers === undefined && complete.length === 1) {
			data.personalShinyTrainers = [complete[0].id];
			updateDetailsCurrentSelectedFilterset();
		}
	});

	// Mounted with the editor's overview, not at app start (the filterset editor itself is
	// mounted with the map page), so this only loads trainers when someone edits a filter.
	onMount(() => {
		refreshLinkedTrainers().then();
	});
</script>

<Attribute label={m.personal_shiny_attribute()}>
	<AttributeChip
		{label}
		emptyLabel={m.personal_shiny_off()}
		isEmpty={!data.personalShiny}
		onremove={() => {
			delete data.personalShiny;
			delete data.personalShinyTrainers;
		}}
	/>
	{#snippet page(thisData: FiltersetPokemon)}
		<PersonalShinyTrainerPage data={thisData} />
	{/snippet}
</Attribute>
