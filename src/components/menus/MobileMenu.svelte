<script lang="ts">
	import { slide } from 'svelte/transition';
	import { getOpenedMenu, openMenu } from '@/lib/ui/menus.svelte.js';
	import MenuContainer from '@/components/menus/MenuContainer.svelte';
	import CloseButton from '@/components/ui/CloseButton.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { Drawer } from 'vaul-svelte';
	import { onMount, onDestroy } from 'svelte';
</script>

<Drawer.Root
	open={!!getOpenedMenu()}
	onClose={() => openMenu(null)}
	closeOnOutsideClick={false}
>
	<Drawer.Portal>
		<Drawer.Content
			class="absolute left-0 bottom-0 z-10 pointer-events-none h-full w-full"
		>
			<div
				class="h-full overflow-y-auto"
				style="-webkit-overflow-scrolling: touch;"
			>
				<div
					class="pb-20 px-2 pt-2 mt-40 min-h-full rounded-t-xl border border-t-border bg-card/60 backdrop-blur-sm pointer-events-auto "
					out:slide={{ duration: 70, axis: 'y' }}
				>
					<div class="w-full py-1 sticky top-2 flex items-center justify-between z-10 bg-card/60 backdrop-blur-sm rounded-lg border border-border">
						<Drawer.Title
							level="h1"
							class="font-bold text-base tracking-tight mx-4"
						>
							{m['nav_' + getOpenedMenu()]()}
						</Drawer.Title>
						<CloseButton
							onclick={() => openMenu(null)}
							class="mr-1 hover:bg-accent/90! active:bg-accent/90!"
						/>
					</div>

					<MenuContainer />
				</div>
			</div>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>
