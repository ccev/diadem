<script lang="ts">
	import SliderRange from '@/components/ui/input/slider/SliderRange.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { pokemonSizes } from '@/lib/utils/pokemonUtils';
	import ToggleGroup from '@/components/ui/input/selectgroup/ToggleGroup.svelte';
	import SelectGroupItem from '@/components/ui/input/selectgroup/SelectGroupItem.svelte';
	import { Camera, CameraOff, CircleSmall, Mars, Venus } from 'lucide-svelte';
	import {
		type FiltersetPokemon,
		type FiltersetQuest, type FiltersetRaid,
		type MinMax, type RaidFilterShow
	} from "@/lib/features/filters/filtersets";
	import { changeAttributeMinMax } from '@/lib/features/filters/filtersetUtils';
	import RadioGroup from '@/components/ui/input/selectgroup/RadioGroup.svelte';
	import { QuestArType } from '@/lib/features/filters/filterUtilsQuest';

	let {
		data
	}: {
		data: FiltersetRaid
	} = $props();

	let thisValues: RaidFilterShow[] = $derived(data.show ? data.show : [])
</script>

<div class="mt-4 px-1">
	<div class="text-base font-semibold mb-2">
		{m.raid_show()}
	</div>

	<ToggleGroup
		childCount={2}
		values={thisValues}
		onchange={(values: RaidFilterShow[]) => {
			if (values.length === 1) {
				data.show = values
			} else {
				delete data.show
			}
			thisValues = values
		}}
		class="w-full"
	>
		<SelectGroupItem
			type="toggle"
			value="egg"
			class="p-2 w-full"
		>
			{m.raid_show_eggs()}
		</SelectGroupItem>
		<SelectGroupItem
			type="toggle"
			value="boss"
			class="p-2 w-full"
		>
			{m.raid_show_bosses()}
		</SelectGroupItem>
	</ToggleGroup>
</div>