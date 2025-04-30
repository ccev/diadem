import { innerWidth } from 'svelte/reactivity/window';
import { getUserSettings } from '@/lib/userSettings.svelte';

export function doSidebarSettings() {
	return (innerWidth.current ?? 0) > 500
}

export function isUiLeft() {
	return doSidebarSettings() || getUserSettings().isLeftHanded
}