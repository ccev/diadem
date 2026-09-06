<script lang="ts">
	import type { Map, MapLibreEvent, MapStyleDataEvent } from "maplibre-gl";
	import DOMPurify from 'dompurify';

	let {
		class: class_ = "",
		map
	}: {
		class?: string;
		map: Map | undefined
	} = $props();

	let attribution = $state("")

	function updateAttribution(loadedMap: Map) {
		const style = loadedMap?.getStyle()
		if (!loadedMap || !style) return
		const attributions = [
			...new Set(
				Object.keys(style.sources)
					.map((id) => loadedMap.getSource(id)?.attribution?.trim())
					.filter((value): value is string => Boolean(value))
			)
		];

		attribution = attributions.join(" | ")
	}

	function onMapLoad(e: MapLibreEvent) {
		updateAttribution(e.target)
	}

	function onStyleChange(e: MapStyleDataEvent) {
		updateAttribution(e.target)
	}


	$effect(() => {
		if (!map) return
		map.on("load", onMapLoad)
		map.on("styledata", onStyleChange)

		return () => {
			map.off("load", onMapLoad)
			map.off("styledata", onStyleChange)
		}
	})

</script>


<div
	class="absolute right-0 bottom-0 tracking-tighter text-[0.5rem]/[0.5rem] text-muted-foreground/50 z-10 bg-background/50 px-0.5 backdrop-blur-sm {class_}"
>
	{@html DOMPurify.sanitize(attribution, {
		ALLOWED_TAGS: ["a"],
		ALLOWED_ATTR: ["href", "target", "rel"],
		ALLOWED_URI_REGEXP: /^https?:/i
	})}
</div>
