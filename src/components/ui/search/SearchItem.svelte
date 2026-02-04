<script lang="ts">
	import LucideIcon from "@/components/utils/LucideIcon.svelte";
	import type { Snippet } from "svelte";
	import type { FuzzyMatches, FuzzyResult } from "@nozbe/microfuzz";
	import { type AnySearchEntry, highlightSearchMatches } from "@/lib/services/search.svelte";
	import { Command } from "bits-ui";
	import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
	import { m } from "@/lib/paraglide/messages";

	let {
		onselect,
		result,
		imageUrl,
		fortImage = false
	}: {
		onselect: () => void,
		result: FuzzyResult<AnySearchEntry>,
		imageUrl?: string,
		fortImage?: boolean
	} = $props()

	function onselectProxy() {
		onselect()
		getUserSettings().recentSearches = getUserSettings().recentSearches.filter(s => s.key !== result.item.key)
		getUserSettings().recentSearches.unshift(result.item)
		getUserSettings().recentSearches.slice(0, 20)
		updateUserSettings()
	}
</script>

<Command.Item
	class="data-selected:bg-accent data-selected:text-accent-foreground py-1.5 px-2 rounded-sm cursor-pointer ring-offset-background focus-visible:ring-ring items-center gap-1.5 justify-center whitespace-nowrap text-sm font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
	onSelect={onselectProxy}
	value={result.item.key}
>
	<div class="w-full flex gap-2 items-center text-start">
		{#if result.item.icon}
			<LucideIcon class="shrink-0 size-4 mx-0.5" name={result.item.icon} />
		{/if}
		{#if imageUrl || result.item.imageUrl}
			<img
				class="size-5 shrink-0"
				class:rounded-full={fortImage}
				class:object-cover={fortImage}
				class:object-contain={!fortImage}
				src={imageUrl ?? result.item.imageUrl}
				alt={result.item.name}
				loading="lazy"
			>
		{/if}
		<span class="shrink-1 overflow-hidden text-ellipsis" {@attach highlightSearchMatches(result.matches[0])}>
			{result.item.name}
		</span>
		<span
			class="text-muted-foreground shrink-0 ml-auto overflow-x-hidden text-right font-normal!"
			{@attach highlightSearchMatches(result.matches[1])}
		>
			{m[result.item.category]?.() ?? ""}
		</span>
	</div>
</Command.Item>