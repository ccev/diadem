import { m } from "@/lib/paraglide/messages";

type LabelFn = () => string;

const TAG_LABELS: Record<string, LabelFn> = {
	"tourism=artwork": m.wayfarer_tag_public_art,
	"tourism=museum": m.wayfarer_tag_museum,
	"tourism=gallery": m.wayfarer_tag_art_gallery,
	"tourism=viewpoint": m.wayfarer_tag_scenic_viewpoint,
	"tourism=attraction": m.wayfarer_tag_local_attraction,
	"tourism=picnic_site": m.wayfarer_tag_picnic_area,
	"tourism=theme_park": m.wayfarer_tag_theme_park,
	"tourism=zoo": m.wayfarer_tag_zoo,
	"tourism=aquarium": m.wayfarer_tag_aquarium,

	"information=board": m.wayfarer_tag_info_board,
	"information=map": m.wayfarer_tag_area_map,
	"information=office": m.wayfarer_tag_tourist_info_office,
	"information=visitor_centre": m.wayfarer_tag_visitor_centre,
	"information=trailhead": m.wayfarer_tag_trailhead,
	"information=guidepost": m.wayfarer_tag_trail_guidepost,

	"historic=memorial": m.wayfarer_tag_memorial,
	"historic=monument": m.wayfarer_tag_monument,
	"historic=wayside_cross": m.wayfarer_tag_wayside_cross,
	"historic=wayside_shrine": m.wayfarer_tag_wayside_shrine,
	"historic=castle": m.wayfarer_tag_castle,
	"historic=fort": m.wayfarer_tag_fort,
	"historic=city_gate": m.wayfarer_tag_city_gate,
	"historic=citywalls": m.wayfarer_tag_city_walls,
	"historic=ruins": m.wayfarer_tag_ruins,
	"historic=tower": m.wayfarer_tag_historic_tower,
	"historic=manor": m.wayfarer_tag_manor_house,
	"historic=monastery": m.wayfarer_tag_monastery,
	"historic=archaeological_site": m.wayfarer_tag_archaeological_site,
	"historic=building": m.wayfarer_tag_listed_historic_building,

	"amenity=place_of_worship": m.wayfarer_tag_place_of_worship,
	"amenity=library": m.wayfarer_tag_library,
	"amenity=townhall": m.wayfarer_tag_town_hall,
	"amenity=courthouse": m.wayfarer_tag_courthouse,
	"amenity=fountain": m.wayfarer_tag_fountain,
	"amenity=clock": m.wayfarer_tag_public_clock,
	"amenity=community_centre": m.wayfarer_tag_community_centre,
	"amenity=social_centre": m.wayfarer_tag_social_club,
	"amenity=arts_centre": m.wayfarer_tag_arts_centre,
	"amenity=theatre": m.wayfarer_tag_theatre,
	"amenity=cinema": m.wayfarer_tag_cinema,
	"amenity=marketplace": m.wayfarer_tag_marketplace,
	"amenity=public_bath": m.wayfarer_tag_public_baths,
	"amenity=ferry_terminal": m.wayfarer_tag_ferry_terminal,
	"amenity=bandstand": m.wayfarer_tag_bandstand,
	"amenity=shelter": m.wayfarer_tag_shelter,

	"man_made=lighthouse": m.wayfarer_tag_lighthouse,
	"man_made=windmill": m.wayfarer_tag_windmill,
	"man_made=watermill": m.wayfarer_tag_watermill,
	"man_made=obelisk": m.wayfarer_tag_obelisk,
	"man_made=pier": m.wayfarer_tag_pier,
	"man_made=tower": m.wayfarer_tag_tower,
	"man_made=water_tower": m.wayfarer_tag_water_tower,
	"man_made=bridge": m.wayfarer_tag_bridge_structure,
	"man_made=cross": m.wayfarer_tag_standalone_cross,
	"man_made=campanile": m.wayfarer_tag_campanile,
	"man_made=telescope": m.wayfarer_tag_observatory_telescope,

	"leisure=park": m.wayfarer_tag_park,
	"leisure=playground": m.wayfarer_tag_playground,
	"leisure=garden": m.wayfarer_tag_garden,
	"leisure=fitness_station": m.wayfarer_tag_outdoor_gym,
	"leisure=pitch": m.wayfarer_tag_sports_pitch,
	"leisure=sports_centre": m.wayfarer_tag_sports_centre,
	"leisure=track": m.wayfarer_tag_running_track,
	"leisure=stadium": m.wayfarer_tag_stadium,
	"leisure=ice_rink": m.wayfarer_tag_ice_rink,
	"leisure=disc_golf_course": m.wayfarer_tag_disc_golf_course,
	"leisure=skatepark": m.wayfarer_tag_skate_park,
	"leisure=marina": m.wayfarer_tag_marina,
	"leisure=nature_reserve": m.wayfarer_tag_nature_reserve,

	"railway=station": m.wayfarer_tag_train_station,
	"public_transport=station": m.wayfarer_tag_transit_station,
	"aeroway=aerodrome": m.wayfarer_tag_airport,

	"building=bandstand": m.wayfarer_tag_bandstand
};

const TAG_PRIORITY_KEYS = [
	"tourism",
	"historic",
	"amenity",
	"man_made",
	"leisure",
	"railway",
	"public_transport",
	"aeroway",
	"building",
	"information"
];

function isFootbridge(tags: Record<string, string>): boolean {
	if (tags.bridge && tags.highway) {
		const bridgeFootways = ["footway", "path", "cycleway", "pedestrian", "steps", "bridleway"];
		return bridgeFootways.includes(tags.highway);
	}
	if (tags.bridge && tags.man_made === "bridge") {
		return true;
	}
	return false;
}

export function getWayfarerCandidateLabel(tags: Record<string, string>): string {
	for (const key of TAG_PRIORITY_KEYS) {
		const value = tags[key];
		if (!value) continue;
		const lookup = TAG_LABELS[`${key}=${value}`];
		if (lookup) return lookup();
	}

	if (tags.tourism === "information" && tags.information) {
		const lookup = TAG_LABELS[`information=${tags.information}`];
		if (lookup) return lookup();
	}

	if (isFootbridge(tags)) return m.wayfarer_tag_footbridge();

	if (tags.historic) return m.wayfarer_tag_historic_feature();
	if (tags.tourism) return m.wayfarer_tag_tourism_feature();
	if (tags.leisure) return m.wayfarer_tag_recreation_feature();
	if (tags.man_made) return m.wayfarer_tag_man_made_landmark();
	if (tags.amenity) return m.wayfarer_tag_public_amenity();
	if (tags.railway) return m.wayfarer_tag_train_station();

	return m.wayfarer_candidate_title();
}
