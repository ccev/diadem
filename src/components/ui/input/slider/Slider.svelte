<script lang="ts">
	import { Slider } from "bits-ui";
	import NumberInput from "@/components/ui/input/NumberInput.svelte";
	import Input from "@/components/ui/input/Input.svelte";
	import SliderCommon from "@/components/ui/input/slider/SliderCommon.svelte";
	import MenuTitle from "@/components/menus/MenuTitle.svelte";

	let {
		min,
		max,
		step = 1,
		title,
		description = "",
		onchange = () => {},
		value = $bindable(),
		labels = undefined,
		label
	}: {
		min: number;
		max: number;
		step?: number;
		title: string;
		description?: string;
		onchange?: (value: number) => void;
		value: number;
		labels?: { [key: number]: string };
		label?: string;
	} = $props();
</script>

<div class="py-3 px-1" class:pb-10={Boolean(labels)}>
	<div class="flex w-full mb-3 items-center">
		<MenuTitle {title} {description} />

		{#if labels}
			<div class="px-3 w-14 text-center ml-auto border rounded-md py-1 border-border">
				{labels[value] ?? value / step}
			</div>
		{:else}
			<Input
				class="w-20 text-center ml-auto"
				type="number"
				{value}
				onchange={(e) => {
					value = Number(e.target?.value ?? value);
					onchange(value);
				}}
			/>
		{/if}
	</div>

	<div class="flex gap-2">
		<Slider.Root
			bind:value
			type="single"
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

		<!--		<div class="shrink-0 border rounded-md px-3 py-1 w-18 text-center">-->
		<!--			{#if labels}-->
		<!--				{labels[value] ?? value / step}-->
		<!--			{:else if label}-->
		<!--				{label.replace("%", (value / step).toString())}-->
		<!--			{:else}-->
		<!--				{value / step}-->
		<!--			{/if}-->
		<!--		</div>-->
	</div>
</div>
