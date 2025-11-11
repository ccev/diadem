<script lang="ts">
	import Button from '@/components/ui/input/Button.svelte';
	import { fly } from 'svelte/transition';
	import { CirclePlus, Pencil } from 'lucide-svelte';
	import type { FiltersetPokemon } from '@/lib/features/filters/filtersets';
	import { filtersetPageNew } from '@/lib/ui/filtersetPages.svelte';

	const placeholderFilter: FiltersetPokemon = {
		id: '1',
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
	transition:fly={{duration: 100, x: -80}}
>
	<Button variant="secondary" size="lg" class="w-full" onclick={onnew}>
		<CirclePlus size="18" />
		<span>
			Create new
		</span>
	</Button>


	<div class="flex items-center gap-4 mt-2 mb-1">
		<div class="bg-border h-px w-full"></div>
		<span class="text-muted-foreground text-sm">or</span>
		<div class="bg-border h-px w-full"></div>
	</div>

	<div class="overflow-y-auto h-full overflow-y-auto">
		<p class="text-sm mb-2">
			Select suggested filter
		</p>
		<div class="flex flex-col gap-1">
			{#each [1,1,1,1,1,1,1,1,1] as _}
				<Button class="w-full flex gap-1 items-center justify-start rounded-md py-2 h-12 m-0! pl-4 pr-2" size="" variant="outline">
					<span>{placeholderFilter.icon}</span>
					<span>{placeholderFilter.title}</span>
					<Button class="ml-auto my-0! mr-1" size="icon" variant="outline">
						<Pencil class="text-muted-foreground" size="16" />
					</Button>
				</Button>
			{/each}
		</div>
	</div>



</div>
