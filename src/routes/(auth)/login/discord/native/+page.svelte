<script lang="ts">
	import { onMount } from "svelte";
	import type { PageProps } from "./$types";
	import Button from "@/components/ui/input/Button.svelte";
	import { m } from "@/lib/paraglide/messages";

	let { data }: PageProps = $props();

	onMount(() => window.location.replace(data.returnUrl));
</script>

<svelte:head>
	<title>{m.native_auth_return()}</title>
</svelte:head>

<main
	class="relative z-10 min-h-dvh flex items-center justify-center bg-background text-foreground p-8"
>
	<div class="max-w-md text-center">
		<p class="mb-6 leading-relaxed">
			{#if data.success}
				{m.native_auth_complete()}
			{:else}
				{m.native_auth_failed()}
			{/if}
		</p>
		<Button tag="a" href={data.returnUrl} size="lg" data-sveltekit-reload>
			{m.native_auth_return()}
		</Button>
	</div>
</main>
