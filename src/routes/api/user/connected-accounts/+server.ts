import { proxyAutoBattleRequest } from "@/lib/server/api/autoBattleApi";
import {
	listConnectedAccounts,
	markConnectedAccountInactive,
	upsertConnectedAccount
} from "@/lib/server/db/internal/repository";
import { error, json } from "@sveltejs/kit";

const ONE_DAY = 24 * 60 * 60 * 1000;

function normalizeFriendCode(value: unknown) {
	const friendCode = String(value ?? "").replaceAll(/\D/g, "");
	if (!/^\d{12}$/.test(friendCode)) error(400, "Friend code must contain 12 digits");
	return friendCode;
}

async function getProfiles(codes: string[]) {
	const request = new Request("https://diadem.invalid/friends/profiles", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ codes })
	});
	return proxyAutoBattleRequest(request, "friends/profiles", true);
}

async function refreshConnectedAccounts(userId: string) {
	const accounts = await listConnectedAccounts(userId);
	const staleAccounts = accounts.filter(
		(account) => Date.now() - account.lastUpdated.getTime() > ONE_DAY
	);

	for (let index = 0; index < staleAccounts.length; index += 10) {
		const batch = staleAccounts.slice(index, index + 10);
		const response = await getProfiles(batch.map((account) => account.friendCode));
		if (!response.ok) continue;

		const { profiles } = (await response.json()) as {
			profiles: {
				friend_code: string;
				team_id: number;
				name: string;
				level: number;
				already_friends: boolean;
			}[];
		};
		const profilesByCode = new Map(profiles.map((profile) => [profile.friend_code, profile]));

		for (const account of batch) {
			const profile = profilesByCode.get(account.friendCode);
			if (!profile) {
				await markConnectedAccountInactive(userId, account.friendCode);
				continue;
			}
			await upsertConnectedAccount(userId, {
				friendCode: profile.friend_code,
				nickname: profile.name,
				team: profile.team_id,
				level: profile.level,
				state: profile.already_friends ? "active" : "pending"
			});
		}
	}
}

export async function GET({ locals, url }) {
	if (!locals.user) error(401, "Authentication is required");
	if (url.searchParams.has("refresh")) await refreshConnectedAccounts(locals.user.id);
	return json({ accounts: await listConnectedAccounts(locals.user.id) });
}

export async function POST({ locals, request }) {
	if (!locals.user) error(401, "Authentication is required");
	const friendCode = normalizeFriendCode((await request.json()).friendCode);
	const response = await getProfiles([friendCode]);
	if (!response.ok) return response;

	const { profiles } = (await response.json()) as {
		profiles: {
			friend_code: string;
			team_id: number;
			name: string;
			level: number;
			already_friends: boolean;
		}[];
	};
	const profile = profiles[0];
	if (!profile) error(404, "Connected account was not found");

	await upsertConnectedAccount(locals.user.id, {
		friendCode: profile.friend_code,
		nickname: profile.name,
		team: profile.team_id,
		level: profile.level,
		state: profile.already_friends ? "active" : "pending"
	});
	const accounts = await listConnectedAccounts(locals.user.id);
	return json({ account: accounts.find((account) => account.friendCode === profile.friend_code) });
}
