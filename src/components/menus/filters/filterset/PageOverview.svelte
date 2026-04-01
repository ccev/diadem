<script lang="ts">
	import Card from "@/components/ui/Card.svelte";
	import { Pencil } from "lucide-svelte";
	import { fly } from "svelte/transition";
	import type { Snippet } from "svelte";
	import {
		filtersetPageEditAttribute,
		getFiltersetPageTransition,
		setCurrentAttributePage
	} from "@/lib/features/filters/filtersetPages.svelte.js";
	import Button from "@/components/ui/input/Button.svelte";
	import { getCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte.js";
	import * as m from "@/lib/paraglide/messages";
	import EditDetails from "@/components/menus/filters/filterset/EditDetails.svelte";
	import { filterTitle } from "@/lib/features/filters/filtersetUtils";
	import FiltersetIcon from "@/lib/features/filters/FiltersetIcon.svelte";
	import AttributesOverview from "./AttributesOverview.svelte";
	import Attribute from "./Attribute.svelte";
	import ModifierPreview from "./modifiers/ModifierPreview.svelte";
	import ModifiersAttribute from "./modifiers/ModifiersAttribute.svelte";
	import { type AnyFilterset, type FiltersetPokemon } from "@/lib/features/filters/filtersets";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";
	import AttributeChip from "./AttributeChip.svelte";

	let {
		overview
	}: {
		overview: Snippet;
	} = $props();

	let data = $state.snapshot(getCurrentSelectedFilterset()?.data);

	let previewIconUrl = $derived.by(() => {
		const pokemon = data?.pokemon;
		const selected = pokemon?.[pokemon.length - 1];
		if (!selected) return undefined;
		return getIconPokemon({
			pokemon_id: selected.pokemon_id,
			form: selected.form
		});
	});
</script>

{#snippet editDetailsPage(thisData: AnyFilterset)}
	<EditDetails data={thisData} />
{/snippet}

{#snippet editVisualPage(thisData: AnyFilterset)}
	<ModifiersAttribute data={thisData} iconUrl={previewIconUrl} />
{/snippet}

<div
	class="pb-2"
	in:fly={getFiltersetPageTransition().in}
	out:fly={getFiltersetPageTransition().out}
>
	<Card class="w-full text-sm divide-y-border divide-y overflow-hidden">
		<Button
			class="w-full! h-full! justify-start py-3! px-4! gap-2 group rounded-none!"
			variant="ghost"
			onclick={() => {
				setCurrentAttributePage(editDetailsPage, m.details());
				filtersetPageEditAttribute();
			}}
		>
			<div
				class="rounded-full bg-accent size-10 border flex items-center justify-center relative shrink-0 mr-1"
			>
				<FiltersetIcon filterset={data} size={5} />
			</div>
			<div class="relative text-left text-base min-w-0 w-full overflow-hidden">
				<div
					class="absolute right-0 h-full w-4 bg-linear-to-l from-background to-transparent group-hover:from-accent group-active:from-accent transition-colors"
				></div>
				<b>{filterTitle(data)}</b>
			</div>
			<Pencil class="ml-auto shrink-0" size="14" />
		</Button>
		<Button
			class="w-full! h-fit! block! justify-start p-0! gap-2 group rounded-none! relative"
			variant="ghost"
			onclick={() => {
				setCurrentAttributePage(editVisualPage, m.modifier_visual());
				filtersetPageEditAttribute();
			}}
		>
			<ModifierPreview
				class="h-20! rounded-none! border-none!"
				modifiers={data.modifiers}
				iconUrl={previewIconUrl}
				filterset={data}
			/>
			<Pencil class="ml-auto shrink-0 absolute right-4 top-1/2 -translate-y-1/2" size="14" />
		</Button>
		<!-- <Button
			class="w-full! h-fit! block! justify-start px-4! py-2! gap-2 group rounded-none!"
			variant="ghost"
			onclick={() => {
				setCurrentAttributePage(editVisualPage, m.modifier_visual());
				filtersetPageEditAttribute();
			}}
		>
			<AttributeChip label="Red Glow" isEmpty={false} onremove={() => delete data.pokemon} />
		</Button> -->
		<!-- <div
			class="w-full text-sm divide-y-border divide-y grid"
			style="grid-template-columns: auto 1fr auto"
		>
			<Attribute label="Map Visuals" showLabel={false}>
				<AttributeChip label="Red Glow" isEmpty={false} onremove={() => delete data.pokemon} />
				{#snippet page(thisData: FiltersetPokemon)}
					<ModifiersAttribute data={thisData} iconUrl={previewIconUrl} />
				{/snippet}
			</Attribute>
		</div> -->
	</Card>

	<!-- <ModifierPreview modifiers={data.modifiers} iconUrl={previewIconUrl} filterset={data} /> -->

	<!-- <AttributesOverview>
		<Attribute label="">
			<ModifierPreview
				modifiers={data.modifiers}
				iconUrl={previewIconUrl}
				filterset={data}
				compact
			/>
			<AttributeChip label="Red Glow" isEmpty={false} onremove={() => delete data.pokemon} />
			{#snippet page(thisData: FiltersetPokemon)}
				<ModifiersAttribute data={thisData} iconUrl={previewIconUrl} />
			{/snippet}
		</Attribute>
	</AttributesOverview> -->

	<div class="space-y-3 mt-6">
		{@render overview()}
	</div>
</div>
