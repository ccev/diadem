<script lang="ts">
	import { filterColors } from "@/lib/features/filters/colors";
	import { slide } from "svelte/transition";
	import type { Snippet } from "svelte";

	let {
		class: class_ = "",
		children
	}: {
		class?: string;
		children: Snippet;
	} = $props();

	const color = filterColors.yellow;
</script>

<div
	class="grid gap-1 text-xs font-semibold {class_}"
	style:grid-template-columns="repeat(auto-fill, minmax(5rem, 1fr))"
	style:--color-attr-chip-border="var({color.border})"
	style:--color-attr-chip-bg="var({color.bg})"
	style:--color-attr-chip-text="var({color.text})"
	style:--color-attr-chip-dark-border="var({color.dark.border})"
	style:--color-attr-chip-dark-bg="var({color.dark.bg})"
	style:--color-attr-chip-dark-text="var({color.dark.text})"
	transition:slide={{ duration: 90 }}
>
	{@render children()}
</div>
