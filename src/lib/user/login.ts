export function getLoginLink() {
	let extra = ""
	if (window.location.pathname !== "/") {
		extra = "?redir=" + encodeURIComponent(window.location.pathname)
	}
	return "/login/discord" + extra
}