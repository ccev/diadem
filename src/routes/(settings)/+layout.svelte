<script lang="ts">
	import { doSidebarSettings } from '@/lib/deviceCheck';
	import { slide, fly } from 'svelte/transition';

	let { children } = $props();
</script>

<div
	class="fixed z-10"
	class:left-0={doSidebarSettings()}
	class:w-[30rem]={doSidebarSettings()}
	class:bottom-0={!doSidebarSettings()}
	class:mx-auto={!doSidebarSettings()}
	out:slide={{ duration: 90, axis: doSidebarSettings() ? "x" : "y" }}
	in:slide={{ duration: 150, axis: doSidebarSettings() ? "x" : "y" }}
>
	{@render children()}
</div>
