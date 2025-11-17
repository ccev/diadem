<script lang="ts">
	import { fly } from 'svelte/transition';
	import {
		getFiltersetPageTransition,
	} from '@/lib/features/filters/filtersetPages.svelte';
	import { getCurrentSelectedFilterset } from '@/lib/features/filters/filtersetPageData.svelte';
	import { Pencil } from 'lucide-svelte';
	import Button from '@/components/ui/input/Button.svelte';
	import Card from '@/components/ui/Card.svelte';
	import type { FiltersetPokemon } from '@/lib/features/filters/filtersets';
	import AttributeDisplay from '@/components/menus/filters/filterset/AttributeDisplay.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { makeAttributeRangeLabel } from '@/lib/features/filters/makeAttributeChipLabel';
	import { getAttributeLabelIvProduct, getAttributeLabelIvValues } from '@/lib/features/filters/pokemonFilterUtils';
	import PokemonAttributeOverview from '@/components/menus/filters/filterset/pokemon/PokemonAttributeOverview.svelte';

	const filterset = getCurrentSelectedFilterset()
</script>

<div
	class="w-full absolute top-0 h-[calc(100%-3rem)] overflow-y-auto"
	in:fly={getFiltersetPageTransition().in}
	out:fly={getFiltersetPageTransition().out}
>
	<div
		class="flex gap-4 items-center px-2 mt-4"
	>
		<span class="text-xl">
			{getCurrentSelectedFilterset()?.data.icon}
		</span>
		<span class="text-lg font-semibold">
			{getCurrentSelectedFilterset()?.data.title}
		</span>
	</div>

	<div class="flex items-center gap-4 my-3">
		<div class="bg-border h-px w-full"></div>
		<span class="text-muted-foreground text-sm whitespace-nowrap">Attributes</span>
		<div class="bg-border h-px w-full"></div>
	</div>

	{#if filterset?.data}
		{#if filterset.category === "pokemonMajor"}
			<!--@ts-ignore-->
			<PokemonAttributeOverview data={filterset.data} />
		{/if}
	{/if}
</div>