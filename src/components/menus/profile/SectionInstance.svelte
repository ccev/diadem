<script lang="ts">
	import MenuCard from "@/components/menus/MenuCard.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import { Server } from "lucide-svelte";
	import {
		getInstanceUrl,
		normalizeInstanceUrl,
		setInstanceUrl,
		validateInstance
	} from "@/lib/native/runtime";
	import { clearStoredToken } from "@/lib/native/auth";

	let value = $state(getInstanceUrl());
	let error = $state("");
	let saving = $state(false);

	async function save() {
		error = "";
		const normalized = normalizeInstanceUrl(value);
		if (!normalized) {
			error = "Enter a valid URL.";
			return;
		}
		if (normalized === getInstanceUrl()) return;
		saving = true;
		if (!(await validateInstance(normalized))) {
			error = "Couldn't reach a Diadem instance at that URL.";
			saving = false;
			return;
		}
		await setInstanceUrl(normalized);
		// A different instance means a different session — drop the stored token.
		await clearStoredToken();
		window.location.reload();
	}
</script>

<MenuCard title="Instance" Icon={Server}>
	<div class="flex flex-col gap-2 px-4 py-3">
		<p class="text-sm text-muted-foreground">The Diadem instance this app connects to.</p>
		<input
			bind:value
			type="url"
			inputmode="url"
			autocapitalize="none"
			autocorrect="off"
			spellcheck="false"
			placeholder="https://map.example.com"
			class="w-full rounded-md border border-input bg-card px-3 py-2 text-foreground outline-none focus:border-ring"
		/>
		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}
		<Button variant="secondary" onclick={save} disabled={saving}>
			{saving ? "Connecting…" : "Save & reconnect"}
		</Button>
	</div>
</MenuCard>
