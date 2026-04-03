<script lang="ts">
	import { SymbolLayer } from "svelte-maplibre";
	import type { ExpressionSpecification } from "maplibre-gl";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";

	let {
		id,
		filter,
		hoverCursor = undefined,
		eventsIfTopMost = false,
		interactive = true
	}: {
		id: string;
		filter: ExpressionSpecification;
		hoverCursor?: string;
		eventsIfTopMost?: boolean;
		interactive?: boolean;
	} = $props();
</script>

<SymbolLayer
	{id}
	{filter}
	{hoverCursor}
	{eventsIfTopMost}
	{interactive}
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
		"text-offset": ["coalesce", ["get", "textOffset"], ["literal", [0, 2.2]]],
		"text-size": 11,
		"text-allow-overlap": true,
		"text-font": [
			"IBM Plex Sans",
			"Open Sans",
			"Noto Sans",
			"Arial Unicode MS Bold",
			"sans-serif"
		]
	}}
	paint={{
		"text-color": "#fafafa",
		"text-halo-color": "#09090b",
		"text-halo-width": 1.5
	}}
/>
