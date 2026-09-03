import type { DiscordUser } from "@/lib/server/auth/discordDetails";

import type { Perms } from "@/lib/utils/features";
import { getHeaders, parseResponse } from "@/lib/utils/requests";

export type UserData = {
	details?: DiscordUser;
	permissions: Perms;
	isGuildMember?: boolean;
};

let userDetails: UserData = $state({
	permissions: { everywhere: [], areas: [] }
});

export function getUserDetails() {
	return userDetails;
}

export async function updateUserDetails() {
	const response = await fetch("/api/user/details", { headers: getHeaders() });
	userDetails = await parseResponse<UserData>(response);
	if (!userDetails.permissions) userDetails.permissions = { everywhere: [], areas: [] };
}

export async function updateUserPermissions() {
	const response = await fetch("/api/user/permissions", { headers: getHeaders() });
	const data = await parseResponse<{ permissions: Perms }>(response);
	userDetails.permissions = data.permissions;
}
