<script lang="ts">
	import type { LucideIcon } from "$lib/types/lucide";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import type { Snippet } from "svelte";

	let {
		class: class_ = "",
		Icon,
		name,
		value
	}: {
		class?: string,
		Icon?: LucideIcon
		name: any | Snippet,
		value: any | Snippet,
	} = $props();
</script>

<div class="flex justify-between *:last:text-right gap-2 {class_}">
	{#if typeof name === "function"}
		{@render name()}
	{:else}
		<div class="flex gap-1.5 items-center text-muted-foreground">
			{#if Icon}
				<Icon class="size-3.5 shrink-0" />
			{/if}
			{name}
		</div>
	{/if}

	{#if typeof value === "function"}
		{@render value()}
	{:else}
		<span>
			{value}
		</span>
	{/if}
</div>