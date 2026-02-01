<script lang="ts">
	import { changeAttributeMinMax } from '@/lib/features/filters/filtersetUtils';
	import SliderRange from '@/components/ui/input/slider/SliderRange.svelte';
	import type { FiltersetPokemon, MinMax } from '@/lib/features/filters/filtersets';
	import { m } from "@/lib/paraglide/messages";

	let {
		data,
		ivBounds,
		percBounds
	}: {
		data: FiltersetPokemon
		ivBounds: MinMax
		percBounds: MinMax
	} = $props();
</script>

<SliderRange
	min={percBounds.min}
	max={percBounds.max}
	title={m.iv_product_label()}
	valueMin={data.iv?.min ?? percBounds.min}
	valueMax={data.iv?.max ?? percBounds.max}
	onchange={([min, max]) => changeAttributeMinMax(data, "iv", percBounds.min, percBounds.max, min, max)}
/>
<SliderRange
	min={ivBounds.min}
	max={ivBounds.max}
	title={m.attack_iv()}
	valueMin={data.ivAtk?.min ?? ivBounds.min}
	valueMax={data.ivAtk?.max ?? ivBounds.max}
	onchange={([min, max]) => changeAttributeMinMax(data, "ivAtk", percBounds.min, percBounds.max, min, max)}
/>
<SliderRange
	min={ivBounds.min}
	max={ivBounds.max}
	title={m.defense_iv()}
	valueMin={data.ivDef?.min ?? ivBounds.min}
	valueMax={data.ivDef?.max ?? ivBounds.max}
	onchange={([min, max]) => changeAttributeMinMax(data, "ivDef", percBounds.min, percBounds.max, min, max)}
/>
<SliderRange
	min={ivBounds.min}
	max={ivBounds.max}
	title={m.stamina_iv()}
	valueMin={data.ivSta?.min ?? ivBounds.min}
	valueMax={data.ivSta?.max ?? ivBounds.max}
	onchange={([min, max]) => changeAttributeMinMax(data, "ivSta", percBounds.min, percBounds.max, min, max)}
/>