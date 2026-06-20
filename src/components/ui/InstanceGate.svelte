<script lang="ts">
	import { normalizeInstanceUrl, setInstanceUrl, validateInstance } from "@/lib/native/runtime";

	// Self-contained: this renders before any instance/config is loaded, so it must
	// not depend on config, i18n state, or other app services.
	let { initial = "" }: { initial?: string } = $props();

	let value = $state(initial || "https://");
	let error = $state("");
	let loading = $state(false);

	async function connect() {
		error = "";
		const normalized = normalizeInstanceUrl(value);
		if (!normalized) {
			error = "Enter a valid URL.";
			return;
		}
		loading = true;
		const ok = await validateInstance(normalized);
		if (!ok) {
			error = "Couldn't reach a Diadem instance at that URL.";
			loading = false;
			return;
		}
		await setInstanceUrl(normalized);
		// Reboot so the app loads against the chosen instance.
		window.location.reload();
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === "Enter") connect();
	}
</script>

<div
	class="fixed inset-0 flex flex-col items-center justify-center gap-5 bg-background px-6 text-center"
	style:padding-top="env(safe-area-inset-top)"
	style:padding-bottom="env(safe-area-inset-bottom)"
>
	<div class="flex flex-col items-center gap-2">
		<img src="/favicon.png" alt="Diadem" class="mb-1 h-16 w-16" />
		<h1 class="text-xl font-semibold text-foreground">Connect to Diadem</h1>
		<p class="max-w-sm text-sm text-muted-foreground">
			Enter the URL of the Diadem instance you want to use.
		</p>
	</div>

	<div class="flex w-full max-w-sm flex-col gap-2">
		<input
			bind:value
			{onkeydown}
			type="url"
			inputmode="url"
			autocapitalize="none"
			autocorrect="off"
			spellcheck="false"
			placeholder="https://map.example.com"
			class="w-full rounded-md border border-input bg-card px-3 py-2.5 text-foreground outline-none focus:border-ring"
		/>
		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}
		<button
			class="rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground disabled:opacity-60"
			onclick={connect}
			disabled={loading}
		>
			{loading ? "Connecting…" : "Connect"}
		</button>
	</div>
</div>
