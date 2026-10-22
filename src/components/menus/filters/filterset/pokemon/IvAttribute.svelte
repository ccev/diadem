<script lang="ts">
	import { changeAttributeMinMax } from "@/lib/features/filters/filtersetUtils.svelte";
	import SliderRange from "@/components/ui/input/slider/SliderRange.svelte";
	import type { FiltersetPokemon, MinMax } from "@/lib/features/filters/filtersets";

	let {
		data,
		ivBounds,
		percBounds
	}: {
		data: FiltersetPokemon;
		ivBounds: MinMax;
		percBounds: MinMax;
	} = $props();
</script>

<SliderRange
	min={percBounds.min}
	max={percBounds.max}
	title={/* @wc-include */ "IV %"}
	valueMin={data.iv?.min ?? percBounds.min}
	valueMax={data.iv?.max ?? percBounds.max}
	onchange={([min, max]) =>
		changeAttributeMinMax(data, "iv", percBounds.min, percBounds.max, min, max)}
/>
<SliderRange
	min={ivBounds.min}
	max={ivBounds.max}
	title="Attack IV"
	valueMin={data.ivAtk?.min ?? ivBounds.min}
	valueMax={data.ivAtk?.max ?? ivBounds.max}
	onchange={([min, max]) =>
		changeAttributeMinMax(data, "ivAtk", percBounds.min, percBounds.max, min, max)}
/>
<SliderRange
	min={ivBounds.min}
	max={ivBounds.max}
	title="Defense IV"
	valueMin={data.ivDef?.min ?? ivBounds.min}
	valueMax={data.ivDef?.max ?? ivBounds.max}
	onchange={([min, max]) =>
		changeAttributeMinMax(data, "ivDef", percBounds.min, percBounds.max, min, max)}
/>
<SliderRange
	min={ivBounds.min}
	max={ivBounds.max}
	title={/* @wc-include */ "HP IV"}
	valueMin={data.ivSta?.min ?? ivBounds.min}
	valueMax={data.ivSta?.max ?? ivBounds.max}
	onchange={([min, max]) =>
		changeAttributeMinMax(data, "ivSta", percBounds.min, percBounds.max, min, max)}
/>
