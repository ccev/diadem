<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import type { AvailableBoss, Battle } from "@/lib/features/autoBattle";
	import * as m from "$lib/paraglide/messages";
	import { mPokemon } from "$lib/services/ingameLocale";
	import { resize } from "$lib/services/assets";
	import { getIconPokemon } from "$lib/services/uicons.svelte";
	import { getNormalizedForm } from "$lib/utils/pokemonUtils";
	import { LoaderCircle, Ticket } from "@lucide/svelte";
	import { onDestroy } from "svelte";

	let {
		boss,
		onrequestinvite = undefined,
		disabled = false,
		preparingInvite = false
	}: {
		boss: AvailableBoss | Battle;
		onrequestinvite?: () => Promise<boolean>;
		disabled?: boolean;
		preparingInvite?: boolean;
	} = $props();

	const pokemon = $derived({
		...boss,
		form: getNormalizedForm(boss.pokemon_id, boss.form)
	});
	let remainingSeconds = $state(0);
	const isCoolingDown = $derived(remainingSeconds > 0);
	let cooldownTimer: number | undefined = undefined;

	onDestroy(() => {
		clearCooldown();
	});

	async function requestInvite() {
		if (!(await onrequestinvite?.())) return;
		remainingSeconds = 3;
		clearCooldown();
		cooldownTimer = window.setInterval(() => {
			remainingSeconds -= 1;
			if (remainingSeconds === 0) clearCooldown();
		}, 1000);
	}

	function clearCooldown() {
		if (cooldownTimer !== undefined) window.clearInterval(cooldownTimer);
		cooldownTimer = undefined;
	}
</script>

<section
	class="flex w-full items-center gap-6 rounded-md border border-border bg-accent px-6 py-4 text-accent-foreground"
	class:opacity-60={preparingInvite || isCoolingDown}
>
	<img class="size-14 shrink-0" src={getIconPokemon(pokemon)} alt={mPokemon(pokemon)} />
	<div class="min-w-0 flex-1 space-y-3">
		<p class="font-semibold text-lg">{mPokemon(pokemon)}</p>
		{#if preparingInvite}
			<Button class="w-full" disabled>
				<LoaderCircle class="size-3.5 animate-spin" />
				{m.auto_battle_preparing_invite()}
			</Button>
		{:else if isCoolingDown}
			<Button class="w-full" disabled>
				{remainingSeconds === 1
					? m.auto_battle_available_in_one_second()
					: m.auto_battle_available_in({ x: remainingSeconds })}
			</Button>
		{:else if onrequestinvite}
			<Button class="w-full" {disabled} onclick={() => void requestInvite()}>
				<Ticket class="size-3.5" />
				{m.auto_battle_request_invite()}
			</Button>
		{/if}
	</div>
</section>
