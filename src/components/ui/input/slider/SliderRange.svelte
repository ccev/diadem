<script lang="ts">
	import { Slider } from "bits-ui";
	import NumberInput from "@/components/ui/input/NumberInput.svelte";
	import Input from "@/components/ui/input/Input.svelte";
	import SliderCommon from "@/components/ui/input/slider/SliderCommon.svelte";

	let {
		min,
		max,
		step = 1,
		title,
		onchange = () => {},
		valueMin = $bindable(),
		valueMax = $bindable(),
		labels = undefined
	}: {
		min: number;
		max: number;
		step?: number;
		title: string;
		onchange?: (value: number[]) => void;
		valueMin: number;
		valueMax: number;
		labels?: { [key: number]: string };
	} = $props();
</script>

<div class="py-3 px-1" class:pb-10={Boolean(labels)}>
	<div class="flex w-full mb-3 items-center">
		<span class="font-semibold text-base">
			{title}
		</span>
		{#if labels}
			<div class="ml-auto border rounded-md py-1 divide-x divide-border flex">
				<div class="px-3 w-14 text-center">
					{labels[valueMin] ?? valueMin}
				</div>
				<div class="px-3 w-14 text-center">
					{labels[valueMax] ?? valueMax}
				</div>
			</div>
		{:else}
			<div class="ml-auto flex gap-1">
				<Input
					class="w-20 text-center"
					type="number"
					value={valueMin}
					onchange={(e) => {
						valueMin = Number(e.target?.value ?? min);
						onchange([valueMin, valueMax]);
					}}
				/>
				<Input
					class="w-20 text-center"
					type="number"
					value={valueMax}
					onchange={(e) => {
						valueMax = Number(e.target?.value ?? max);
						onchange([valueMin, valueMax]);
					}}
				/>
			</div>
		{/if}
	</div>

	<Slider.Root
		bind:value={
			() => [valueMin, valueMax],
			(v) => {
				valueMin = v[0];
				valueMax = v[1];
			}
		}
		type="multiple"
		class="relative flex w-full touch-none select-none items-center"
		{step}
		{min}
		{max}
		onValueChange={onchange}
	>
		{#snippet children({ thumbItems, tickItems })}
			<SliderCommon {tickItems} {thumbItems} {labels} />
		{/snippet}
	</Slider.Root>
</div>
