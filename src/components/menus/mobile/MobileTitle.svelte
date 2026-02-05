<script>
	import { closeMenu, getOpenedMenu } from "@/lib/ui/menus.svelte.ts";
	import CloseButton from "@/components/ui/CloseButton.svelte";
	import { Drawer } from 'diadem-vaul-svelte';
	import { m } from "@/lib/paraglide/messages";
</script>

<div class="sticky top-2 z-20">
	<div class="w-full py-1 flex items-center justify-between bg-card rounded-lg border border-border">
		<Drawer.Title
			level={1}
			class="font-bold text-base tracking-tight mx-4"
		>
			{#if getOpenedMenu()}
				{m['nav_' + getOpenedMenu()]()}
			{/if}

		</Drawer.Title>
		<CloseButton
			onclick={closeMenu}
			class="mr-1 hover:bg-accent/90! active:bg-accent/90!"
		/>
	</div>
</div>