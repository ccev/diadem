<script lang="ts">
	import Card from '@/components/ui/Card.svelte';
	import { Pencil } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import type { Snippet } from 'svelte';
	import { isFilterPageTransitionReverse } from '@/lib/ui/filtersetPages.svelte';
	import Button from '@/components/ui/input/Button.svelte';

	let {
		overview
	}: {
		overview: Snippet
	} = $props();
</script>

<div
	class="w-full absolute top-0 h-[calc(100%-3rem)] overflow-y-auto"
	transition:fly={{duration: 100, x: isFilterPageTransitionReverse ? -80 : 80}}
>
	<Card class="w-full text-sm divide-y-border divide-y mb-3 flex gap-2">
		<Button
			class="w-full! h-full! justify-start py-3! px-4! gap-4"
			variant="ghost"

		>
			<div
				class="rounded-full bg-accent size-10 border flex items-center justify-center relative"
			>
			<span class="text-lg">
				💯
			</span>
			</div>
			<div class="flex items-center gap-2 text-base">
				<b>Filter Title</b>
			</div>
			<Pencil class="ml-auto" size="14" />

		</Button>

	</Card>

	<div class="space-y-3">
		{@render overview()}
	</div>
</div>
