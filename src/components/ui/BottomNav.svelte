<script lang="ts">
	import { CircleUserRound, Map, Settings2 } from "lucide-svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { Avatar } from "bits-ui";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte.js";
	import { getOpenedMenu, type MenuTypes, openMenu } from "@/lib/ui/menus.svelte.js";
	import { hasLoadedFeature, LoadedFeature } from "@/lib/services/initialLoad.svelte.js";
	import { isSearchViewActive } from "@/lib/features/activeSearch.svelte.js";
	import { fade } from "svelte/transition";

	function isSelected(type: MenuTypes) {
		return type === getOpenedMenu();
	}

	function onNavigate(type: MenuTypes) {
		if (isSelected(type)) {
			openMenu(null);
		} else {
			openMenu(type);
		}
	}

	const buttons: {
		text: string,
		icon: any,
		type: MenuTypes
	}[] = [
		{
			text: m.nav_filters(),
			icon: Settings2,
			type: "filters"
		},
		{
			text: m.nav_profile(),
			icon: CircleUserRound,
			type: "profile"
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
			<div class:selected-stroke={isSelected(btn.type)}>
				<Icon size="20" />
			</div>
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
