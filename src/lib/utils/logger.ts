/**
 * Universal logger that works in both server and browser environments.
 * - Server: Uses winston logger (injected via setServerLoggerFactory)
 * - Browser: Falls back to console methods
 */

type LogFn = (message: string, ...args: unknown[]) => void;

export interface Logger {
	debug: LogFn;
	info: LogFn;
	warning: LogFn;
	error: LogFn;
}

// Keep in sync with Debug type in @/lib/services/config/configTypes.d.ts
export type DebugCategories = {
	permissions?: boolean;
};

// Server-side logger factory, injected at startup
let serverLoggerFactory: ((name: string) => Logger) | null = null;

// Debug categories configuration (injected at startup)
let debugCategories: DebugCategories = {};

/**
 * Called by server initialization to inject the winston logger factory.
 * This allows the universal logger to use winston without importing from server code.
 */
export function setServerLoggerFactory(factory: (name: string) => Logger, categories?: DebugCategories) {
	serverLoggerFactory = factory;
	debugCategories = categories ?? {};
}

/**
 * Check if debug logging is enabled for a specific category.
 */
export function isDebugEnabled(category: keyof DebugCategories): boolean {
	return debugCategories[category] ?? false;
}

function createBrowserLogger(name: string): Logger {
	const prefix = `[${name}]`;
	return {
		debug: (message, ...args) => console.debug(prefix, message, ...args),
		info: (message, ...args) => console.info(prefix, message, ...args),
		warning: (message, ...args) => console.warn(prefix, message, ...args),
		error: (message, ...args) => console.error(prefix, message, ...args),
	};
}

/**
 * Get a logger instance for the given name.
 * On server (after initialization), uses winston.
 * On browser or before server init, uses console.
 */
export function getUniversalLogger(name: string): Logger {
	if (serverLoggerFactory) {
		return serverLoggerFactory(name);
	}
	return createBrowserLogger(name);
}
