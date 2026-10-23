import { getDiscordGuildMember } from "../../../../scripts/cluster/discord.mjs";

type DiscordUserData = {
	id: string;
	username: string;
	global_name: string;
	avatar: string;
};

export type DiscordGuildData = {
	roles?: string[];
	user?: { id: string };
};

export type DiscordUser = {
	id: string;
	username: string;
	displayName: string;
	avatarUrl: string;
};

export type DiscordUserInfoResult = {
	status: number;
	data?: DiscordUser;
};

const endpoint = "https://discord.com/api/users/@me";

function getFetchOptions(accessToken: string): RequestInit {
	return {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	};
}

export async function getUserInfoResult(accessToken: string): Promise<DiscordUserInfoResult> {
	const response = await fetch(endpoint, getFetchOptions(accessToken));

	if (!response.ok) {
		return { status: response.status };
	}

	const user: DiscordUserData = await response.json();
	return {
		status: response.status,
		data: {
			id: user.id,
			username: "@" + user.username,
			displayName: user.global_name || user.username || "",
			avatarUrl: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`
		}
	};
}

export async function getGuildMemberInfo(guildId: string, accessToken: string) {
	const result = await getDiscordGuildMember(guildId, accessToken);
	if ((result.status !== 200 && result.status !== 404) || !result.data) {
		throw new DiscordGuildLookupError(
			`Discord guild lookup failed (HTTP ${result.status})`,
			result.retryAfter ?? 5
		);
	}
	return result.data;
}

export class DiscordGuildLookupError extends Error {
	constructor(
		message: string,
		public readonly retryAfter: number
	) {
		super(message);
	}
}

export async function isGuildMember(guildId: string, accessToken: string) {
	const guildMember = await getGuildMemberInfo(guildId, accessToken);
	if (!guildMember) return;
	return !!guildMember.user;
}
