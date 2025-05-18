import type { DiscordUser } from '@/lib/server/auth/discordDetails';
import type { Perms } from '@/lib/server/auth/permissions';

let userDetails: {
	details?: DiscordUser;
	permissions: Perms;
} = $state({
	permissions: {}
});

export function getUserDetails() {
	return userDetails;
}

export async function updateUserDetails() {
	const response = await fetch('/api/user/details');
	userDetails = await response.json();
	if (!userDetails.permissions) userDetails.permissions = {};
}

export async function updateUserPermissions() {
	const response = await fetch('/api/user/permissions');
	const data = await response.json()
	userDetails.permissions = data.permissions
	console.log(userDetails)
}
