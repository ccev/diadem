<script lang="ts">
	import FiltersetModal from "@/components/menus/filters/filterset/FiltersetModal.svelte";
	import AttributeChip from "@/components/menus/filters/filterset/AttributeChip.svelte";
	import Attribute from "@/components/menus/filters/filterset/Attribute.svelte";
	import AttributesOverview from "@/components/menus/filters/filterset/AttributesOverview.svelte";
	import * as m from "@/lib/paraglide/messages";
	import type { FiltersetRaid } from "@/lib/features/filters/filtersets";
	import { getCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte";
	import {
		makeAttributePokemonLabel,
		makeAttributeRaidLevelLabel,
		makeAttributeRaidShowLabel
	} from "@/lib/features/filters/makeAttributeChipLabel";
	import Card from "@/components/ui/Card.svelte";
	import RaidTypeAttribute from "@/components/menus/filters/filterset/raid/RaidTypeAttribute.svelte";
	import { RaidLevel, type RaidFilterType } from "@/lib/utils/gymUtils";
	import HatchedLevelAttribute from "@/components/menus/filters/filterset/raid/HatchedLevelAttribute.svelte";
	import RaidLevelAttribute from "@/components/menus/filters/filterset/raid/RaidLevelAttribute.svelte";
	import RaidBossAttribute from "@/components/menus/filters/filterset/raid/RaidBossAttribute.svelte";
	import RaidFilterDisplay from "@/components/menus/filters/filterset/raid/RaidFilterDisplay.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import ModifiersAttribute from "@/components/menus/filters/filterset/modifiers/ModifiersAttribute.svelte";
	import ModifierPreview from "@/components/menus/filters/filterset/modifiers/ModifierPreview.svelte";
	import { getIconPokemon, getIconRaidEgg } from "@/lib/services/uicons.svelte";

	let data: FiltersetRaid | undefined = $derived(getCurrentSelectedFilterset()?.data) as
		| FiltersetRaid
		| undefined;

	let filterType: RaidFilterType = $derived(Object.hasOwn(data ?? {}, "bosses") ? "boss" : "level");

	function getModifierPreviewIcon(filterset: FiltersetRaid) {
		const bosses = filterset.bosses;
		const boss = bosses?.[bosses.length - 1];
		if (boss) {
			return getIconPokemon({ pokemon_id: boss.pokemon_id, form: boss.form });
		}

		return getIconRaidEgg(filterset.levels?.[0] ?? RaidLevel.LEGENDARY);
	}
</script>

<FiltersetModal
	modalType="filtersetRaid"
	mapObject={MapObjectType.GYM}
	majorCategory="gym"
	subCategory="raid"
	titleBase={m.raid_filter()}
	titleShared={m.shared_raid_filter()}
	titleNew={m.new_raid_filter()}
	titleEdit={m.edit_raid_filter()}
	height={156}
>
	{#snippet base()}
		{#if data}
			<RaidFilterDisplay {data} />
		{/if}
	{/snippet}
	{#snippet overview()}
		{#if data}
			<Card class="w-full px-4 pt-2 pb-3">
				<RaidTypeAttribute {data} bind:filterType />
			</Card>

			{#if filterType === "level"}
				<AttributesOverview>
					<Attribute label={m.raid_levels()}>
						<AttributeChip
							label={makeAttributeRaidLevelLabel(data.levels ?? [])}
							isEmpty={!data.levels}
							onremove={() => delete data.levels}
						/>
						{#snippet page(thisData: FiltersetRaid)}
							<RaidLevelAttribute data={thisData} />
						{/snippet}
					</Attribute>
					<Attribute label={m.raid_show()}>
						{#if !data.show}
							<AttributeChip isEmpty={true} />
						{:else}
							{#each data.show as showType}
								<AttributeChip
									label={makeAttributeRaidShowLabel(showType)}
									isEmpty={false}
									onremove={() => {
										if (data.show?.length === 1) {
											delete data.show;
										} else {
											data.show = data.show?.filter((s) => s !== showType);
										}
									}}
								/>
							{/each}
						{/if}
						{#snippet page(thisData: FiltersetRaid)}
							<HatchedLevelAttribute data={thisData} />
						{/snippet}
					</Attribute>
				</AttributesOverview>
			{:else}
				<AttributesOverview>
					<Attribute label={m.raid_bosses()}>
						<AttributeChip
							label={makeAttributePokemonLabel(data.bosses ?? [])}
							isEmpty={!data.bosses}
							onremove={() => delete data.bosses}
						/>
						{#snippet page(thisData: FiltersetRaid)}
							<RaidBossAttribute data={thisData} />
						{/snippet}
					</Attribute>
				</AttributesOverview>
			{/if}

			<AttributesOverview>
				<Attribute label={m.modifier_visual()}>
					<ModifierPreview
						modifiers={data.modifiers}
						iconUrl={getModifierPreviewIcon(data)}
						filterset={data}
						compact
					/>
					{#snippet page(thisData: FiltersetRaid)}
						<ModifiersAttribute data={thisData} iconUrl={getModifierPreviewIcon(thisData)} />
					{/snippet}
				</Attribute>
			</AttributesOverview>
		{/if}
	{/snippet}
</FiltersetModal>
