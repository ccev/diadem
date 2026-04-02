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
		"icon-rotate": ["coalesce", ["get", "imageRotation"], 0],
		"text-field": ["coalesce", ["get", "textLabel"], ""],
		"text-anchor": "top",
		"text-offset": [0, 2.2],
		"text-size": 11,
		"text-allow-overlap": true,
		"text-font": ["Open Sans Bold", "Arial Unicode MS Bold"]
	}}
	paint={{
		"text-color": "#ffffff",
		"text-halo-color": "#000000",
		"text-halo-width": 1.5
	}}
/>
