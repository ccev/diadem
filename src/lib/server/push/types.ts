export type { MinMax, PushAlertRule } from "@/lib/features/notifications/pushTypes";

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

export type StoredSubscription = {
	id: string;
	endpoint: string;
	endpointHash: string;
	p256dh: string;
	auth: string;
};

export type PushPayload = {
	title: string;
	body: string;
	tag: string;
	url: string;
	icon: string;
};
