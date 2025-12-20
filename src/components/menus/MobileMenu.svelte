<script lang="ts">
	import { slide } from 'svelte/transition';
	import { getOpenedMenu, openMenu } from '@/lib/ui/menus.svelte.js';
	import MenuContainer from '@/components/menus/MenuContainer.svelte';
	import CloseButton from '@/components/ui/CloseButton.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { Drawer } from 'vaul-svelte';
</script>

<Drawer.Root
	open={!!getOpenedMenu()}
	onClose={() => openMenu(null)}
	closeOnOutsideClick={false}
>
	<Drawer.Portal>
		<Drawer.Content
			class="after:h-0! duration-150! touch-auto! fixed z-10 w-full h-full overflow-y-scroll bottom-0 pointer-events-none overscroll-contain"
			style="{getOpenedMenu() === 'scout' ? 'height: fit-content !important;' : '' }; -webkit-overflow-scrolling: touch; touch-action: pan-y;"
		>
			<div
				class="pb-20 px-2 pt-2 mt-40 min-h-full rounded-t-xl border border-t-border bg-card/60 backdrop-blur-sm"
				out:slide={{ duration: 70, axis: 'y' }}
			>
				<div class="sticky top-2 z-20">
					<div class="w-full py-1 flex items-center justify-between bg-card/60 backdrop-blur-sm rounded-lg border border-border">
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
				</div>

				<MenuContainer />
			</div>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>
