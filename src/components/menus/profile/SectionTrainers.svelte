<script lang="ts">
	import MenuCard from "@/components/menus/MenuCard.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import Input from "@/components/ui/input/Input.svelte";
	import * as m from "@/lib/paraglide/messages";
	import {
		getLinkedTrainers,
		isTrainerPending,
		linkTrainer,
		refreshLinkedTrainers,
		unlinkTrainer,
		type LinkTrainerError
	} from "@/lib/services/linkedTrainers.svelte";
	import { clearMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
	import { LoaderCircle, Sparkles, X } from "@lucide/svelte";
	import { onMount } from "svelte";

	const POLL_INTERVAL_MS = 5000;

	let friendCode = $state("");
	let linking = $state(false);
	let error: LinkTrainerError | undefined = $state();

	let hasPending = $derived(getLinkedTrainers().some(isTrainerPending));
	let linkedCount = $derived(getLinkedTrainers().filter((t) => t.status === "complete").length);

	const errorMessages: Record<LinkTrainerError, () => string> = {
		invalid_friend_code: m.linked_trainers_error_friend_code,
		too_many_trainers: m.linked_trainers_error_too_many,
		queue_full: m.linked_trainers_error_queue_full,
		rate_limited: m.linked_trainers_error_queue_full,
		unavailable: m.linked_trainers_error_unavailable,
		not_allowed: m.linked_trainers_error_unavailable,
		invalid_body: m.linked_trainers_error_friend_code
	};

	// Pokemon already on the map were annotated for the old trainer list
	function reloadPokemon() {
		clearMapObjects(MapObjectType.POKEMON);
		updateAllMapObjects().then();
	}

	onMount(() => {
		refreshLinkedTrainers().then();
	});

	$effect(() => {
		if (!hasPending) return;

		const interval = setInterval(async () => {
			const before = linkedCount;
			await refreshLinkedTrainers();
			if (linkedCount !== before) reloadPokemon();
		}, POLL_INTERVAL_MS);
		return () => clearInterval(interval);
	});
</script>

<MenuCard title={m.linked_trainers()} Icon={Sparkles}>
	<p class="font-normal text-sm px-4 text-muted-foreground">
		{m.linked_trainers_description()}
	</p>

	{#if getLinkedTrainers().length > 0}
		<ul class="mx-4 mt-2 divide-y divide-border">
			{#each getLinkedTrainers() as trainer (trainer.id)}
				<li class="flex items-center gap-2 py-1.5 text-sm">
					{#if trainer.status === "complete"}
						<span class="font-semibold truncate"
							>{trainer.trainerName ?? m.linked_trainers_unnamed()}</span
						>
					{:else if isTrainerPending(trainer)}
						<LoaderCircle class="size-4 animate-spin shrink-0" />
						<span class="text-muted-foreground">
							{trainer.status === "delayed"
								? m.linked_trainers_delayed()
								: m.linked_trainers_pending()}
						</span>
					{:else if trainer.status === "invalid_code"}
						<span class="text-muted-foreground">{m.linked_trainers_invalid_code()}</span>
					{:else}
						<span class="text-muted-foreground">{m.linked_trainers_failed()}</span>
					{/if}
					<Button
						variant="ghost"
						size="icon"
						class="ml-auto size-8! shrink-0"
						title={m.linked_trainers_remove()}
						onclick={async () => {
							const wasLinked = trainer.status === "complete";
							if ((await unlinkTrainer(trainer.id)) && wasLinked) reloadPokemon();
						}}
					>
						<X class="size-4" />
					</Button>
				</li>
			{/each}
		</ul>
	{/if}

	<form
		class="flex gap-2 px-4 mt-2 mb-2"
		onsubmit={async (e) => {
			e.preventDefault();
			linking = true;
			error = await linkTrainer(friendCode);
			linking = false;
			if (!error) friendCode = "";
		}}
	>
		<Input
			class="flex-1 min-w-0"
			value={friendCode}
			oninput={(e) => (friendCode = (e.target as HTMLInputElement).value)}
			placeholder={m.linked_trainers_friend_code_placeholder()}
			inputmode="numeric"
			autocomplete="off"
			maxlength={20}
		/>
		<Button type="submit" variant="secondary" disabled={linking || !friendCode.trim()}>
			{#if linking}
				<LoaderCircle class="size-4 animate-spin" />
			{/if}
			{m.linked_trainers_link()}
		</Button>
	</form>

	{#if error}
		<p class="text-sm text-destructive px-4 mb-2">{errorMessages[error]()}</p>
	{/if}
</MenuCard>
