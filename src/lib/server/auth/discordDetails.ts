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

export async function getUserInfo(accessToken: string): Promise<DiscordUser | undefined> {
	const result = await getUserInfoResult(accessToken);
	return result.data;
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
			displayName: user.global_name,
			avatarUrl: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`
		}
	};
}

export async function getGuildMemberInfo(guildId: string, accessToken: string) {
	const response = await fetch(`${endpoint}/guilds/${guildId}/member`, getFetchOptions(accessToken));
	if (response.status === 404) {
		return { roles: [] } as DiscordGuildData;
	}
	if (!response.ok) {
		return undefined;
	}
	const guildMember: DiscordGuildData = await response.json();
	return guildMember;
}

export async function isGuildMember(guildId: string, accessToken: string) {
	const guildMember = await getGuildMemberInfo(guildId, accessToken);
	if (!guildMember) return;
	return !!guildMember.user;
}
