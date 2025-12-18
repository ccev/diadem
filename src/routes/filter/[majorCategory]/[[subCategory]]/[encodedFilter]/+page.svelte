<script lang="ts">
	import type { PageProps } from "./$types";
	import { browser } from "$app/environment";
	import Metadata from "@/components/utils/Metadata.svelte";
	import * as m from "@/lib/paraglide/messages";
	import {
		getAttributeLabelCp,
		getAttributeLabelIvProduct,
		getAttributeLabelIvValues,
		getAttributeLabelLevel,
		getAttributeLabelRank,
		getAttributeLabelSize
	} from "@/lib/features/filters/filterUtilsPokemon";
	import type { FiltersetPokemon, FiltersetRaid } from "@/lib/features/filters/filtersets";
	import { getGenderLabel } from "@/lib/utils/pokemonUtils";
	import { tick } from "svelte";
	import { goto } from "$app/navigation";
	import { filterTitle } from "@/lib/features/filters/filtersetUtils";
	import { getMapPath } from "@/lib/utils/getMapPath";
	import {
		makeAttributePokemonLabel,
		makeAttributeRaidLevelLabel,
		makeAttributeRaidShowLabel
	} from "@/lib/features/filters/makeAttributeChipLabel";
	import { getConfig } from "@/lib/services/config/config";

	let { data }: PageProps = $props();

	let title = $derived.by(() => {
		if (!data.majorCategory) return "";

		let title = "";

		if (data.majorCategory === "pokemon") {
			title += m.pokemon_filter();
		} else if (data.majorCategory === "gym" && data.subCategory === "raid") {
			title += m.raid_filter();
		}

		if (title) title += " | " + filterTitle(data.filterset);

		return title;
	});

	let text = $derived.by(() => {
		if (browser || !data.filterset || !data.majorCategory) return "";

		let text = "";
		if (data.majorCategory === "pokemon") {
			const filterset = data.filterset as FiltersetPokemon;

			if (filterset.pokemon) {
				text += `${m.species()}: ${makeAttributePokemonLabel(filterset.pokemon)}\n`;
			}
			if (filterset.iv || filterset.ivAtk || filterset.ivDef || filterset.ivSta) {
				text += m.pogo_ivs() + ": ";

				let valueText = "";
				if (filterset.ivAtk || filterset.ivDef || filterset.ivSta) {
					valueText = getAttributeLabelIvValues(filterset.ivAtk, filterset.ivDef, filterset.ivSta);
				}

				if (filterset.iv) {
					text += getAttributeLabelIvProduct(filterset.iv);
					if (valueText) text += `(${valueText})`;
				} else {
					text += valueText;
				}

				text += "\n";
			}
			if (filterset.cp) {
				text += `${m.cp()}: ${getAttributeLabelCp(filterset.cp)}\n`;
			}
			if (filterset.level) {
				text += `${m.level()}: ${getAttributeLabelLevel(filterset.level)}\n`;
			}
			if (filterset.pvpRankLittle) {
				text += `${m.little_league()}: ${getAttributeLabelRank(filterset.pvpRankLittle)}\n`;
			}
			if (filterset.pvpRankGreat) {
				text += `${m.great_league()}: ${getAttributeLabelRank(filterset.pvpRankGreat)}\n`;
			}
			if (filterset.pvpRankUltra) {
				text += `${m.ultra_league()}: ${getAttributeLabelRank(filterset.pvpRankUltra)}\n`;
			}
			if (filterset.size) {
				text += `${m.pokemon_size()}: ${getAttributeLabelSize(filterset.size)}\n`;
			}
			if (filterset.gender) {
				text += `${m.pokemon_gender()}: ${filterset.gender.map(getGenderLabel).join(", ")}\n`;
			}
		} else if (data.majorCategory === "gym" && data.subCategory === "raid") {
			const filterset = data.filterset as FiltersetRaid;
			if (filterset.bosses) {
				text += `${m.raid_bosses_long()}: ${makeAttributePokemonLabel(filterset.bosses)}\n`;
			}
			if (filterset.levels) {
				text += `${m.raid_levels_long()}: ${makeAttributeRaidLevelLabel(filterset.levels)}\n`;
			}
			if (filterset.show) {
				for (const show of filterset.show) {
					text += `${m.raid_show()}: ${makeAttributeRaidShowLabel(show)}\n`;
				}
			}
		}
		return text;
	});

	if (browser) {
		tick().then(() => {
			goto(getMapPath(getConfig()));
		});
	}
</script>

<svelte:head>
	{#if !browser && data}
		<Metadata
			title={title}
			embedTitle={title}
			description={text}
		/>
	{/if}
</svelte:head>

{#if browser}
	<a class="p-4 mx-auto underline" href={getMapPath(getConfig())}>
		{m.redirect_notice({ goal: title })}
	</a>
{/if}
