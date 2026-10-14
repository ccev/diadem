<script lang="ts">
	import Attribute from "@/components/menus/filters/filterset/Attribute.svelte";
	import AttributeChip from "@/components/menus/filters/filterset/AttributeChip.svelte";
	import Input from "@/components/ui/input/Input.svelte";
	import type { FiltersetPokemon } from "@/lib/features/filters/filtersets";
	import { updateDetailsCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte";
	import { getCompleteTrainers, refreshLinkedTrainers } from "@/lib/services/linkedTrainers.svelte";
	import { formatNumber } from "@/lib/utils/numberFormat";
	import * as m from "@/lib/paraglide/messages";
	import { onMount } from "svelte";

	let { data }: { data: FiltersetPokemon } = $props();
	const id = $props.id();
	let trainers = $derived(getCompleteTrainers());
	let selectedTrainer = $derived(
		trainers.find((trainer) => trainer.id === data.showcase?.trainerId)
	);
	let label = $derived(
		data.showcase
			? m.showcase_filter_summary({
					trainer: selectedTrainer
						? (selectedTrainer.trainerName ?? m.linked_trainers_unnamed())
						: m.personal_shiny_trainer_missing(),
					score: formatNumber(data.showcase.minScore)
				})
			: undefined
	);

	onMount(() => {
		refreshLinkedTrainers().then();
	});
</script>

<Attribute label={m.showcase_filter()}>
	<AttributeChip
		{label}
		emptyLabel={m.personal_shiny_off()}
		isEmpty={!data.showcase}
		onremove={() => delete data.showcase}
	/>
	{#snippet page(thisData: FiltersetPokemon)}
		<div class="space-y-4">
			<p class="text-sm text-muted-foreground">{m.showcase_filter_notice()}</p>
			<label for="{id}-trainer" class="block text-base font-semibold space-y-2">
				<span class="block">{m.showcase_trainer()}</span>
				<select
					id="{id}-trainer"
					class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
					value={thisData.showcase?.trainerId ?? ""}
					onchange={(event) => {
						const trainerId = event.currentTarget.value;
						if (trainerId)
							thisData.showcase = { trainerId, minScore: thisData.showcase?.minScore ?? 0 };
						else delete thisData.showcase;
						updateDetailsCurrentSelectedFilterset();
					}}
				>
					<option value="">{m.personal_shiny_off()}</option>
					{#each trainers as trainer (trainer.id)}
						<option value={trainer.id}>{trainer.trainerName ?? m.linked_trainers_unnamed()}</option>
					{/each}
					{#if thisData.showcase && !trainers.some((trainer) => trainer.id === thisData.showcase?.trainerId)}
						<option value={thisData.showcase.trainerId}>{m.personal_shiny_trainer_missing()}</option
						>
					{/if}
				</select>
			</label>
			<label for="{id}-minimum" class="block text-base font-semibold space-y-2">
				<span class="block">{m.showcase_minimum()}</span>
				<Input
					id="{id}-minimum"
					type="number"
					class="w-32 font-normal tabular-nums"
					min="0"
					step="any"
					value={thisData.showcase?.minScore ?? 0}
					disabled={!thisData.showcase}
					oninput={(event) => {
						const minScore = event.currentTarget.valueAsNumber;
						if (thisData.showcase && Number.isFinite(minScore) && minScore >= 0) {
							thisData.showcase.minScore = minScore;
							updateDetailsCurrentSelectedFilterset();
						} else event.currentTarget.value = String(thisData.showcase?.minScore ?? 0);
					}}
				/>
			</label>
			{#if !trainers.length}
				<p class="text-sm text-muted-foreground">{m.showcase_link_trainers()}</p>
			{/if}
		</div>
	{/snippet}
</Attribute>
