import type { DiscordUser } from "@/lib/server/auth/discordDetails";

import type { Perms } from "@/lib/utils/features";

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
	const response = await fetch("/api/user/details");
	userDetails = await response.json();
	if (!userDetails.permissions) userDetails.permissions = { everywhere: [], areas: [] };
}

export async function updateUserPermissions() {
	const response = await fetch("/api/user/permissions");
	const data = await response.json();
	userDetails.permissions = data.permissions;
}
