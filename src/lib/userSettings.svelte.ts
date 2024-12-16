import type { UserSettings } from '@/lib/types/userSettings';

let userSettings: UserSettings = $state({
	isLeftHanded: false
})

export function getUserSettings() {
	return userSettings
}