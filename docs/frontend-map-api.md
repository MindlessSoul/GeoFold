# GeoFold — Frontend Map/Report API Contract

Endpoints a separate SPA (React/Vue/…) needs to render the survey map/report (Phase 5).
Base URL (dev): `https://localhost:7xxx` (see `Properties/launchSettings.json` for the exact port).

## Auth
Every endpoint requires a **Supabase JWT** as a bearer token:

```
Authorization: Bearer <supabase_access_token>
```

Obtain the token in the SPA via the Supabase JS client (`supabase.auth.getSession()`),
then attach it to each request. All data is scoped to the authenticated user.

## CORS
The API allows the SPA origin(s) listed in `appsettings.json` → `Cors:AllowedOrigins`
(defaults: `http://localhost:5173`, `http://localhost:3000`). Add your dev/prod origin there.
Auth is bearer-token based (no cookies), so `credentials` is not required.

## Endpoints

### 1. List projects (for the filter dropdown)
`GET /api/v1/projects`
```json
[{ "id": "…", "name": "…", "description": null, "formSchema": "[]",
   "createdAtUtc": "…", "archivedAtUtc": null, "surveyCount": 12 }]
```

### 2. Survey markers as GeoJSON  ← main map feed
`GET /api/v1/surveys/geojson`

Query params (all optional): `projectId`, `minLat`, `minLng`, `maxLat`, `maxLng` (viewport
bbox — pass all four or none), `limit` (default 5000, max 10000).

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [106.827153, -6.175392] },
      "properties": {
        "id": "…", "projectId": "…", "status": "submitted",
        "capturedAtUtc": "…", "syncedAtUtc": "…",
        "accuracyMeters": 4.5, "photoCount": 2,
        "detailsJson": "{\"note\":\"ok\"}"
      }
    }
  ]
}
```
Notes:
- **Coordinates are `[longitude, latitude]`** (GeoJSON order), ready for `L.geoJSON(fc)`.
- `detailsJson` is a **JSON string** (the survey's form_data) — `JSON.parse()` it before use.
- Kept lightweight (no photo URLs) — fetch those on marker click (below).

### 3. Full survey detail (on marker click)
`GET /api/v1/surveys/{id}` → includes `photos: [{ id, uploadStatus, latitude, longitude, capturedAtUtc }]`.

### 4. Signed photo URL (to show the image)
`GET /api/v1/surveys/{surveyId}/photos/{photoId}/url` → `{ "url": "https://…" }` (valid ~15 min).

## Leaflet flow (sketch)
```js
const fc = await api(`/api/v1/surveys/geojson?projectId=${pid}`);
L.geoJSON(fc, {
  onEachFeature: (f, layer) => layer.on('click', async () => {
    const detail = await api(`/api/v1/surveys/${f.properties.id}`);
    const photo = detail.photos[0];
    const { url } = photo
      ? await api(`/api/v1/surveys/${detail.id}/photos/${photo.id}/url`)
      : { url: null };
    layer.bindPopup(renderPopup(detail, url)).openPopup();
  })
}).addTo(map);
```
