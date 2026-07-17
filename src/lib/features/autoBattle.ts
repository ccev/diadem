import type { GymData } from "$lib/types/mapObjectData/gym";
import type { StationData } from "$lib/types/mapObjectData/station";
import { MapObjectType } from "$lib/mapObjects/mapObjectTypes";

export type BattleType = "raid" | "max_battle";

export type BattleBoss = {
	type: BattleType;
	pokemon_id: number;
	form?: number;
	temp_evolution_id?: number;
	alignment?: number;
	bread_mode?: number;
	gender?: number;
};

export type AvailableBoss = BattleBoss & {
	level: number;
	count: number;
};

export type Battle = BattleBoss & {
	id: string;
	name?: string;
	latitude: number;
	longitude: number;
	level?: number;
	start_timestamp: number;
	end_timestamp: number;
	cp?: number;
	move_1?: number;
	move_2?: number;
	address?: string;
};

export type ConnectedAccount = {
	friendCode: string;
	nickname: string;
	team: number;
	level: number;
	state: "active" | "pending" | "inactive";
	lastUpdated: string;
};

export type FriendProfile = {
	friend_code: string;
	team_id: 0 | 1 | 2 | 3;
	name: string;
	level: number;
	already_friends: boolean;
};

export type BattleLobby = {
	player_count: number;
	join_end_ms: number;
};

export type BattleSession = {
	session_id: string;
	state: BattleSessionState;
	battle: Battle;
	lobby?: BattleLobby | null;
	error?: string;
};

export type BattleStart = {
	session_id: string;
	battle: Battle;
	lobby?: BattleLobby | null;
};

export type BattleSessionState =
	| "queued"
	| "awaiting_friend_accept"
	| "friend_ready"
	| "scanning_battle"
	| "finding_lobby"
	| "inviting"
	| "invites_sent"
	| "completed"
	| "failed";

export type AutoBattleApiErrorBody = {
	error?: string;
	message?: string;
};

export type AutoBattleHealth = {
	status: "ok" | "degraded" | "down";
};

export class AutoBattleApiError extends Error {
	constructor(
		public status: number,
		public body: AutoBattleApiErrorBody
	) {
		super(body.error ?? body.message ?? "The Auto Battle request failed.");
	}
}

export function getRemoteInvite(data: GymData | StationData) {
	const friends = ["444434678928"];

	// TODO: friend flow
	// TODO: visual feedback
	const response = startSpecificBattle(data.type, data.id, friends, data.lat, data.lon);
	if (!response) return;

	response
		.then(() => {
			// TODO: success
		})
		.catch((error) => {
			// TODO: error
		});
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(
		`/api/${path.startsWith("user/") ? "" : "auto-battle/"}${path}`,
		init
	);
	const text = await response.text();
	let body: T | AutoBattleApiErrorBody;
	try {
		body = JSON.parse(text);
	} catch {
		body = { error: text || `Request failed with status ${response.status}` };
	}
	if (!response.ok) throw new AutoBattleApiError(response.status, body as AutoBattleApiErrorBody);
	return body as T;
}

export function getAutoBattleHealth() {
	return request<AutoBattleHealth>("health");
}

export function getAvailableBosses() {
	return request<{ bosses: AvailableBoss[] }>("available");
}

export function getFriendProfiles(codes: string[]) {
	return request<{ profiles: FriendProfile[] }>("friends/profiles", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ codes })
	});
}

export function getConnectedAccounts(refresh = false) {
	return request<{ accounts: ConnectedAccount[] }>(
		`user/connected-accounts${refresh ? "?refresh=1" : ""}`
	);
}

export function connectAccount(friendCode: string) {
	return request<{ account: ConnectedAccount }>("user/connected-accounts", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ friendCode })
	});
}

export function removeConnectedAccount(friendCode: string) {
	return request<{ error: null }>(`user/connected-accounts/${encodeURIComponent(friendCode)}`, {
		method: "DELETE"
	});
}

export function startBattle(friendCodes: string[], boss: BattleBoss) {
	return request<BattleStart>("battle", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ friend_codes: friendCodes, boss })
	});
}

export function getBattleStatus(sessionId: string) {
	return request<BattleSession>(`battle/status/${encodeURIComponent(sessionId)}`);
}

function startSpecificBattle(
	type: MapObjectType,
	id: string,
	friendCodes: string[],
	lat: number,
	lon: number
) {
	if (![MapObjectType.GYM, MapObjectType.STATION].includes(type)) return;

	const path = `battle/${type}/${encodeURIComponent(id)}`;

	return request<BattleStart>(path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ friend_codes: friendCodes, lat, lon })
	});
}
