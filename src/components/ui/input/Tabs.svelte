<script lang="ts">
	import { Tabs } from "bits-ui";
	import type { Snippet } from "svelte";

	let {
		class: class_ = "",
		tabs,
		value = $bindable(),
		children
	}: {
		class?: string;
		tabs: { value: string; label: string }[];
		value: string;
		children?: Snippet;
	} = $props();
</script>

<Tabs.Root bind:value>
	<Tabs.List class="flex gap-1 overflow-x-auto -mx-1 px-1 pt-1 pb-2 {class_}">
		{#each tabs as tab (tab.value)}
			<Tabs.Trigger
				value={tab.value}
				class="shrink-0 cursor-pointer ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 rounded-full px-5 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:border-transparent"
			>
				{tab.label}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>
	{@render children?.()}
</Tabs.Root>
