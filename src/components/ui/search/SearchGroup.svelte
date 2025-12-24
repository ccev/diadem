<script lang="ts">
	import { flyTo } from '@/lib/map/utils.js';
	import LucideIcon from '@/components/utils/LucideIcon.svelte';
	import { Command } from "bits-ui";
	import type { Snippet } from 'svelte';
	import Button from "@/components/ui/input/Button.svelte";
	import SearchItem from "@/components/ui/search/SearchItem.svelte";

	type T = any

	let {
		title,
		limit = 3,
		items,
		item,
	}: {
		title: string
		limit?: number
		items: T[]
		item: Snippet<[T]>
	} = $props()

	let showAll = $state(false)
	let visibleItems = $derived(showAll ? items : items.slice(0, limit))
</script>

<Command.Group>
	<Command.GroupHeading
		class="text-muted-foreground p-1 px-2 py-1.5 text-xs font-medium self-starts"
	>
		{title}
	</Command.GroupHeading>
	<Command.GroupItems>
		{#each visibleItems as thisItem}
			{@render item(thisItem)}
		{/each}
		{#if items.length > limit}
			<SearchItem
				onselect={() => showAll = !showAll}
				label={showAll ? 'Show less' : 'Show all'}
				value="all{title}"
				iconName={showAll ? 'Minus' : 'Plus'}
			/>
		{/if}
	</Command.GroupItems>
</Command.Group>