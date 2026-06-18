import { getPushAlerts } from "@/lib/server/db/internal/repository";
import { getClientConfig, getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type {
	FiltersetInvasion,
	FiltersetMaxBattle,
	FiltersetPokemon,
	FiltersetQuest,
	FiltersetRaid
} from "@/lib/features/filters/filtersets";
import type { MinMax } from "@/lib/server/push/types";

const log = getLogger("push");

// RewardType values (mirrors @/lib/utils/pokestopUtils, which isn't server-safe).
const RewardType = { XP: 1, ITEM: 2, STARDUST: 3, CANDY: 4, POKEMON: 7, XL_CANDY: 9, MEGA_ENERGY: 12 };

function nowSec(): number {
	return Math.floor(Date.now() / 1000);
}

function coords(): { latitude: number; longitude: number } {
	const general = getClientConfig().general;
	return { latitude: general.defaultLat ?? 51.516855, longitude: general.defaultLon ?? -0.0805 };
}

function valueInRange(range: MinMax | undefined, fallback: number): number {
	if (!range) return fallback;
	return Math.min(range.max, Math.max(range.min, fallback));
}

function ivStats(range: MinMax | undefined): {
	individual_attack: number;
	individual_defense: number;
	individual_stamina: number;
} {
	if (!range) return { individual_attack: 15, individual_defense: 15, individual_stamina: 15 };
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

function uid(prefix: string, index: number, id: string): string {
	return `diadem-test-${prefix}-${Date.now()}-${index}-${id}`;
}

function fakePokemon(fs: FiltersetPokemon, index: number) {
	const mon = fs.pokemon?.[0];
	return {
		encounter_id: uid("pokemon", index, fs.id),
		pokemon_id: mon?.pokemon_id ?? 1,
		form: mon?.form ?? 0,
		...coords(),
		disappear_time: nowSec() + 900,
		seen_type: "wild",
		...ivStats(fs.iv),
		pokemon_level: valueInRange(fs.level, 35),
		cp: valueInRange(fs.cp, 1500),
		size: valueInRange(fs.size, 1),
		gender: fs.gender?.[0] ?? 1
	};
}

function fakeRaid(fs: FiltersetRaid, index: number) {
	const boss = fs.bosses?.[0];
	const eggOnly = !boss && fs.show?.includes("egg") && !fs.show?.includes("boss");
	return {
		gym_id: uid("raid", index, fs.id),
		...coords(),
		gym_name: "Test Gym",
		level: fs.levels?.[0] ?? 5,
		pokemon_id: eggOnly ? 0 : (boss?.pokemon_id ?? 150),
		form: boss?.form ?? 0,
		evolution: boss?.temp_evolution_id ?? 0,
		start: nowSec(),
		end: nowSec() + 3600
	};
}

function fakeQuestReward(fs: FiltersetQuest): { type: number; info: Record<string, number> } {
	if (fs.pokemon?.[0]) {
		return { type: RewardType.POKEMON, info: { pokemon_id: fs.pokemon[0].pokemon_id, form: fs.pokemon[0].form } };
	}
	if (fs.item?.[0]) {
		return { type: RewardType.ITEM, info: { item_id: Number(fs.item[0].id), amount: fs.item[0].amount ?? 1 } };
	}
	if (fs.megaResource?.[0]) {
		return { type: RewardType.MEGA_ENERGY, info: { pokemon_id: Number(fs.megaResource[0].id), amount: fs.megaResource[0].amount ?? 100 } };
	}
	if (fs.candy?.[0]) {
		return { type: RewardType.CANDY, info: { pokemon_id: Number(fs.candy[0].id), amount: fs.candy[0].amount ?? 3 } };
	}
	if (fs.xlCandy?.[0]) {
		return { type: RewardType.XL_CANDY, info: { pokemon_id: Number(fs.xlCandy[0].id), amount: fs.xlCandy[0].amount ?? 1 } };
	}
	if (fs.stardust) {
		return { type: RewardType.STARDUST, info: { amount: valueInRange(fs.stardust, 1000) } };
	}
	if (fs.xp) {
		return { type: RewardType.XP, info: { amount: valueInRange(fs.xp, 500) } };
	}
	return { type: RewardType.POKEMON, info: { pokemon_id: 1, form: 0 } };
}

function fakeQuest(fs: FiltersetQuest, index: number) {
	const task = fs.tasks?.[0];
	return {
		pokestop_id: uid("quest", index, fs.id),
		...coords(),
		title: task?.title ?? "catch_pokemon",
		target: task?.target ?? 5,
		pokestop_name: "Test Pokéstop",
		rewards: [fakeQuestReward(fs)],
		updated: nowSec()
	};
}

function fakeInvasion(fs: FiltersetInvasion, index: number) {
	const character = fs.characters?.[0] ?? 4;
	const lineup = (fs.rewards ?? []).map((r) => ({ pokemon_id: r.pokemon_id, form: r.form }));
	return {
		id: uid("invasion", index, fs.id),
		pokestop_id: uid("invasion-stop", index, fs.id),
		...coords(),
		character,
		confirmed: lineup.length > 0,
		display_type: 1,
		expiration: nowSec() + 1800,
		lineup,
		pokestop_name: "Test Pokéstop"
	};
}

function fakeMaxBattle(fs: FiltersetMaxBattle, index: number) {
	const boss = fs.bosses?.[0];
	return {
		id: uid("station", index, fs.id),
		...coords(),
		name: "Test Power Spot",
		battle_level: fs.levels?.[0] ?? 5,
		battle_pokemon_id: boss?.pokemon_id ?? 0,
		battle_pokemon_form: boss?.form ?? 0,
		battle_pokemon_bread_mode: boss?.bread_mode ?? 0,
		is_battle_available: fs.isActive || !!boss,
		total_stationed_gmax: fs.hasGmax ? 1 : 0,
		battle_start: nowSec(),
		battle_end: nowSec() + 3600
	};
}

export const POST: RequestHandler = async ({ fetch, locals }) => {
	if (!locals.user) return json({ error: "Not logged in" }, { status: 401 });

	const push = getServerConfig().push;
	if (!push?.enabled) return json({ error: "Push disabled" }, { status: 503 });

	const rules = await getPushAlerts(locals.user.id);
	const enabled = <T extends { enabled: boolean }>(arr: T[]) => arr.filter((f) => f.enabled);

	const body: { type: string; message: unknown }[] = [
		...enabled(rules.pokemon).map((fs, i) => ({ type: "pokemon", message: fakePokemon(fs, i) })),
		...enabled(rules.raid).map((fs, i) => ({ type: "raid", message: fakeRaid(fs, i) })),
		...enabled(rules.quest).map((fs, i) => ({ type: "quest", message: fakeQuest(fs, i) })),
		...enabled(rules.invasion).map((fs, i) => ({ type: "invasion", message: fakeInvasion(fs, i) })),
		...enabled(rules.maxBattle).map((fs, i) => ({ type: "max_battle", message: fakeMaxBattle(fs, i) }))
	];

	if (body.length === 0) return json({ error: "No enabled alert rules" }, { status: 400 });

	log.info(`Sending fake Golbat webhook for user ${locals.user.id}: messages=${body.length}`);

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

	return json(
		{ ...data, generated: body.length, status: response.status },
		{ status: response.ok ? 200 : response.status }
	);
};
