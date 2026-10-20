<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import type { MapData } from "@/lib/mapObjects/mapObjectTypes";
	import type { BiomeData } from "@/lib/types/mapObjectData/biome";
	import * as m from "@/lib/paraglide/messages";
	import { getBiomeColor, getBiomeFieldLabel, getBiomeLabel } from "@/lib/utils/biomeUtils";
	import { formatNumber } from "@/lib/utils/numberFormat";
	import {
		Earth,
		Info,
		Mountain,
		Sprout,
		ThermometerSun,
		Waves,
		Leaf,
		Trees,
		TreePalm,
		FingerprintPattern
	} from "@lucide/svelte";
	import StatsMainCard from "@/components/ui/popups/common/StatsMainCard.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import BiomeSpawnPools from "@/components/ui/popups/biome/BiomeSpawnPools.svelte";
	import UpdatedTimeCountdown from "@/components/ui/popups/common/UpdatedTimeCountdown.svelte";

	export { image, main };

	export function getPopupPropsBiome(data: MapData): MapObjectPopupProps {
		const biome = data as BiomeData;
		return { type: m.biome(), title: getBiomeLabel(biome.profile), image, main };
	}
</script>

{#snippet image(d: MapData)}
	{@const data = d as BiomeData}
	<div
		class="size-12 -mr-2 shrink-0 flex items-center justify-center rounded-full"
		style:background={getBiomeColor(data.profile, 0.4)}
		style:color={getBiomeColor(data.profile, 1)}
	>
		<Leaf class="size-5" />
	</div>
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as BiomeData}
	{@const profile = data.profile}
	{@const fields = profile.fields}
	<TitledMainSection Icon={Earth} title={m.biome_geography()} disabled={!fields}>
		<StatsMainCard>
			{#if !fields}
				{m.biome_geography_unknown()}
			{:else}
				<StatsMainCardEntry
					Icon={Mountain}
					name={m.biome_landform()}
					value={getBiomeFieldLabel("landform", fields.landform)}
				/>
				<StatsMainCardEntry
					Icon={Trees}
					name={m.biome_landcover()}
					value={getBiomeFieldLabel("landcover", fields.landcover)}
				/>
				<StatsMainCardEntry
					Icon={ThermometerSun}
					name={m.biome_temperature()}
					value={getBiomeFieldLabel("temperature", fields.temperature)}
				/>
				<StatsMainCardEntry Icon={TreePalm} name={m.biome_features()}>
					{#snippet value()}
						{#if fields.features?.length}
							{fields.features.map((value) => getBiomeFieldLabel("features", value)).join(", ")}
						{:else if fields.features}
							{m.biome_unset()}
						{:else}
							{m.unknown()}
						{/if}
					{/snippet}
				</StatsMainCardEntry>
			{/if}
		</StatsMainCard>
	</TitledMainSection>

	<BiomeSpawnPools cellId={data.id} />

	<TitledMainSection Icon={Info} title={m.about_this_biome()}>
		<StatsMainCard>
			<StatsMainCardEntry Icon={FingerprintPattern} name={m.s2_cell_id()} value={data.id} />
			{#if profile.geography_updated_at !== undefined}
				{@const updated = profile.geography_updated_at}
				<StatsMainCardEntry Icon={Earth} name={m.biome_updated_geography()}>
					{#snippet value()}
						<UpdatedTimeCountdown timestamp={updated} />
					{/snippet}
				</StatsMainCardEntry>
			{/if}
			{#if profile.pools_updated_at !== undefined}
				{@const updated = profile.pools_updated_at}
				<StatsMainCardEntry Icon={Sprout} name={m.biome_updated_spawn_pools()}>
					{#snippet value()}
						<UpdatedTimeCountdown timestamp={updated} />
					{/snippet}
				</StatsMainCardEntry>
			{/if}
		</StatsMainCard>
	</TitledMainSection>
{/snippet}
