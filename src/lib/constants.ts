import * as m from '@/lib/paraglide/messages';

/**
 * Max Zoom level to still update the map while idling
 */
export const UPDATE_MAP_OBJECT_INTERVAL_MAX_ZOOM = 12

/**
 * Time to wait between idle map updates (ms)
 */
export const UPDATE_MAP_OBJECT_INTERVAL_TIME = 5000

/**
 * Time to wait between map updates when aggressive map updates are enabled (ms)
 */
export const AGGRESSIVE_UPDATE_TIME = 200

/**
 * A fort is considered outdated if not updated within this timeframe (seconds)
 */
export const FORT_OUTDATED_SECONDS = 24 * 60 * 60

/**
 * Weather is considered outdated if not updated within this timeframe (seconds)
 */
export const WEATHER_OUTDATED_SECONDS = 60 * 60 * 6

/**
 * Always show PVP ranks > X in Pokemon Popups
 */
export const POKEMON_MIN_RANK = 15

/**
 * How much to increase the map icon's size when it's selected
 */
export const SELECTED_MAP_OBJECT_SCALE = 2

/**
 * Interval to refresh Discord Auth (seconds)
 */
export const DISCORD_REFRESH_INTERVAL = 60 * 60 * 24

/**
 * Interval to update a user's permissions (i.e. what roles they have) (seconds)
 */
export const PERMISSION_UPDATE_INTERVAL = 5 * 60

/**
 * All languages supported by the project
 */
export const AVAILABLE_LANGUAGES = [
	{
		label: m.language_english(),
		value: "en"
	},
	{
		label: m.language_german(),
		value: "de"
	}
]