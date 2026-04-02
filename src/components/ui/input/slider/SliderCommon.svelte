<script lang="ts">
	import { Slider, type ThumbItem, type TickItem } from "bits-ui";

	let {
		thumbItems,
		tickItems,
		labels = undefined
	}: {
		thumbItems: ThumbItem[];
		tickItems: TickItem[];
		labels?: { [key: number]: string };
	} = $props();
</script>

<span class="relative h-2 w-full grow cursor-pointer overflow-hidden rounded-full bg-accent">
	<Slider.Range class="bg-foreground absolute h-full z-1" />
</span>

{#each thumbItems as { index } (index)}
	<Slider.Thumb
		{index}
		class="border-border-input bg-background focus-visible:ring-foreground dark:bg-foreground z-5 focus-visible:outline-hidden data-active:scale-90 transition-transform block size-6 cursor-pointer rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
	/>
{/each}

{#if labels}
	{#each tickItems as { index, value } (index)}
		<Slider.TickLabel
			position="bottom"
			{index}
			class="text-muted-foreground data-selected:text-foreground data-selected:font-semibold text-sm mt-4 leading-none cursor-pointer"
		>
			{labels[value]}
		</Slider.TickLabel>
	{/each}
{/if}
