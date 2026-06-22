<script lang="ts">
	import MenuCard from "@/components/menus/MenuCard.svelte";
	import * as m from "@/lib/paraglide/messages";
	import Button from "@/components/ui/input/Button.svelte";
	import { LoaderCircle, Save, Server } from "lucide-svelte";
	import {
		getInstanceUrl,
		normalizeInstanceUrl,
		setInstanceUrl,
		validateInstance
	} from "@/lib/native/runtime";
	import { clearStoredToken } from "@/lib/native/auth";
	import Input from "@/components/ui/input/Input.svelte";

	let value = $state(getInstanceUrl());
	let error = $state("");
	let saving = $state(false);

	async function save() {
		error = "";
		const normalized = normalizeInstanceUrl(value);
		if (!normalized) {
			error = m.error_invalid_url();
			return;
		}
		if (normalized === getInstanceUrl()) return;
		saving = true;
		if (!(await validateInstance(normalized))) {
			error = m.error_connect_instance();
			saving = false;
			return;
		}
		await setInstanceUrl(normalized);
		await clearStoredToken();
		window.location.reload();
	}
</script>

<MenuCard title={m.instance()} Icon={Server}>
	<div class="flex flex-col gap-2 px-4 py-3">
		<p class="font-normal text-sm">
			{m.instance_description()}
		</p>
		<Input
			class="w-full mt-2 py-6"
			type="url"
			inputmode="url"
			autocapitalize="none"
			autocorrect="off"
			spellcheck="false"
			placeholder="https://diadem.co"
			{value}
			onchange={(e) => value = (e.target as HTMLInputElement)?.value ?? ""}
		/>
		{#if error}
			<p class="text-sm text-destructive-foreground">{error}</p>
		{/if}
		<Button variant="secondary" onclick={save} disabled={saving}>
			{#if saving}
				<LoaderCircle class="size-3.5 animate-spin" />
				{m.connecting()}
			{:else}
				<Save class="size-3.5" />
				{m.save()}
			{/if}
		</Button>
	</div>
</MenuCard>
