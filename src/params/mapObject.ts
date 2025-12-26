import type { ParamMatcher } from '@sveltejs/kit';

import { allMapObjectTypes, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export const match = ((param: string): param is MapObjectType => {
	return allMapObjectTypes.includes(param as MapObjectType);
}) satisfies ParamMatcher;