<script lang="ts">
	let {
		class: class_ = "",
		children = null,
		...rest
	} = $props()
</script>

<div class="rounded-lg border bg-card text-card-foreground shadow-lg px-6 py-4 {class_}" {...rest}>
	{@render children?.()}
</div>