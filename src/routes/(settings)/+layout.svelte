<script lang="ts">
	let { children } = $props();
</script>

<div class="fixed z-10 bottom-2 w-full">
	{@render children()}
</div>

