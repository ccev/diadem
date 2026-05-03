<script lang="ts">
	import type { Component, Snippet } from "svelte";
	import type { LucideIcon } from "@/lib/types/lucide";

	let {
		Icon,
		children,
		class: class_ = ""
	}: {
		Icon: LucideIcon | Component;
		children: Snippet;
		class?: string
	} = $props();
</script>

<div class="flex {class_}">
	<Icon class="shrink-0 size-4 mt-1" />

	<div class="ml-1.5">
		{@render children()}
	</div>
</div>
