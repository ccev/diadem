<script lang="ts">
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import Input from "@/components/ui/input/Input.svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { getDataLimit } from "@/lib/mapObjects/dataLimitState.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { openPopup } from "@/lib/mapObjects/interact";
	import { requestPopupVisibilityCheck } from "@/lib/mapObjects/popupVisibility.svelte";
	import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
	import { formatNumber } from "@/lib/utils/numberFormat";
	import { rankShowcaseCandidates } from "@/lib/utils/showcaseCandidates";
	import * as m from "@/lib/paraglide/messages";
	import { Award, ChevronDown } from "@lucide/svelte";
	import { onMount } from "svelte";

	let { data }: { data: PokemonData } = $props();
	let trainerId = $state("");
	let minScore = $state(0);
	let expanded = $state(false);
	let now = $state(Math.floor(Date.now() / 1000));
	const id = $props.id();
	let currentPokemon = $derived.by(() => {
		const latest = getMapObjects()[data.mapId];
		if (!latest) return data;
		return latest.type === MapObjectType.POKEMON ? latest : undefined;
	});
	let trainers = $derived(Object.entries(currentPokemon?.personal_sizes ?? {}));
	let selectedTrainerId = $derived(
		trainers.some(([id]) => id === trainerId) ? trainerId : (trainers[0]?.[0] ?? "")
	);
	let candidates = $derived(
		rankShowcaseCandidates(
			Object.values(getMapObjects()).filter(
				(candidate): candidate is PokemonData => candidate.type === MapObjectType.POKEMON
			),
			selectedTrainerId,
			currentPokemon?.pokemon_id ?? 0,
			currentPokemon?.form ?? 0,
			minScore,
			now
		)
	);
	let limited = $derived(!!getDataLimit(MapObjectType.POKEMON));

	onMount(() => {
		const interval = setInterval(() => (now = Math.floor(Date.now() / 1000)), 10_000);
		return () => clearInterval(interval);
	});
</script>

{#if trainers.length}
	<TitledMainSection Icon={Award} title={m.showcase_personal_title()}>
		<BasicMainCard>
			<div class="overflow-x-auto">
				<table class="w-full text-sm tabular-nums">
					<caption class="sr-only">{m.showcase_personal_title()}</caption>
					<thead class="text-muted-foreground">
						<tr>
							<th scope="col" class="pb-2 pr-2 text-left font-normal">{m.showcase_trainer()}</th>
							<th scope="col" class="pb-2 px-1 text-right font-normal">{m.showcase_height()}</th>
							<th scope="col" class="pb-2 px-1 text-right font-normal">{m.showcase_weight()}</th>
							<th scope="col" class="pb-2 pl-2 text-right font-normal">{m.showcase_score()}</th>
						</tr>
					</thead>
					<tbody>
						{#each trainers as [trainerId, personal] (trainerId)}
							<tr class="border-t border-border">
								<th scope="row" class="py-2 pr-2 text-left font-medium break-words">
									{personal.trainerName || m.linked_trainers_unnamed()}
								</th>
								<td class="py-2 px-1 text-right"
									>{formatNumber(personal.height, { maximumFractionDigits: 3 })}</td
								>
								<td class="py-2 px-1 text-right"
									>{formatNumber(personal.weight, { maximumFractionDigits: 3 })}</td
								>
								<td class="py-2 pl-2 text-right font-medium">
									{#if Number.isFinite(personal.score)}
										{formatNumber(personal.score, { maximumFractionDigits: 1 })}
									{:else}
										<span class="text-muted-foreground font-normal">{m.unavailable()}</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="text-xs text-muted-foreground mt-2">{m.showcase_prediction_notice()}</p>

			<Button
				variant="ghost"
				class="w-full mt-3 justify-between! whitespace-normal! text-left"
				aria-expanded={expanded}
				aria-controls="{id}-ranking"
				onclick={() => (expanded = !expanded)}
			>
				{m.showcase_rank_loaded()}
				<ChevronDown class="size-4 shrink-0" style="rotate: {expanded ? '180deg' : '0deg'}" />
			</Button>
			{#if expanded}
				<div id="{id}-ranking" class="mt-3 space-y-3">
					<div class="grid grid-cols-[minmax(0,1fr)_6rem] items-end gap-3">
						<label class="space-y-1.5 text-sm min-w-0" for="{id}-trainer">
							<span class="block">{m.showcase_trainer()}</span>
							<select
								id="{id}-trainer"
								class="h-10 w-full min-w-0 rounded-md border border-input bg-background px-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
								value={selectedTrainerId}
								onchange={(event) => (trainerId = event.currentTarget.value)}
							>
								{#each trainers as [id, personal] (id)}
									<option value={id}>{personal.trainerName || m.linked_trainers_unnamed()}</option>
								{/each}
							</select>
						</label>
						<label class="space-y-1.5 text-sm" for="{id}-minimum">
							<span class="block">{m.showcase_minimum()}</span>
							<Input
								id="{id}-minimum"
								class="w-full tabular-nums"
								type="number"
								min="0"
								step="any"
								value={minScore}
								oninput={(event) => {
									const value = event.currentTarget.valueAsNumber;
									if (Number.isFinite(value) && value >= 0) minScore = value;
									else event.currentTarget.value = String(minScore);
								}}
							/>
						</label>
					</div>
					<p class="text-xs text-muted-foreground">{m.showcase_loaded_notice()}</p>
					{#if limited}
						<p class="text-sm font-medium">{m.showcase_limit_notice()}</p>
					{/if}
					{#if candidates.length}
						<ol class="max-h-64 overflow-y-auto divide-y divide-border">
							{#each candidates as candidate, index (candidate.mapId)}
								{@const personal = candidate.personal_sizes![selectedTrainerId]}
								<li>
									<Button
										variant="ghost"
										size=""
										class="w-full gap-3 p-2 text-left justify-start! whitespace-normal! tabular-nums"
										aria-label={m.showcase_open_candidate({
											rank: index + 1,
											score: formatNumber(personal.score, { maximumFractionDigits: 1 })
										})}
										aria-current={candidate.mapId === data.mapId ? "true" : undefined}
										onclick={() => {
											requestPopupVisibilityCheck(candidate);
											openPopup(candidate);
										}}
									>
										<span class="w-7 shrink-0 text-muted-foreground">#{index + 1}</span>
										<span class="flex-1 min-w-0">
											<span class="block text-base font-semibold"
												>{formatNumber(personal.score, { maximumFractionDigits: 1 })}</span
											>
											<span class="block text-xs text-muted-foreground font-normal">
												{m.showcase_dimensions({
													height: formatNumber(personal.height, { maximumFractionDigits: 3 }),
													weight: formatNumber(personal.weight, { maximumFractionDigits: 3 })
												})}
											</span>
										</span>
										<span class="text-xs text-right font-normal">
											{#if candidate.mapId === data.mapId}
												<span class="block font-medium">{m.showcase_current()}</span>
											{/if}
											<Countdown expireTime={candidate.expire_timestamp} />
										</span>
									</Button>
								</li>
							{/each}
						</ol>
					{:else}
						<p class="text-sm text-muted-foreground py-2">{m.showcase_no_candidates()}</p>
					{/if}
				</div>
			{/if}
		</BasicMainCard>
	</TitledMainSection>
{/if}
