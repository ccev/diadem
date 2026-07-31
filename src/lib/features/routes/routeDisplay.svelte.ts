let focusedRouteMapId = $state<string | null>(null);

export function getFocusedRouteMapId(): string | null {
	return focusedRouteMapId;
}

export function setFocusedRouteMapId(mapId: string | null): void {
	focusedRouteMapId = mapId;
}
