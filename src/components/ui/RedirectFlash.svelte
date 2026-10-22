<script lang="ts">
	import { browser } from "$app/environment";
	import { getMapPath } from "@/lib/utils/getMapPath";
	import { getConfig } from "@/lib/services/config/config";

	import { tick } from "svelte";
	import { goto } from "$app/navigation";
	import ErrorPage from "@/components/ui/ErrorPage.svelte";
	import Button from "@/components/ui/input/Button.svelte";

	let {
		goal,
		href = getMapPath(getConfig()),
		redirect = true,
		onclick = undefined
	}: {
		goal: string;
		href?: string;
		redirect?: boolean;
		onclick?: () => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	if (browser && redirect) {
		tick().then(() => {
			goto(href);
		});
	}
</script>

{#if browser}
	<ErrorPage error="Bringing you to {goal}" href="" linkLabel="">
		{#snippet extraButtons()}
			<Button variant="outline" tag="a" {href} {onclick}>Click here if that didn't work</Button>
		{/snippet}
	</ErrorPage>
{/if}
