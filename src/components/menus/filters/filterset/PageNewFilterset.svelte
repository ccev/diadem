<script lang="ts">
	import Button from '@/components/ui/input/Button.svelte';
	import { fly } from 'svelte/transition';
	import { CirclePlus, Pencil } from 'lucide-svelte';
	import type { FiltersetPokemon } from '@/lib/features/filters/filtersets';
	import {
		filtersetPageNew,
		filtersetPageSelect,
		getFiltersetPageTransition
	} from '@/lib/features/filters/filtersetPages.svelte.js';
	import { getNewFilterset, setCurrentSelectedFilterset } from '@/lib/features/filters/filtersetPageData.svelte.js';

	const placeholderFilter: FiltersetPokemon = {
		id: crypto.randomUUID(),
		title: '100% IV',
		icon: '💯',
		enabled: true,
		iv: { min: 100, max: 100}
	};

	function onnew() {
		filtersetPageNew()
	}
</script>

<div
	class="w-full absolute top-0 h-full pb-20"
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
			{#each [1,1,1,1,1,1,1,1,1] as _}
				<Button
					class="w-full flex gap-1 items-center justify-start rounded-md py-2 h-12 m-0! pl-4 pr-2"
					size=""
					variant="outline"
					onclick={() => {
						setCurrentSelectedFilterset("pokemonMajor", placeholderFilter, false)
						filtersetPageSelect()
					}}
				>
					<span>{placeholderFilter.icon}</span>
					<span>{placeholderFilter.title}</span>
				</Button>
			{/each}
		</div>
	</div>



</div>
