# Smap

A WIP next-gen map frontend for pogo.

## Setup
1. `cp config/config.example.toml config/config.toml && ln config/config.toml src/lib/server/config.toml && cp config/Home.example.svelte config/Home.svelte && ln config/Home.svelte src/components/custom/Home.svelte` 
+ fill out config.toml
2. `pnpm run db:push`
3. `pnpm install` && `pnpm run build`
4. Start with `PORT=3900 HOST=127.0.0.1 FORCE_COLOR=1 pm2 start build/index.js -n "smap"`
5. Set up a reverse proxy, I use caddy with this config:
    ```
    map.co {
      root * /path/smap/build
      reverse_proxy * 127.0.0.1:3900
    }
    ```

### Update
1. `git pull`
2. `pnpm install` && `pnpm run build`
3. `pm2 restart`

### Asset caching
Smap proxies and optimizes UICON repos. Clients will cache all uicons for 7 days. 
But I suggest adding your own caching rules, i.e. with Cloudflare:
- In you CF dashboard, go to your domain -> Caching -> Cache rules -> Create rule
- Set a name, and set `URI Full` | `wildcard` | `https://map.co/assets/*`
- Optionally configure the caching rule and save