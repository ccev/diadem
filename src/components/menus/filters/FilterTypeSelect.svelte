<script lang="ts">
	import { Eye, EyeOff, Funnel } from 'lucide-svelte';
	import type { FilterCategory, FilterType } from '@/lib/filters/filters';
	import { getUserSettings, updateUserSettings } from '@/lib/userSettings.svelte.js';
	import RadioGroup from '@/components/ui/basic/RadioGroup.svelte';
	import RadioGroupItem from '@/components/ui/basic/RadioGroupItem.svelte';
	import { updateFeatures } from '@/lib/map/featuresGen.svelte';
	import { getMapObjects } from '@/lib/mapObjects/mapObjectsState.svelte';
	import { updateAllMapObjects } from '@/lib/mapObjects/updateMapObject';

	let { category }: { category: FilterCategory } = $props()

	function onValueChange(newType: string) {
		getUserSettings().filters[category].type = newType as FilterType
		updateUserSettings()
		updateAllMapObjects().then();
	}
</script>

<RadioGroup
	class="gap-3! w-full"
	value={getUserSettings().filters[category].type}
	{onValueChange}
>
	<RadioGroupItem value="all" class="py-2">
		<Eye size="16" />
		<span>All</span>
	</RadioGroupItem>
	<RadioGroupItem value="none" class="py-2">
		<EyeOff size="16" />
		<span>None</span>
	</RadioGroupItem>
	<RadioGroupItem value="filtered" class="py-2">
		<Funnel size="16" />
		<span>Filtered</span>
	</RadioGroupItem>
</RadioGroup>
