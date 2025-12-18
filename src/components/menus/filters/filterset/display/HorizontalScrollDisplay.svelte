<script lang="ts">
	import AttributeDisplay from "@/components/menus/filters/filterset/display/AttributeDisplay.svelte";
	import type { Snippet } from "svelte";

	let {
		label,
		children
	}: {
		label: string
		children: Snippet
	} = $props();
</script>

<AttributeDisplay
	{label}
	class="w-full pb-0!"
>
	<div class="flex overflow-x-auto gap-2 pb-3 mt-2">
		{@render children()}
	</div>
</AttributeDisplay>