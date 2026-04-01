<script lang="ts">
	import { resize } from "@/lib/services/assets";
	import type { IconPickerItem } from "./iconPickerData";

	let {
		items,
		onselect
	}: {
		items: IconPickerItem[];
		onselect: (item: IconPickerItem) => void;
	} = $props();
</script>

<div class="grid" style:grid-template-columns="repeat(auto-fill, minmax(2.25rem, 1fr))">
	{#each items as item (item.key)}
		<button
			class="rounded-sm cursor-pointer hover:bg-accent active:bg-accent size-9 text-center"
			onclick={() => onselect(item)}
			title={item.label}
		>
			{#if item.emoji}
				<span class="text-[1.25rem]">{item.emoji}</span>
			{:else if item.iconUrl}
				<img
					class="max-w-7.5 max-h-8 text-xs mx-auto"
					src={resize(item.iconUrl, { width: 64 })}
					alt={item.label}
					loading="lazy"
				/>
			{/if}
		</button>
	{/each}
</div>
