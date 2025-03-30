<script lang="ts">
	import { ToggleGroup as ToggleGroupPrimitive } from 'bits-ui';
	import FilterTypeSelectItem from './FilterTypeSelectItem.svelte';
	import { Eye, EyeOff, Filter } from 'lucide-svelte';
	import type { FilterCategory } from '@/lib/filters/filters';
	import { getUserSettings, updateUserSettings } from '@/lib/userSettings.svelte';

	let { category }: { category: FilterCategory } = $props()

	function onValueChange(newType: string) {
		getUserSettings().filters[category].type = newType
		updateUserSettings()
	}
</script>

<ToggleGroupPrimitive.Root
	value={getUserSettings().filters[category].type}
	class="grid grid-cols-3 gap-3"
	{onValueChange}
>
	<FilterTypeSelectItem value="all">
		<Eye size="16" />
		<span>All</span>
	</FilterTypeSelectItem>
	<FilterTypeSelectItem value="none">
		<EyeOff size="16" />
		<span>None</span>
	</FilterTypeSelectItem>
	<FilterTypeSelectItem value="filtered">
		<Filter size="16" />
		<span>Filtered</span>
	</FilterTypeSelectItem>
</ToggleGroupPrimitive.Root>
