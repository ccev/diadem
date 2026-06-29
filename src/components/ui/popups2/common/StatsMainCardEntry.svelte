<script lang="ts">
	import type { LucideIcon } from "$lib/types/lucide";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import type { Snippet } from "svelte";

	let {
		Icon,
		name,
		value
	}: {
		Icon?: LucideIcon
		name: any | Snippet,
		value: any | Snippet,
	} = $props();
</script>

<div class="flex justify-between">
	{#if typeof name === "function"}
		{@render name()}
	{:else}
		<div class="flex gap-1.5 text-muted-foreground items-center">
			{#if Icon}
				<Icon class="size-3.5" />
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