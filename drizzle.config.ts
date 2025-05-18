import { defineConfig } from 'drizzle-kit';
import { getInternalDbUri } from './src/lib/config/configNode.server';

export default defineConfig({
	schema: './src/lib/server/auth/db/schema.ts',
	dialect: 'mysql',
	dbCredentials: { url: getInternalDbUri() },
	verbose: true,
	strict: true
});
