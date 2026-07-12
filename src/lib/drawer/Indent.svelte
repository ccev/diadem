<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { getDrawerProviderContext } from "./context.svelte.js";
	let { children, style, ...props }: HTMLAttributes<HTMLDivElement> & { children?: Snippet } =
		$props();
	const provider = getDrawerProviderContext();
</script>

<div
	{...props}
	data-active={provider?.active ? "" : undefined}
	data-inactive={!provider?.active ? "" : undefined}
	style:--drawer-swipe-progress={provider?.swipeProgress ?? 0}
	style:--drawer-height={`${provider?.frontmostHeight ?? 0}px`}
	{style}
>
	{@render children?.()}
</div>
