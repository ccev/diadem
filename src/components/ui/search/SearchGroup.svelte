<script lang="ts">
	import { flyTo } from "@/lib/map/utils.js";
	import LucideIcon from "@/components/utils/LucideIcon.svelte";
	import { Command } from "bits-ui";
	import { onMount, type Snippet } from "svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import SearchItem from "@/components/ui/search/SearchItem.svelte";
	import { Debounced, watch } from "runed";
	import { m } from "@/lib/paraglide/messages";

	type T = any

	let {
		title,
		limit = 3,
		items,
		item,
		query,
		debounceCallback = undefined,
		isLoading = false,
	}: {
		title: string
		limit?: number
		items: T[]
		item: Snippet<[T]>,
		query: string,
		debounceCallback?: (query: string) => void,
		isLoading?: boolean,
	} = $props();

	let showAll = $state(false);
	let visibleItems = $derived(showAll ? items : items.slice(0, limit));
	let nothingFound = $derived(query.length > 0 && items.length === 0)

	onMount(() => {
		if (debounceCallback) {
			const debounced = new Debounced(() => query, 100);

			watch(
				() => debounced.current,
				debounceCallback
			);
		}
	});
</script>

<Command.Group>
	<Command.GroupHeading
		class="text-muted-foreground p-1 px-2 py-1.5 text-xs font-medium self-starts"
	>
		{title}
		{#if isLoading}
			· {m.search_address_loading()}
		{:else if nothingFound}
			· {m.search_address_no_place_found()}
		{/if}
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