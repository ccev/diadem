<script lang="ts">
	import type { PageProps } from "./$types";
	import { browser } from "$app/environment";

	import {
		getAttributeLabelCp,
		getAttributeLabelIvProduct,
		getAttributeLabelIvValues,
		getAttributeLabelLevel,
		getAttributeLabelRank,
		getAttributeLabelSize
	} from "@/lib/features/filters/filterUtilsPokemon";
	import type {
		FiltersetInvasion,
		FiltersetPokemon,
		FiltersetRaid
	} from "@/lib/features/filters/filtersets";
	import { getGenderLabel } from "@/lib/utils/pokemonUtils";
	import { filterTitle } from "@/lib/features/filters/filtersetUtils.svelte";
	import {
		makeAttributePokemonLabel,
		makeAttributeRaidLevelLabel,
		makeAttributeRaidShowLabel
	} from "@/lib/features/filters/makeAttributeChipLabel";
	import RedirectFlash from "@/components/ui/RedirectFlash.svelte";
	import { makeAttributeCharacterLabel } from "@/lib/features/filters/filterUtilsInvasion";
	import Metadata from "@/components/utils/Metadata.svelte";

	let { data }: PageProps = $props();

	let title = $derived.by(() => {
		if (!data.majorCategory) return "";

		let title = "";

		if (data.majorCategory === "pokemon") {
			title += "Pokémon Filter";
		} else if (data.majorCategory === "gym" && data.subCategory === "raid") {
			title += "Raid Filter";
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
				text += `Species: ${makeAttributePokemonLabel(filterset.pokemon)}\n`;
			}
			if (filterset.iv || filterset.ivAtk || filterset.ivDef || filterset.ivSta) {
				text += "IVs" + ": ";

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
				text += `CP: ${getAttributeLabelCp(filterset.cp)}\n`;
			}
			if (filterset.level) {
				text += `Level: ${getAttributeLabelLevel(filterset.level)}\n`;
			}
			if (filterset.pvpRankLittle) {
				text += `Little League: ${getAttributeLabelRank(filterset.pvpRankLittle)}\n`;
			}
			if (filterset.pvpRankGreat) {
				text += `Great League: ${getAttributeLabelRank(filterset.pvpRankGreat)}\n`;
			}
			if (filterset.pvpRankUltra) {
				text += `Ultra League: ${getAttributeLabelRank(filterset.pvpRankUltra)}\n`;
			}
			if (filterset.size) {
				text += `Size: ${getAttributeLabelSize(filterset.size)}\n`;
			}
			if (filterset.gender) {
				text += `Gender: ${filterset.gender.map(getGenderLabel).join(", ")}\n`;
			}
		} else if (data.majorCategory === "gym" && data.subCategory === "raid") {
			const filterset = data.filterset as FiltersetRaid;
			if (filterset.bosses) {
				text += `Raid Bosses: ${makeAttributePokemonLabel(filterset.bosses)}\n`;
			}
			if (filterset.levels) {
				text += `Raid Levels: ${makeAttributeRaidLevelLabel(filterset.levels)}\n`;
			}
			if (filterset.show) {
				for (const show of filterset.show) {
					text += `Show: ${makeAttributeRaidShowLabel(show)}\n`;
				}
			}
		} else if (data.majorCategory === "pokestop" && data.subCategory === "invasion") {
			const filterset = data.filterset as FiltersetInvasion;
			if (filterset.characters) {
				text += `Grunts: ${makeAttributeCharacterLabel(filterset.characters)}\n`;
			}
			if (filterset.rewards) {
				text += `Rewards: ${makeAttributePokemonLabel(filterset.rewards)}\n`;
			}
		}
		return text;
	});
</script>

{#if !browser && data}
	<Metadata {title} embedTitle={title} description={text} />
{/if}

<RedirectFlash goal={title} />
