<script lang="ts">
	import { Slider } from "bits-ui";
	import SliderCommon from "@/components/ui/input/slider/SliderCommon.svelte";

	let {
		onchange,
		value,
		steps,
		labels
	}: {
		onchange: (value: number) => void;
		value: number;
		steps: number[];
		labels: { [key: number]: string };
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
		{#snippet children({ tickItems, thumbItems })}
			<SliderCommon {tickItems} {thumbItems} {labels} />
		{/snippet}
	</Slider.Root>
</div>
