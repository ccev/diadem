<script lang="ts">
	import { CircleUserRound, Settings2 } from "lucide-svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte.js";
	import { closeMenu, getOpenedMenu, Menu, openMenu } from "@/lib/ui/menus.svelte.js";
	import { hasLoadedFeature, LoadedFeature } from "@/lib/services/initialLoad.svelte.js";
	import { fade } from "svelte/transition";
	import { Avatar } from "bits-ui";

	function isSelected(type: Menu) {
		return type === getOpenedMenu();
	}

	function onNavigate(type: Menu) {
		if (isSelected(type)) {
			closeMenu();
		} else {
			openMenu(type);
		}
	}

	const buttons: {
		text: string,
		icon: any,
		type: Menu
	}[] = [
		{
			text: m.nav_filters(),
			icon: Settings2,
			type: Menu.FILTERS
		},
		{
			text: m.nav_profile(),
			icon: CircleUserRound,
			type: Menu.PROFILE
		}
	];
</script>

<div
	class="z-10 h-16 mx-2 min-w-44 text-sm grid grid-cols-2 divide-x rounded-lg border bg-card text-card-foreground shadow-lg shrink-0"
	style="pointer-events: all"
	transition:fade={{ duration: 90 }}
>
	{#each buttons as btn}
		{@const Icon = btn.icon}

		{#snippet icon()}
			<Icon size="20" />
		{/snippet}

		<Button
			variant="ghost"
			size=""
			class="flex px-2 pt-0.5 justify-center items-center flex-col text-sm bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground first:rounded-l-lg last:rounded-r-lg"
			onclick={() => onNavigate(btn.type)}
			disabled={!hasLoadedFeature(LoadedFeature.REMOTE_LOCALE, LoadedFeature.ICON_SETS, LoadedFeature.SUPPORTED_FEATURES)}
		>
			{#if btn.type === "profile"}
				<Avatar.Root>
					<Avatar.Image
						class="border-2 border-foreground rounded-full h-6 w-6 -mb-1"
						src={getUserDetails()?.details?.avatarUrl}
						alt={getUserDetails()?.details?.displayName}
					/>
					<Avatar.Fallback>
						{@render icon()}
					</Avatar.Fallback>
				</Avatar.Root>
			{:else}
				{@render icon()}
			{/if}

			<span
				class:font-semibold={isSelected(btn.type)}
				class:tracking-light={isSelected(btn.type)}
			>
				{btn.text}
			</span>
		</Button>
	{/each}
</div>
