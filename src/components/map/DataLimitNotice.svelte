<script lang="ts">
	import { getDataLimits } from "@/lib/mapObjects/dataLimitState.svelte";
	import { mapObjectLabels } from "@/lib/mapObjects/mapObjectLabels";
	import * as m from "@/lib/paraglide/messages";
	import { Telescope } from "@lucide/svelte";
	import { slide } from "svelte/transition";

	const limited = $derived([...getDataLimits()]);
	const label = $derived(limited.length === 1 ? mapObjectLabels[limited[0][0]]() : m.pogo_data());
</script>

{#if limited.length > 0}
	<div
		class="pointer-events-auto px-4 py-3 bg-card border rounded-lg shadow-lg"
		transition:slide={{ duration: 90 }}
	>
		<div class="flex items-center gap-2 text-base font-semibold">
			<Telescope class="size-4 shrink-0" />
			<span>{m.map_limit_title()}</span>
		</div>
		<div class="text-base text-muted-foreground">
			{m.map_limit_zoom_hint({ objects: label })}
		</div>
	</div>
{/if}
