// Universal logger that works on both the server and in the browser

type LogFn = (message: string, ...args: unknown[]) => void;

export interface Logger {
	debug: LogFn;
	info: LogFn;
	warning: LogFn;
	error: LogFn;
}

export type DebugCategories = {
	permissions?: boolean;
};

let serverLoggerFactory: ((name: string) => Logger) | null = null;

export function setServerLoggerFactory(factory: (name: string) => Logger,) {
	serverLoggerFactory = factory;
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

export function getLogger(name: string): Logger {
	if (serverLoggerFactory) {
		return serverLoggerFactory(name);
	}
	return createBrowserLogger(name);
}
