<script lang="ts">
	import RadioGroup from "@/components/ui/input/selectgroup/RadioGroup.svelte";
	import SelectGroupItem from "@/components/ui/input/selectgroup/SelectGroupItem.svelte";
	import type { FiltersetInvasion } from "@/lib/features/filters/filtersets";
	import * as m from "@/lib/paraglide/messages";
	import { updateDetailsCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte";

	import { InvasionFilterType } from "@/lib/features/filters/filterUtilsInvasion";

	let {
		data,
		filterType = $bindable()
	}: {
		data: FiltersetInvasion
		filterType: InvasionFilterType
	} = $props();
</script>

<div>
	<div class="text-base font-semibold mb-2">
		{m.invasion_filter_by()}
	</div>

	<RadioGroup
		childCount={2}
		value={filterType}
		onValueChange={(value: InvasionFilterType) => {
			filterType = value

			if (value === InvasionFilterType.CHARACTERS) {
				delete data.rewards
			} else {
				delete data.characters
			}

			updateDetailsCurrentSelectedFilterset()
		}}
		class="w-full"
	>
		<SelectGroupItem
			type="radio"
			value={InvasionFilterType.CHARACTERS}
			class="p-2 w-full"
		>
			{m.invasion_filter_by_character()}
		</SelectGroupItem>
		<SelectGroupItem
			type="radio"
			value={InvasionFilterType.REWARDS}
			class="p-2 w-full"
		>
			{m.invasion_filter_by_reward()}
		</SelectGroupItem>
	</RadioGroup>
</div>