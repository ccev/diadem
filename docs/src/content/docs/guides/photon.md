---
title: Self-host address search
---

Geocoding describes the process of converting a written address to coordinates, while reverse geocoding converts a given set
of coordinates to a human-understandable address. I tested three different geocoding services: Nominatim, Pelias, and
Photon. I found Photon to be the best, by far.

# Photon

Diadem supports three different geocoding providers, of which Proton is the easiest to set up, provides the fastest 
results and requires the least disk space.

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

## Geometries

When searching for a place, Diadem can show the resulting geometry on the map. Photon does not provide this data 
by default, so you have 3 options:

1. Do nothing: The map shows a circle
2. Configure Nominatim
    - When a user selects a search result, geometries are fetched from nominatim
    - Queries take a second or two to resolve, so there's a noticeable delay to the user
    - It's probably fine to use their public API
    ```toml
    [server.nominatim]
    url = "https://nominatim.openstreetmap.org/"
    userAgent = "Diadem / Contact: name@email.com"
    ```
3. Import full geometries to Photon
    - To enable, start Photon with `-full-geometries` and set `server.photon.hasGeometries` to `true`
    - This has not been tested, you're somewhat on your own. [Find more here](https://github.com/komoot/photon/blob/master/docs/usage.md#filtering-the-data-to-be-imported) and [here](https://github.com/komoot/photon/pull/823)
    - The import takes up ~600 GB of disk space for the entire planet
