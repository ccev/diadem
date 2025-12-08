export function getLoginLink() {
	return "/login/discord" + "?redir=" + encodeURIComponent(window.location.pathname)
}