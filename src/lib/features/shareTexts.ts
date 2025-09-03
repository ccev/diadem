import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import * as m from "@/lib/paraglide/messages";
import { timestampToLocalTime } from "@/lib/utils/timestampToLocalTime";
import { getRank, hasTimer, showGreat, showLittle, showUltra } from "@/lib/utils/pokemonUtils";

export function getPokemonShareText(data: PokemonData) {
	let text = "";

	if (hasTimer(data)) {
		text += `${m.popup_despawns()} ${timestampToLocalTime(data.expire_timestamp)}\n`;
	} else {
		text += `${m.popup_found()} ${timestampToLocalTime(data.first_seen_timestamp)}\n`;
	}

	if (data.cp !== null && data.level !== null) {
		text += `${m.pogo_cp({ cp: data.cp })} (${m.pogo_level({ level: data.level })})\n`;
	}

	if (data.iv !== null) {
		text += `${m.pogo_ivs()}: ${data.iv.toFixed(1)}% (${data.atk_iv ?? "?"}/${data.def_iv ?? "?"}/${data.sta_iv ?? "?"})\n`;
	}

	if (showLittle(data)) {
		text += `${m.league_rank({ league: m.little_league() })}: ${getRank(data, "little")}\n`;
	}

	if (showGreat(data)) {
		text += `${m.league_rank({ league: m.great_league() })}: ${getRank(data, "great")}\n`;
	}

	if (showUltra(data)) {
		text += `${m.league_rank({ league: m.ultra_league() })}: ${getRank(data, "ultra")}\n`;
	}

	return text
}
