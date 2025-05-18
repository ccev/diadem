import type { PageLoad } from './$types';
import { updateUserPermissions } from '@/lib/user/userDetails.svelte.js';

export const load: PageLoad = async () => {
	await updateUserPermissions();
};