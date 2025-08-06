<script lang="ts">
	import { redirect } from '@sveltejs/kit';
	import Metadata from '@/components/utils/Metadata.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';


	// goto("/").then()
	onMount(() => {
		console.debug("redirect pls")
		// goto("../../")
	})

</script>

<svelte:head>
	<Metadata  />
</svelte:head>

<a href="../../">
	click me
</a>
