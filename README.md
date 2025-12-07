# Smap

A WIP next-gen map frontend for pogo.

## Setup
1. `git clone https://github.com/ccev/smap && cd smap`
1. `./setup.sh`, then fill out config/config.toml
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
2. `./setup.sh && pnpm install && pnpm run build`
3. `pm2 restart`

### Asset caching
Smap proxies and optimizes UICON repos. Clients will cache all uicons for 7 days. 
But I suggest adding your own caching rules, i.e. with Cloudflare:
- In you CF dashboard, go to your domain -> Caching -> Cache rules -> Create rule
- Set a name, and set `URI Full` | `wildcard` | `https://map.co/assets/*`
- Optionally configure the caching rule and save