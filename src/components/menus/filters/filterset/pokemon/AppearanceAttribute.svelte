<script lang="ts">
	import SliderRange from "@/components/ui/input/slider/SliderRange.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { pokemonSizes } from "@/lib/utils/pokemonUtils";
	import ToggleGroup from "@/components/ui/input/selectgroup/ToggleGroup.svelte";
	import SelectGroupItem from "@/components/ui/input/selectgroup/SelectGroupItem.svelte";
	import { CircleSmall, Mars, Venus } from "@lucide/svelte";
	import type { FiltersetPokemon, MinMax } from "@/lib/features/filters/filtersets";
	import { changeAttributeMinMax } from "@/lib/features/filters/filtersetUtils.svelte";

	let {
		data,
		sizeBounds,
		showSize = true
	}: {
		data: FiltersetPokemon;
		sizeBounds: MinMax;
		showSize?: boolean;
	} = $props();

	let thisValues = $derived(data.gender?.map(String) ?? ["1", "2", "3"]);
</script>

{#if showSize}
	<SliderRange
		min={sizeBounds.min}
		max={sizeBounds.max}
		title={m.pokemon_size()}
		valueMin={data.size?.min ?? sizeBounds.min}
		valueMax={data.size?.max ?? sizeBounds.max}
		onchange={([min, max]) =>
			changeAttributeMinMax(data, "size", sizeBounds.min, sizeBounds.max, min, max)}
		labels={pokemonSizes}
	/>
{/if}

<div class:mt-4={showSize}>
	<div class="text-base font-semibold mb-2">
		{m.pokemon_gender()}
	</div>

	<ToggleGroup
		values={thisValues}
		onchange={(values) => {
			if (values.length > 0 && values.length < 3) {
				data.gender = values.map(Number);
			} else {
				delete data.gender;
			}
			thisValues = values;
		}}
		class="w-full"
	>
		<SelectGroupItem type="toggle" value="2" class="p-2 flex-1">
			<Venus size="20" />
			{m.pokemon_gender_female()}
		</SelectGroupItem>
		<SelectGroupItem type="toggle" value="1" class="p-2 flex-1">
			<Mars size="20" />
			{m.pokemon_gender_male()}
		</SelectGroupItem>
		<SelectGroupItem type="toggle" value="3" class="p-2 flex-1">
			<CircleSmall size="20" />
			{m.pokemon_gender_neutral()}
		</SelectGroupItem>
	</ToggleGroup>
</div>
