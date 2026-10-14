// PlayerID may add in-progress ticket statuses over time, so anything that isn't a known end
// state counts as still in progress
const FINISHED_LINK_STATUSES = ["complete", "invalid_code", "failed", "expired"];

export function isLinkPending(status: string) {
	return !FINISHED_LINK_STATUSES.includes(status);
}
