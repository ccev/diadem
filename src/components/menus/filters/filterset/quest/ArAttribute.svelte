<script lang="ts">
	import SliderRange from '@/components/ui/input/slider/SliderRange.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { pokemonSizes } from '@/lib/utils/pokemonUtils';
	import ToggleGroup from '@/components/ui/input/selectgroup/ToggleGroup.svelte';
	import SelectGroupItem from '@/components/ui/input/selectgroup/SelectGroupItem.svelte';
	import { Camera, CameraOff, CircleSmall, Mars, Venus } from 'lucide-svelte';
	import {
		type FiltersetPokemon,
		type FiltersetQuest,
		type MinMax
	} from '@/lib/features/filters/filtersets';
	import { changeAttributeMinMax } from '@/lib/features/filters/filtersetUtils';
	import RadioGroup from '@/components/ui/input/selectgroup/RadioGroup.svelte';
	import { QuestArType } from '@/lib/features/filters/filterUtilsQuest';

	let {
		data
	}: {
		data: FiltersetQuest
	} = $props();

	let thisValues: QuestArType[] = $derived(data.ar ? [data.ar] : [])
</script>

<div class="">
	<div class="text-base font-semibold mb-2">
		{m.ar_layer()}
	</div>

	<ToggleGroup
		childCount={2}
		values={thisValues}
		onchange={(values: QuestArType[]) => {
			if (values.length === 1) {
				data.ar = values[0]
			} else {
				delete data.ar
			}
			thisValues = values
		}}
		class="w-full"
	>
		<SelectGroupItem
			type="toggle"
			value={QuestArType.AR}
			class="p-2 w-full"
		>
			{m.quest_ar_tag()}
		</SelectGroupItem>
		<SelectGroupItem
			type="toggle"
			value={QuestArType.NOAR}
			class="p-2 w-full"
		>
			{m.quest_noar_tag()}
		</SelectGroupItem>
	</ToggleGroup>
</div>