<script lang="ts">
	import type { Snippet } from "svelte";
	import type { LucideIcon } from "$lib/types/lucide";

	let {
		Icon = undefined,
		title,
		children,
		rightPart,
		disabled = false
	}: {
		Icon?: LucideIcon
		title: string,
		children: Snippet,
		rightPart?: Snippet,
		disabled?: boolean
	} = $props();
</script>

<section class:opacity-50={disabled}>
	<div class="flex justify-between gap-2 items-center mb-2">
		<h2 class="flex items-center gap-1.5 font-semibold">
			{#if Icon}
				<Icon class="size-3.5" />
			{/if}
			{title}
		</h2>
		{#if rightPart}
			{@render rightPart()}
		{/if}
	</div>
	{@render children()}
</section>