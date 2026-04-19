---
title: Self-host address search using Photon
---

Geocoding describes the process of converting a written address to coordinates, while reverse geocoding converts a given set
of coordinates to a human-understandable address. I tested three different geocoding services: Nominatim, Pelias, and
Photon. I found Photon to be the best, by far.

For smaller maps, it should be fine to use the publicly available Photon API at `https://photon.komoot.io/`.
For larger setups, it's highly recommended to self-host it. Photon is also supported by Poracle.

Hosting Photon for the entire Earth takes up about 90 GB of disk space; CPU and memory usage are negligible.

The setup involves installing Java, downloading the Photon database, and starting the JAR.
Ignoring the download time, this only takes a couple of minutes.
You can find [more detailed installation instructions here.](https://github.com/komoot/photon#installation)

Once set up, just point Diadem to your endpoint:

```toml
[server.photon]
url = "http://127.0.0.1:2322/"
```

You may also want to point Poracle to Photon:

```toml
[geocoding]
provider = "photon"
provider_url = "http://127.0.0.1:2322/"
```
