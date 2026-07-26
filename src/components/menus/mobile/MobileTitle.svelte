<script lang="ts">
	import { closeMenu, getOpenedMenu } from "@/lib/ui/menus.svelte";
	import CloseButton from "@/components/ui/CloseButton.svelte";
	import { Drawer } from "$lib/drawer";
	import { mAny } from "@/lib/utils/anyMessage";
	import * as m from "$lib/paraglide/messages";
	import { closePopup } from "$lib/mapObjects/interact";
	import { X } from "@lucide/svelte";
	import Button from "@/components/ui/input/Button.svelte";
</script>

<div class="sticky top-2 z-20">
	<div
		class="w-full bg-card rounded-t-xl rounded-b-sm border border-border relative"
	>
		<Drawer.Handle />

		<Button
			variant="ghost"
			size=""
			class="rounded-full p-2 size-9 bg-accent/50 absolute right-3 top-1/2 -translate-y-1/2"
			title={m.close()}
			onclick={closeMenu}
		>
			<X class="size-4.5" />
		</Button>

		<div class="flex items-center justify-between pb-4 -mt-2">
			<Drawer.Title level={1} class="font-bold text-base tracking-tight mx-6">
				{#if getOpenedMenu()}
					{mAny("nav_" + getOpenedMenu())}
				{/if}
			</Drawer.Title>

		</div>
	</div>
</div>
