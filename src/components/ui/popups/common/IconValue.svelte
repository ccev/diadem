<script lang="ts">
	import type { Component, Snippet } from "svelte";
	import type { LucideIcon } from "@/lib/types/lucide";

	let {
		Icon,
		children
	}: {
		Icon: LucideIcon | Component;
		children: Snippet;
	} = $props();
</script>

<div class="flex">
	<Icon class="shrink-0 size-4 mt-1" />

	<div class="ml-1.5">
		{@render children()}
	</div>
</div>
