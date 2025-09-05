<script lang="ts">
	import Card from '@/components/ui/Card.svelte';
	import type { Snippet } from 'svelte';
	import type { LucideIcon } from '@/lib/types/lucide';
	import * as m from '@/lib/paraglide/messages';
	import { Image } from 'lucide-svelte';

	let {
		title,
		Icon,
		children
	}: {
		title?: string,
		Icon?: LucideIcon
		children: Snippet
	} = $props();
</script>

<Card class="pt-4 pb-2 px-2">
	{#if title}
		<h1 class="font-bold text-base tracking-tight flex items-center gap-2 mb-2 mx-4 shadow-none">
			{#if Icon}
				<Icon size="18" />
			{/if}
			{title}
		</h1>
	{/if}
	{@render children()}
</Card>