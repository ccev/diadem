<script lang="ts">
	import Button from '@/components/ui/input/Button.svelte';
	import { fly } from 'svelte/transition';
	import { CirclePlus } from 'lucide-svelte';
	import type { FiltersetPokemon } from '@/lib/features/filters/filtersets';
	import {
		filtersetPageNew,
		filtersetPageSelect,
		getFiltersetPageTransition
	} from '@/lib/features/filters/filtersetPages.svelte.js';
	import { setCurrentSelectedFilterset } from '@/lib/features/filters/filtersetPageData.svelte.js';
	import { filterTitle } from '@/lib/features/filters/filtersetUtils';
	import FiltersetIcon from '@/lib/features/filters/FiltersetIcon.svelte';
	import { IconCategory, IconFeature } from '@/lib/features/filters/icons';
	import { League } from '@/lib/services/uicons.svelte';

	const premadeFiltersets: FiltersetPokemon[] = [
		{
			id: crypto.randomUUID(),
			icon: {
				isUserSelected: false,
				emoji: '💯'
			},
			title: {
				message: 'filter_template_hundo',
			},
			enabled: true,
			iv: { min: 100, max: 100 }
		},
		{
			id: crypto.randomUUID(),
			icon: {
				isUserSelected: false,
				uicon: {
					category: IconCategory.FEATURES,
					params: {
						feature: IconFeature.LEAGUE,
						league: League.GREAT
					}
				}
			},
			title: {
				message: 'filter_template_rank1_great',
			},
			enabled: true,
			pvpRankGreat: { min: 1, max: 1 }
		},
		{
			id: crypto.randomUUID(),
			icon: {
				isUserSelected: false,
				uicon: {
					category: IconCategory.FEATURES,
					params: {
						feature: IconFeature.LEAGUE,
						league: League.ULTRA
					}
				}
			},
			title: {
				message: 'filter_template_rank1_ultra',
			},
			enabled: true,
			pvpRankGreat: { min: 1, max: 1 }
		},
		{
			id: crypto.randomUUID(),
			icon: {
				isUserSelected: false,
				emoji: '🗑️'
			},
			title: {
				message: 'filter_template_nundo',
			},
			enabled: true,
			iv: { min: 0, max: 0 }
		},
		{
			id: crypto.randomUUID(),
			icon: {
				isUserSelected: false,
				emoji: '📏'
			},
			title: {
				message: 'filter_template_xxl',
			},
			enabled: true,
			size: { min: 5, max: 5 }
		},
		{
			id: crypto.randomUUID(),
			icon: {
				isUserSelected: false,
				uicon: {
					category: IconCategory.POKEMON,
					params: { pokemon_id: 201, form: 6 }
				}
			},
			title: {
				message: 'filter_template_unown',
			},
			enabled: true,
			pokemon: Array.from({ length: 28 }, (_, i) => i + 1).map(i => ({ pokemon_id: 201, form: i }))
		},
		{
			id: crypto.randomUUID(),
			icon: {
				isUserSelected: false,
				uicon: {
					category: IconCategory.POKEMON,
					params: { pokemon_id: 480, form: 0 }
				}
			},
			title: {
				message: 'filter_template_sea_trio',
			},
			enabled: true,
			pokemon: [ { pokemon_id: 480, form: 0 }, { pokemon_id: 481, form: 0 }, { pokemon_id: 482, form: 0 } ]
		},
	];

	function onnew() {
		filtersetPageNew();
	}
</script>

<div
	class="w-full absolute top-0 pb-20"
	in:fly={getFiltersetPageTransition().in}
	out:fly={getFiltersetPageTransition().out}
>
	<Button
		variant="secondary" size="lg" class="w-full"
		onclick={onnew}
	>
		<CirclePlus size="18" />
		<span>
			Create new
		</span>
	</Button>


	<div class="flex items-center gap-4 my-3">
		<div class="bg-border h-px w-full"></div>
		<span class="text-muted-foreground text-sm whitespace-nowrap">or select suggested filter</span>
		<div class="bg-border h-px w-full"></div>
	</div>

	<div class="overflow-y-auto h-full -mx-4 px-4">
		<div class="flex flex-col gap-1">
			{#each premadeFiltersets as filterset}
				<Button
					class="w-full flex gap-2 items-center justify-start rounded-md py-2 h-12 m-0! pl-4 pr-2"
					size=""
					variant="outline"
					onclick={() => {
						setCurrentSelectedFilterset("pokemon", filterset, false)
						filtersetPageSelect()
					}}
				>
					<FiltersetIcon {filterset} size={5} />
					<span>{filterTitle(filterset)}</span>
				</Button>
			{/each}
		</div>
	</div>
</div>
