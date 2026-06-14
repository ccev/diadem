import Base from "@/components/thumbnail/Base.svelte";
import { generateThumbnail } from "@/lib/server/thumbnails/generateThumbnail";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";
import { render } from "svelte/server";
import type { RequestHandler } from "./$types";

const log = getLogger("thumbnail");

export const GET: RequestHandler = async () => {
	log.info("Generating base thumbnail");
	return await generateThumbnail(
		render(Base, { props: { title: getClientConfig().general.mapName ?? "Map" } })
	);
};
