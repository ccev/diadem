import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";
import { error, json } from "@sveltejs/kit";

const log = getLogger("wayfarercandidates");

const OVERPASS_QUERY = `[out:json][timeout:180];
// WAYFARER — BROAD: cast wide, let humans judge
(
  // all historic objects
  nwr["historic"]({{bbox}});

  // all tourism EXCEPT lodging
  nwr["tourism"]["tourism"!~"^(hotel|motel|hostel|guest_house|apartment|chalet|caravan_site|camp_pitch|camp_site|wilderness_hut|alpine_hut)$"]({{bbox}});

  // all leisure EXCEPT backyard / non-POI noise
  nwr["leisure"]["leisure"!~"^(swimming_pool|slipway|bird_hide|firepit|picnic_table|outdoor_seating|bleachers)$"]({{bbox}});

  // curated civic/cultural/landmark amenities (keeps out shops, food, fuel, parking, schools, hospitals, graveyards)
  nwr["amenity"~"^(place_of_worship|library|townhall|courthouse|fountain|clock|community_centre|social_centre|arts_centre|theatre|cinema|marketplace|public_bath|ferry_terminal|bandstand)$"]({{bbox}});

  // man-made landmarks
  nwr["man_made"~"^(lighthouse|windmill|watermill|obelisk|tower|water_tower|pier|bridge|cross|campanile|telescope)$"]({{bbox}});

  // every named bridge (road or foot)
  way["bridge"]["name"]({{bbox}});

  // transit hubs
  nwr["railway"="station"]({{bbox}});
  nwr["public_transport"="station"]({{bbox}});
  nwr["aeroway"="aerodrome"]({{bbox}});
);
out center;`;

export type CandidateRequest = {
	bounds: {
		minLat: number;
		maxLat: number;
		minLon: number;
		maxLon: number;
	};
};

export type Candidate = {
	id: number;
	osmType: "node" | "way" | "relation";
	lat: number;
	lon: number;
	tags: Record<string, string>;
};

export type CandidateResponse = {
	candidates: Candidate[];
};

type OverpassElement = {
	type: "node" | "way" | "relation";
	id: number;
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
	tags?: Record<string, string>;
};

export async function POST({ request, locals }) {
	const hasPokestops = hasFeatureAnywhereServer(locals.perms, MapObjectType.POKESTOP, locals.user);
	const hasGyms = hasFeatureAnywhereServer(locals.perms, MapObjectType.GYM, locals.user);
	if (!hasPokestops && !hasGyms) error(401);

	const overpassCfg = getServerConfig().overpass;
	if (!overpassCfg?.url) error(404, "Overpass API not configured");

	const body = (await request.json()) as CandidateRequest;
	const bbox = body.bounds;

	const query = OVERPASS_QUERY.replaceAll(
		"{{bbox}}",
		`${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`
	);

	try {
		const response = await fetch(overpassCfg.url, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"User-Agent": overpassCfg.userAgent ?? "diadem"
			},
			body: "data=" + encodeURIComponent(query)
		});

		if (!response.ok) {
			log.error("Overpass API returned %d", response.status);
			throw new Error("Overpass API error");
		}

		const data = await response.json();
		const elements: OverpassElement[] = data.elements ?? [];

		const candidates: Candidate[] = [];
		for (const el of elements) {
			const lat = el.lat ?? el.center?.lat;
			const lon = el.lon ?? el.center?.lon;
			if (lat == null || lon == null) continue;

			candidates.push({
				id: el.id,
				osmType: el.type,
				lat,
				lon,
				tags: el.tags ?? {}
			});
		}

		log.info("Fetched %d OSM candidates", candidates.length);
		return json({ candidates } satisfies CandidateResponse);
	} catch (e) {
		log.error("Error querying Overpass", e);
		error(502, "Failed to query Overpass API");
	}
}
