<script lang="ts">
	import { ChartColumn, Crown, Sparkles } from "@lucide/svelte";

	import { formatNumber, formatNumberCompact, formatRatio } from "$lib/utils/numberFormat";
	import { getRarityLabel } from "$lib/utils/pokemonUtils";
	import StatsMainCard from "@/components/ui/popups/common/StatsMainCard.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import type { PokemonData } from "$lib/types/mapObjectData/pokemon";
	import {
		getPokemonStats as getMasterPokemonStats,
		type PokemonStats
	} from "$lib/features/masterStats.svelte";
	import { mPokemon } from "$lib/services/ingameLocale";

	let {
		data
	}: {
		data: Pick<PokemonData, "pokemon_id" | "form">;
	} = $props();

	let stats: PokemonStats | undefined = $derived(
		getMasterPokemonStats(data.pokemon_id, data.form ?? 0)
	);
	let statsEntry = $derived(stats?.entry);
</script>

<TitledMainSection Icon={ChartColumn} title="Stats">
	{#snippet rightPart()}
		<p class="text-sm text-muted-foreground">
			{#if stats}
				Last {formatNumber(stats.total.days)} days ·
			{/if}
			{#if statsEntry}
				Total seen: {formatNumberCompact(statsEntry?.shiny?.total ?? statsEntry?.spawns?.count)}
			{/if}
		</p>
	{/snippet}

	<StatsMainCard>
		{#if !statsEntry || !stats}
			Stats unavailable for this {mPokemon(data)}
		{:else}
			<StatsMainCardEntry
				Icon={Sparkles}
				name={statsEntry.shiny && statsEntry.shiny.shinies > 0 ? "Shiny Rate" : "Shiny"}
				value={statsEntry.shiny && statsEntry.shiny.shinies > 0
					? formatRatio(statsEntry.shiny.shinies, statsEntry.shiny.total)
					: "None seen"}
			/>
			<StatsMainCardEntry Icon={Crown} name="Rarity">
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
						Unavailable
					{/if}
				{/snippet}
			</StatsMainCardEntry>
		{/if}
	</StatsMainCard>
</TitledMainSection>
