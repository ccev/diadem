<script lang="ts">
	import { page } from "$app/state";
	import StatusScreen from "@/components/ui/StatusScreen.svelte";

	import { isNative } from "$lib/native/runtime";
	import ErrorPage from "@/components/ui/ErrorPage.svelte";

	const status = page.status;
	const title = status === 404 ? /* @wc-include */ "404: Page not found" : "Something went wrong";
	const description =
		status === 404 ? undefined : status + (page.error ? ": " + page.error.message : "");
</script>

{#if isNative()}
	<StatusScreen {title} {description} />
{:else}
	<ErrorPage error={title} {description} />
{/if}
