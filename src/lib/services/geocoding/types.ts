export interface GeocodingSearchOptions {
	query: string;
	language: string;
	lat?: string | null;
	lon?: string | null;
	zoom?: number | null;
	limit?: number;
}

export interface GeocodingReverseOptions {
	lat: number;
	lon: number;
	language?: string;
}

export interface GeocodingLookupOptions {
	osmId: string;
}

export interface ReverseGeocodingResponse {
	city?: string;
	country?: string;
	countrycode?: string;
	state?: string;
	postcode?: string;
	street?: string;
	housenumber?: string;
	district?: string;
}
