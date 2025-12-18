<script lang="ts">
	import * as m from "@/lib/paraglide/messages";
	import ToggleGroup from "@/components/ui/input/selectgroup/ToggleGroup.svelte";
	import SelectGroupItem from "@/components/ui/input/selectgroup/SelectGroupItem.svelte";
	import { type FiltersetRaid, type RaidFilterShow } from "@/lib/features/filters/filtersets";

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