<script lang="ts">
	import { Marker } from "svelte-maplibre";
	import { getContextMenuEvent, getIsContextMenuOpen } from "@/lib/ui/contextmenu.svelte.js";
</script>

{#if getIsContextMenuOpen()}
	<Marker lngLat={getContextMenuEvent()?.lngLat ?? [0, 0]}>
		<div class="relative size-3 rounded-full bg-pink-200 outline-white outline-2">
			<div
				class="absolute left-1/2 top-1/2 -translate-1/2 bg-rose-500 size-3 rounded-full duration-2500 animate-pulse"
			></div>
		</div>
	</Marker>
{/if}
