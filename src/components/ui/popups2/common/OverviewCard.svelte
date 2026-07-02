<script lang="ts">
	import type { Snippet } from "svelte";
	import type { LucideIcon } from "$lib/types/lucide";

	let {
		Icon,
		title,
		children,
		value
	}: {
		Icon?: LucideIcon,
		title: string,
		children?: Snippet,
		value?: Snippet | any
	} = $props();
</script>

<div class="border bg-accent border-border rounded-lg px-4 py-2 max-w-64">
	<h2 class="flex items-center gap-1 text-muted-foreground text-sm font-semibold mb-1">
		{#if Icon}
			<Icon class="size-3.5" />
		{/if}
		{title}
	</h2>

	{#if children}
		{@render children()}
	{/if}

	{#if value}
		<p
			class="font-semibold text-xl"
		>
			{#if typeof value === "function"}
				{@render value()}
			{:else}
				{value}
			{/if}
		</p>
	{/if}
</div>