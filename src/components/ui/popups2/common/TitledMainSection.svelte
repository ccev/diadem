<script lang="ts">
	import type { Snippet } from "svelte";
	import type { LucideIcon } from "$lib/types/lucide";

	let {
		Icon = undefined,
		title,
		children,
		rightPart
	}: {
		Icon?: LucideIcon
		title: string,
		children: Snippet,
		rightPart?: Snippet
	} = $props();
</script>

<section>
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