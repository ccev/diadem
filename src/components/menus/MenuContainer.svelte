<script lang="ts">
	import { getOpenedMenu } from '@/lib/menus.svelte';
	import ProfileMenu from '@/components/menus/profile/ProfileMenu.svelte';
	import FiltersMenu from '@/components/menus/filters/FiltersMenu.svelte';
	import { slide } from 'svelte/transition';
</script>

{#if getOpenedMenu() === "profile"}
	<ProfileMenu />
{:else if getOpenedMenu() === "filters"}
	<FiltersMenu />
{/if}