# Maltemap

A WIP next-gen map frontend for pogo.

## Setup
1. `cp src/lib/server/config.example.toml config.toml && ln config.toml src/lib/server/config.toml` + fill out config.toml
2. `pnpm install` && `pnpm run build`
3. Start with `PORT=3900 HOST=127.0.0.1 pm2 start build/index.js -n "maltemap"`

I use caddy with this config
```
map.malt.ee {
  root * /path/maltemap/build
  reverse_proxy * 127.0.0.1:3900
}
```