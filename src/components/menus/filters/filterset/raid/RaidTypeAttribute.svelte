<script lang="ts">
	import RadioGroup from "@/components/ui/input/selectgroup/RadioGroup.svelte";
	import SelectGroupItem from "@/components/ui/input/selectgroup/SelectGroupItem.svelte";
	import type { RaidFilterType } from "@/lib/utils/gymUtils";
	import type { FiltersetRaid } from "@/lib/features/filters/filtersets";
	import * as m from "@/lib/paraglide/messages";
	import { updateDetailsCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte";

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
		{m.raid_filter_by()}
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

			updateDetailsCurrentSelectedFilterset()
		}}
		class="w-full"
	>
		<SelectGroupItem
			type="radio"
			value="level"
			class="p-2 w-full"
		>
			{m.raid_filter_by_level()}
		</SelectGroupItem>
		<SelectGroupItem
			type="radio"
			value="boss"
			class="p-2 w-full"
		>
			{m.raid_filter_by_boss()}
		</SelectGroupItem>
	</RadioGroup>
</div>