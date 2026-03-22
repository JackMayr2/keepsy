/**
 * City / place search via Photon (Komoot) — no API key, usable from native and web (CORS-friendly).
 * Attribution: Data © OpenStreetMap contributors (https://openstreetmap.org/copyright)
 */

export type PlaceSuggestion = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
};

type PhotonFeature = {
  geometry?: { type: string; coordinates?: [number, number] };
  properties?: Record<string, string | number | undefined>;
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

function buildLabel(props: Record<string, string | number | undefined> | undefined, fallback: string): string {
  if (!props) return fallback;
  const name = props.name != null ? String(props.name).trim() : '';
  const locality =
    props.city != null ? String(props.city).trim() : props.town != null ? String(props.town).trim() : '';
  const state = props.state != null ? String(props.state).trim() : '';
  const country = props.country != null ? String(props.country).trim() : '';
  const parts: string[] = [];
  if (name) parts.push(name);
  if (locality && locality !== name) parts.push(locality);
  if (!name && !locality && state) parts.push(state);
  if (country) parts.push(country);
  const joined = parts.join(', ');
  return joined || name || locality || fallback;
}

/**
 * Search for cities and places. Minimum 2 characters.
 */
export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=10&lang=en`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as PhotonResponse;
    const features = data.features ?? [];
    const out: PlaceSuggestion[] = [];

    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      const lon = coords[0];
      const lat = coords[1];
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

      const props = f.properties;
      const label = buildLabel(props, q);

      out.push({
        id: `${lat.toFixed(5)},${lon.toFixed(5)},${i}`,
        latitude: lat,
        longitude: lon,
        label,
      });
    }

    return out;
  } catch {
    return [];
  }
}
