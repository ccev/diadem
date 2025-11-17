<script lang="ts">
	import Button from '@/components/ui/input/Button.svelte';
	import Switch from '@/components/ui/input/Switch.svelte';
	import { Eye, Pencil } from 'lucide-svelte';

	import type { AnyFilterset } from '@/lib/features/filters/filtersets';
	import { openModal } from '@/lib/ui/modal.svelte';
	import { setCurrentSelectedFilterset } from '@/lib/features/filters/filtersetPageData.svelte';
	import { filtersetPageReset } from '@/lib/features/filters/filtersetPages.svelte';

	let {
		filter
	}: {
		filter: AnyFilterset
	} = $props()
</script>

<Button
	class="px-4! h-fit!"
	variant="outline"
	size="lg"
	onclick={() => {
		setCurrentSelectedFilterset("pokemonMajor", filter, true)
		filtersetPageReset()
		openModal("filtersetPokemon")
	}}
>
	<div class="flex-1 flex gap-1 items-center justify-start rounded-md py-2 h-12 m-0! pr-2" size="" variant="ghost">
		<span>{filter.icon}</span>
		<span>{filter.title}</span>
	</div>
	<!--	<Button class="flex-1 justify-start rounded-md py-2 h-12 m-0! pl-4 pr-2" size="" variant="ghost">-->
	<!--		<span>{filter.icon}</span>-->
	<!--		<span>{filter.title}</span>-->
	<!--	</Button>-->

	<!--	<Button class="ml-auto my-0!" variant="outline" size="icon">-->
	<!--		<Pencil size="16" />-->
	<!--	</Button>-->

	<Button
		class="ml-auto my-0! mr-1"
		variant="outline"
		size="icon"
	>
		<Eye size="16" />
	</Button>
</Button>