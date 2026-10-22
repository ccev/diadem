import type { FiltersetTitle } from "./filtersets";
import { legacyFilterTitles } from "./legacyFilterTitles";

// These templates are serialized in saved/shared filters, so resolve them at display time.
export function localizeFilterTitle(title: FiltersetTitle | undefined): string {
	if (title?.title) return title.title;
	if (!title?.message) return "Unknown Filter";
	const source = Object.hasOwn(legacyFilterTitles, title.message)
		? legacyFilterTitles[title.message]
		: title.message;
	const {
		count = "",
		pokemon = "",
		attributes = "",
		type = "",
		reward = "",
		task = ""
	} = title.params ?? {};
	const storedKind = String(title.params?.kind ?? "");
	const sourceKind = Object.hasOwn(legacyFilterTitles, storedKind)
		? legacyFilterTitles[storedKind]
		: storedKind;
	const kinds: Record<string, string> = { Raids: "Raids", Bosses: "Bosses", Eggs: "Eggs" };
	const kind = Object.hasOwn(kinds, sourceKind) ? kinds[sourceKind] : sourceKind;
	switch (source) {
		case /* @wc-ignore */ "{count} Pokémon":
			return `${count} Pokémon`;
		case /* @wc-ignore */ "Unknown Filter":
			return "Unknown Filter";
		case /* @wc-ignore */ "100% IV":
			return /* @wc-include */ "100% IV";
		case /* @wc-ignore */ "0% IV":
			return /* @wc-include */ "0% IV";
		case /* @wc-ignore */ "Rank 1 Great League":
			return "Rank 1 Great League";
		case /* @wc-ignore */ "Rank 1 Ultra League":
			return "Rank 1 Ultra League";
		case /* @wc-ignore */ "XXL Magikarp":
			return "XXL Magikarp";
		case /* @wc-ignore */ "All XXL":
			return "All XXL";
		case /* @wc-ignore */ "Unown":
			return "Unown";
		case /* @wc-ignore */ "Lake Trio":
			return "Lake Trio";
		case /* @wc-ignore */ "Legendary Raids":
			return "Legendary Raids";
		case /* @wc-ignore */ "Legendary Shadow Raids":
			return "Legendary Shadow Raids";
		case /* @wc-ignore */ "Shadow Raids":
			return "Shadow Raids";
		case /* @wc-ignore */ "Mega Raids":
			return "Mega Raids";
		case /* @wc-ignore */ "Mega Legendary Raids":
			return "Mega Legendary Raids";
		case /* @wc-ignore */ "Primal Raids":
			return "Primal Raids";
		case /* @wc-ignore */ "Ultra Beast Raids":
			return "Ultra Beast Raids";
		case /* @wc-ignore */ "Elite Raids":
			return "Elite Raids";
		case /* @wc-ignore */ "Raids":
			return "Raids";
		case /* @wc-ignore */ "Bosses":
			return "Bosses";
		case /* @wc-ignore */ "Eggs":
			return "Eggs";
		case /* @wc-ignore */ "Elite {kind}":
			return `Elite ${kind}`;
		case /* @wc-ignore */ "Ultra Beast {kind}":
			return `Ultra Beast ${kind}`;
		case /* @wc-ignore */ "Primal {kind}":
			return `Primal ${kind}`;
		case /* @wc-ignore */ "Mega Legendary {kind}":
			return `Mega Legendary ${kind}`;
		case /* @wc-ignore */ "Mega {kind}":
			return `Mega ${kind}`;
		case /* @wc-ignore */ "Legendary {kind}":
			return `Legendary ${kind}`;
		case /* @wc-ignore */ "Legendary Shadow {kind}":
			return `Legendary Shadow ${kind}`;
		case /* @wc-ignore */ "Shadow {kind}":
			return `Shadow ${kind}`;
		case /* @wc-ignore */ "★ {kind}":
			return /* @wc-include */ `★ ${kind}`;
		case /* @wc-ignore */ "Shadow ★ {kind}":
			return `Shadow ★ ${kind}`;
		case /* @wc-ignore */ "★★★ {kind}":
			return /* @wc-include */ `★★★ ${kind}`;
		case /* @wc-ignore */ "Shadow ★★★ {kind}":
			return `Shadow ★★★ ${kind}`;
		case /* @wc-ignore */ "Various {kind}":
			return `Various ${kind}`;
		case /* @wc-ignore */ "Raid Filter":
			return "Raid Filter";
		case /* @wc-ignore */ "All {kind}":
			return `All ${kind}`;
		case /* @wc-ignore */ "{pokemon} Raids":
			return `${pokemon} Raids`;
		case /* @wc-ignore */ "Pokémon Filter":
			return "Pokémon Filter";
		case /* @wc-ignore */ "{attributes}{kind}":
			return /* @wc-include */ `${attributes}${kind}`;
		case /* @wc-ignore */ "{count} Grunts":
			return `${count} Grunts`;
		case /* @wc-ignore */ "{count} Leaders":
			return `${count} Leaders`;
		case /* @wc-ignore */ "Team Rocket Filter":
			return "Team Rocket Filter";
		case /* @wc-ignore */ "{type}":
			// @wc-context: Team Rocket grunt type
			return /* @wc-include */ `${type}`;
		case /* @wc-ignore */ "Giovanni":
			return "Giovanni";
		case /* @wc-ignore */ "Legendary Birds":
			return "Legendary Birds";
		case /* @wc-ignore */ "{pokemon} Grunts":
			return /* @wc-context: Grunts rewarding a Pokémon */ `${pokemon} Grunts`;
		case /* @wc-ignore */ "Inactive":
			return "Inactive";
		case /* @wc-ignore */ "Max Battle Filter":
			return "Max Battle Filter";
		case /* @wc-ignore */ "{pokemon} Max Battles":
			return `${pokemon} Max Battles`;
		case /* @wc-ignore */ "Active":
			return "Active";
		case /* @wc-ignore */ "{count} Tasks":
			return `${count} Tasks`;
		case /* @wc-ignore */ "{reward} Quests":
			return /* @wc-context: Quest filter reward */ `${reward} Quests`;
		case /* @wc-ignore */ "{task}":
			return /* @wc-include */ `${task}`;
		case /* @wc-ignore */ "Quest Filter":
			return "Quest Filter";
		case /* @wc-ignore */ "Team Rocket Leaders":
			return "Team Rocket Leaders";
		case /* @wc-ignore */ "Super Mega Raids":
			return "Super Mega Raids";
		case /* @wc-ignore */ "Legendary Super Mega Raids":
			return "Legendary Super Mega Raids";
		case /* @wc-ignore */ "Super Mega {kind}":
			return `Super Mega ${kind}`;
		default:
			return title.message;
	}
}
