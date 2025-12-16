<script lang="ts">
	import RadioGroup from "@/components/ui/input/selectgroup/RadioGroup.svelte";
	import SelectGroupItem from "@/components/ui/input/selectgroup/SelectGroupItem.svelte";
	import type { RaidFilterType } from "@/lib/utils/gymUtils";
	import type { FiltersetRaid } from "@/lib/features/filters/filtersets";

	let {
		data,
		filterType = $bindable()
	}: {
		data: FiltersetRaid
		filterType: RaidFilterType
	} = $props();
</script>

<div>
	<div class="text-base font-semibold mb-2">
		Filter by
	</div>

	<RadioGroup
		childCount={2}
		value={filterType}
		onValueChange={(value: RaidFilterType) => {
			filterType = value

			if (value === "level") {
				delete data.bosses
			} else {
				delete data.levels
				delete data.show
			}
		}}
		class="w-full"
	>
		<SelectGroupItem
			type="radio"
			value="level"
			class="p-2 w-full"
		>
			Raid Level
		</SelectGroupItem>
		<SelectGroupItem
			type="radio"
			value="boss"
			class="p-2 w-full"
		>
			Raid Boss
		</SelectGroupItem>
	</RadioGroup>
</div>