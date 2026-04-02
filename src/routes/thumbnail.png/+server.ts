import type { RequestHandler } from "./$types";
import { generateThumbnail } from "@/lib/server/thumbnails/generateThumbnail";
import { render } from "svelte/server";
import Base from "@/components/thumbnail/Base.svelte";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("thumbnail");

export const GET: RequestHandler = async () => {
	log.info("Generating base thumbnail");
	return await generateThumbnail(
		render(Base, { props: { title: getClientConfig().general.mapName ?? "Map" } })
	);
};
