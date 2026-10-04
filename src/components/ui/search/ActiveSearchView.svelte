<script lang="ts">
	import { Search, X } from "@lucide/svelte";
	import { getActiveSearch } from "@/lib/features/activeSearch.svelte.js";
	import { m } from "@/lib/paraglide/messages";
	import { closeOverlay } from "@/lib/ui/overlays.svelte";
</script>

<button
	class="w-full max-w-2xl! mx-auto flex items-center gap-4 pointer-events-auto rounded-lg border bg-card text-card-foreground shadow-md cursor-pointer text-left transition-colors hover:bg-accent active:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
	title={m.close()}
	onclick={() => closeOverlay({ kind: "active-search", id: "banner" })}
>
	<Search size="18" class="ml-4 shrink-0" />
	<span class="min-w-0 wrap-anywhere my-4">
		{m.searching_for()}
		<b>{getActiveSearch()?.name}</b>
	</span>
	<span class="ml-auto mr-2 size-10 shrink-0 flex items-center justify-center" aria-hidden="true">
		<X size="20" />
	</span>
</button>
