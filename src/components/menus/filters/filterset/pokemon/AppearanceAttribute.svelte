<script lang="ts">
	import SliderRange from '@/components/ui/input/slider/SliderRange.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { pokemonSizes } from '@/lib/utils/pokemonUtils';
	import ToggleGroup from '@/components/ui/input/selectgroup/ToggleGroup.svelte';
	import SelectGroupItem from '@/components/ui/input/selectgroup/SelectGroupItem.svelte';
	import { CircleSmall, Mars, Venus } from 'lucide-svelte';
	import type { FiltersetPokemon, MinMax } from '@/lib/features/filters/filtersets';
	import { changeAttributeMinMax } from '@/lib/features/filters/filtersetUtils';

	let {
		data,
		sizeBounds
	}: {
		data: FiltersetPokemon
		sizeBounds: MinMax
	} = $props();

	let thisValues = $derived(data.gender?.map(String) ?? ["1", "2", "3"])
</script>

<SliderRange
	min={sizeBounds.min}
	max={sizeBounds.max}
	title={m.pokemon_size()}
	valueMin={data.size?.min ?? sizeBounds.min}
	valueMax={data.size?.max ?? sizeBounds.max}
	onchange={([min, max]) => changeAttributeMinMax(data, "size", sizeBounds.min, sizeBounds.max, min, max)}
	labels={pokemonSizes}
/>

<div class="mt-4">
	<div class="text-base font-semibold mb-2">
		{m.pokemon_gender()}
	</div>

	<ToggleGroup
		childCount={3}
		values={thisValues}
		onchange={(values) => {
			if (values.length > 0 && values.length < 3) {
				data.gender = values.map(Number)
			} else {
				delete data.gender
			}
			thisValues = values
		}}
		class="w-full"
	>
		<SelectGroupItem
			type="toggle"
			value="2"
			class="p-2 w-full"
		>
			<Venus size="20" />
			{m.pokemon_gender_female()}
		</SelectGroupItem>
		<SelectGroupItem
			type="toggle"
			value="1"
			class="p-2 w-full"
		>
			<Mars size="20" />
			{m.pokemon_gender_male()}
		</SelectGroupItem>
		<SelectGroupItem
			type="toggle"
			value="3"
			class="p-2 w-full"
		>
			<CircleSmall size="20" />
			{m.pokemon_gender_neutral()}
		</SelectGroupItem>
	</ToggleGroup>
</div>