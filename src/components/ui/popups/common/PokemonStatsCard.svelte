<script lang="ts">
	import { ChartColumn, Crown, Sparkles } from "@lucide/svelte";
	import * as m from "$lib/paraglide/messages.js";
	import { formatNumber, formatNumberCompact, formatRatio } from "$lib/utils/numberFormat";
	import { getRarityLabel } from "$lib/utils/pokemonUtils";
	import StatsMainCard from "@/components/ui/popups/common/StatsMainCard.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import type { PokemonData } from "$lib/types/mapObjectData/pokemon";
	import { getPokemonStats as getMasterPokemonStats, type PokemonStats } from "$lib/features/masterStats.svelte";
	import { mPokemon } from "$lib/services/ingameLocale";

	let {
		data
	}: {
		data: Pick<PokemonData, "pokemon_id" | "form">
	} = $props()

	let stats: PokemonStats | undefined = $derived(getMasterPokemonStats(data.pokemon_id, data.form ?? 0))
	let statsEntry = $derived(stats?.entry)
</script>

<TitledMainSection Icon={ChartColumn} title={m.stats()}>
	{#snippet rightPart()}
		<p class="text-sm text-muted-foreground">
			{#if stats}
				{m.last_x_days({ days: formatNumber(stats.total.days) })} ·
			{/if}
			{#if statsEntry}
				{m.total_seen()}: {formatNumberCompact(
				statsEntry?.shiny?.total ?? statsEntry?.spawns?.count
			)}
			{/if}
		</p>
	{/snippet}

	<StatsMainCard>
		{#if !statsEntry || !stats}
			{m.stats_unavailable({ name: mPokemon(data) })}
		{:else}
			<StatsMainCardEntry
				Icon={Sparkles}
				name={statsEntry.shiny && statsEntry.shiny.shinies > 0
						? m.shiny_rate()
						: m.contest_shiny()}
				value={statsEntry.shiny && statsEntry.shiny.shinies > 0
						? formatRatio(statsEntry.shiny.shinies, statsEntry.shiny.total)
						: m.no_shinies_seen()}
			/>
			<StatsMainCardEntry Icon={Crown} name={m.rarity()}>
				{#snippet value()}
					{#if statsEntry.spawns && statsEntry.spawns.count > 0}
						<p class="flex gap-2">
								<span class="text-muted-foreground">
									{formatRatio(statsEntry.spawns.count, stats.total.count)}
								</span>
							<span class="text-muted-foreground">·</span>
							<span>{getRarityLabel(statsEntry.spawns.count, stats.total.count)}</span>
						</p>
					{:else}
						{m.unavailable()}
					{/if}
				{/snippet}
			</StatsMainCardEntry>
		{/if}
	</StatsMainCard>
</TitledMainSection>
