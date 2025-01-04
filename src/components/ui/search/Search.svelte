<script lang="ts">
	import { getConfig } from '@/lib/config.js';
	import Card from '@/components/ui/Card.svelte';
	import { isModalOpen } from '@/lib/modal.svelte';
	import { onMount } from 'svelte';
	import Button from '@/components/ui/Button.svelte';

	let {
		onjump
	}: {
		onjump: (center: number[], zoom: number) => void
	} = $props()

	let inputElement: HTMLInputElement | undefined = $state()
	onMount(() => {
		inputElement?.focus()
	})
</script>

<Card class="px-6 py-4 shadow-none!">
	<input
		bind:this={inputElement}
		class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
	>
	<div class="grid grid-cols-2">
		{#each getConfig().areas as area (area.name)}
			<Button
				variant="ghost"
				class="text-center"
				onclick={() => onjump(area.center, area.zoom)}
			>
				{area.name}
			</Button>
		{/each}
	</div>
</Card>