<script lang="ts">
	import { SymbolLayer } from "svelte-maplibre";
	import type { ExpressionSpecification } from "maplibre-gl";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";

	let {
		id,
		filter,
		beforeId = undefined,
		hoverCursor = undefined,
		eventsIfTopMost = false
	}: {
		id: string;
		filter: ExpressionSpecification;
		beforeId?: string;
		hoverCursor?: string;
		eventsIfTopMost?: boolean;
	} = $props();
</script>

<SymbolLayer
	{id}
	{filter}
	{beforeId}
	{hoverCursor}
	{eventsIfTopMost}
	layout={{
		"icon-image": ["get", "imageUrl"],
		"icon-overlap": "always",
		"icon-size": [
			"*",
			["get", "imageSize"],
			["get", "selectedScale"],
			getUserSettings().mapIconSize
		],
		"icon-allow-overlap": true,
		"icon-offset": ["get", "imageOffset"],
		"icon-rotate": ["coalesce", ["get", "imageRotation"], 0]
	}}
/>
