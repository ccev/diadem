// English source messages, extracted by Wuchale into src/locales/*.po.
// Keep function names stable: saved and shared filters refer to these identifiers.

export function theme_light() {
	// @wc-context: theme_light
	return "Light";
}

export function theme_system() {
	// @wc-context: theme_system
	return "System";
}

export function theme_dark() {
	// @wc-context: theme_dark
	return "Dark";
}

export function settings_appearance() {
	// @wc-context: settings_appearance
	return "Appearance";
}

export function settings_left_handed_mode_title() {
	// @wc-context: settings_left_handed_mode_title
	return "Left-handed Mode";
}

export function settings_left_handed_mode_description() {
	// @wc-context: settings_left_handed_mode_description
	return "Place UI elements on the left";
}

export function settings_theme() {
	// @wc-context: settings_theme
	return "Theme";
}

export function settings_map_style() {
	// @wc-context: settings_map_style
	return "Map Style";
}

export function settings_icons() {
	// @wc-context: settings_icons
	return "Icon Style";
}

export function pogo_pokemon() {
	// @wc-context: pogo_pokemon
	return "Pokémon";
}

export function pogo_pokestops() {
	// @wc-context: pogo_pokestops
	return "Pokéstops";
}

export function pogo_gyms() {
	// @wc-context: pogo_gyms
	return "Gyms";
}

export function settings_advanced() {
	// @wc-context: settings_advanced
	return "Advanced";
}

export function settings_load_map_objects_while_moving_title() {
	// @wc-context: settings_load_map_objects_while_moving_title
	return "Aggressive Map Updates";
}

export function settings_load_map_objects_while_moving_description() {
	// @wc-context: settings_load_map_objects_while_moving_description
	return "⚠ Major performance impact! Fetch data while moving the map";
}

export function settings_load_map_objects_padding_title() {
	// @wc-context: settings_load_map_objects_padding_title
	return "Map Update Padding";
}

export function settings_load_map_objects_padding_description() {
	// @wc-context: settings_load_map_objects_padding_description
	return "Additional pixels to fetch around the map's bounding box";
}

export function settings_language() {
	// @wc-context: settings_language
	return "Language";
}

export function language_auto() {
	// @wc-context: language_auto
	return "Auto";
}

export function language_english() {
	// @wc-context: language_english
	return "English";
}

export function language_german() {
	// @wc-context: language_german
	return "German";
}

export function nav_map() {
	// @wc-context: nav_map
	return "Map";
}

export function nav_filters() {
	// @wc-context: nav_filters
	return "Filters";
}

export function nav_settings() {
	// @wc-context: nav_settings
	return "Settings";
}

export function locate_error_support() {
	// @wc-context: locate_error_support
	return "Your browser doesn't have location support";
}

export function locate_error_perms() {
	// @wc-context: locate_error_perms
	return "Location permissions denied";
}

export function locate_error_timeout() {
	// @wc-context: locate_error_timeout
	return "Timed out while fetching your location";
}

export function locate_error_unknown() {
	// @wc-context: locate_error_unknown
	return "An error occurred while fetching your location";
}

export function clipboard_copied() {
	// @wc-context: clipboard_copied
	return "Copied to clipboard";
}

export function clipboard_error() {
	// @wc-context: clipboard_error
	return "Couldn't copy to clipboard";
}

export function popup_hide_details() {
	// @wc-context: popup_hide_details
	return "Hide details";
}

export function popup_show_details() {
	// @wc-context: popup_show_details
	return "Show details";
}

export function popup_navigate() {
	// @wc-context: popup_navigate
	return "Navigate";
}

export function popup_share() {
	// @wc-context: popup_share
	return "Share";
}

export function time_format_m_s({ m, s }: { m: string | number; s: string | number }) {
	// @wc-context: time_format_m_s
	return `${m}m ${s}s`;
}

export function time_format_h_m_s({
	h,
	m,
	s
}: {
	h: string | number;
	m: string | number;
	s: string | number;
}) {
	// @wc-context: time_format_h_m_s
	return `${h}h ${m}m ${s}s`;
}

export function time_format_h_m_s_ago({
	h,
	m,
	s
}: {
	h: string | number;
	m: string | number;
	s: string | number;
}) {
	// @wc-context: time_format_h_m_s_ago
	return `${h}h ${m}m ${s}s ago`;
}

export function time_format_m_s_ago({ m, s }: { m: string | number; s: string | number }) {
	// @wc-context: time_format_m_s_ago
	return `${m}m ${s}s ago`;
}

export function pogo_cp({ cp }: { cp: string | number }) {
	// @wc-context: pogo_cp
	return `${cp} CP`;
}

export function pogo_level({ level }: { level: string | number }) {
	// @wc-context: pogo_level
	return `Level ${level}`;
}

export function popup_found() {
	// @wc-context: popup_found
	return "Found";
}

export function popup_estimated_location() {
	// @wc-context: popup_estimated_location
	return "Estimated location";
}

export function popup_no_iv_scanned() {
	// @wc-context: popup_no_iv_scanned
	return "No IV scanned";
}

export function pogo_pokestop() {
	// @wc-context: pogo_pokestop
	return "Pokéstop";
}

export function pogo_gym() {
	// @wc-context: pogo_gym
	return "Gym";
}

export function direct_link_not_found({ type }: { type: string | number }) {
	// @wc-context: direct_link_not_found
	return `Didn't find ${type}`;
}

export function context_menu_copy_coordinates() {
	// @wc-context: context_menu_copy_coordinates
	return "Copy coordinates";
}

export function context_menu_navigate_here() {
	// @wc-context: context_menu_navigate_here
	return "Navigate here";
}

export function context_menu_scout_location() {
	// @wc-context: context_menu_scout_location
	return "Scout location";
}

export function unknown_pokestop() {
	// @wc-context: unknown_pokestop
	return "Unknown Pokéstop";
}

export function pogo_station() {
	// @wc-context: pogo_station
	return "Power Spot";
}

export function pogo_stations() {
	// @wc-context: pogo_stations
	return "Power Spots";
}

export function unknown_gym() {
	// @wc-context: unknown_gym
	return "Unknown Gym";
}

export function view_full_image() {
	// @wc-context: view_full_image
	return "View full image";
}

export function default_() {
	// @wc-context: default_
	return "Default";
}

export function unknown_pokemon() {
	// @wc-context: unknown_pokemon
	return "Unknown Pokémon";
}

export function time_format_d_h_m({
	d,
	h,
	m
}: {
	d: string | number;
	h: string | number;
	m: string | number;
}) {
	// @wc-context: time_format_d_h_m
	return `${d}d ${h}h ${m}m`;
}

export function time_format_d_h_m_ago({
	d,
	h,
	m
}: {
	d: string | number;
	h: string | number;
	m: string | number;
}) {
	// @wc-context: time_format_d_h_m_ago
	return `${d}d ${h}h ${m}m ago`;
}

export function ex_gym() {
	// @wc-context: ex_gym
	return "EX Gym";
}

export function gym_members() {
	// @wc-context: gym_members
	return "Defenders";
}

export function gym_power() {
	// @wc-context: gym_power
	return "Total CP";
}

export function raid_ends() {
	// @wc-context: raid_ends
	return "Ends";
}

export function raid_starts() {
	// @wc-context: raid_starts
	return "Starts";
}

export function confirmed() {
	// @wc-context: confirmed
	return "confirmed";
}

export function outdated() {
	// @wc-context: outdated
	return "outdated";
}

export function last_seen() {
	// @wc-context: last_seen
	return "Last seen";
}

export function last_updated() {
	// @wc-context: last_updated
	return "Last updated";
}

export function first_seen() {
	// @wc-context: first_seen
	return "First seen";
}

export function outdated_message() {
	// @wc-context: outdated_message
	return "Hasn't been updated in a while";
}

export function time_format_h_m({ h, m }: { h: string | number; m: string | number }) {
	// @wc-context: time_format_h_m
	return `${h}h ${m}m`;
}

export function time_format_h_m_ago({ h, m }: { h: string | number; m: string | number }) {
	// @wc-context: time_format_h_m_ago
	return `${h}h ${m}m ago`;
}

export function yesterday_time({ time }: { time: string | number }) {
	// @wc-context: yesterday_time
	return `Yesterday, ${time}`;
}

export function today_time({ time }: { time: string | number }) {
	// @wc-context: today_time
	return `Today, ${time}`;
}

export function tomorrow_time({ time }: { time: string | number }) {
	// @wc-context: tomorrow_time
	return `Tomorrow, ${time}`;
}

export function contest_smallest({ name }: { name: string | number }) {
	// @wc-context: contest_smallest
	return `Smallest ${name}`;
}

export function contest_biggest({ name }: { name: string | number }) {
	// @wc-context: contest_biggest
	return `Biggest ${name}`;
}

export function contest_buddy_min_level({ level }: { level: string | number }) {
	// @wc-context: contest_buddy_min_level
	return `Buddy (Level ${level}+)`;
}

export function pokemon_class_1() {
	// @wc-context: pokemon_class_1
	return "Legendary";
}

export function pokemon_class_2() {
	// @wc-context: pokemon_class_2
	return "Mythic";
}

export function pokemon_class_3() {
	// @wc-context: pokemon_class_3
	return "Ultra Beast";
}

export function contest_pokemon_family({ pokemon }: { pokemon: string | number }) {
	// @wc-context: contest_pokemon_family
	return `${pokemon} (Evolution line)`;
}

export function contest_hatched() {
	// @wc-context: contest_hatched
	return "Hatched Pokémon";
}

export function contest_not_hatched() {
	// @wc-context: contest_not_hatched
	return "Non-hatched Pokémon";
}

export function contest_mega_evolution() {
	// @wc-context: contest_mega_evolution
	return "Mega Evolution";
}

export function contest_not_mega_evolution() {
	// @wc-context: contest_not_mega_evolution
	return "Non-Mega Evolution";
}

export function contest_shiny() {
	// @wc-context: contest_shiny
	return "Shiny";
}

export function contest_not_shiny() {
	// @wc-context: contest_not_shiny
	return "Non-Shiny";
}

export function popup_species_changed() {
	// @wc-context: popup_species_changed
	return "Species previously changed!";
}

export function popup_pokemon_moves() {
	// @wc-context: popup_pokemon_moves
	return "Moves";
}

export function pokemon_gender_male() {
	// @wc-context: pokemon_gender_male
	return "Male";
}

export function pokemon_gender_female() {
	// @wc-context: pokemon_gender_female
	return "Female";
}

export function pokemon_gender_neutral() {
	// @wc-context: pokemon_gender_neutral
	return "Neutral";
}

export function pokemon_gender() {
	// @wc-context: pokemon_gender
	return "Gender";
}

export function weather_boost() {
	// @wc-context: weather_boost
	return "Weather Boost";
}

export function no_weather_boost() {
	// @wc-context: no_weather_boost
	return "No Weather Boost";
}

export function popup_pokemon_is_strong() {
	// @wc-context: popup_pokemon_is_strong
	return "Is a Mighty Pokémon";
}

export function popup_despawns() {
	// @wc-context: popup_despawns
	return "Despawns";
}

export function little_league() {
	// @wc-context: little_league
	return "Little League";
}

export function great_league() {
	// @wc-context: great_league
	return "Great League";
}

export function ultra_league() {
	// @wc-context: ultra_league
	return "Ultra League";
}

export function league_rank({ league }: { league: string | number }) {
	// @wc-context: league_rank
	return `${league} Rank`;
}

export function until() {
	// @wc-context: until
	return "until";
}

export function x_type({ type }: { type: string | number }) {
	// @wc-context: x_type
	return `${type}-Type`;
}

export function connected_and({
	first,
	second
}: {
	first: string | number;
	second: string | number;
}) {
	// @wc-context: connected_and
	return `${first}- and ${second}`;
}

export function pogo_dynamax_pokemon({ pokemon }: { pokemon: string | number }) {
	// @wc-context: pogo_dynamax_pokemon
	return `Dynamax ${pokemon}`;
}

export function pogo_gigantamax_pokemon({ pokemon }: { pokemon: string | number }) {
	// @wc-context: pogo_gigantamax_pokemon
	return `Gigantamax ${pokemon}`;
}

export function start() {
	// @wc-context: start
	return "Start";
}

export function end() {
	// @wc-context: end
	return "End";
}

export function x_start_max_battle({ level }: { level: string | number }) {
	// @wc-context: x_start_max_battle
	return `${level}-Star Max Battle`;
}

export function webgl_disabled_error() {
	// @wc-context: webgl_disabled_error
	return "WebGL is required to use the map, but seems to be disabled in your browser. Please enable it or try to restart your browser.";
}

export function webgl_unsupported_error() {
	// @wc-context: webgl_unsupported_error
	return "WebGL is required to use the map. Please use a modern device and browser.";
}

export function last_changed() {
	// @wc-context: last_changed
	return "Last changed";
}

export function boosted() {
	// @wc-context: boosted
	return "Boosted";
}

export function settings_show_debug_title() {
	// @wc-context: settings_show_debug_title
	return "Show Map Debug Menu";
}

export function settings_show_debug_description() {
	// @wc-context: settings_show_debug_description
	return "Display in-depth information about the app";
}

export function search_address_loading() {
	// @wc-context: search_address_loading
	return "Loading...";
}

export function search_address_no_place_found() {
	// @wc-context: search_address_no_place_found
	return "Found nothing";
}

export function search_area_no_areas_found() {
	// @wc-context: search_area_no_areas_found
	return "No areas found";
}

export function search_area_title() {
	// @wc-context: search_area_title
	return "Areas";
}

export function search_place_title() {
	// @wc-context: search_place_title
	return "Places";
}

export function search_placeholder() {
	// @wc-context: search_placeholder
	return "Search...";
}

export function rsvp_entry({ going, maybe }: { going: string | number; maybe: string | number }) {
	// @wc-context: rsvp_entry
	return `${going} going · ${maybe} maybe`;
}

export function quest_xp({ count }: { count: string | number }) {
	// @wc-context: quest_xp
	return `${count} XP`;
}

export function quest_item({ count, item }: { count: string | number; item: string | number }) {
	// @wc-context: quest_item
	return `${count}x ${item}`;
}

export function quest_stardust({ count }: { count: string | number }) {
	// @wc-context: quest_stardust
	return `${count} Stardust`;
}

export function quest_candy({
	count,
	pokemon
}: {
	count: string | number;
	pokemon: string | number;
}) {
	// @wc-context: quest_candy
	return `${count} ${pokemon} Candy`;
}

export function quest_xl_candy({
	count,
	pokemon
}: {
	count: string | number;
	pokemon: string | number;
}) {
	// @wc-context: quest_xl_candy
	return `${count} ${pokemon} Candy XL`;
}

export function quest_mega_resource({
	count,
	pokemon
}: {
	count: string | number;
	pokemon: string | number;
}) {
	// @wc-context: quest_mega_resource
	return `${count} ${pokemon} Mega Energy`;
}

export function signin_toast_error() {
	// @wc-context: signin_toast_error
	return "Error while signing in, please try again";
}

export function signin_toast_success({ name }: { name: string | number }) {
	// @wc-context: signin_toast_success
	return `Signed in as ${name}`;
}

export function signout() {
	// @wc-context: signout
	return "Unlink Discord";
}

export function nav_profile() {
	// @wc-context: nav_profile
	return "Profile";
}

export function signin_prompt_part_1() {
	// Keep this optional prefix extractable; English is empty, Portuguese has text.
	// @wc-context: signin_prompt_part_1
	return " ".trim();
}

export function signin_prompt_bold() {
	// @wc-context: signin_prompt_bold
	return "Link your Discord account";
}

export function signin_prompt_part_2() {
	// @wc-context: signin_prompt_part_2
	return "to access more features";
}

export function settings_icon_size() {
	// @wc-context: settings_icon_size
	return "Map Icon Size";
}

export function unknown_weather() {
	// @wc-context: unknown_weather
	return "Unknown Weather";
}

export function unknown_type() {
	// @wc-context: unknown_type
	return "Unknown Type";
}

export function unknown_item() {
	// @wc-context: unknown_item
	return "Unknown Item";
}

export function unknown_raid() {
	// @wc-context: unknown_raid
	return "Unknown Raid";
}

export function unknown_move() {
	// @wc-context: unknown_move
	return "Unknown Move";
}

export function unknown_alignment() {
	// @wc-context: unknown_alignment
	return "Unknown Alignment";
}

export function unknown_generation() {
	// @wc-context: unknown_generation
	return "Unknown Generation";
}

export function unknown_quest() {
	// @wc-context: unknown_quest
	return "Unknown Quest";
}

export function unknown_character() {
	// @wc-context: unknown_character
	return "Unknown Grunt";
}

export function nav_scout() {
	// @wc-context: nav_scout
	return "Scout";
}

export function scout_area_size() {
	// @wc-context: scout_area_size
	return "Area Size";
}

export function scout_queue_position() {
	// @wc-context: scout_queue_position
	return "Position in queue";
}

export function scout_toast_success() {
	// @wc-context: scout_toast_success
	return "Started scouting, please wait a few seconds";
}

export function scout_toast_error() {
	// @wc-context: scout_toast_error
	return "There was an error while scouting, please try again";
}

export function scout_start() {
	// @wc-context: scout_start
	return "Start scout";
}

export function pogo_ivs() {
	// @wc-context: pogo_ivs
	return "IVs";
}

export function unknown_station() {
	// @wc-context: unknown_station
	return "Unknown Power Spot";
}

export function pogo_quest() {
	// @wc-context: pogo_quest
	return "Quest";
}

export function pogo_quests() {
	// @wc-context: pogo_quests
	return "Quests";
}

export function pogo_invasion() {
	// @wc-context: pogo_invasion
	return "Team Rocket";
}

export function pogo_max_battle() {
	// @wc-context: pogo_max_battle
	return "Max Battle";
}

export function any() {
	// @wc-context: any
	return "Any";
}

export function count_pokemon({ count }: { count: string | number }) {
	// @wc-context: count_pokemon
	return `${count} Pokémon`;
}

export function species() {
	// @wc-context: species
	return "Species";
}

export function cp() {
	// @wc-context: cp
	return "CP";
}

export function level() {
	// @wc-context: level
	return "Level";
}

export function filterset_title_new_pokemon() {
	// @wc-context: filterset_title_new_pokemon
	return "New Pokémon Filter";
}

export function filterset_title_edit_pokemon() {
	// @wc-context: filterset_title_edit_pokemon
	return "Edit Pokémon Filter";
}

export function atk_def_sta({
	atk,
	def,
	sta
}: {
	atk: string | number;
	def: string | number;
	sta: string | number;
}) {
	// @wc-context: atk_def_sta
	return `${atk}/${def}/${sta}`;
}

export function range_to({ x, y }: { x: string | number; y: string | number }) {
	// @wc-context: range_to
	return `${x} – ${y}`;
}

export function range_min({ x }: { x: string | number }) {
	// @wc-context: range_min
	return `${x}+`;
}

export function range_max({ x }: { x: string | number }) {
	// @wc-context: range_max
	return `≤${x}`;
}

export function rank_x({ rank }: { rank: string | number }) {
	// @wc-context: rank_x
	return `Rank ${rank}`;
}

export function x_percentage({ x }: { x: string | number }) {
	// @wc-context: x_percentage
	return `${x}%`;
}

export function count_genders({ count }: { count: string | number }) {
	// @wc-context: count_genders
	return `${count} genders`;
}

export function pokemon_filter() {
	// @wc-context: pokemon_filter
	return "Pokémon Filter";
}

export function pokemon_size() {
	// @wc-context: pokemon_size
	return "Size";
}

export function details() {
	// @wc-context: details
	return "Details";
}

export function shared_pokemon_filter() {
	// @wc-context: shared_pokemon_filter
	return "Shared Pokémon Filter";
}

export function unknown_filter() {
	// @wc-context: unknown_filter
	return "Unknown Filter";
}

export function filter_template_hundo() {
	// @wc-context: filter_template_hundo
	return "100% IV";
}

export function filter_template_nundo() {
	// @wc-context: filter_template_nundo
	return "0% IV";
}

export function filter_template_rank1_great() {
	// @wc-context: filter_template_rank1_great
	return "Rank 1 Great League";
}

export function filter_template_rank1_ultra() {
	// @wc-context: filter_template_rank1_ultra
	return "Rank 1 Ultra League";
}

export function filter_template_xxl_magikarp() {
	// @wc-context: filter_template_xxl_magikarp
	return "XXL Magikarp";
}

export function filter_template_xxl() {
	// @wc-context: filter_template_xxl
	return "All XXL";
}

export function filter_template_unown() {
	// @wc-context: filter_template_unown
	return "Unown";
}

export function filter_template_sea_trio() {
	// @wc-context: filter_template_sea_trio
	return "Lake Trio";
}

export function shiny_rate() {
	// @wc-context: shiny_rate
	return "Shiny Rate";
}

export function unknown_contest() {
	// @wc-context: unknown_contest
	return "Unknown Showcase";
}

export function contest() {
	// @wc-context: contest
	return "Showcase";
}

export function quest_filter() {
	// @wc-context: quest_filter
	return "Quest Filter";
}

export function shared_quest_filter() {
	// @wc-context: shared_quest_filter
	return "Shared Quest Filter";
}

export function new_quest_filter() {
	// @wc-context: new_quest_filter
	return "New Quest Filter";
}

export function edit_quest_filter() {
	// @wc-context: edit_quest_filter
	return "Edit Quest Filter";
}

export function rarity_common() {
	// @wc-context: rarity_common
	return "Common";
}

export function rarity_uncommon() {
	// @wc-context: rarity_uncommon
	return "Uncommon";
}

export function rarity_rare() {
	// @wc-context: rarity_rare
	return "Rare";
}

export function rarity_very_rare() {
	// @wc-context: rarity_very_rare
	return "Very Rare";
}

export function rarity_extremely_rare() {
	// @wc-context: rarity_extremely_rare
	return "Elusive";
}

export function rarity_legendary() {
	// @wc-context: rarity_legendary
	return "Off the charts";
}

export function stats() {
	// @wc-context: stats
	return "Stats";
}

export function last_x_days({ days }: { days: string | number }) {
	// @wc-context: last_x_days
	return `Last ${days} days`;
}

export function total_seen() {
	// @wc-context: total_seen
	return "Total seen";
}

export function no_shiny() {
	// @wc-context: no_shiny
	return "No shiny";
}

export function rarity() {
	// @wc-context: rarity
	return "Rarity";
}

export function showing_showing_of_examined({
	showing,
	examined
}: {
	showing: string | number;
	examined: string | number;
}) {
	// @wc-context: showing_showing_of_examined
	return `Showing ${showing} of ${examined}`;
}

export function showing_showing({ showing }: { showing: string | number }) {
	// @wc-context: showing_showing
	return `Showing ${showing}`;
}

export function both() {
	// @wc-context: both
	return "Both";
}

export function reward() {
	// @wc-context: reward
	return "Reward";
}

export function items() {
	// @wc-context: items
	return "Items";
}

export function mega_energy() {
	// @wc-context: mega_energy
	return "Mega Energy";
}

export function candy() {
	// @wc-context: candy
	return "Candy";
}

export function stardust() {
	// @wc-context: stardust
	return "Stardust";
}

export function xp() {
	// @wc-context: xp
	return "XP";
}

export function xl_candy() {
	// @wc-context: xl_candy
	return "Candy XL";
}

export function redirect_notice({ goal }: { goal: string | number }) {
	// @wc-context: redirect_notice
	return `You're being automatically redirected to ${goal}. Click here if that didn't work.`;
}

export function language_spanish() {
	// @wc-context: language_spanish
	return "Spanish";
}

export function language_portuguese() {
	// @wc-context: language_portuguese
	return "Portuguese";
}

export function raid_filter() {
	// @wc-context: raid_filter
	return "Raid Filter";
}

export function shared_raid_filter() {
	// @wc-context: shared_raid_filter
	return "Shared Raid Filter";
}

export function new_raid_filter() {
	// @wc-context: new_raid_filter
	return "New Raid Filter";
}

export function edit_raid_filter() {
	// @wc-context: edit_raid_filter
	return "Edit Raid Filter";
}

export function count_raid_levels({ count }: { count: string | number }) {
	// @wc-context: count_raid_levels
	return `${count} Raid levels`;
}

export function iv_product_label() {
	// @wc-context: iv_product_label
	return "IV %";
}

export function attack_iv() {
	// @wc-context: attack_iv
	return "Attack IV";
}

export function defense_iv() {
	// @wc-context: defense_iv
	return "Defense IV";
}

export function stamina_iv() {
	// @wc-context: stamina_iv
	return "HP IV";
}

export function iv_product_label_long() {
	// @wc-context: iv_product_label_long
	return "Total IV";
}

export function pokemon_looks() {
	// @wc-context: pokemon_looks
	return "Cosmetics";
}

export function little_league_rank() {
	// @wc-context: little_league_rank
	return "Little League Rank";
}

export function great_league_rank() {
	// @wc-context: great_league_rank
	return "Great League Rank";
}

export function ultra_league_rank() {
	// @wc-context: ultra_league_rank
	return "Ultra League Rank";
}

export function raid_show() {
	// @wc-context: raid_show
	return "Show";
}

export function raid_show_eggs() {
	// @wc-context: raid_show_eggs
	return "Eggs";
}

export function raid_show_bosses() {
	// @wc-context: raid_show_bosses
	return "Bosses";
}

export function raid_levels() {
	// @wc-context: raid_levels
	return "Levels";
}

export function raid_levels_long() {
	// @wc-context: raid_levels_long
	return "Raid Levels";
}

export function raid_bosses() {
	// @wc-context: raid_bosses
	return "Bosses";
}

export function raid_bosses_long() {
	// @wc-context: raid_bosses_long
	return "Raid Bosses";
}

export function raid_boss_select_available() {
	// @wc-context: raid_boss_select_available
	return "Show available bosses";
}

export function raid_filter_by() {
	// @wc-context: raid_filter_by
	return "Filter by";
}

export function raid_filter_by_level() {
	// @wc-context: raid_filter_by_level
	return "Raid Level";
}

export function raid_filter_by_boss() {
	// @wc-context: raid_filter_by_boss
	return "Raid Boss";
}

export function add_filter_pokemon_undefined() {
	// @wc-context: add_filter_pokemon_undefined
	return "Add Pokémon filter";
}

export function add_filter_pokestop_quest() {
	// @wc-context: add_filter_pokestop_quest
	return "Add Quest filter";
}

export function add_filter_pokestop_invasion() {
	// @wc-context: add_filter_pokestop_invasion
	return "Add Team Rocket filter";
}

export function add_filter_gym_raid() {
	// @wc-context: add_filter_gym_raid
	return "Add Raid filter";
}

export function error_back_to_website() {
	// @wc-context: error_back_to_website
	return "Back to site";
}

export function error_webgl_unavailable() {
	// @wc-context: error_webgl_unavailable
	return "WebGL unavailable";
}

export function error_404() {
	// @wc-context: error_404
	return "404: Page not found";
}

export function discord_block_title() {
	// @wc-context: discord_block_title
	return "Discord Link required";
}

export function discord_block_desc() {
	// @wc-context: discord_block_desc
	return "You have to link your Discord account before accessing the map";
}

export function discord_block_button() {
	// @wc-context: discord_block_button
	return "Link Discord";
}

export function filter_template_raids_5() {
	// @wc-context: filter_template_raids_5
	return "Legendary Raids";
}

export function filter_template_raids_5_shadow() {
	// @wc-context: filter_template_raids_5_shadow
	return "Legendary Shadow Raids";
}

export function filter_template_raids_shadow() {
	// @wc-context: filter_template_raids_shadow
	return "Shadow Raids";
}

export function filter_template_raids_mega() {
	// @wc-context: filter_template_raids_mega
	return "Mega Raids";
}

export function filter_template_raids_mega_legendary() {
	// @wc-context: filter_template_raids_mega_legendary
	return "Mega Legendary Raids";
}

export function filter_template_raids_primal() {
	// @wc-context: filter_template_raids_primal
	return "Primal Raids";
}

export function filter_template_raids_ultra_beast() {
	// @wc-context: filter_template_raids_ultra_beast
	return "Ultra Beast Raids";
}

export function filter_template_raids_elite() {
	// @wc-context: filter_template_raids_elite
	return "Elite Raids";
}

export function enable_filters() {
	// @wc-context: enable_filters
	return "Enable filters";
}

export function disable_filters() {
	// @wc-context: disable_filters
	return "Disable filters";
}

export function filter_template_raids_raids() {
	// @wc-context: filter_template_raids_raids
	return "Raids";
}

export function filter_template_raids_bosses() {
	// @wc-context: filter_template_raids_bosses
	return "Bosses";
}

export function filter_template_raids_eggs() {
	// @wc-context: filter_template_raids_eggs
	return "Eggs";
}

export function filter_template_levels_elite({ kind }: { kind: string | number }) {
	// @wc-context: filter_template_levels_elite
	return `Elite ${kind}`;
}

export function filter_template_levels_ultra_beast({ kind }: { kind: string | number }) {
	// @wc-context: filter_template_levels_ultra_beast
	return `Ultra Beast ${kind}`;
}

export function filter_template_levels_primal({ kind }: { kind: string | number }) {
	// @wc-context: filter_template_levels_primal
	return `Primal ${kind}`;
}

export function filter_template_levels_mega_legendary({ kind }: { kind: string | number }) {
	// @wc-context: filter_template_levels_mega_legendary
	return `Mega Legendary ${kind}`;
}

export function filter_template_levels_mega({ kind }: { kind: string | number }) {
	// @wc-context: filter_template_levels_mega
	return `Mega ${kind}`;
}

export function filter_template_levels_legendary({ kind }: { kind: string | number }) {
	// @wc-context: filter_template_levels_legendary
	return `Legendary ${kind}`;
}

export function filter_template_levels_legendary_shadow({ kind }: { kind: string | number }) {
	// @wc-context: filter_template_levels_legendary_shadow
	return `Legendary Shadow ${kind}`;
}

export function filter_template_levels_shadow({ kind }: { kind: string | number }) {
	// @wc-context: filter_template_levels_shadow
	return `Shadow ${kind}`;
}

export function filter_template_levels_1_star({ kind }: { kind: string | number }) {
	// @wc-context: filter_template_levels_1_star
	return `★ ${kind}`;
}

export function filter_template_levels_1_star_shadow({ kind }: { kind: string | number }) {
	// @wc-context: filter_template_levels_1_star_shadow
	return `Shadow ★ ${kind}`;
}

export function filter_template_levels_3_star({ kind }: { kind: string | number }) {
	// @wc-context: filter_template_levels_3_star
	return `★★★ ${kind}`;
}

export function filter_template_levels_3_star_shadow({ kind }: { kind: string | number }) {
	// @wc-context: filter_template_levels_3_star_shadow
	return `Shadow ★★★ ${kind}`;
}

export function filter_template_levels_various({ kind }: { kind: string | number }) {
	// @wc-context: filter_template_levels_various
	return `Various ${kind}`;
}

export function filter_template_raids_fallback() {
	// @wc-context: filter_template_raids_fallback
	return "Raid Filter";
}

export function filter_template_raids_all({ kind }: { kind: string | number }) {
	// @wc-context: filter_template_raids_all
	return `All ${kind}`;
}

export function filter_template_pokemon_raids({ pokemon }: { pokemon: string | number }) {
	// @wc-context: filter_template_pokemon_raids
	return `${pokemon} Raids`;
}

export function filter_template_pokemon_fallback() {
	// @wc-context: filter_template_pokemon_fallback
	return "Pokémon Filter";
}

export function filter_template_pokemon_template({
	attributes,
	kind
}: {
	attributes: string | number;
	kind: string | number;
}) {
	// @wc-context: filter_template_pokemon_template
	return `${attributes}${kind}`;
}

export function short_rank_little_league({ rank }: { rank: string | number }) {
	// @wc-context: short_rank_little_league
	return `LL #${rank}`;
}

export function short_rank_great_league({ rank }: { rank: string | number }) {
	// @wc-context: short_rank_great_league
	return `GL #${rank}`;
}

export function short_rank_ultra_league({ rank }: { rank: string | number }) {
	// @wc-context: short_rank_ultra_league
	return `UL #${rank}`;
}

export function context_menu_share_position() {
	// @wc-context: context_menu_share_position
	return "Share map position";
}

export function x_km({ x }: { x: string | number }) {
	// @wc-context: x_km
	return `${x}km`;
}

export function display_pokemon_notice({
	pokemon,
	display
}: {
	pokemon: string | number;
	display: string | number;
}) {
	// @wc-context: display_pokemon_notice
	return `This ${pokemon} is hiding as a ${display}`;
}

export function plain_pokestops() {
	// @wc-context: plain_pokestops
	return "Plain Pokéstops";
}

export function lures() {
	// @wc-context: lures
	return "Lures";
}

export function contests() {
	// @wc-context: contests
	return "Showcases";
}

export function routes() {
	// @wc-context: routes
	return "Routes";
}

export function kecleon() {
	// @wc-context: kecleon
	return "Kecleon";
}

export function golden_pokestops() {
	// @wc-context: golden_pokestops
	return "Golden Pokéstops";
}

export function raids() {
	// @wc-context: raids
	return "Raids";
}

export function plain_gyms() {
	// @wc-context: plain_gyms
	return "Plain Gyms";
}

export function plain_stations() {
	// @wc-context: plain_stations
	return "Plain Power Spots";
}

export function max_battles() {
	// @wc-context: max_battles
	return "Max Battles";
}

export function s2_cells() {
	// @wc-context: s2_cells
	return "S2 Cells";
}

export function tappables() {
	// @wc-context: tappables
	return "Ground Items";
}

export function spawnpoints() {
	// @wc-context: spawnpoints
	return "Spawnpoints";
}

export function nests() {
	// @wc-context: nests
	return "Nests";
}

export function pokemon_nest({ pokemon }: { pokemon: string | number }) {
	// @wc-context: pokemon_nest
	return `${pokemon} Nest`;
}

export function park_name() {
	// @wc-context: park_name
	return "Park Name";
}

export function nest_avg() {
	// @wc-context: nest_avg
	return "Spawn Rate";
}

export function nest_avg_value({ avg }: { avg: string | number }) {
	// @wc-context: nest_avg_value
	return `~${avg}/hour`;
}

export function nest_ratio() {
	// @wc-context: nest_ratio
	return "Spawn Ratio";
}

export function nest_spawnpoint_count() {
	// @wc-context: nest_spawnpoint_count
	return "Total Spawnpoints";
}

export function nest_size() {
	// @wc-context: nest_size
	return "Area";
}

export function square_m_value({ size }: { size: string | number }) {
	// @wc-context: square_m_value
	return `${size}m²`;
}

export function pogo_nest() {
	// @wc-context: pogo_nest
	return "Nest";
}

export function pogo_s2cell() {
	// @wc-context: pogo_s2cell
	return "S2 Cell";
}

export function pogo_tappable() {
	// @wc-context: pogo_tappable
	return "Ground Item";
}

export function pogo_spawnpoint() {
	// @wc-context: pogo_spawnpoint
	return "Spawnpoint";
}

export function pogo_route() {
	// @wc-context: pogo_route
	return "Route";
}

export function lure_hint() {
	// @wc-context: lure_hint
	return "This Pokémon was seen at a Lure Module";
}

export function tappable_hint() {
	// @wc-context: tappable_hint
	return "This Pokémon appears after tapping an Apple";
}

export function unknown_tappable() {
	// @wc-context: unknown_tappable
	return "Unknown Ground Item";
}

export function time_is_estimated() {
	// @wc-context: time_is_estimated
	return "Time is estimated";
}

export function spawnpoint_despawns() {
	// @wc-context: spawnpoint_despawns
	return "Despawns";
}

export function spawnpoint_unknown() {
	// @wc-context: spawnpoint_unknown
	return "Unknown despawn time";
}

export function invasion_filter() {
	// @wc-context: invasion_filter
	return "Team Rocket Filter";
}

export function shared_invasion_filter() {
	// @wc-context: shared_invasion_filter
	return "Shared Team Rocket Filter";
}

export function new_invasion_filter() {
	// @wc-context: new_invasion_filter
	return "New Team Rocket Filter";
}

export function edit_invasion_filter() {
	// @wc-context: edit_invasion_filter
	return "Edit Team Rocket Filter";
}

export function invasion_filter_by() {
	// @wc-context: invasion_filter_by
	return "Filter by";
}

export function invasion_filter_by_reward() {
	// @wc-context: invasion_filter_by_reward
	return "Rewards";
}

export function invasion_filter_by_character() {
	// @wc-context: invasion_filter_by_character
	return "Grunts";
}

export function rewards() {
	// @wc-context: rewards
	return "Rewards";
}

export function grunts() {
	// @wc-context: grunts
	return "Grunts";
}

export function count_characters({ count }: { count: string | number }) {
	// @wc-context: count_characters
	return `${count} Grunts`;
}

export function count_leaders({ count }: { count: string | number }) {
	// @wc-context: count_leaders
	return `${count} Leaders`;
}

export function filter_template_invasion_fallback() {
	// @wc-context: filter_template_invasion_fallback
	return "Team Rocket Filter";
}

export function filter_template_invasion_one_grunt({ type }: { type: string | number }) {
	// @wc-context: filter_template_invasion_one_grunt
	return `${type}`;
}

export function filter_template_invasion_giovanni() {
	// @wc-context: filter_template_invasion_giovanni
	return "Giovanni";
}

export function create_new() {
	// @wc-context: create_new
	return "Create new";
}

export function or_select_suggested_filter() {
	// @wc-context: or_select_suggested_filter
	return "or select suggested filter";
}

export function save() {
	// @wc-context: save
	return "Save";
}

export function cancel() {
	// @wc-context: cancel
	return "Cancel";
}

export function edit() {
	// @wc-context: edit
	return "Edit";
}

function deleteMessage() {
	// @wc-context: delete
	return "Delete";
}

export function searching_for() {
	// @wc-context: searching_for
	return "Searching for";
}

export function nothing_to_see_here() {
	// @wc-context: nothing_to_see_here
	return "Here you can search for anything";
}

export function nothing_found() {
	// @wc-context: nothing_found
	return "Nothing came up";
}

export function search_hint() {
	// @wc-context: search_hint
	return "Try searching for Pokémon, areas, addresses, Gyms or Quests";
}

export function search_hint_no_address() {
	// @wc-context: search_hint_no_address
	return "Try searching for Pokémon, areas, Gyms or Quests";
}

export function search_hint_no_area() {
	// @wc-context: search_hint_no_area
	return "Try searching for Pokémon, addresses, Gyms or Quests";
}

export function search_hint_no_area_address() {
	// @wc-context: search_hint_no_area_address
	return "Try searching for Pokémon, Pokéstops, Gyms or Quests";
}

export function area() {
	// @wc-context: area
	return "Area";
}

export function search_recent() {
	// @wc-context: search_recent
	return "Recent";
}

export function x_quests({ x }: { x: string | number }) {
	// @wc-context: x_quests
	return `${x} Quests`;
}

export function count_items({ count }: { count: string | number }) {
	// @wc-context: count_items
	return `${count} Items`;
}

export function tasks() {
	// @wc-context: tasks
	return "Tasks";
}

export function pokemon_mega_resource({ pokemon }: { pokemon: string | number }) {
	// @wc-context: pokemon_mega_resource
	return `${pokemon} Mega Energy`;
}

export function pokemon_candy({ pokemon }: { pokemon: string | number }) {
	// @wc-context: pokemon_candy
	return `${pokemon} Candy`;
}

export function pokemon_xl_candy({ pokemon }: { pokemon: string | number }) {
	// @wc-context: pokemon_xl_candy
	return `${pokemon} Candy XL`;
}

export function kecleon_pokestops() {
	// @wc-context: kecleon_pokestops
	return "Kecleon Pokéstops";
}

export function pogo_contests() {
	// @wc-context: pogo_contests
	return "Showcases";
}

export function character_grunt({ character }: { character: string | number }) {
	// @wc-context: character_grunt
	return `${character} Grunt`;
}

export function pokemon_raids({ pokemon }: { pokemon: string | number }) {
	// @wc-context: pokemon_raids
	return `${pokemon} Raids`;
}

export function x_star_max_battles({ level }: { level: string | number }) {
	// @wc-context: x_star_max_battles
	return `${level}-Star Max Battles`;
}

export function pokemon_max_battles({ pokemon }: { pokemon: string | number }) {
	// @wc-context: pokemon_max_battles
	return `${pokemon} Max Battles`;
}

export function pokemon_nests({ pokemon }: { pokemon: string | number }) {
	// @wc-context: pokemon_nests
	return `${pokemon} Nests`;
}

export function address() {
	// @wc-context: address
	return "Address";
}

export function searching_for_addresses() {
	// @wc-context: searching_for_addresses
	return "Looking for addresses";
}

export function nav_tools() {
	// @wc-context: nav_tools
	return "Tools";
}

export function nav_coveragemap() {
	// @wc-context: nav_coveragemap
	return "Coverage Map";
}

export function back_to_map() {
	// @wc-context: back_to_map
	return "Back to map";
}

export function external_map_context_menu() {
	// @wc-context: external_map_context_menu
	return "Selected location";
}

export function google_maps() {
	// @wc-context: google_maps
	return "Google Maps";
}

export function apple_maps() {
	// @wc-context: apple_maps
	return "Apple Maps";
}

export function settings_external_map_provider() {
	// @wc-context: settings_external_map_provider
	return "Navigate using";
}

export function wayfarer_cells() {
	// @wc-context: wayfarer_cells
	return "Wayfarer Cells";
}

export function cell_level() {
	// @wc-context: cell_level
	return "S2 Cell Level";
}

export function redirect_title({ goal }: { goal: string | number }) {
	// @wc-context: redirect_title
	return `Bringing you to ${goal}`;
}

export function redirect_button() {
	// @wc-context: redirect_button
	return "Click here if that didn't work";
}

export function filter_template_legendary_birds() {
	// @wc-context: filter_template_legendary_birds
	return "Legendary Birds";
}

export function species_quick_filter_selected() {
	// @wc-context: species_quick_filter_selected
	return "Selected";
}

export function settings_rotate_pitch_title() {
	// @wc-context: settings_rotate_pitch_title
	return "Lock map rotate & pitch";
}

export function settings_rotate_pitch_description() {
	// @wc-context: settings_rotate_pitch_description
	return "Disables rotation and pitching of the map";
}

export function tool_scout_title() {
	// @wc-context: tool_scout_title
	return "Scout";
}

export function tool_scout_description() {
	// @wc-context: tool_scout_description
	return "Scan any location";
}

export function tool_coverage_map_title() {
	// @wc-context: tool_coverage_map_title
	return "Coverage Map";
}

export function tool_coverage_map_description() {
	// @wc-context: tool_coverage_map_description
	return "Overview of all scanned areas";
}

export function plain_pokestop_filter() {
	// @wc-context: plain_pokestop_filter
	return "Plain Pokéstop Filter";
}

export function filter_attributes() {
	// @wc-context: filter_attributes
	return "Attributes";
}

export function filter_icon() {
	// @wc-context: filter_icon
	return "Icon";
}

export function filter_name() {
	// @wc-context: filter_name
	return "Name";
}

export function reward_avatar_clothing() {
	// @wc-context: reward_avatar_clothing
	return "Avatar Clothing";
}

export function reward_quest() {
	// @wc-context: reward_quest
	return "Quest";
}

export function reward_pokecoins() {
	// @wc-context: reward_pokecoins
	return "Pokécoins";
}

export function reward_level_cap() {
	// @wc-context: reward_level_cap
	return "Level Cap";
}

export function reward_sticker() {
	// @wc-context: reward_sticker
	return "Sticker";
}

export function reward_incident() {
	// @wc-context: reward_incident
	return "Incident";
}

export function reward_player_attribute() {
	// @wc-context: reward_player_attribute
	return "Player Attribute";
}

export function reward_event_badge() {
	// @wc-context: reward_event_badge
	return "Event Badge";
}

export function reward_egg() {
	// @wc-context: reward_egg
	return "Egg";
}

export function unknown_nest() {
	// @wc-context: unknown_nest
	return "Unknown Nest";
}

export function toast_copied_default() {
	// @wc-context: toast_copied_default
	return "Copied to clipboard";
}

export function direct_link_no_permission({ type }: { type: string | number }) {
	// @wc-context: direct_link_no_permission
	return `No permission to view this ${type}`;
}

export function invasion_lineup_unavailable() {
	// @wc-context: invasion_lineup_unavailable
	return "Lineups not available";
}

export function invasion_x_possible_rewards({ x }: { x: string | number }) {
	// @wc-context: invasion_x_possible_rewards
	return `${x} possible rewards`;
}

export function invasion_reward() {
	// @wc-context: invasion_reward
	return "Reward";
}

export function filter_template_pokemon_invasion({ pokemon }: { pokemon: string | number }) {
	// @wc-context: filter_template_pokemon_invasion
	return `${pokemon} Grunts`;
}

export function add_filter_station_maxBattle() {
	// @wc-context: add_filter_station_maxBattle
	return "Add Max Battle filter";
}

export function max_battle_filter() {
	// @wc-context: max_battle_filter
	return "Max Battle Filter";
}

export function shared_max_battle_filter() {
	// @wc-context: shared_max_battle_filter
	return "Shared Max Battle Filter";
}

export function new_max_battle_filter() {
	// @wc-context: new_max_battle_filter
	return "New Max Battle Filter";
}

export function edit_max_battle_filter() {
	// @wc-context: edit_max_battle_filter
	return "Edit Max Battle Filter";
}

export function max_battle_boss_select_available() {
	// @wc-context: max_battle_boss_select_available
	return "Show available";
}

export function max_battle_inactive() {
	// @wc-context: max_battle_inactive
	return "Inactive";
}

export function filter_template_max_battle_fallback() {
	// @wc-context: filter_template_max_battle_fallback
	return "Max Battle Filter";
}

export function filter_template_pokemon_max_battles({ pokemon }: { pokemon: string | number }) {
	// @wc-context: filter_template_pokemon_max_battles
	return `${pokemon} Max Battles`;
}

export function max_battle_only_show_active() {
	// @wc-context: max_battle_only_show_active
	return "Only show active";
}

export function max_battle_only_show() {
	// @wc-context: max_battle_only_show
	return "Only show";
}

export function max_battle_active() {
	// @wc-context: max_battle_active
	return "Active";
}

export function max_battle_has_gmax() {
	// @wc-context: max_battle_has_gmax
	return "Has Gigantamax";
}

export function max_battle_power_spot_has() {
	// @wc-context: max_battle_power_spot_has
	return "Power spot has";
}

export function max_battle_gmax() {
	// @wc-context: max_battle_gmax
	return "Gigantamax";
}

export function icon_picker_emoji() {
	// @wc-context: icon_picker_emoji
	return "Emoji";
}

export function icon_picker_type() {
	// @wc-context: icon_picker_type
	return "Types";
}

export function icon_picker_raid() {
	// @wc-context: icon_picker_raid
	return "Raids";
}

export function icon_picker_invasion() {
	// @wc-context: icon_picker_invasion
	return "Grunts";
}

export function icon_picker_item() {
	// @wc-context: icon_picker_item
	return "Items";
}

export function icon_search_placeholder() {
	// @wc-context: icon_search_placeholder
	return "Search for an icon";
}

export function icon_picker_misc() {
	// @wc-context: icon_picker_misc
	return "Misc";
}

export function icon_picker_poi() {
	// @wc-context: icon_picker_poi
	return "POIs";
}

export function team_neutral() {
	// @wc-context: team_neutral
	return "Neutral";
}

export function team_mystic() {
	// @wc-context: team_mystic
	return "Mystic";
}

export function team_valor() {
	// @wc-context: team_valor
	return "Valor";
}

export function team_instinct() {
	// @wc-context: team_instinct
	return "Instinct";
}

export function master_league() {
	// @wc-context: master_league
	return "Master League";
}

export function poi_pokestop_invasion() {
	// @wc-context: poi_pokestop_invasion
	return "Pokéstop (Team Rocket)";
}

export function poi_pokestop_gold() {
	// @wc-context: poi_pokestop_gold
	return "Golden Pokéstop";
}

export function poi_pokestop_kecleon() {
	// @wc-context: poi_pokestop_kecleon
	return "Pokéstop (Kecleon)";
}

export function poi_pokestop_contest() {
	// @wc-context: poi_pokestop_contest
	return "Pokéstop (Showcase)";
}

export function poi_pokestop_lured({ lure }: { lure: string | number }) {
	// @wc-context: poi_pokestop_lured
	return `Pokéstop (${lure})`;
}

export function poi_gym_team({ team }: { team: string | number }) {
	// @wc-context: poi_gym_team
	return `Gym (${team})`;
}

export function poi_station_active() {
	// @wc-context: poi_station_active
	return "Power Spot (Active)";
}

export function poi_station_inactive() {
	// @wc-context: poi_station_inactive
	return "Power Spot (Inactive)";
}

export function modifier_visual() {
	// @wc-context: modifier_visual
	return "Visual";
}

export function modifier_glow() {
	// @wc-context: modifier_glow
	return "Glow";
}

export function modifier_glow_intensity() {
	// @wc-context: modifier_glow_intensity
	return "Glow intensity";
}

export function modifier_background() {
	// @wc-context: modifier_background
	return "Background";
}

export function modifier_background_circle() {
	// @wc-context: modifier_background_circle
	return "Circle";
}

export function modifier_background_intensity() {
	// @wc-context: modifier_background_intensity
	return "Circle intensity";
}

export function modifier_scale() {
	// @wc-context: modifier_scale
	return "Scale";
}

export function modifier_rotation() {
	// @wc-context: modifier_rotation
	return "Rotation";
}

export function modifier_none() {
	// @wc-context: modifier_none
	return "None";
}

export function modifier_show_badge() {
	// @wc-context: modifier_show_badge
	return "Show Badge";
}

export function modifier_show_label() {
	// @wc-context: modifier_show_label
	return "Show Label";
}

export function modifier_map_preview() {
	// @wc-context: modifier_map_preview
	return "Map Preview";
}

export function coveragemap_view() {
	// @wc-context: coveragemap_view
	return "View";
}

export function search_placeholder_pokemon() {
	// @wc-context: search_placeholder_pokemon
	return "Search for Pokémon";
}

export function pokemon_picker_selected() {
	// @wc-context: pokemon_picker_selected
	return "Selected";
}

export function pokemon_picker_available() {
	// @wc-context: pokemon_picker_available
	return "Available";
}

export function alolan_pokemon({ name }: { name: string | number }) {
	// @wc-context: alolan_pokemon
	return `Alolan ${name}`;
}

export function hisuian_pokemon({ name }: { name: string | number }) {
	// @wc-context: hisuian_pokemon
	return `Hisuian ${name}`;
}

export function galarian_pokemon({ name }: { name: string | number }) {
	// @wc-context: galarian_pokemon
	return `Galarian ${name}`;
}

export function x_star_raid({ level }: { level: string | number }) {
	// @wc-context: x_star_raid
	return `${level}-Star Raid`;
}

export function x_star_raids({ level }: { level: string | number }) {
	// @wc-context: x_star_raids
	return `${level}-Star Raids`;
}

export function x_star_shadow_raid({ level }: { level: string | number }) {
	// @wc-context: x_star_shadow_raid
	return `${level}-Star Shadow Raid`;
}

export function x_star_shadow_raids({ level }: { level: string | number }) {
	// @wc-context: x_star_shadow_raids
	return `${level}-Star Shadow Raids`;
}

export function legendary_shadow_raid() {
	// @wc-context: legendary_shadow_raid
	return "Legendary Shadow Raid";
}

export function legendary_shadow_raids() {
	// @wc-context: legendary_shadow_raids
	return "Legendary Shadow Raids";
}

export function only_show_hatched() {
	// @wc-context: only_show_hatched
	return "Only show hatched";
}

export function count_mega_energies({ count }: { count: string | number }) {
	// @wc-context: count_mega_energies
	return `${count} Mega Energies`;
}

export function quest_reward_none_available({ reward }: { reward: string | number }) {
	// @wc-context: quest_reward_none_available
	return `No ${reward} currently available from Quests`;
}

export function count_tasks({ count }: { count: string | number }) {
	// @wc-context: count_tasks
	return `${count} Tasks`;
}

export function quest_tasks_only_matching_rewards() {
	// @wc-context: quest_tasks_only_matching_rewards
	return "Matching rewards";
}

export function task() {
	// @wc-context: task
	return "Task";
}

export function filter_template_quest_reward({ reward }: { reward: string | number }) {
	// @wc-context: filter_template_quest_reward
	return `${reward} Quests`;
}

export function filter_template_quest_task({ task }: { task: string | number }) {
	// @wc-context: filter_template_quest_task
	return `${task}`;
}

export function filter_template_quest_fallback() {
	// @wc-context: filter_template_quest_fallback
	return "Quest Filter";
}

export function count_candies({ count }: { count: string | number }) {
	// @wc-context: count_candies
	return `${count} Candies`;
}

export function count_xl_candies({ count }: { count: string | number }) {
	// @wc-context: count_xl_candies
	return `${count} Candies XL`;
}

export function count_stardust({ count }: { count: string | number }) {
	// @wc-context: count_stardust
	return `${count} Stardust`;
}

export function count_xp({ count }: { count: string | number }) {
	// @wc-context: count_xp
	return `${count} XP`;
}

export function filter_template_invasion_leaders() {
	// @wc-context: filter_template_invasion_leaders
	return "Team Rocket Leaders";
}

export function join_server() {
	// @wc-context: join_server
	return "Join Server";
}

export function signout_toast_error() {
	// @wc-context: signout_toast_error
	return "Error while signing out, please try again";
}

export function unknown_league() {
	// @wc-context: unknown_league
	return "Unknown League";
}

export function target_cp() {
	// @wc-context: target_cp
	return "Target CP";
}

export function considered_max_level() {
	// @wc-context: considered_max_level
	return "Considered max level";
}

export function copy_link() {
	// @wc-context: copy_link
	return "Copy link";
}

export function popup_action_dim() {
	// @wc-context: popup_action_dim
	return "Dim";
}

export function popup_action_undim() {
	// @wc-context: popup_action_undim
	return "Undim";
}

export function popup_action_show_radius() {
	// @wc-context: popup_action_show_radius
	return "Show range";
}

export function popup_action_hide_radius() {
	// @wc-context: popup_action_hide_radius
	return "Hide range";
}

export function popup_action_spacial_rend() {
	// @wc-context: popup_action_spacial_rend
	return "Spacial Rend";
}

export function popup_action_undim_all_pokemon() {
	// @wc-context: popup_action_undim_all_pokemon
	return "Undim all Pokémon";
}

export function popup_action_show_on_every_pokemon() {
	// @wc-context: popup_action_show_on_every_pokemon
	return "Show on every Pokémon";
}

export function popup_action_undim_all_pokestop() {
	// @wc-context: popup_action_undim_all_pokestop
	return "Undim all Pokéstops";
}

export function popup_action_show_on_every_pokestop() {
	// @wc-context: popup_action_show_on_every_pokestop
	return "Show on every Pokéstop";
}

export function popup_action_undim_all_gym() {
	// @wc-context: popup_action_undim_all_gym
	return "Undim all Gyms";
}

export function popup_action_show_on_every_gym() {
	// @wc-context: popup_action_show_on_every_gym
	return "Show on every Gym";
}

export function popup_action_undim_all_station() {
	// @wc-context: popup_action_undim_all_station
	return "Undim all Power Spots";
}

export function popup_action_show_on_every_station() {
	// @wc-context: popup_action_show_on_every_station
	return "Show on every Power Spot";
}

export function popup_action_undim_all_tappable() {
	// @wc-context: popup_action_undim_all_tappable
	return "Undim all Ground Items";
}

export function popup_action_show_on_every_tappable() {
	// @wc-context: popup_action_show_on_every_tappable
	return "Show on every Ground Item";
}

export function popup_action_show_timer() {
	// @wc-context: popup_action_show_timer
	return "Show timer";
}

export function popup_action_hide_timer() {
	// @wc-context: popup_action_hide_timer
	return "Hide timer";
}

export function close() {
	// @wc-context: close
	return "Close";
}

export function language_polish() {
	// @wc-context: language_polish
	return "Polish";
}

export function pogo_hp({ hp }: { hp: string | number }) {
	// @wc-context: pogo_hp
	return `${hp} HP`;
}

export function cpm() {
	// @wc-context: cpm
	return "CP Multiplier";
}

export function defender_fed({ count }: { count: string | number }) {
	// @wc-context: defender_fed
	return `${count}x fed`;
}

export function defender_won({ count }: { count: string | number }) {
	// @wc-context: defender_won
	return `${count}x won`;
}

export function defender_lost({ count }: { count: string | number }) {
	// @wc-context: defender_lost
	return `${count}x lost`;
}

export function defender_placed() {
	// @wc-context: defender_placed
	return "Placed";
}

export function nav_wayfarer() {
	// @wc-context: nav_wayfarer
	return "Wayfarer Map";
}

export function tool_wayfarer_title() {
	// @wc-context: tool_wayfarer_title
	return "Wayfarer Map";
}

export function tool_wayfarer_description() {
	// @wc-context: tool_wayfarer_description
	return "Plan your Wayfarer submissions";
}

export function wayfarer_sponsored() {
	// @wc-context: wayfarer_sponsored
	return "Sponsored";
}

export function wayfarer_pokestops_required_for_gym({ count }: { count: string | number }) {
	// @wc-context: wayfarer_pokestops_required_for_gym
	return `New Pokéstops required for next Gym: <b>${count}</b>`;
}

export function wayfarer_gym_limit_reached() {
	// @wc-context: wayfarer_gym_limit_reached
	return "Cell has reached its Gym limit";
}

export function unknown_poi() {
	// @wc-context: unknown_poi
	return "Unknown POI";
}

export function is_a_pokestop() {
	// @wc-context: is_a_pokestop
	return "Is a Pokéstop";
}

export function is_a_gym() {
	// @wc-context: is_a_gym
	return "Is a Gym";
}

export function not_in_game() {
	// @wc-context: not_in_game
	return "Not available in-game";
}

export function wayfarer_cell_title() {
	// @wc-context: wayfarer_cell_title
	return "Level 14 Cell";
}

export function wayfarer_pokestops_count({ count }: { count: string | number }) {
	// @wc-context: wayfarer_pokestops_count
	return `Pokéstops: <b>${count}</b>`;
}

export function wayfarer_gyms_count({ count }: { count: string | number }) {
	// @wc-context: wayfarer_gyms_count
	return `Gyms: <b>${count}</b>`;
}

export function search_hint_coverage() {
	// @wc-context: search_hint_coverage
	return "Try searching an address or area";
}

export function search_hint_wayfarer() {
	// @wc-context: search_hint_wayfarer
	return "Try searching for Pokéstops, addresses or areas";
}

export function search_no_results_generic() {
	// @wc-context: search_no_results_generic
	return "Nothing came up";
}

export function coordinates() {
	// @wc-context: coordinates
	return "Coordinates";
}

export function lasts_until() {
	// @wc-context: lasts_until
	return "Lasts until";
}

export function connecting() {
	// @wc-context: connecting
	return "Connecting";
}

export function connect() {
	// @wc-context: connect
	return "Connect";
}

export function error_retry() {
	// @wc-context: error_retry
	return "Retry";
}

export function status_offline_title() {
	// @wc-context: status_offline_title
	return "You're offline";
}

export function status_offline_desc() {
	// @wc-context: status_offline_desc
	return "Check your internet connection and try again";
}

export function status_unreachable_title({ name }: { name: string | number }) {
	// @wc-context: status_unreachable_title
	return `Can't reach ${name}`;
}

export function status_unreachable_desc() {
	// @wc-context: status_unreachable_desc
	return "Check that it's online and try again";
}

export function status_generic_title() {
	// @wc-context: status_generic_title
	return "Something went wrong";
}

export function disconnect_from_name({ name }: { name: string | number }) {
	// @wc-context: disconnect_from_name
	return `Disconnect from ${name}`;
}

export function app_connected_to_name({ name }: { name: string | number }) {
	// @wc-context: app_connected_to_name
	return `Your Diadem App is connected to ${name}`;
}

export function diadem_map() {
	// @wc-context: diadem_map
	return "Diadem Map";
}

export function instance_gate_prompt() {
	// @wc-context: instance_gate_prompt
	return "Enter an URL below to connect to a Diadem Map";
}

export function connection_checking() {
	// @wc-context: connection_checking
	return "Checking...";
}

export function connecting_to_name({ name }: { name: string | number }) {
	// @wc-context: connecting_to_name
	return `Connecting to ${name}`;
}

export function connection_failed() {
	// @wc-context: connection_failed
	return "Connection failed";
}

export function diadem_connection() {
	// @wc-context: diadem_connection
	return "Diadem Connection";
}

export function wild_pokemon() {
	// @wc-context: wild_pokemon
	return "Wild Pokémon";
}

export function disappear_time() {
	// @wc-context: disappear_time
	return "Disappear Time";
}

export function unknown_spawnpoint_notice() {
	// @wc-context: unknown_spawnpoint_notice
	return "This spawnpoint's disappear time is not yet known. It will be learned over time";
}

export function unknown_spawnpoint_notice_nearby() {
	// @wc-context: unknown_spawnpoint_notice_nearby
	return "This Pokémon's disappear time is unknown";
}

export function notice_xxl({ name }: { name: string | number }) {
	// @wc-context: notice_xxl
	return `It's huge! This ${name} is XXL`;
}

export function notice_xxs({ name }: { name: string | number }) {
	// @wc-context: notice_xxs
	return `It's tiny! This ${name} is XXS`;
}

export function notice_lure({ name }: { name: string | number }) {
	// @wc-context: notice_lure
	return `This ${name} comes from a Lure Module`;
}

export function notice_tappable({ name }: { name: string | number }) {
	// @wc-context: notice_tappable
	return `This ${name} appears after tapping an apple`;
}

export function notice_disguise({
	name1,
	name2
}: {
	name1: string | number;
	name2: string | number;
}) {
	// @wc-context: notice_disguise
	return `This ${name1} is disguised as a ${name2}`;
}

export function notice_nearby({ name }: { name: string | number }) {
	// @wc-context: notice_nearby
	return `This ${name} was seen nearby. Its location is estimated and details are unknown`;
}

export function notice_wild({ name }: { name: string | number }) {
	// @wc-context: notice_wild
	return `This ${name} has not yet been scanned completely. Its details are unknown`;
}

export function notice_mighty() {
	// @wc-context: notice_mighty
	return "This is a Mighty Pokémon! Its stats are much better than usual, but it's extra difficult to catch";
}

export function notice_hundo({ name }: { name: string | number }) {
	// @wc-context: notice_hundo
	return `Hundo! This ${name} has 100% IV`;
}

export function notice_nundo({ name }: { name: string | number }) {
	// @wc-context: notice_nundo
	return `Nundo! This ${name} has 0% IV`;
}

export function notice_extremely_rare({
	name,
	chance
}: {
	name: string | number;
	chance: string | number;
}) {
	// @wc-context: notice_extremely_rare
	return `What a sight! ${name} are extremely rare at 1 in ${chance}`;
}

export function notice_pvp_rank({
	name,
	league
}: {
	name: string | number;
	league: string | number;
}) {
	// @wc-context: notice_pvp_rank
	return `Cool! This ${name} performs great in ${league}`;
}

export function listed_and({ part1, part2 }: { part1: string | number; part2: string | number }) {
	// @wc-context: listed_and
	return `${part1} and ${part2}`;
}

export function values() {
	// @wc-context: values
	return "Values";
}

export function attack() {
	// @wc-context: attack
	return "Attack";
}

export function defense() {
	// @wc-context: defense
	return "Defense";
}

export function stamina() {
	// @wc-context: stamina
	return "HP";
}

export function stats_unavailable({ name }: { name: string | number }) {
	// @wc-context: stats_unavailable
	return `Stats unavailable for this ${name}`;
}

export function no_shinies_seen() {
	// @wc-context: no_shinies_seen
	return "None seen";
}

export function unavailable() {
	// @wc-context: unavailable
	return "Unavailable";
}

export function about_this_pokemon({ name }: { name: string | number }) {
	// @wc-context: about_this_pokemon
	return `About this ${name}`;
}

export function access_this_pokemon({ name }: { name: string | number }) {
	// @wc-context: access_this_pokemon
	return `Access this ${name}`;
}

export function matching_filtersets() {
	// @wc-context: matching_filtersets
	return "Matching Filters";
}

export function unknown() {
	// @wc-context: unknown
	return "Unknown";
}

export function normal() {
	// @wc-context: normal
	return "Normal";
}

export function filters_dont_match_pokemon() {
	// @wc-context: filters_dont_match_pokemon
	return "None of your filters match this Pokémon";
}

export function lure_module() {
	// @wc-context: lure_module
	return "Lure Module";
}

export function character_grunts({ character }: { character: string | number }) {
	// @wc-context: character_grunts
	return `${character} Grunts`;
}

export function male_grunt() {
	// @wc-context: male_grunt
	return "Male Grunt";
}

export function female_grunt() {
	// @wc-context: female_grunt
	return "Female Grunt";
}

export function male_grunts() {
	// @wc-context: male_grunts
	return "Male Grunts";
}

export function female_grunts() {
	// @wc-context: female_grunts
	return "Female Grunts";
}

export function male_type({ type }: { type: string | number }) {
	// @wc-context: male_type
	return `Male ${type}`;
}

export function female_type({ type }: { type: string | number }) {
	// @wc-context: female_type
	return `Female ${type}`;
}

export function giovanni_or_decoy() {
	// @wc-context: giovanni_or_decoy
	return "Giovanni or Decoy";
}

export function decoy() {
	// @wc-context: decoy
	return "Decoy";
}

export function hidden_here() {
	// @wc-context: hidden_here
	return "Hidden here";
}

export function pokestop_outdated_notice({ time }: { time: string | number }) {
	// @wc-context: pokestop_outdated_notice
	return `This Pokéstop is outdated! It was last seen ${time}`;
}

export function no_quest_scanned_today() {
	// @wc-context: no_quest_scanned_today
	return "No Quest was scanned here today";
}

export function find_more_x_quests({ x }: { x: string | number }) {
	// @wc-context: find_more_x_quests
	return `Find more ${x} Quests`;
}

export function no_invasions_at_pokestop() {
	// @wc-context: no_invasions_at_pokestop
	return "No Team Rocket Grunts are currently at this Pokéstop";
}

export function confirmed_reward() {
	// @wc-context: confirmed_reward
	return "Confirmed Reward";
}

export function or_x_chance_to_get({ chance }: { chance: string | number }) {
	// @wc-context: or_x_chance_to_get
	return `or ${chance}% chance to get`;
}

export function possible_lineup() {
	// @wc-context: possible_lineup
	return "Possible Lineup";
}

export function find_more_x({ x }: { x: string | number }) {
	// @wc-context: find_more_x
	return `Find more ${x}`;
}

export function no_lure_seen_here() {
	// @wc-context: no_lure_seen_here
	return "No Lure Module was ever seen here";
}

export function last_lure_ended({ time }: { time: string | number }) {
	// @wc-context: last_lure_ended
	return `Last Lure Module ended ${time}`;
}

export function no_kecleon_hiding_here() {
	// @wc-context: no_kecleon_hiding_here
	return "There's no Kecleon hiding here";
}

export function kecleon_hiding_here() {
	// @wc-context: kecleon_hiding_here
	return "A Kecleon is hiding here";
}

export function pokestop_never_hosted_showcase() {
	// @wc-context: pokestop_never_hosted_showcase
	return "This Pokéstop never hosted a showcase";
}

export function last_showcase_ended({ time }: { time: string | number }) {
	// @wc-context: last_showcase_ended
	return `Last showcase ended ${time}`;
}

export function entries() {
	// @wc-context: entries
	return "Entries";
}

export function score_x({ score }: { score: string | number }) {
	// @wc-context: score_x
	return `Score: ${score}`;
}

export function access_this_pokestop() {
	// @wc-context: access_this_pokestop
	return "Access this Pokéstop";
}

export function filters_dont_match_pokestop() {
	// @wc-context: filters_dont_match_pokestop
	return "None of your filters match this Pokéstop";
}

export function about_this_pokestop() {
	// @wc-context: about_this_pokestop
	return "About this Pokéstop";
}

export function no_description() {
	// @wc-context: no_description
	return "No description";
}

export function cover_photo_of({ name }: { name: string | number }) {
	// @wc-context: cover_photo_of
	return `Cover Photo of ${name}`;
}

export function go_to_wayfarer_map() {
	// @wc-context: go_to_wayfarer_map
	return "Go to Wayfarer Map";
}

export function about_this_nest() {
	// @wc-context: about_this_nest
	return "About this Nest";
}

export function access_this_nest() {
	// @wc-context: access_this_nest
	return "View the Nest";
}

export function access_this_tappable() {
	// @wc-context: access_this_tappable
	return "Access this Ground item";
}

export function about_this_spawnpoint() {
	// @wc-context: about_this_spawnpoint
	return "About this Spawnpoint";
}

export function access_this_spawnpoint() {
	// @wc-context: access_this_spawnpoint
	return "Access this Spawnpoint";
}

export function spawnpoint_outdated_notice({ time }: { time: string | number }) {
	// @wc-context: spawnpoint_outdated_notice
	return `This Spawnpoint is outdated! It was last seen ${time}`;
}

export function access_this_power_spot() {
	// @wc-context: access_this_power_spot
	return "Access this Power Spot";
}

export function last_max_battle_notice({ time }: { time: string | number }) {
	// @wc-context: last_max_battle_notice
	return `Last Max Battle ended ${time}`;
}

export function stationed_pokemon() {
	// @wc-context: stationed_pokemon
	return "Stationed Pokémon";
}

export function stationed() {
	// @wc-context: stationed
	return "Stationed";
}

export function total_stationed() {
	// @wc-context: total_stationed
	return "Total Stationed";
}

export function s2_cell_id() {
	// @wc-context: s2_cell_id
	return "S2 Cell ID";
}

export function power_spot_never_had_max_battle() {
	// @wc-context: power_spot_never_had_max_battle
	return "This Power Spot is not hosting a Max Battle";
}

export function name() {
	// @wc-context: name
	return "Name";
}

export function tier() {
	// @wc-context: tier
	return "Tier";
}

export function started() {
	// @wc-context: started
	return "Started";
}

export function attack_bonus() {
	// @wc-context: attack_bonus
	return "Attack Bonus";
}

export function station_overview_count({
	total,
	gmax
}: {
	total: string | number;
	gmax: string | number;
}) {
	// @wc-context: station_overview_count
	return `${total} Total · ${gmax} Gmax`;
}

export function raid() {
	// @wc-context: raid
	return "Raid";
}

export function gym_team({ team }: { team: string | number }) {
	// @wc-context: gym_team
	return `Team ${team}`;
}

export function gym_slots({
	occupied,
	total
}: {
	occupied: string | number;
	total: string | number;
}) {
	// @wc-context: gym_slots
	return `Slots: ${occupied}/${total}`;
}

export function slots_occupied() {
	// @wc-context: slots_occupied
	return "Slots occupied";
}

export function no_raid_at_gym() {
	// @wc-context: no_raid_at_gym
	return "This Gym is not hosting a Raid";
}

export function last_raid_ended({ time }: { time: string | number }) {
	// @wc-context: last_raid_ended
	return `Last Raid ended ${time}`;
}

export function no_defenders_at_gym() {
	// @wc-context: no_defenders_at_gym
	return "There are no defenders in this Gym";
}

export function gym_outdated_notice({ time }: { time: string | number }) {
	// @wc-context: gym_outdated_notice
	return `This Gym is outdated! It was last seen ${time}`;
}

export function access_this_gym() {
	// @wc-context: access_this_gym
	return "Access this Gym";
}

export function about_this_gym() {
	// @wc-context: about_this_gym
	return "About this Gym";
}

export function read_more() {
	// @wc-context: read_more
	return "Read more";
}

export function unknown_details() {
	// @wc-context: unknown_details
	return "Unknown details";
}

export function defending() {
	// @wc-context: defending
	return "Defending";
}

export function yesterday_time_lower({ time }: { time: string | number }) {
	// @wc-context: yesterday_time_lower
	return `yesterday, ${time}`;
}

export function today_time_lower({ time }: { time: string | number }) {
	// @wc-context: today_time_lower
	return `today, ${time}`;
}

export function tomorrow_time_lower({ time }: { time: string | number }) {
	// @wc-context: tomorrow_time_lower
	return `tomorrow, ${time}`;
}

export function battle_time() {
	// @wc-context: battle_time
	return "Battle Time";
}

export function possible_hatch() {
	// @wc-context: possible_hatch
	return "Possible Hatch";
}

export function possible_hatches() {
	// @wc-context: possible_hatches
	return "Possible Hatches";
}

export function rsvp() {
	// @wc-context: rsvp
	return "RSVP";
}

export function pvp_performance() {
	// @wc-context: pvp_performance
	return "PVP Performance";
}

export function pvp_target() {
	// @wc-context: pvp_target
	return "Target";
}

export function league() {
	// @wc-context: league
	return "League";
}

export function performance() {
	// @wc-context: performance
	return "Performance";
}

export function won() {
	// @wc-context: won
	return "Won";
}

export function lost() {
	// @wc-context: lost
	return "Lost";
}

export function fed() {
	// @wc-context: fed
	return "Fed";
}

export function catchable() {
	// @wc-context: catchable
	return "Catchable";
}

export function find_wild_name({ name }: { name: string | number }) {
	// @wc-context: find_wild_name
	return `Find wild ${name}`;
}

export function filters_dont_match_gym() {
	// @wc-context: filters_dont_match_gym
	return "None of your filters match this Gym";
}

export function super_mega_raid() {
	// @wc-context: super_mega_raid
	return "Super Mega Raid";
}

export function super_mega_raids() {
	// @wc-context: super_mega_raids
	return "Super Mega Raids";
}

export function legendary_super_mega_raid() {
	// @wc-context: legendary_super_mega_raid
	return "Legendary Super Mega Raid";
}

export function legendary_super_mega_raids() {
	// @wc-context: legendary_super_mega_raids
	return "Legendary Super Mega Raids";
}

export function unity_raid() {
	// @wc-context: unity_raid
	return "Unity Raid";
}

export function unity_raids() {
	// @wc-context: unity_raids
	return "Unity Raids";
}

export function filter_template_levels_super_mega({ kind }: { kind: string | number }) {
	// @wc-context: filter_template_levels_super_mega
	return `Super Mega ${kind}`;
}

export function about_this_sation() {
	// @wc-context: about_this_sation
	return "About this Power Spot";
}

export function quest_pokecoins({ count }: { count: string | number }) {
	// @wc-context: quest_pokecoins
	return `${count} Pokécoins`;
}

export function count_pokecoins({ count }: { count: string | number }) {
	// @wc-context: count_pokecoins
	return `${count} Pokécoins`;
}

export function background() {
	// @wc-context: background
	return "Background";
}

export function with_background() {
	// @wc-context: with_background
	return "With Background";
}

export function map_limit_title() {
	// @wc-context: map_limit_title
	return "Limit reached";
}

export function map_limit_zoom_hint({ objects }: { objects: string | number }) {
	// @wc-context: map_limit_zoom_hint
	return `Zoom in to see more ${objects}`;
}

export function pogo_data() {
	// @wc-context: pogo_data
	return "data";
}

export function routes_starting_here() {
	// @wc-context: routes_starting_here
	return "Routes starting here";
}

export function no_routes_starting_here() {
	// @wc-context: no_routes_starting_here
	return "No routes start here";
}

export function show_route() {
	// @wc-context: show_route
	return "Show Route";
}

export function hide_route() {
	// @wc-context: hide_route
	return "Hide Route";
}

export function show_all_routes() {
	// @wc-context: show_all_routes
	return "Show all routes";
}

export function route_details() {
	// @wc-context: route_details
	return "Route details";
}

export function route_distance() {
	// @wc-context: route_distance
	return "Distance";
}

export function route_duration() {
	// @wc-context: route_duration
	return "Duration";
}

export function route_direction() {
	// @wc-context: route_direction
	return "Direction";
}

export function route_reversible() {
	// @wc-context: route_reversible
	return "Reversible";
}

export function route_one_way() {
	// @wc-context: route_one_way
	return "One way";
}

export function unknown_route() {
	// @wc-context: unknown_route
	return "Unknown Route";
}

export function focus_route() {
	// @wc-context: focus_route
	return "Focus Route";
}

export function unfocus_route() {
	// @wc-context: unfocus_route
	return "Unfocus Route";
}

export function route_map() {
	// @wc-context: route_map
	return "Route map";
}

export function about_this_route() {
	// @wc-context: about_this_route
	return "About this Route";
}

export function route_shortcode() {
	// @wc-context: route_shortcode
	return "Share Code";
}

export function route_description() {
	// @wc-context: route_description
	return "Description";
}

export function route_tags() {
	// @wc-context: route_tags
	return "Tags";
}

export function route_endpoints() {
	// @wc-context: route_endpoints
	return "Route start and end";
}

export function route_uphill() {
	// @wc-context: route_uphill
	return "Uphill";
}

export function route_downhill() {
	// @wc-context: route_downhill
	return "Downhill";
}

export function follow_this_route() {
	// @wc-context: follow_this_route
	return "Follow this Route";
}

export function route_reversible_notice() {
	// @wc-context: route_reversible_notice
	return "This route can be started from either end";
}

export function route_reverse_direction() {
	// @wc-context: route_reverse_direction
	return "Reverse direction";
}

export function routes_from_here() {
	// @wc-context: routes_from_here
	return "Routes from here";
}

export function route_leads_to() {
	// @wc-context: route_leads_to
	return "Leads to";
}

export function format_distance_meters({ distance }: { distance: string | number }) {
	// @wc-context: format_distance_meters
	return `${distance} m`;
}

export function format_distance_kilometers({ distance }: { distance: string | number }) {
	// @wc-context: format_distance_kilometers
	return `${distance} km`;
}

export function format_duration_minutes({ minutes }: { minutes: string | number }) {
	// @wc-context: format_duration_minutes
	return `${minutes} min`;
}

export function format_duration_hours_minutes({
	hours,
	minutes
}: {
	hours: string | number;
	minutes: string | number;
}) {
	// @wc-context: format_duration_hours_minutes
	return `${hours} hr ${minutes} min`;
}

export function format_elevation_meters({ elevation }: { elevation: string | number }) {
	// @wc-context: format_elevation_meters
	return `${elevation} m`;
}

export function location() {
	// @wc-context: location
	return "Location";
}

export function scout_location() {
	// @wc-context: scout_location
	return "Scout location";
}

export function address_unavailable() {
	// @wc-context: address_unavailable
	return "Address unavailable";
}

export function my_location() {
	// @wc-context: my_location
	return "My Location";
}

export function in_range() {
	// @wc-context: in_range
	return "In Range";
}

export { deleteMessage as delete };
