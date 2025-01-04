<script lang="ts">
	import {Map, Settings2, Settings} from 'lucide-svelte';
	import Button from '@/components/ui/Button.svelte';
	import * as m from "@/lib/paraglide/messages"

	let {
		page,
		onmapclick = undefined
	}: {
		page: string
		onmapclick?: () => any
	} = $props()

	function isSelected(path: string) {
		return path === page
	}

	const buttons = [
		{
			text: m.nav_map(),
			icon: Map,
			href: "/",
			onclick: onmapclick
		},
		{
			text: m.nav_filters(),
			icon: Settings2,
			href: "/filters",
			onclick: undefined
		},
		{
			text: m.nav_settings(),
			icon: Settings,
			href: "/settings",
			onclick: undefined
		}
	]
</script>

<div
	class="z-10 h-16 mx-2 w-60 text-sm grid grid-cols-3 divide-x rounded-lg border bg-card text-card-foreground shadow-lg"
	style="pointer-events: all"
>
	{#each buttons as btn}
	{@const Icon = btn.icon}
		<Button
			tag={btn.onclick ? "button" : "a"}
			variant="ghost"
			size=""
			class="flex justify-center items-center flex-col text-sm bg-background hover:bg-accent hover:text-accent-foreground first:rounded-l-lg last:rounded-r-lg"
			href={btn.href}
			onclick={btn.onclick}
		>
			<Icon size="20" />
			<span
				class:font-semibold={isSelected(btn.href)}
				class:tracking-light={isSelected(btn.href)}
			>
				{btn.text}
			</span>
		</Button>
	{/each}
</div>