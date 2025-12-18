<script lang="ts">
	import Card from '@/components/ui/Card.svelte';
	import type { Snippet } from 'svelte';

	let {
		class: class_ = "",
		label,
		value = undefined,
		children = undefined
	}: {
		class?: string
		label: string
		value?: string
		children?: Snippet
	} = $props()
</script>

<Card class="w-fit px-5 py-3 {class_}">
	<p class="text-sm">
		{label}
	</p>
	{#if value}
		<p class="text-xl font-semibold">
			{value}
		</p>
	{/if}
	{@render children?.()}
</Card>