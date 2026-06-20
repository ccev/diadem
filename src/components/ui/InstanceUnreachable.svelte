<script lang="ts">
	import { getInstanceUrl } from "@/lib/native/runtime";

	// Self-contained on purpose: this renders when the instance config couldn't be
	// loaded, so it must not depend on config or any loaded app state.
	const instance = getInstanceUrl();
	let retrying = $state(false);

	function retry() {
		retrying = true;
		window.location.reload();
	}
</script>

<div class="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
	<h1 class="text-xl font-semibold text-foreground">Can't reach your Diadem instance</h1>
	<p class="max-w-sm text-sm text-muted-foreground">
		{#if instance}
			Couldn't connect to <span class="font-mono break-all">{instance}</span>. Check your
			connection and that the instance is online.
		{:else}
			Couldn't connect to the configured instance. Check your connection.
		{/if}
	</p>
	<button
		class="rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground disabled:opacity-60"
		onclick={retry}
		disabled={retrying}
	>
		{retrying ? "Retrying…" : "Retry"}
	</button>
</div>
