<script lang="ts">
	import { getDefaultIconSet, getUserSettings } from '@/lib/services/userSettings.svelte.js';
	import { getConfig } from '@/lib/services/config/config';
	import type { MapData, MapObjectType } from '@/lib/types/mapObjectData/mapObjects';
	import MenuGeneric from '@/components/menus/MenuGeneric.svelte';
	import * as m from '@/lib/paraglide/messages';
	import RadioGroup from '@/components/ui/input/RadioGroup.svelte';
	import VerticalRadioGroupItem from '@/components/ui/input/VerticalRadioGroupItem.svelte';
	import { onIconChange } from '@/lib/services/settings';
	import { getIconForMap } from '@/lib/services/uicons.svelte';

	let {
		title,
		type,
		getIconParams = {}
	}: {
		title: string
		type: MapObjectType
		getIconParams?: Partial<MapData>
	} = $props();

	function getUiconSets(type: MapObjectType) {
		const allSets = getConfig().uiconSets.filter(s => s[type]);
		const defaultSetId = getDefaultIconSet(type);
		const index = allSets.findIndex(s => s.id === defaultSetId.id);
		if (index > 0) {
			const [defaultSet] = allSets.splice(index, 1);
			allSets.unshift(defaultSet);
		}
		return allSets.map(s => {
			return {
				value: s.id,
				label: s.id === defaultSetId.id ? m.default_() : (s[type]?.name ?? s.name)
			};
		});
	}
</script>

{#if getUiconSets(type).length > 1}
	<MenuGeneric {title}>
		<RadioGroup
			childCount={getUiconSets(type).length}
			value={getUserSettings().uiconSet[type].id}
			onValueChange={(value) => onIconChange(value, type)}
			evenColumns={false}
		>
			{#each getUiconSets(type) as iconSet (iconSet.value)}
				<VerticalRadioGroupItem class="p-4" value={iconSet.value}>
					<img
						class="w-5"
						src={getIconForMap({type, ...getIconParams}, iconSet.value)}
						alt="{title} (Style: {iconSet.label})"
					>
					{iconSet.label}
				</VerticalRadioGroupItem>
			{/each}
		</RadioGroup>
	</MenuGeneric>
{/if}