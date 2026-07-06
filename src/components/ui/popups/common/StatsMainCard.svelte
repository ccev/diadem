<script lang="ts">
	import type { Snippet } from "svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";

	let {
		class: class_ = "",
		children
	}: {
		class?: string,
		children: Snippet
	} = $props()
</script>

<BasicMainCard class="space-y-3 {class_}">
	{@render children()}
</BasicMainCard>
