<script lang="ts">
	let { class: class_ = "size-3.5" }: { class?: string } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 64 64"
	class="{class_} aspect-square stroke-foreground stroke-5 fill-transparent"
	style:stroke-linecap="round"
	style:stroke-linejoin="round"
>
	<circle cx="32" cy="32" r="12" />
	<line x1="32" y1="4.5" x2="32" y2="10.5" />
	<line x1="32" y1="53.5" x2="32" y2="59.5" />
	<line x1="4.5" y1="32" x2="10.5" y2="32" />
	<line x1="53.5" y1="32" x2="59.5" y2="32" />
	<line x1="48.5" y1="48.5" x2="53" y2="53" />
	<line x1="48.5" y1="15.5" x2="53" y2="11" />
	<line x1="15.5" y1="15.5" x2="11" y2="11" />
	<line x1="11" y1="53" x2="15.5" y2="48.5" />
</svg>
