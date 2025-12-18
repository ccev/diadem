<script lang="ts">
	import { page } from "$app/state";
	import Card from "@/components/ui/Card.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import ErrorPage from "@/components/ui/ErrorPage.svelte";
	import * as m from "@/lib/paraglide/messages";

	const status = page.status
	let error: string

	if (status === 404) {
		error = m.error_404()
	} else {
		error = "" + status
		if (page.error) error += ": " + page.error.message
	}
</script>

<ErrorPage {error} />


