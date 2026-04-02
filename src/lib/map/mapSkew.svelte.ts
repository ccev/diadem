let skew: {
	pitch: number;
	bearing: number;
} = $state({ pitch: 0, bearing: 0 });

export function isMapSkewed() {
	return skew.pitch !== 0 || skew.bearing !== 0;
}

export function setSkew(pitch: number, bearing: number) {
	skew = { pitch, bearing };
}

export function getSkew() {
	return skew;
}
