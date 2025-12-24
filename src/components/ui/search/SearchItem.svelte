<script lang="ts">
	import LucideIcon from '@/components/utils/LucideIcon.svelte';
	import { Command } from "bits-ui";

	let {
		onselect,
		label,
		value,
		keywords = [],
		iconName = undefined,
		image = undefined
	}: {
		onselect: () => void,
		label: string,
		value: string,
		keywords?: string[],
		iconName?: string,
		image?: string,
	} = $props()
</script>

<Command.Item
	class="data-selected:bg-accent data-selected:text-accent-foreground py-1.5 px-2 rounded-sm cursor-pointer ring-offset-background focus-visible:ring-ring items-center gap-1.5 justify-center whitespace-nowrap text-sm font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
	onSelect={onselect}
	{value}
>
	<div class="w-full flex gap-2 items-center text-start">
		{#if iconName}
			<LucideIcon size="16" name={iconName} />
		{/if}
		{#if image}
			<img
				class="size-5 object-cover rounded-full"
				src={image}
				alt={label}
				loading="lazy"
			>
		{/if}
		<span>
			{label}
		</span>
	</div>
</Command.Item>