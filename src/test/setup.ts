import { vi } from "vitest";

// Mock paraglide messages - return message key as the string
// Creates a mock function for any message key that returns the key name
function msgFn(key: string) {
	return (params?: Record<string, any>) => {
		if (params && Object.keys(params).length > 0) {
			const paramStr = Object.entries(params)
				.map(([k, v]) => `${k}:${v}`)
				.join(",");
			return `${key}(${paramStr})`;
		}
		return key;
	};
}

vi.mock("@/lib/paraglide/messages", async () => {
	const fs = await import("fs");
	const path = await import("path");
	const messagesPath = path.resolve(__dirname, "../../messages/en.json");
	const messages = JSON.parse(fs.readFileSync(messagesPath, "utf-8"));

	const mod: Record<string, any> = {};
	for (const key of Object.keys(messages)) {
		if (key === "$schema") continue;
		mod[key] = msgFn(key);
	}

	// `m` as a Proxy for `import { m }` + dynamic key access like m["key"]()
	mod.m = new Proxy({}, {
		get(_target, prop) {
			if (typeof prop !== "string") return undefined;
			return msgFn(prop);
		},
		has() { return true; }
	});

	return mod;
});

// Mock paraglide runtime
vi.mock("@/lib/paraglide/runtime", () => ({
	getLocale: () => "en",
	setLocale: vi.fn(),
	isLocale: () => true
}));

// Mock currentTimestamp - can be overridden per test
vi.mock("@/lib/utils/currentTimestamp", () => ({
	currentTimestamp: vi.fn(() => Math.floor(Date.now() / 1000))
}));

// Mock getUserSettings
vi.mock("@/lib/services/userSettings.svelte", () => ({
	getUserSettings: vi.fn(() => ({
		filters: {
			pokemon: { filters: [] },
			gym: { enabled: true, raid: { enabled: true, filters: [] } },
			pokestop: {
				enabled: true,
				quest: { enabled: true, filters: [] },
				invasion: { enabled: true, filters: [] },
				lure: { enabled: true, filters: [] },
				contest: { enabled: true, filters: [] },
				kecleon: { enabled: true },
				goldPokestop: { enabled: true },
				pokestopPlain: { enabled: true }
			},
			station: { enabled: true, stationPlain: { enabled: true }, maxBattle: { enabled: true, filters: [] } },
			nest: { enabled: true, filters: [] }
		},
		externalMapProvider: "google"
	})),
	defaultFilter: vi.fn((enabled = false) => ({
		enabled,
		filters: []
	})),
	ExternalMapProvider: {
		GOOGLE: "google",
		APPLE: "apple"
	}
}));

// Mock masterfile
vi.mock("@/lib/services/masterfile", () => ({
	getMasterPokemon: vi.fn(() => undefined),
	getMasterFile: vi.fn(() => ({ pokemon: {} }))
}));

// Mock currentSelectedState
vi.mock("@/lib/mapObjects/currentSelectedState.svelte", () => ({
	isCurrentSelectedOverwrite: vi.fn(() => false)
}));

// Mock activeSearch
vi.mock("@/lib/features/activeSearch.svelte", () => ({
	getActiveSearch: vi.fn(() => undefined)
}));

// Mock ingame locale
vi.mock("@/lib/services/ingameLocale", () => ({
	mPokemon: vi.fn((data: any) => `pokemon:${data?.pokemon_id ?? "?"}:${data?.form ?? 0}`),
	mItem: vi.fn((id: any) => `item:${id}`),
	mRaid: vi.fn((level: any, short?: boolean) => `raid:${level}`),
	mType: vi.fn((type: any) => `type:${type}`),
	mAlignment: vi.fn((alignment: any) => `alignment:${alignment}`),
	mGeneration: vi.fn((gen: any) => `gen:${gen}`),
	mCharacter: vi.fn((id: any) => `character:${id}`)
}));

// Mock uicons
vi.mock("@/lib/services/uicons.svelte", () => ({
	getIconPokemon: vi.fn(() => "icon-pokemon"),
	getIconType: vi.fn(() => "icon-type"),
	getIconContest: vi.fn(() => "icon-contest"),
	getIconRaidEgg: vi.fn(() => "icon-raid-egg"),
	getIconItem: vi.fn(() => "icon-item"),
	getIconLeague: vi.fn(() => "icon-league"),
	getIconInvasion: vi.fn(() => "icon-invasion"),
	League: { LITTLE: 500, GREAT: 1500, ULTRA: 2500, MASTER: 9000 }
}));

// Mock masterStats
vi.mock("@/lib/features/masterStats.svelte", () => ({
	getPokemonStats: vi.fn(() => undefined),
	getMasterStats: vi.fn(() => undefined)
}));

// Mock $app/environment
vi.mock("$app/environment", () => ({
	browser: false,
	dev: false,
	building: false,
	version: "test"
}));

// Mock server config
vi.mock("@/lib/services/config/config.server", () => ({
	isAuthRequired: vi.fn(() => true),
	getServerConfig: vi.fn(() => ({
		db: { user: "test", password: "test", host: "localhost", port: 3306, database: "test" }
	})),
	getClientConfig: vi.fn(() => ({}))
}));

// Mock dbUri.server
vi.mock("@/lib/services/config/dbUri.server", () => ({
	getDbUri: vi.fn(() => "mysql://test:test@localhost:3306/test")
}));

// Mock mysql2/promise
vi.mock("mysql2/promise", () => ({
	default: {
		createPool: vi.fn(() => ({
			query: vi.fn(() => [[], []])
		}))
	}
}));

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
	getLogger: vi.fn(() => ({
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	}))
}));
