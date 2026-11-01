import { getPokemonStats } from "@/lib/features/masterStats.svelte";
import type { MasterFile, MasterPokemon, MasterWeather } from "@/lib/types/masterfile";
import { getHeaders, parseResponse } from "@/lib/utils/requests";

const url = "/api/pogodata";
let masterFile: MasterFile;

export async function loadMasterFile() {
	const result = await fetch(url, { headers: getHeaders() });
	masterFile = await parseResponse<MasterFile>(result);
}

export function overwriteMasterfile(newMaster: MasterFile) {
	masterFile = newMaster;
}

export function defaultProp(obj: any | undefined, key: any, fallback: any): any {
	if (!obj) return fallback;
	return obj[key] ?? fallback;
}

export function getMasterFile() {
	return masterFile;
}

export function getMasterPokemon(
	pokemonId: string | number,
	formId: string | number | undefined | null = undefined,
	tempEvoId: string | number | undefined | null = undefined
): MasterPokemon | undefined {
	const pokemon = masterFile.pokemon["" + pokemonId];
	if (!formId && !tempEvoId) return pokemon;

	if (tempEvoId) {
		const tempEvo = pokemon.tempEvos["" + tempEvoId];
		if (tempEvo) return tempEvo;
	}

	if (formId) {
		const form = pokemon.forms["" + formId];
		if (form) return form;
	}

	return pokemon;
}

const blacklistBasePokemon = [
	412,
	413, // burmy
	421, // cherrim
	422,
	423, // shellos
	669, // flabebe
	676, // furfrou
	710,
	711, // pumpkaboo
	741 // oricorio
];
const blacklistForms = [
	25, // pikachu
	327, // spinda
	664,
	665 // scatterbug
];

export function getAllPokemon(onlyActive: boolean = false): { pokemon_id: number; form: number }[] {
	const allPokemon: { pokemon_id: number; form: number }[] = [];

	for (const [strPokemonId, pokemon] of Object.entries(masterFile.pokemon)) {
		if (pokemon.mythical || pokemon.ultraBeast) continue;

		const pokemonId = Number(strPokemonId);
		// const defaultForm = pokemon.defaultFormId ?? 0;

		if (!pokemon.unreleased && !blacklistBasePokemon.includes(pokemonId)) {
			if (!onlyActive || getPokemonStats(pokemonId, 0)?.entry) {
				allPokemon.push({ pokemon_id: pokemonId, form: 0 });
			}
		}

		// specific pokemon to ignore the forms of
		if (blacklistForms.includes(pokemonId)) continue;

		for (const [formIdRaw, form] of Object.entries(pokemon.forms)) {
			const formId = Number(formIdRaw);
			if (
				form.name !== "Normal" &&
				form.name !== "Unset" &&
				!form.name.includes("Costume") &&
				!form.name.includes("20") && // gets rid of year-specific forms
				!(form.isCostume ?? false) &&
				!form.unreleased &&
				(!onlyActive || getPokemonStats(pokemonId, formId)?.entry)
			) {
				allPokemon.push({ pokemon_id: pokemonId, form: formId });
			}
		}
	}

	return [...allPokemon];
}

export function getMasterWeather(
	weatherId: string | number | null | undefined
): MasterWeather | undefined {
	if (weatherId === undefined || weatherId === null) return undefined;

	return masterFile.weather["" + weatherId];
}

export function getAllLureModuleIds(): number[] {
	return masterFile.items.filter((i) => i.startsWith("5")).map(Number);
}

const cpMultipliers = {
	1: 0.09399999678134918,
	"1.5": 0.1351374387741089,
	2: 0.16639786958694458,
	"2.5": 0.1926509141921997,
	3: 0.21573247015476227,
	"3.5": 0.23657265305519104,
	4: 0.2557200491428375,
	"4.5": 0.27353036403656006,
	5: 0.29024988412857056,
	"5.5": 0.3060573935508728,
	6: 0.3210875988006592,
	"6.5": 0.3354450464248657,
	7: 0.349212646484375,
	"7.5": 0.3624577522277832,
	8: 0.37523555755615234,
	"8.5": 0.3875923752784729,
	9: 0.39956724643707275,
	"9.5": 0.4111935496330261,
	10: 0.42250001430511475,
	"10.5": 0.4329264163970947,
	11: 0.443107545375824,
	"11.5": 0.4530599117279053,
	12: 0.4627983570098877,
	"12.5": 0.4723360538482666,
	13: 0.48168492317199707,
	"13.5": 0.4908558130264282,
	14: 0.49985843896865845,
	"14.5": 0.508701741695404,
	15: 0.517393946647644,
	"15.5": 0.5259425044059753,
	16: 0.5343543291091919,
	"16.5": 0.5426357984542847,
	17: 0.5507926940917969,
	"17.5": 0.5588306188583374,
	18: 0.5667545199394226,
	"18.5": 0.5745691657066345,
	19: 0.5822789072990417,
	"19.5": 0.5898879170417786,
	20: 0.5974000096321106,
	"20.5": 0.604823648929596,
	21: 0.6121572852134705,
	"21.5": 0.619404137134552,
	22: 0.6265671253204346,
	"22.5": 0.6336491703987122,
	23: 0.6406529545783997,
	"23.5": 0.6475809812545776,
	24: 0.6544356346130371,
	"24.5": 0.6612192392349243,
	25: 0.667934000492096,
	"25.5": 0.6745818853378296,
	26: 0.6811649203300476,
	"26.5": 0.6876848936080933,
	27: 0.6941436529159546,
	"27.5": 0.7005428671836853,
	28: 0.7068842053413391,
	"28.5": 0.7131690979003906,
	29: 0.719399094581604,
	"29.5": 0.7255756258964539,
	30: 0.7317000031471252,
	"30.5": 0.7347410321235657,
	31: 0.7377694845199585,
	"31.5": 0.7407855987548828,
	32: 0.7437894344329834,
	"32.5": 0.7467812299728394,
	33: 0.7497610449790955,
	"33.5": 0.7527291178703308,
	34: 0.7556855082511902,
	"34.5": 0.7586303949356079,
	35: 0.7615638375282288,
	"35.5": 0.7644860744476318,
	36: 0.7673971652984619,
	"36.5": 0.7702972888946533,
	37: 0.7731865048408508,
	"37.5": 0.776064932346344,
	38: 0.7789327502250671,
	"38.5": 0.7817900776863098,
	39: 0.7846369743347168,
	"39.5": 0.7874735593795776,
	40: 0.7903000116348267,
	"40.5": 0.792803943157196,
	41: 0.7953000068664551,
	"41.5": 0.7978039383888245,
	42: 0.8003000020980835,
	"42.5": 0.8028038740158081,
	43: 0.8052999973297119,
	"43.5": 0.8078038692474365,
	44: 0.8102999925613403,
	"44.5": 0.8128038644790649,
	45: 0.8152999877929688,
	"45.5": 0.8178038001060486,
	46: 0.8202999830245972,
	"46.5": 0.822803795337677,
	47: 0.8252999782562256,
	"47.5": 0.8278037309646606,
	48: 0.830299973487854,
	"48.5": 0.8328037261962891,
	49: 0.8353000283241272,
	"49.5": 0.8378037810325623,
	50: 0.8403000235557556
};

export function calculateCp(options: {
	pokemonId: number;
	formId?: number;
	level?: number;
	cpMultiplier?: number;
	iv: [number, number, number];
}): number {
	let multiplier = options.cpMultiplier;
	if (options.level !== undefined) {
		multiplier = cpMultipliers[options.level as keyof typeof cpMultipliers];
	}

	if (!multiplier) {
		return 0;
	}

	const stats = getMasterPokemon(options.pokemonId, options.formId);

	if (!multiplier || !stats) return 0;

	const attack = stats.baseAtk + options.iv[0];
	const defense = stats.baseDef + options.iv[1];
	const stamina = stats.baseSta + options.iv[2];

	return Math.max(
		10,
		Math.floor((attack * Math.sqrt(defense) * Math.sqrt(stamina) * Math.pow(multiplier, 2)) / 10)
	);
}
