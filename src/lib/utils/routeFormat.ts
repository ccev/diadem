import * as m from "@/lib/paraglide/messages";
import { formatNumber } from "@/lib/utils/numberFormat";

export function formatRouteDistance(distance: number): string {
	if (distance < 1000) {
		return m.route_distance_meters({ distance: formatNumber(distance) });
	}

	return m.route_distance_kilometers({
		distance: formatNumber(distance / 1000, { maximumFractionDigits: 2 })
	});
}

export function formatRouteDuration(duration: number): string {
	const minutes = Math.max(1, Math.ceil(duration / 60));
	if (minutes < 60) return m.route_duration_minutes({ minutes });

	return m.route_duration_hours_minutes({
		hours: Math.floor(minutes / 60),
		minutes: minutes % 60
	});
}

export function formatRouteElevation(elevation: number): string {
	return m.route_elevation_meters({
		elevation: formatNumber(elevation, { maximumFractionDigits: 1 })
	});
}
