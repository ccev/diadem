<script lang="ts">
	import { CircleUserRound, Map, Settings2 } from 'lucide-svelte';
	import Button from '@/components/ui/basic/Button.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { Avatar } from 'bits-ui';
	import { getUserDetails } from '@/lib/user/userDetails.svelte';

	let {
		page,
		onmapclick = undefined
	}: {
		page: string
		onmapclick?: () => any
	} = $props();

	function isSelected(path: string) {
		return path === page;
	}

	const buttons = [
		{
			text: m.nav_map(),
			icon: Map,
			href: '/',
			onclick: onmapclick
		},
		{
			text: m.nav_filters(),
			icon: Settings2,
			href: '/filters',
			onclick: undefined
		},
		{
			text: m.nav_profile(),
			icon: CircleUserRound,
			href: '/profile',
			onclick: undefined
		}
	];
</script>

<div
	class="z-10 h-16 mx-2 min-w-60 text-sm grid grid-cols-3 divide-x rounded-lg border bg-card text-card-foreground shadow-lg"
	style="pointer-events: all"
>
	{#each buttons as btn}
		{@const Icon = btn.icon}
		<Button
			tag={btn.onclick ? "button" : "a"}
			variant="ghost"
			size=""
			class="flex px-2 justify-center items-center flex-col text-sm bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground first:rounded-l-lg last:rounded-r-lg"
			href={btn.href}
			onclick={btn.onclick}
		>
			{#if btn.href === "/profile"}
				<Avatar.Root>
					<Avatar.Image
						class="border-2 border-foreground rounded-full h-6 w-6 -mb-1"
						src={getUserDetails()?.details?.avatarUrl}
						alt={getUserDetails()?.details?.displayName}
					/>
					<Avatar.Fallback>
						<Icon size="20" />
					</Avatar.Fallback>
				</Avatar.Root>
			{:else}
				<Icon size="20" />
			{/if}

			<span
				class:font-semibold={isSelected(btn.href)}
				class:tracking-light={isSelected(btn.href)}
			>
				{btn.text}
			</span>
		</Button>
	{/each}
</div>