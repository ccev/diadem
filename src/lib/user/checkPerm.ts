import type { FeaturesKey, Perms } from '@/lib/server/auth/permissions';

export const noPermResult = {
	error: 'Missing permissions',
	result: []
};

export function checkPermsFeatures(perms: Perms, feature: FeaturesKey) {
	if (perms.features === undefined) return true;
	if (perms.features.includes('*')) return true;

	return perms.features.includes(feature);
}