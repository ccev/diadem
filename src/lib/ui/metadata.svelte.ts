import { onDestroy } from "svelte";

export type MetadataState = {
	title?: string;
	embedTitle?: string;
	description?: string;
	thumbnail?: string;
	image?: string;
	color?: string;
};

type MetadataEntry = {
	metadata: MetadataState;
};

let metadataStack: MetadataEntry[] = [];
let currentMetadata: MetadataState = $state({});

function applyMetadata() {
	currentMetadata = metadataStack.at(-1)?.metadata ?? {};
}

export function getCurrentMetadata() {
	return currentMetadata;
}

export function useMetadata(getMetadata: () => MetadataState) {
	const entry: MetadataEntry = { metadata: getMetadata() };
	metadataStack.push(entry);
	applyMetadata();

	$effect(() => {
		entry.metadata = getMetadata();
		applyMetadata();
	});

	onDestroy(() => {
		metadataStack = metadataStack.filter((item) => item !== entry);
		applyMetadata();
	});
}
