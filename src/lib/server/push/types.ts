export type {
	MinMax,
	PushAlertCategory,
	PushAlertRules
} from "@/lib/features/notifications/pushTypes";
export { emptyPushAlertRules } from "@/lib/features/notifications/pushTypes";

/** Pokémon fields the matcher needs, mapped from the Golbat webhook. */
export type MatchablePokemon = {
	encounterId: string;
	pokemonId: number;
	form: number;
	lat: number;
	lon: number;
	despawnMs: number; // expire_timestamp * 1000; 0 if unknown
	iv?: number; // 0..100 overall, computed from atk/def/sta
	atkIv?: number;
	defIv?: number;
	staIv?: number;
	level?: number;
	cp?: number;
	size?: number;
	gender?: number;
};

export type MatchableRaid = {
	gymId: string;
	lat: number;
	lon: number;
	level: number;
	pokemonId: number; // 0 = egg
	form: number;
	tempEvolutionId: number;
	startMs: number;
	endMs: number;
	gymName?: string;
	cp?: number;
	move1?: number;
	move2?: number;
	gender?: number;
	costume?: number;
	teamId?: number;
};

export type MatchableQuest = {
	pokestopId: string;
	lat: number;
	lon: number;
	title?: string;
	target?: number;
	rewardType: number; // RewardType
	reward: { pokemonId?: number; form?: number; itemId?: number; amount?: number };
	pokestopName?: string;
	updatedMs: number;
};

export type MatchableInvasion = {
	id: string;
	pokestopId: string;
	lat: number;
	lon: number;
	character: number;
	confirmed: boolean;
	displayType: number;
	expirationMs: number;
	rewardPokemon: { pokemon_id: number; form: number }[];
	pokestopName?: string;
};

export type MatchableMaxBattle = {
	stationId: string;
	lat: number;
	lon: number;
	name?: string;
	level: number;
	pokemonId: number; // 0 = no active boss
	form: number;
	breadMode: number;
	isActive: boolean;
	gmaxCount: number;
	startMs: number;
	endMs: number;
};

export type MatchableObject =
	| { kind: "pokemon"; data: MatchablePokemon }
	| { kind: "raid"; data: MatchableRaid }
	| { kind: "quest"; data: MatchableQuest }
	| { kind: "invasion"; data: MatchableInvasion }
	| { kind: "maxBattle"; data: MatchableMaxBattle };

export type StoredSubscription = {
	id: string;
	endpoint: string;
	endpointHash: string;
	p256dh: string;
	auth: string;
};

export type PushPayload = {
	kind: string;
	title: string;
	body: string;
	tag: string;
	url: string;
	icon: string;
	badge: string;
	timestamp?: number; // associated event timestamp (ms): despawn/end/expiry
	address?: string;
};
