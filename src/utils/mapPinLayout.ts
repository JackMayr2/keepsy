/**
 * Spread pins that share the same map coordinates into a small ring so markers
 * don't stack invisibly on top of each other.
 */
export type MapPinInput = {
  key: string;
  latitude: number;
  longitude: number;
};

/** ~1.1 m grouping — pins closer than this share a jitter group */
const GROUP_DECIMALS = 5;

/** Radius in meters for placing pins around the true coordinate */
const RING_RADIUS_M = 16;

export function jitteredCoordinatesForPins<T extends MapPinInput>(
  pins: T[]
): Map<string, { latitude: number; longitude: number }> {
  const groups = new Map<string, T[]>();
  for (const p of pins) {
    const gk = `${p.latitude.toFixed(GROUP_DECIMALS)},${p.longitude.toFixed(GROUP_DECIMALS)}`;
    const arr = groups.get(gk) ?? [];
    arr.push(p);
    groups.set(gk, arr);
  }

  const out = new Map<string, { latitude: number; longitude: number }>();
  for (const group of groups.values()) {
    const n = group.length;
    group.forEach((p, i) => {
      if (n <= 1) {
        out.set(p.key, { latitude: p.latitude, longitude: p.longitude });
        return;
      }
      const angle = (2 * Math.PI * i) / n;
      const cosLat = Math.max(0.15, Math.cos((p.latitude * Math.PI) / 180));
      const dLat = (RING_RADIUS_M / 111_320) * Math.sin(angle);
      const dLng = (RING_RADIUS_M / (111_320 * cosLat)) * Math.cos(angle);
      out.set(p.key, {
        latitude: p.latitude + dLat,
        longitude: p.longitude + dLng,
      });
    });
  }
  return out;
}
