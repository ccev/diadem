import { type KojiFeatures } from "@/lib/features/koji";
import { fetchKojiGeofences } from "@/lib/server/api/kojiApi";
import { type DiscordGuildData, getGuildMemberInfo } from "@/lib/server/auth/discordDetails";
import type { User } from "@/lib/server/db/internal/schema";
import { getServerConfig } from "@/lib/services/config/config.server";
import type {
	Permissions as ConfigRule,
	RuleRequirements
} from "@/lib/services/config/configTypes";
import type { FeaturesKey, PermArea, Perms } from "@/lib/utils/features";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("permissions");

let initializedEveryonePerms: boolean = false;
let everyonePerms: Perms = { everywhere: [], areas: [] };

function addFeatures(featureArray: FeaturesKey[], features: FeaturesKey[] | undefined) {
	if (!features) return;

	features.forEach((feature) => {
		if (!featureArray.includes(feature)) {
			featureArray.push(feature);
		}
	});
}

function handleRule(rule: ConfigRule, perms: Perms, geofences: KojiFeatures | undefined) {
	if (rule.areas && !geofences) return;

	if (rule.areas) {
		for (const ruleArea of rule.areas) {
			let area: PermArea | undefined = perms.areas.find((a) => ruleArea === a.name);
			if (!area) {
				const kojiFeature = geofences!.find(
					(f) => f.properties.name.toLowerCase() === ruleArea.toLowerCase()
				);
				if (!kojiFeature) {
					console.error(
						`You configured area ${ruleArea} in your config permissions, but there's no Koji area with that name. Permissions for this area are ignored`
					);
					continue;
				}

				area = { name: ruleArea, features: [], polygon: kojiFeature.geometry };
				perms.areas.push(area);
			}

			addFeatures(area!.features, rule.features);
		}
	} else {
		addFeatures(perms.everywhere, rule.features);
	}
}

async function getGeofences(thisFetch: typeof fetch) {
	const data = await fetchKojiGeofences(thisFetch);
	if (!data) {
		log.error("Koji error while handling permissions. All area-based permissions are ignored");
	}
	return data;
}

export async function getEveryonePerms(thisFetch: typeof fetch, geofences?: KojiFeatures) {
	if (initializedEveryonePerms) return everyonePerms;

	if (!geofences) geofences = await getGeofences(thisFetch);

	const perms: Perms = { everywhere: [], areas: [] };
	for (const rule of getServerConfig().permissions ?? []) {
		if (rule.everyone && !rule.userIds) {
			handleRule(rule, perms, geofences);
		}
	}
	initializedEveryonePerms = true;
	everyonePerms = perms;
	return everyonePerms;
}

/**
 * Checks rule requirements (everyone, loggedIn, guildId, roleId, userIds) for a logged-in user.
 * Create one per user: guild lookups are cached, so each guild is only fetched once.
 */
export function makeRuleMatcher(user: Pick<User, "id" | "discordId">, accessToken: string) {
	const guildCache: { [key: string]: DiscordGuildData } = {};
	const canCheckGuildRules = accessToken.trim().length > 0;

	return async (rule: RuleRequirements): Promise<boolean> => {
		if (rule.userIds && !rule.userIds.includes(user.discordId)) return false;
		if (rule.loggedIn || rule.everyone) return true;
		if (!rule.guildId) return !!rule.userIds;
		if (!canCheckGuildRules) return false;

		let guild = guildCache[rule.guildId];
		if (!guild) {
			const lookup = await getGuildMemberInfo(rule.guildId, accessToken);
			if (!lookup) {
				log.warning(
					`discord guild lookup failed for user ${user.id}; treating guild ${rule.guildId} as non-member`
				);
				guild = { roles: [] };
			} else {
				guild = lookup;
			}
			guildCache[rule.guildId] = guild;
		}

		if (rule.roleId) return (guild.roles ?? []).includes(rule.roleId);
		return !!guild.user;
	};
}

export async function updatePermissions(user: User, accessToken: string, thisFetch: typeof fetch) {
	const permConfig = getServerConfig().permissions;
	const ruleApplies = makeRuleMatcher(user, accessToken);

	const geofences = await getGeofences(thisFetch);

	const permissions: Perms = JSON.parse(
		JSON.stringify(await getEveryonePerms(thisFetch, geofences))
	);

	if (permConfig) {
		for (const rule of permConfig) {
			if (await ruleApplies(rule)) {
				handleRule(rule, permissions, geofences);
			}
		}
	}

	return permissions;
}
