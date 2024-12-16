<script lang="ts">
	import {Map, Settings2, Settings} from 'lucide-svelte';
	import Button from '@/components/ui/Button.svelte';

	let {
		page
	}: {
		page: string
	} = $props()

	function isSelected(path: string) {
		return path === page
	}

	const buttons = [
		{
			text: "Map",
			icon: Map,
			href: "/"
		},
		{
			text: "Filters",
			icon: Settings2,
			href: "/filters"
		},
		{
			text: "Settings",
			icon: Settings,
			href: "/settings"
		}
	]
</script>

<div
	class="z-10 h-16 mx-2 w-60 text-sm grid grid-cols-3 divide-x rounded-lg border bg-card text-card-foreground shadow-lg"
	style="pointer-events: all"
>
	{#each buttons as btn}
	{@const Icon = btn.icon}
		<a
			class="flex justify-center items-center flex-col text-sm bg-background hover:bg-accent hover:text-accent-foreground first:rounded-l-lg last:rounded-r-lg"
			href={btn.href}
		>
			<Icon size="20" />
			<span
				class:font-semibold={isSelected(btn.href)}
				class:tracking-light={isSelected(btn.href)}
			>
				{btn.text}
			</span>
		</a>
	{/each}
</div>