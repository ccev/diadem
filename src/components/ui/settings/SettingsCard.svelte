<script lang="ts">
	import Card from '@/components/ui/Card.svelte';
	import type { Snippet } from 'svelte';

	let {
		title,
		children
	}: {
		title: Snippet,
		children: Snippet
	} = $props()
</script>

<Card class="pt-4 pb-2 px-2 mx-2">
	<h1 class="font-bold text-lg tracking-tight flex items-center gap-2 mb-2 mx-4 shadow-none">
		{@render title()}
	</h1>
	{@render children()}
</Card>