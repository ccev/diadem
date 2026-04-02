<script lang="ts">
	import SliderRange from "@/components/ui/input/slider/SliderRange.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { pokemonSizes } from "@/lib/utils/pokemonUtils";
	import ToggleGroup from "@/components/ui/input/selectgroup/ToggleGroup.svelte";
	import SelectGroupItem from "@/components/ui/input/selectgroup/SelectGroupItem.svelte";
	import { Camera, CameraOff, CircleSmall, Mars, Venus } from "lucide-svelte";
	import {
		type FiltersetPokemon,
		type FiltersetQuest,
		type MinMax
	} from "@/lib/features/filters/filtersets";
	import { changeAttributeMinMax } from "@/lib/features/filters/filtersetUtils";
	import RadioGroup from "@/components/ui/input/selectgroup/RadioGroup.svelte";
	import { QuestArType } from "@/lib/features/filters/filterUtilsQuest";
	import { RewardType, rewardTypeLabel } from "@/lib/utils/pokestopUtils";

	let {
		data
	}: {
		data: FiltersetQuest;
	} = $props();

	const filterableRewards = [
		RewardType.POKEMON,
		RewardType.ITEM,
		RewardType.STARDUST,
		RewardType.MEGA_ENERGY,
		RewardType.XP,
		RewardType.CANDY
	];
</script>

<div class="">
	<div class="text-base font-semibold mb-2">
		{m.reward()}
	</div>

	<RadioGroup
		childCount={filterableRewards.length}
		value={data.rewardType}
		onValueChange={(value: RewardType) => {
			if (data.rewardType === value) {
				delete data.rewardType;
			} else {
				data.rewardType = value;
			}
		}}
		class="w-full gap-3!"
	>
		{#each filterableRewards as rewardType}
			<SelectGroupItem type="radio" value={rewardType} class="p-2 w-full">
				{rewardTypeLabel(rewardType)}
			</SelectGroupItem>
		{/each}
	</RadioGroup>
</div>
