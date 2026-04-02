<script lang="ts">
	import { SymbolLayer } from "svelte-maplibre";
	import type { ExpressionSpecification } from "maplibre-gl";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { MapObjectLayerId } from "@/lib/map/layers";

	let {
		id,
		filter,
		beforeId = undefined,
		interactive = false
	}: {
		id: string;
		filter: ExpressionSpecification;
		beforeId?: string;
		interactive?: boolean;
	} = $props();
</script>

<SymbolLayer
	{id}
	{interactive}
	{filter}
	{beforeId}
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
		"icon-offset": ["get", "imageOffset"]
	}}
/>
