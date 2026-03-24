function parseNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Try to get GPS coordinates from image picker result (when exif: true).
 * Returns { latitude, longitude } or null if not present.
 */
export function getLocationFromImageAsset(asset: {
  exif?: Record<string, unknown> | null;
}): { latitude: number; longitude: number } | null {
  const exif = asset?.exif;
  if (!exif || typeof exif !== 'object') return null;

  // Direct decimal pairs (some Android / tooling)
  const lat0 = parseNumber(exif.latitude ?? exif.Latitude ?? exif.GPSLatitude);
  const lon0 = parseNumber(exif.longitude ?? exif.Longitude ?? exif.GPSLongitude);
  if (lat0 != null && lon0 != null && Math.abs(lat0) <= 90 && Math.abs(lon0) <= 180) {
    return { latitude: lat0, longitude: lon0 };
  }

  // EXIF GPS as rational arrays + hemisphere refs (iOS / common EXIF)
  const lat = exif.GPSLatitude ?? exif.gpsLatitude;
  const lon = exif.GPSLongitude ?? exif.gpsLongitude;
  if (lat != null && lon != null && Array.isArray(lat) && Array.isArray(lon)) {
    const latNum = toDecimal(lat, (exif.GPSLatitudeRef ?? exif.gpsLatitudeRef) === 'S');
    const lonNum = toDecimal(lon, (exif.GPSLongitudeRef ?? exif.gpsLongitudeRef) === 'W');
    if (latNum != null && lonNum != null) return { latitude: latNum, longitude: lonNum };
  }

  // Nested { GPS: { ... } } (occasionally serialized this way)
  const gps = exif.GPS ?? exif.gps;
  if (gps && typeof gps === 'object') {
    const g = gps as Record<string, unknown>;
    const nested = getLocationFromImageAsset({ exif: g });
    if (nested) return nested;
  }

  return null;
}

function toDecimal(
  rational: Array<{ num?: number; den?: number } | number>,
  negate: boolean
): number | null {
  if (rational.length < 3) return null;
  const toNum = (r: { num?: number; den?: number } | number): number =>
    typeof r === 'number' ? r : (r.den ? (r.num ?? 0) / r.den : 0);
  const deg = toNum(rational[0]);
  const min = toNum(rational[1]);
  const sec = toNum(rational[2]);
  let dec = deg + min / 60 + sec / 3600;
  if (negate) dec = -dec;
  return dec;
}
