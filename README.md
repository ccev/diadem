# Diadem

A WIP next-gen map frontend for pogo.

[Demo](https://map.malt.ee) | [Discord](https://discord.com/invite/VGgsQN2hYG)

![](https://raw.githubusercontent.com/ccev/diadem/refs/heads/main/.github/map.png)

## Features & Roadmap

Diadem is under active development, and as of writing this, not ready for production use.

For a list of planned features (and fixes), check out the [issues](https://github.com/ccev/diadem/issues). 
To get an idea of what's working right now, check out the [demo](https://map.malt.ee).

## Setup

Before this becomes ready for production, documentation is lacking, and for now it's generally not advised to 
set this up yourself. But I'm not stopping you:

1. `git clone https://github.com/ccev/diadem && cd `
1. `./setup.sh`, then fill out config/config.toml
2. `pnpm run db:push`
3. `pnpm install` && `pnpm run build`
4. Start with pm2: `PORT=3900 HOST=127.0.0.1 FORCE_COLOR=1 pm2 start build/index.js -n "diadem"`
5. Set up a reverse proxy, I use caddy with this config:
    ```
    map.co {
      root * /path/diadem/build
      reverse_proxy * 127.0.0.1:3900
    }
    ```

### Update
1. `git pull`
2. `./setup.sh && pnpm install && pnpm run build`
3. `pm2 restart diadem`

### Quick-Start in Docker
These are the basic steps to get going in Docker, but are not production ready (single-node DB, no redundancy, etc)
1. `git clone https://github.com/ccev/diadem && cd `
2. `cp ./config/config.example.toml ./config/config.toml`
3. Modify the config file to your liking by editing ./config/config.toml. You'll need to point the db at hostname `diadem-db`
4. `cp docker-compose.example.yml docker-compose.yml`
5. Modify the docker-compose file to your liking, such as pointing to an external database
6. `docker compose up --build`
7. Diadem is now running on http://localhost:3900

### Asset caching
Diadem proxies and optimizes UICON repos. Clients will cache all uicons for 7 days. 
But I suggest adding your own caching rules, i.e. with Cloudflare:
- In you CF dashboard, go to your domain -> Caching -> Cache rules -> Create rule
- Set a name, and set `URI Full` | `wildcard` | `https://map.co/assets/*`
- Optionally configure the caching rule and save

### Address Search

Diadem has a fully featured search function, that includes an address search.
If you want to enable it, it's **highly** recommended to 
[set up Pelias](https://github.com/pelias/docker). 
Nominatim is also supported, but using it is highly discouraged.

Setting up Pelias take a bit of effort, but should eventually replace Nominatim in the 
Unown# Stack. [They also offer a hosted solution](https://geocode.earth/) that can be used instead.

## Contributing

If you want to contribute anything, feel free to fork this repo and open a pull request.

To set up a local dev environment, follow the setup instructions and run `pnpm run dev`. 
A local dev server will spin up, changes can be viewed live in your browser.

## Credits

Diadem is built on top of a decade worth of pogo tooling. Especially noteworthy for this project are:

- [TurtleSocks](https://github.com/turtiesocks/) and [Mygod](https://github.com/mygod/) for their work 
on [ReactMap](github.com/watwowmap/reactmap), [Koji](https://github.com/turtiesocks/koji), [Masterfile-Generator](https://github.com/WatWowMap/Masterfile-Generator), 
[pogo-translations](https://github.com/WatWowMap/pogo-translations), [wwm-uicons](https://github.com/WatWowMap/wwm-uicons) and 
[uicons.json](https://github.com/turtiesocks/uicons.js)
- [UnownHash](https://github.com/UnownHash/) for their work on [Dragonite](https://github.com/UnownHash/Dragonite-Public) 
and [Golbat](https://github.com/UnownHash/Golbat)

## License

Published under the [AGPL](https://github.com/ccev/diadem/blob/main/LICENSE) license.