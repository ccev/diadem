<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { X } from "lucide-svelte";
	import * as m from "@/lib/paraglide/messages";
	import { updateDetailsCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte";
	import { filterColors } from "@/lib/features/filters/colors";

	let {
		label = undefined,
		isEmpty = false,
		color = "yellow",
		onremove = () => {}
	}: {
		label?: string;
		isEmpty: boolean;
		color?: "yellow" | "muted";
		onremove?: () => void;
	} = $props();

	function onclick(event: MouseEvent) {
		event.stopPropagation();
		onremove();
		updateDetailsCurrentSelectedFilterset();
	}

	let actualColor = $derived(filterColors[isEmpty ? "muted" : color]);
</script>

<div
	class="pl-2 rounded-sm border w-fit flex items-stretch attribute-chip"
	class:pr-2={isEmpty}
	style:--color-attr-chip-border="var({actualColor.border})"
	style:--color-attr-chip-bg="var({actualColor.bg})"
	style:--color-attr-chip-text="var({actualColor.text})"
	style:--color-attr-chip-dark-border="var({actualColor.dark.border})"
	style:--color-attr-chip-dark-bg="var({actualColor.dark.bg})"
	style:--color-attr-chip-dark-text="var({actualColor.dark.text})"
>
	<span class="py-1">
		{#if isEmpty}
			{m.any()}
		{:else}
			{label}
		{/if}
	</span>
	{#if !isEmpty}
		<Button
			class="h-auto! w-auto! px-2! p-0! attribute-chip-button"
			variant=""
			size="icon"
			style=""
			{onclick}
		>
			<X size="14" />
		</Button>
	{/if}
</div>

<style>
	.attribute-chip {
		background-color: var(--color-attr-chip-bg);
		color: var(--color-attr-chip-text);
		border-color: var(--color-attr-chip-border);
	}

	:global(.dark .attribute-chip) {
		background-color: var(--color-attr-chip-dark-bg);
		color: var(--color-attr-chip-dark-text);
		border-color: var(--color-attr-chip-dark-border);
	}

	:global(.attribute-chip-button:hover),
	:global(.attribute-chip-button:active) {
		background-color: color-mix(in oklab, var(--color-attr-chip-border) 50%, transparent);
	}

	:global(.dark .attribute-chip-button:hover),
	:global(.dark .attribute-chip-button:active) {
		background-color: color-mix(in oklab, var(--color-attr-chip-dark-border) 90%, transparent);
	}
</style>
