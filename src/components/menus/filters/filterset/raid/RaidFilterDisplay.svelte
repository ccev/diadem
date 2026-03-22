<script lang="ts">
	import type { FiltersetRaid } from "@/lib/features/filters/filtersets";
	import AttributeDisplay from "@/components/menus/filters/filterset/display/AttributeDisplay.svelte";
	import PokemonDisplay from "@/components/menus/filters/filterset/display/PokemonDisplay.svelte";
	import FilterDisplay from "@/components/menus/filters/filterset/display/FilterDisplay.svelte";
	import HorizontalScrollDisplay from "@/components/menus/filters/filterset/display/HorizontalScrollDisplay.svelte";
	import HorizontalScrollElement from "@/components/menus/filters/filterset/display/HorizontalScrollElement.svelte";
	import { resize } from "@/lib/services/assets";
	import { getIconPokemon, getIconRaidEgg } from "@/lib/services/uicons.svelte";
	import { mRaid } from "@/lib/services/ingameLocale";
	import { makeAttributeRaidShowLabel } from "@/lib/features/filters/makeAttributeChipLabel";
	import * as m from "@/lib/paraglide/messages";
	import ModifierPreview from "@/components/menus/filters/filterset/modifiers/ModifierPreview.svelte";
	import { RaidLevel } from "@/lib/utils/gymUtils";

	let {
		data
	}: {
		data: FiltersetRaid
	} = $props();

	let previewIconUrl = $derived.by(() => {
		const boss = data.bosses?.[data.bosses.length - 1];
		if (boss) return getIconPokemon({ pokemon_id: boss.pokemon_id, form: boss.form });
		return getIconRaidEgg(data.levels?.[0] ?? RaidLevel.LEGENDARY);
	});
</script>

<FilterDisplay>
	{#if data.bosses}
		<PokemonDisplay label={m.raid_bosses_long()} pokemon={data.bosses} />
	{/if}
	{#if data.levels}
		<HorizontalScrollDisplay label={m.raid_levels_long()}>
			{#each data.levels as raidLevel (raidLevel)}
				<HorizontalScrollElement>
					<img
						class="w-7"
						src={resize(getIconRaidEgg(raidLevel), { width: 64 })}
						alt={mRaid(raidLevel, true)}
					>
					{mRaid(raidLevel, true)}
				</HorizontalScrollElement>
			{/each}
		</HorizontalScrollDisplay>
	{/if}
	{#if data.show}
		{#each data.show as show}
			<AttributeDisplay label={m.raid_show()} value={makeAttributeRaidShowLabel(show)} />
		{/each}
	{/if}

	{#if data.modifiers}
		<div class="flex items-center gap-4 w-full">
			<div class="bg-border h-px w-full"></div>
			<span class="text-muted-foreground text-sm whitespace-nowrap">{m.modifier_visual()}</span>
			<div class="bg-border h-px w-full"></div>
		</div>
		<div class="w-full">
			<ModifierPreview modifiers={data.modifiers} iconUrl={previewIconUrl} filterset={data} />
		</div>
	{/if}
</FilterDisplay>
