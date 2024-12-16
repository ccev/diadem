<script lang="ts">
	let { class: class_ = "", ...rest } = $props()
</script>

<div class="rounded-t-lg border bg-card text-card-foreground shadow-sm {class_}" {...rest}>
	<slot/>
</div>