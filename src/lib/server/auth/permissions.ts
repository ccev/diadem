import { type User } from "@/lib/server/db/internal/schema";
import { setPermissions } from "@/lib/server/auth/auth";
import { type DiscordGuildData, getGuildMemberInfo } from "@/lib/server/auth/discordDetails";
import { getServerConfig } from "@/lib/services/config/config.server";
import type { Permissions as ConfigRule } from "@/lib/services/config/configTypes";
import { type KojiFeatures } from "@/lib/features/koji";
import { fetchKojiGeofences } from "@/lib/server/api/kojiApi";
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
		if (rule.everyone) {
			handleRule(rule, perms, geofences);
		}
	}
	initializedEveryonePerms = true;
	everyonePerms = perms;
	return everyonePerms;
}

export async function updatePermissions(user: User, accessToken: string, thisFetch: typeof fetch) {
	const guildCache: { [key: string]: DiscordGuildData } = {};
	const authConfig = getServerConfig().auth;
	const permConfig = getServerConfig().permissions;

	const geofences = await getGeofences(thisFetch);

	const permissions: Perms = JSON.parse(
		JSON.stringify(await getEveryonePerms(thisFetch, geofences))
	);

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
					ruleApplies = true;
				} else if (rule.roleId && roles.includes(rule.roleId)) {
					ruleApplies = true;
				}
			}

			if (ruleApplies) {
				handleRule(rule, permissions, geofences);
			}
		}
	}

	await setPermissions(user.id, permissions);
	return permissions;
}
