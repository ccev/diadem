import type { ParamMatcher } from '@sveltejs/kit';
import type { MapObjectType } from '@/lib/types/mapObjectData/mapObjects';

import { allMapObjectTypes } from '@/lib/mapObjects/mapObjectTypes';

export const match = ((param: string): param is MapObjectType => {
	return allMapObjectTypes.includes(param as MapObjectType);
}) satisfies ParamMatcher;