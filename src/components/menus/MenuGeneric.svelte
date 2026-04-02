<script lang="ts">
	import MenuTitle from "@/components/menus/MenuTitle.svelte";
	import type { Snippet } from "svelte";

	let {
		title,
		description = "",
		children
	}: {
		title: string;
		description?: string;
		children: Snippet;
	} = $props();
</script>

<div class="py-3 px-4 w-full flex flex-col gap-2">
	<MenuTitle {title} {description} />

	{@render children()}
</div>
