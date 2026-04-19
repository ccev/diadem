---
title: Self-host address search using Photon
---

Geocoding describes the act of converting a written address to coordinates, reverse geocoding converts a given set 
of coordinates to a human-understandable address. I tested out 3 different geocoding services: Nominatim, Pelias and 
Photon. I found Photon to be the best, by far.

For smaller maps, it should be fine to use the publicly available Photon API at `https://photon.komoot.io/`. 
For bigger setups, it's highly recommend to self-host it. Photon is also supported by Poracle.

Hosting Photon for entire earth takes up about 90 GB of disk space, CPU and memory usage is negligible.

The setup involves installing java, downloading the photon database and running starting the jar. 
Ignoring the download, this only takes a couple minutes. 
You can find [more detailed installation instructions here.](https://github.com/komoot/photon#installation)

One set up, just point Diadem to your endpoint:
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