import { SvelteMap } from "svelte/reactivity";
import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export type DataLimitInfo = {
	/** Map zoom level at the time the limit was hit */
	zoom: number;
	/** Serialized filter that was active when the limit was hit */
	filterJson: string | undefined;
};

const dataLimits = new SvelteMap<MapObjectType, DataLimitInfo>();

export function getDataLimits(): ReadonlyMap<MapObjectType, DataLimitInfo> {
	return dataLimits;
}

export function getDataLimit(type: MapObjectType): DataLimitInfo | undefined {
	return dataLimits.get(type);
}

export function setDataLimit(type: MapObjectType, info: DataLimitInfo) {
	dataLimits.set(type, info);
}

export function clearDataLimit(type: MapObjectType) {
	dataLimits.delete(type);
}

export function clearAllDataLimits() {
	dataLimits.clear();
}
