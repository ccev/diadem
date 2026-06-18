import { getPushAlerts } from "@/lib/server/db/internal/repository";
import { getClientConfig, getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { FiltersetPokemon } from "@/lib/features/filters/filtersets";
import type { MinMax } from "@/lib/server/push/types";

const log = getLogger("push");

function valueInRange(range: MinMax | undefined, fallback: number): number {
	if (!range) return fallback;
	return Math.min(range.max, Math.max(range.min, fallback));
}

function ivStats(range: MinMax | undefined): {
	individual_attack: number;
	individual_defense: number;
	individual_stamina: number;
} {
	if (!range) {
		return { individual_attack: 15, individual_defense: 15, individual_stamina: 15 };
	}

	for (let total = 0; total <= 45; total += 1) {
		const iv = (total / 45) * 100;
		if (iv >= range.min && iv <= range.max) {
			const individual_attack = Math.min(15, total);
			const individual_defense = Math.min(15, total - individual_attack);
			const individual_stamina = total - individual_attack - individual_defense;
			return { individual_attack, individual_defense, individual_stamina };
		}
	}

	return { individual_attack: 15, individual_defense: 15, individual_stamina: 15 };
}

function fakePokemonMessage(filterset: FiltersetPokemon, index: number) {
	const configuredPokemon = filterset.pokemon?.[0];
	const now = Math.floor(Date.now() / 1000);
	const general = getClientConfig().general;

	return {
		encounter_id: `diadem-test-${Date.now()}-${index}-${filterset.id}`,
		pokemon_id: configuredPokemon?.pokemon_id ?? 1,
		form: configuredPokemon?.form ?? 0,
		latitude: general.defaultLat ?? 51.516855,
		longitude: general.defaultLon ?? -0.0805,
		disappear_time: now + 900,
		seen_type: "wild",
		...ivStats(filterset.iv),
		pokemon_level: valueInRange(filterset.level, 35),
		cp: valueInRange(filterset.cp, 1500),
		size: valueInRange(filterset.size, 1),
		gender: filterset.gender?.[0] ?? 1
	};
}

export const POST: RequestHandler = async ({ fetch, locals }) => {
	if (!locals.user) return json({ error: "Not logged in" }, { status: 401 });

	const push = getServerConfig().push;
	if (!push?.enabled) return json({ error: "Push disabled" }, { status: 503 });

	const pokemonRules = (await getPushAlerts(locals.user.id)).pokemon.filter(
		(filterset) => filterset.enabled
	);
	if (pokemonRules.length === 0)
		return json({ error: "No enabled alert rules" }, { status: 400 });

	const body = pokemonRules.map((filterset, index) => ({
		type: "pokemon",
		message: fakePokemonMessage(filterset, index)
	}));
	log.info(
		`Sending fake Golbat webhook for user ${locals.user.id}: rules=${pokemonRules.length}, pokemon=${body.length}`
	);

	const response = await fetch("/api/intake/golbat", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${push.intakeSecret}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify(body)
	});
	const data = await response.json();
	log.info(
		`Fake Golbat webhook result for user ${locals.user.id}: status=${response.status}, received=${data.received}, sent=${data.dispatch?.sent ?? 0}`
	);

	return json({
		...data,
		generated: body.length,
		status: response.status
	}, { status: response.ok ? 200 : response.status });
};
