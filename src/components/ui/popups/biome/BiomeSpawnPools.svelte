<script lang="ts">
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { mPokemon } from "@/lib/services/ingameLocale";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";
	import type { BiomePools } from "@/lib/types/mapObjectData/biome";
	import { getBiomePoolSpawns } from "@/lib/utils/biomeUtils";
	import { formatPercentage } from "@/lib/utils/numberFormat";
	import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
	import { getHeaders, parseResponse } from "@/lib/utils/requests";
	import { Astroid, CalendarDays, Globe, LoaderCircle, Sprout } from "@lucide/svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import { resize } from "$lib/services/assets";

	let { cellId }: { cellId: string } = $props();

	const sections = $derived([
		{ component: "event", title: m.biome_event_spawns(), Icon: CalendarDays },
		{ component: "background", title: m.biome_background_spawns(), Icon: Sprout },
		{ component: "regional", title: m.biome_regional_spawns(), Icon: Globe }
	]);

	const pools = $derived.by(async () => {
		const response = await fetch(`/api/biome/${encodeURIComponent(cellId)}/pools`, {
			headers: getHeaders()
		});
		if (!response.ok) throw new Error();
		return parseResponse<BiomePools>(response);
	});
</script>

{#await pools}
	<div class="flex items-center gap-2 text-muted-foreground" role="status">
		<LoaderCircle class="size-4 animate-spin" />
		{m.biome_pool_loading()}
	</div>
{:then data}
	<div class="space-y-7">
		{#each data.components as pool, index (index)}
			{@const section = sections.find((section) => section.component === pool.name) ?? {
				title: m.biome_special_spawns(),
				Icon: Astroid
			}}
			{@const spawns = getBiomePoolSpawns(data, index)}
			<TitledMainSection Icon={section.Icon} title={section.title} disabled={!spawns.length}>
				{#snippet rightPart()}
					<span class="text-muted-foreground">
						{m.biome_pool_share({ share: formatPercentage(pool.share, { minDecimals: 0 }) })}
					</span>
				{/snippet}
				{#if spawns.length}
					<!-- svelte-ignore a11y_no_noninteractive_tabindex (The horizontal scroll region needs keyboard access.) -->
					<div
						class="overflow-x-auto overscroll-x-contain pb-2 touch-pan-x"
						role="region"
						aria-label={section.title}
						tabindex="0"
					>
						<ul class="flex gap-2">
							{#each spawns as spawn (`${spawn.pokemon_id}-${spawn.form}`)}
								{@const pokemon = {
									pokemon_id: spawn.pokemon_id,
									form: getNormalizedForm(spawn.pokemon_id, spawn.form)
								}}
								<li class="w-23 shrink-0 rounded-lg border border-border bg-accent p-2 text-center">
									<ImagePopup
										src={resize(getIconPokemon(pokemon), { width: 64 })}
										alt={mPokemon(pokemon)}
										class="mx-auto size-10"
										loading="lazy"
									/>
									<p class="mt-2 truncate text-sm font-semibold" title={mPokemon(pokemon)}>
										{mPokemon(pokemon)}
									</p>
									<p class="mt-2 tabular-nums">
										{#if spawn.minimum === spawn.maximum}
											{formatPercentage(spawn.minimum, { maxSignificantDecimals: 2 })}
										{:else}
											{formatPercentage(spawn.minimum, {
												maxSignificantDecimals: 2
											})}–{formatPercentage(spawn.maximum, { maxSignificantDecimals: 2 })}
										{/if}
									</p>
								</li>
							{/each}
						</ul>
					</div>
				{:else}
					<BasicMainCard>
						{m.biome_pool_unknown()}
					</BasicMainCard>
				{/if}
			</TitledMainSection>
		{/each}
	</div>
{:catch e}
	<TitledMainSection Icon={Sprout} title={m.spawn_pools()} disabled={true}>
		<BasicMainCard>
			{m.spawnpool_error()}
		</BasicMainCard>
	</TitledMainSection>
{/await}
