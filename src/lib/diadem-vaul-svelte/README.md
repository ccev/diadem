![](static/og.jpg)

<!-- automd:badges license name="diadem-vaul-svelte" color="green" github="roundaboutluke/diadem-vaul-svelte" -->

[![npm version](https://flat.badgen.net/npm/v/diadem-vaul-svelte?color=green)](https://npmjs.com/package/diadem-vaul-svelte)
[![npm downloads](https://flat.badgen.net/npm/dm/diadem-vaul-svelte?color=green)](https://npmjs.com/package/diadem-vaul-svelte)
[![license](https://flat.badgen.net/github/license/roundaboutluke/diadem-vaul-svelte?color=green)](https://github.com/roundaboutluke/diadem-vaul-svelte/blob/main/LICENSE)

<!-- /automd -->

Diadem-Vaul-Svelte is an unstyled drawer component for Svelte that can be used as a Dialog replacement on tablet and mobile devices. It uses [Bits' Dialog primitive](https://www.bits-ui.com/docs/components/dialog) under the hood and is inspired by [this tweet](https://twitter.com/devongovett/status/1674470185783402496).

This is a fork of [vaul-svelte](https://github.com/huntabyte/vaul-svelte) by [@huntabyte](https://github.com/huntabyte). The original library is a port of [Vaul](https://github.com/emilkowalski/vaul) for React, created by [Emil Kowalski](https://twitter.com/emilkowalski_).

This fork tracks upstream while carrying changes needed for [Diadem](https://github.com/ccev/diadem). If you want a general-purpose drawer, use the upstream `vaul-svelte` package.

## Usage

To start using the library, install it in your project:

```bash
npm install diadem-vaul-svelte
```

Use the drawer in your app.

```svelte
<script>
	import { Drawer } from "diadem-vaul-svelte";
</script>

<Drawer.Root>
	<Drawer.Trigger>Open</Drawer.Trigger>
	<Drawer.Portal>
		<Drawer.Content>
			<p>Content</p>
		</Drawer.Content>
		<Drawer.Overlay />
	</Drawer.Portal>
</Drawer.Root>
```

## Differences from upstream

- Uses Bits UI v2 and Svelte 5.
- `asChild`/builder slot patterns from the upstream demo are not supported here.
- This fork targets Diadem’s usage, so the demo site and extended docs are removed.

## License

<!-- automd:contributors license=MIT author="huntabyte" github="huntabyte/vaul-svelte" -->

Published under the [MIT](https://github.com/roundaboutluke/diadem-vaul-svelte/blob/main/LICENSE) license.
Made by [@huntabyte](https://github.com/huntabyte) and [community](https://github.com/huntabyte/vaul-svelte/graphs/contributors) 💛
<br><br>
<a href="https://github.com/huntabyte/vaul-svelte/graphs/contributors">
<img src="https://contrib.rocks/image?repo=huntabyte/vaul-svelte" />
</a>

<!-- /automd -->
