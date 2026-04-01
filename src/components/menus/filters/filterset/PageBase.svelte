<script lang="ts">
	import { fly } from "svelte/transition";
	import { getFiltersetPageTransition } from "@/lib/features/filters/filtersetPages.svelte";
	import { getCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte";
	import { filterTitle, getModifierPreviewIcon } from "@/lib/features/filters/filtersetUtils";
	import FiltersetIcon from "@/lib/features/filters/FiltersetIcon.svelte";
	import type { Snippet } from "svelte";
	import * as m from "@/lib/paraglide/messages";
	import ModifierPreview from "./modifiers/ModifierPreview.svelte";
	import Seperator from "@/components/ui/Seperator.svelte";

	let {
		base
	}: {
		base: Snippet;
	} = $props();

	let filterset = $derived(getCurrentSelectedFilterset());
	let data = $derived(filterset?.data);

	let previewIconUrl = $derived(data ? getModifierPreviewIcon(data) : undefined);
</script>

<div
	class="flex flex-col"
	in:fly={getFiltersetPageTransition().in}
	out:fly={getFiltersetPageTransition().out}
>
	<div class="flex gap-4 items-center px-2 mt-4">
		<FiltersetIcon filterset={$state.snapshot(getCurrentSelectedFilterset()?.data)} size={8} />
		<span class="text-lg font-semibold">
			{filterTitle($state.snapshot(getCurrentSelectedFilterset()?.data))}
		</span>
	</div>

	{#if data.modifiers}
		<Seperator class="my-3" text="Map Preview" />
		<div class="w-full">
			<ModifierPreview modifiers={data.modifiers} iconUrl={previewIconUrl} filterset={data} />
		</div>
	{/if}

	<Seperator class="my-3" text={m.filter_attributes()} />

	{#if filterset?.data}
		<div class="overflow-y-auto">
			{@render base()}
		</div>
	{/if}
</div>
