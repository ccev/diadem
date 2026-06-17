<script lang="ts">
	let { class: class_ = "", children, ...rest } = $props();
</script>

<div class="rounded-t-lg border bg-card text-card-foreground shadow-xs {class_}" {...rest}>
	{@render children?.()}
</div>
