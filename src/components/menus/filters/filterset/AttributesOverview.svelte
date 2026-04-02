<script lang="ts">
	import Card from "@/components/ui/Card.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import { ChevronRight } from "lucide-svelte";
	import type { Snippet } from "svelte";

	let {
		children
	}: {
		children: Snippet;
	} = $props();
</script>

<Card
	class="w-full text-sm divide-y-border divide-y grid"
	style="grid-template-columns: auto 1fr auto"
>
	{@render children()}
</Card>
