import type { User } from '@/lib/server/auth/db/schema';
import { setPermissions } from '@/lib/server/auth/auth';
import { type DiscordGuildData, getGuildMemberInfo } from '@/lib/server/auth/discordDetails';
import { getServerConfig } from '@/lib/config/config.server';

export type FeaturesKey = '*' | 'pokemon' | 'gym' | "pokestop" | "station" | "weather" | "s2cell";
export type Perms = {
	areas?: string[];
	features?: FeaturesKey[];
};

let initializedEveryonePerms: boolean = false
let everyonePerms: Perms = {};

function addPerm(set: Perms, type: 'areas' | 'features', perms: string[] | FeaturesKey[]) {
	// @ts-ignore
	set[type] = [...(set[type] ?? []), ...perms];
}

export function getEveryonePerms() {
	if (initializedEveryonePerms) return everyonePerms;

	const perms = {}
	for (const rule of getServerConfig().permissions ?? []) {
		if (rule.everyone) {
			if (rule.areas !== undefined) addPerm(perms, 'areas', rule.areas);
			if (rule.features !== undefined) addPerm(perms, 'features', rule.features);
		}
	}
	initializedEveryonePerms = true
	everyonePerms = perms
	return everyonePerms;
}

export async function updatePermissions(user: User) {
	const guildCache: { [key: string]: DiscordGuildData } = {};
	const authConfig = getServerConfig().auth;
	const permConfig = getServerConfig().permissions;

	user.permissions = getEveryonePerms();

	if (permConfig && authConfig.enabled) {
		for (const rule of permConfig) {
			let ruleApplies = !!rule.loggedIn || !!rule.everyone;

			if (!ruleApplies && rule.guildId) {
				let guild = guildCache[rule.guildId];
				if (!guild) {
					guild = await getGuildMemberInfo(rule.guildId, user.discordToken);
					guildCache[rule.guildId] = guild;
				}

				const roles = guild.roles ?? [];
				if (guild.user && (!rule.roleId || roles.includes(rule.roleId))) {
					ruleApplies = true;
				}
			}

			if (ruleApplies) {
				if (rule.areas !== undefined) addPerm(user.permissions, 'areas', rule.areas);
				if (rule.features !== undefined) addPerm(user.permissions, 'features', rule.features);
			}
		}
	}

	await setPermissions(user.id, user.permissions as Perms);
}
