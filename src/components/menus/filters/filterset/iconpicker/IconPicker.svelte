<script lang="ts">
	import type { AnyFilterset } from "@/lib/features/filters/filtersets";
	import { IconCategory } from "@/lib/features/filters/icons";
	import {
		filtersetPageSaveSimple,
		getFiltersetPageTransition
	} from "@/lib/features/filters/filtersetPages.svelte";
	import Tabs from "@/components/ui/input/Tabs.svelte";
	import IconGrid from "./IconGrid.svelte";
	import {
		type IconPickerTab,
		type IconPickerItem,
		PICKER_TABS,
		getAllIconsByTab,
		getAllSearchableEmojis,
		isValidSingleEmoji
	} from "./iconPickerData";
	import * as m from "@/lib/paraglide/messages";
	import { fly } from "svelte/transition";
	import { mAny } from "@/lib/utils/anyMessage";

	let {
		data
	}: {
		data: AnyFilterset;
	} = $props();

	let activeTab: IconPickerTab = $state("emoji");
	let searchQuery = $state("");

	const allIcons = getAllIconsByTab();

	let displayItems = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();

		if (!query) {
			return allIcons[activeTab];
		}

		// Search across all categories in tab order, emojis last
		const results: IconPickerItem[] = [];

		// Non-emoji tabs first, in PICKER_TABS order
		for (const tab of PICKER_TABS) {
			if (tab.id === "emoji") continue;
			for (const item of allIcons[tab.id]) {
				if (item.label.toLowerCase().includes(query)) {
					results.push(item);
				}
			}
		}

		// Emojis last — if input is a valid emoji, show it first among emojis
		if (isValidSingleEmoji(searchQuery.trim())) {
			const emoji = searchQuery.trim();
			results.push({
				key: `custom-emoji-${emoji}`,
				emoji,
				label: emoji,
				category: "emoji",
				params: { emoji }
			});
		}

		for (const item of getAllSearchableEmojis()) {
			if (item.label.toLowerCase().includes(query)) {
				results.push(item);
			}
		}

		return results;
	});

	function selectItem(item: IconPickerItem) {
		if (item.category === "emoji") {
			const emoji = item.emoji ?? item.params.emoji;
			data.icon = { isUserSelected: true, emoji };
			delete data.icon.uicon;
		} else {
			data.icon = { isUserSelected: true, uicon: { category: item.category, params: item.params } };
			delete data.icon.emoji;
		}
		filtersetPageSaveSimple();
	}
</script>

<div in:fly={getFiltersetPageTransition().in} out:fly={getFiltersetPageTransition().out}>
	<input
		class="mt-1 border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full h-11 rounded-md border px-3 py-2 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 mb-2"
		type="search"
		placeholder={m.icon_search_placeholder()}
		value={searchQuery}
		oninput={(e) => (searchQuery = e.currentTarget.value)}
	/>

	{#if !searchQuery.trim()}
		<Tabs
			tabs={PICKER_TABS.map((t) => ({ value: t.id, label: mAny(t.labelKey) }))}
			bind:value={activeTab}
		/>
	{/if}

	<IconGrid items={displayItems} onselect={selectItem} />
</div>
