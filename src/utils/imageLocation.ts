/**
 * Try to get GPS coordinates from image picker result (when exif: true).
 * Returns { latitude, longitude } or null if not present.
 */
export function getLocationFromImageAsset(asset: {
  exif?: Record<string, unknown> | null;
}): { latitude: number; longitude: number } | null {
  const exif = asset?.exif;
  if (!exif || typeof exif !== 'object') return null;

  // EXIF GPS can be stored as GPSLatitude/GPSLongitude (rational arrays) and refs
  const lat = exif.GPSLatitude ?? exif.gpsLatitude;
  const lon = exif.GPSLongitude ?? exif.gpsLongitude;
  if (lat != null && lon != null && Array.isArray(lat) && Array.isArray(lon)) {
    const latNum = toDecimal(lat, (exif.GPSLatitudeRef ?? exif.gpsLatitudeRef) === 'S');
    const lonNum = toDecimal(lon, (exif.GPSLongitudeRef ?? exif.gpsLongitudeRef) === 'W');
    if (latNum != null && lonNum != null) return { latitude: latNum, longitude: lonNum };
  }

  // Some pickers return decimal directly
  const latD = exif.GPSLatitude as number | undefined;
  const lonD = exif.GPSLongitude as number | undefined;
  if (typeof latD === 'number' && typeof lonD === 'number') {
    return { latitude: latD, longitude: lonD };
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
