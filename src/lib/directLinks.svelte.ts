import type { MapData, MapObjectType } from '@/lib/types/mapObjectData/mapObjects';

let directLinkObject: {
	unavailable: boolean,
	data?: {
		id: string,
		type: MapObjectType,
		lat?: number,
		lon?: number
	}
} | undefined = $state(undefined)

export function getDirectLinkObject() {
	return directLinkObject
}

export function setDirectLinkObject(id: string, type: MapObjectType, data?: { lat: number, lon: number }) {
	directLinkObject = { unavailable: !Boolean(data), data: { id, type, ...data } }
}