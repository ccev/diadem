import { session, type User } from '@/lib/server/auth/db/schema';
import { setPermissions } from '@/lib/server/auth/auth';
import { type DiscordGuildData, getGuildMemberInfo } from '@/lib/server/auth/discordDetails';
import { getServerConfig } from '@/lib/config/config.server';
import type { Permissions as ConfigRule } from '@/lib/config/config.d';

export type FeaturesKey = '*' | 'pokemon' | 'gym' | "pokestop" | "station" | "weather" | "s2cell";
type PermArea = { name: string, features: FeaturesKey[] }
export type Perms = {
	everywhere: FeaturesKey[]
	areas: PermArea[]
};

let initializedEveryonePerms: boolean = false
let everyonePerms: Perms = { everywhere: [], areas: [] };

function addPerm(set: Perms, type: 'areas' | 'features', perms: string[] | FeaturesKey[]) {
	// @ts-ignore
	set[type] = [...(set[type] ?? []), ...perms];
}

function addFeatures(featureArray: FeaturesKey[], features: FeaturesKey[] | undefined) {
	if (!features) return

	features.forEach((feature) => {
		if (!featureArray.includes(feature)) {
			featureArray.push(feature);
		}
	})
}

function handleRule(rule: ConfigRule, perms: Perms) {
	if (rule.areas) {
		for (const ruleArea of rule.areas) {
			let area: PermArea | undefined = perms.areas.find(a => ruleArea === a.name)
			if (!area) {
				area = { name: ruleArea, features: [] }
				perms.areas.push(area)
			}

			addFeatures(area.features, rule.features)
		}
	} else {
		addFeatures(perms.everywhere, rule.features);
	}
}

export function getEveryonePerms() {
	if (initializedEveryonePerms) return everyonePerms;

	const perms: Perms = { everywhere: [], areas: [] }
	for (const rule of getServerConfig().permissions ?? []) {
		if (rule.everyone) {
			handleRule(rule, perms)
		}
	}
	initializedEveryonePerms = true
	everyonePerms = perms
	return everyonePerms;
}

export async function updatePermissions(user: User, accessToken: string) {
	const guildCache: { [key: string]: DiscordGuildData } = {};
	const authConfig = getServerConfig().auth;
	const permConfig = getServerConfig().permissions;

	const permissions: Perms = JSON.parse(JSON.stringify(getEveryonePerms()));

	if (permConfig && authConfig.enabled) {
		for (const rule of permConfig) {
			let ruleApplies = !!rule.loggedIn || !!rule.everyone;

			if (!ruleApplies && rule.guildId) {
				let guild = guildCache[rule.guildId];
				if (!guild) {
					guild = await getGuildMemberInfo(rule.guildId, accessToken);
					guildCache[rule.guildId] = guild;
				}

				const roles = guild.roles ?? [];
				if (!rule.roleId && guild.user) {
					ruleApplies = true
				} else if (rule.roleId && roles.includes(rule.roleId)) {
					ruleApplies = true
				}
			}

			if (ruleApplies) {
				handleRule(rule, permissions)
			}
		}
	}

	await setPermissions(user.id, permissions);
	return permissions
}
