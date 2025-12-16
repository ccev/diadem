<script lang="ts">
	import { RAID_LEVELS } from "@/lib/utils/gymUtils";
	import { mRaid } from "@/lib/services/ingameLocale";
	import type { FiltersetRaid } from "@/lib/features/filters/filtersets";
	import ToggleGroup from "@/components/ui/input/selectgroup/ToggleGroup.svelte";
	import SelectGroupItem from "@/components/ui/input/selectgroup/SelectGroupItem.svelte";
	import { getIconRaidEgg } from "@/lib/services/uicons.svelte";
	import { resize } from "@/lib/services/assets";

	let {
		data
	}: {
		data: FiltersetRaid
	} = $props();
</script>

<ToggleGroup
	class="grid-cols-2! w-full max-h-120 overflow-y-auto px-1 py-1"
	childCount={RAID_LEVELS.length}
	evenColumns={false}
	values={data.levels?.map(String) ?? []}
	onchange={(values) => {
		if (values.length > 0) {
			data.levels = values.map(Number).sort((a, b) => a - b)
		} else {
			delete data.levels
		}
	}}
>
	{#each RAID_LEVELS as raidLevel}
		<SelectGroupItem
			class="w-full h-16!"
			type="toggle"
			value={raidLevel.toString()}
		>
			<img
				class="w-5"
				src={resize(getIconRaidEgg(raidLevel), { width: 64 })}
				alt={mRaid(raidLevel, true)}
			>
			{mRaid(raidLevel, true)}
		</SelectGroupItem>
	{/each}
</ToggleGroup>
