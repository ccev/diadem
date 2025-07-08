<script lang="ts">
	import { openMenu } from '@/lib/menus.svelte';
	import MenuContainer from '@/components/menus/MenuContainer.svelte';
	import CloseButton from '@/components/ui/CloseButton.svelte';
	import { slide } from 'svelte/transition';
</script>

<div
	class="mb-auto z-10 max-w-[26rem] overflow-y-auto h-fit rounded-br-xl pointer-events-auto pb-2 border border-border bg-card/60 backdrop-blur-sm"
	transition:slide={{ duration: 70, axis: "x" }}
>
	<!--{#if showSignInButton}-->
	<!--	<div class="h-11"></div>-->
	<!--{/if}-->
	<div class="w-full py-1 sticky top-2 flex items-center justify-between z-10 bg-card border border-b-border">
		<h1 class="font-bold text-base tracking-tight mx-4">
			Profile
		</h1>
		<CloseButton
			onclick={() => openMenu(null)}
			class="mr-2"
		/>
	</div>
	<div class="px-2">
		<MenuContainer />
	</div>
</div>