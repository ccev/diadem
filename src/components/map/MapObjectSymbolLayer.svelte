<script lang="ts">
	import { SymbolLayer } from "svelte-maplibre";
	import type { ExpressionSpecification } from "maplibre-gl";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";

	let {
		id,
		filter,
		beforeId = undefined,
		hoverCursor = undefined,
		eventsIfTopMost = false,
		interactive = true,
		withLabel = false
	}: {
		id: string;
		filter: ExpressionSpecification;
		beforeId?: string;
		hoverCursor?: string;
		eventsIfTopMost?: boolean;
		interactive?: boolean;
		withLabel?: boolean;
	} = $props();
</script>

<SymbolLayer
	{id}
	{filter}
	{beforeId}
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
		...(withLabel
			? {
					"text-field": ["coalesce", ["get", "textLabel"], ""],
					"text-anchor": "top",
					"text-offset": ["coalesce", ["get", "textOffset"], ["literal", [0, 2.2]]],
					"text-size": 11,
					"text-allow-overlap": true,
					"text-font": ["Open Sans Bold", "Arial Unicode MS Bold"]
				}
			: {})
	}}
	paint={{
		...(withLabel
			? {
					"text-color": "#ffffff",
					"text-halo-color": "#000000",
					"text-halo-width": 1.5
				}
			: {})
	}}
/>
