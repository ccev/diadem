<script lang="ts">
	import { Search, X } from "lucide-svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import { getActiveSearch, resetActiveSearchFilter } from "@/lib/features/activeSearch.svelte.js";
	import { m } from "@/lib/paraglide/messages";
	import { closeSearchModal } from "@/lib/ui/modal.svelte";
	import {slide} from "svelte/transition";

	function onkeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			resetActiveSearchFilter()
		}
	}
</script>

<svelte:window {onkeydown} />

<button
	class="w-full mx-auto max-w-147 flex items-center gap-4 pointer-events-auto rounded-lg border bg-card text-card-foreground shadow-md cursor-pointer"
	onclick={resetActiveSearchFilter}
>
	<Search size="18" class="ml-4" />
	<span class="my-4">
		{m.searching_for()}
		<b>{getActiveSearch()?.name}</b>
	</span>
	<Button
		class="ml-auto mr-2"
		variant="ghost"
		size="icon"
		onclick={() => {
			resetActiveSearchFilter()
			closeSearchModal()
		}}
	>
		<X size="20" />
	</Button>
</button>