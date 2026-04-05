import { isCurrentSelectedOverwrite } from "@/lib/mapObjects/currentSelectedState.svelte";

export function getEnabledFiltersets<T extends { enabled: boolean }>(
	filtersets: T[] | undefined
): T[] | undefined {
	if (!filtersets) return undefined;
	const enabled = filtersets.filter((f) => f.enabled);
	return enabled.length === 0 ? undefined : enabled;
}

export function shouldDisplay(mapId: string, filterEnabled: boolean, match: () => boolean) {
	if (isCurrentSelectedOverwrite(mapId)) return true;
	if (!filterEnabled) return false;
	return match();
}
