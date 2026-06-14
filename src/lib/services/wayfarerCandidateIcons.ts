import { Building2, Landmark, MapPin, Palette, Trees, Waypoints } from "lucide-svelte";
import type { LucideIcon } from "@/lib/types/lucide";

export type CandidateCategory = "landmark" | "tree" | "building" | "art" | "waypoint" | "default";

type CandidateIconDef = {
	Icon: LucideIcon;
	mapImageId: string;
};

export const CANDIDATE_ICONS: Record<CandidateCategory, CandidateIconDef> = {
	landmark: { Icon: Landmark, mapImageId: "candidate-icon-landmark" },
	tree: { Icon: Trees, mapImageId: "candidate-icon-tree" },
	building: { Icon: Building2, mapImageId: "candidate-icon-building" },
	art: { Icon: Palette, mapImageId: "candidate-icon-art" },
	waypoint: { Icon: Waypoints, mapImageId: "candidate-icon-waypoint" },
	default: { Icon: MapPin, mapImageId: "candidate-icon-default" }
};

export const CANDIDATE_CATEGORIES: CandidateCategory[] = [
	"landmark",
	"tree",
	"building",
	"art",
	"waypoint",
	"default"
];

export function getCandidateCategory(tags: Record<string, string>): CandidateCategory {
	if (tags.historic) return "landmark";
	if (tags.leisure) return "tree";
	if (tags.amenity) return "building";
	if (tags.tourism === "artwork" || tags.tourism === "museum" || tags.tourism === "gallery")
		return "art";
	if (tags.tourism) return "waypoint";
	if (tags.railway || tags.public_transport || tags.aeroway) return "waypoint";
	if (tags.man_made) return "landmark";
	if (tags.building) return "building";
	return "default";
}

export function getCandidateIcon(tags: Record<string, string>): LucideIcon {
	return CANDIDATE_ICONS[getCandidateCategory(tags)].Icon;
}

export function getCandidateMapImageId(tags: Record<string, string>): string {
	return CANDIDATE_ICONS[getCandidateCategory(tags)].mapImageId;
}
