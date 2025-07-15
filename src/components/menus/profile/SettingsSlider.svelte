<script lang="ts">
	import { Slider } from 'bits-ui';

	let {
		onchange,
		value,
		steps,
		labels
	}: {
		onchange: (value: number) => void,
		value: number,
		title: string,
		steps: number[],
		labels: { [key: number]: string }
	} = $props();
</script>

<div class="pb-10 pt-2 px-1">
	<Slider.Root
		{value}
		type="single"
		step={steps}
		class="relative flex w-full touch-none select-none items-center"
		trackPadding={3}
		onValueChange={onchange}
	>
		{#snippet children({ tickItems })}
		  <span
			  class="relative h-2 w-full grow cursor-pointer overflow-hidden rounded-full bg-accent"
		  >
			<Slider.Range class="bg-foreground absolute h-full z-1" />
		  </span>
			<Slider.Thumb
				index={0}
				class="border-border-input bg-background focus-visible:ring-foreground dark:bg-foreground z-5 focus-visible:outline-hidden data-active:scale-90 transition-transform block size-6 cursor-pointer rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
			/>
			{#each tickItems as { index, value } (index)}
				<Slider.Tick
					{index}
					class="bg-accent h-4 w-2 rounded-full self-start"
				/>
				<Slider.TickLabel
					position="bottom"
					{index}
					class="text-muted-foreground data-selected:text-foreground data-selected:font-semibold text-sm mt-4 leading-none cursor-pointer"
				>
					{labels[value]}
				</Slider.TickLabel>
			{/each}
		{/snippet}
	</Slider.Root>
</div>