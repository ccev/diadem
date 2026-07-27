<script lang="ts">
	import { Search, X } from "@lucide/svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import { getActiveSearch } from "@/lib/features/activeSearch.svelte.js";
	import { m } from "@/lib/paraglide/messages";
	import { closeOverlay } from "@/lib/ui/overlays.svelte";
</script>

<button
	class="w-full max-w-2xl! mx-auto flex items-center gap-4 pointer-events-auto rounded-lg border bg-card text-card-foreground shadow-md cursor-pointer text-left"
	onclick={() => closeOverlay({ kind: "active-search", id: "banner" })}
>
	<Search size="18" class="ml-4 shrink-0" />
	<span class="my-4">
		{m.searching_for()}
		<b>{getActiveSearch()?.name}</b>
	</span>
	<Button
		class="ml-auto mr-2"
		variant="ghost"
		size="icon"
		onclick={(e) => {
			e.stopPropagation();
			closeOverlay({ kind: "active-search", id: "banner" });
		}}
	>
		<X size="20" />
	</Button>
</button>
