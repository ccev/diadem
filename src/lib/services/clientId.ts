import { browser } from "$app/environment";
import { getId } from "@/lib/utils/uuid";

const STORAGE_KEY = "diadem_client_id";
export const CLIENT_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
let clientId: string | undefined;

export function getClientId(): string {
	if (clientId) return clientId;

	if (browser) {
		try {
			const stored = sessionStorage.getItem(STORAGE_KEY);
			if (stored && CLIENT_ID_PATTERN.test(stored)) {
				clientId = stored;
				return clientId;
			}
		} catch {
		}
	}

	clientId = getId();
	if (browser) {
		try {
			sessionStorage.setItem(STORAGE_KEY, clientId);
		} catch {}
	}
	return clientId;
}
