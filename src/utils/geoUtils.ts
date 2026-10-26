import { LatLng, SacredSite, SACRED_SITES } from '../data/sacredSitesData';

/**
 * Calculates distance in kilometers between two lat/lng points using Haversine formula
 */
export function calculateDistanceKm(point1: LatLng, point2: LatLng): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts distance in kilometers to user-friendly French string (meters or km)
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(2)} km`;
}

/**
 * Calculates compass initial bearing (azimuth in degrees, 0 to 360) from point1 to point2
 */
export function calculateBearing(point1: LatLng, point2: LatLng): number {
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);
  const dLng = toRad(point2.lng - point1.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

/**
 * Converts bearing angle to cardinal direction label in French
 */
export function getCardinalDirection(bearingDeg: number): string {
  const directions = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
  const index = Math.round(bearingDeg / 45) % 8;
  return directions[index];
}

/**
 * Checks whether a given position is within the geofenced radius of a sacred site
 */
export function isInsideSiteGeofence(pos: LatLng, site: SacredSite): boolean {
  const distKm = calculateDistanceKm(pos, site.location);
  const radiusKm = site.radiusMeters / 1000;
  return distKm <= radiusKm;
}

/**
 * Finds the nearest sacred site to a given position
 */
export function findNearestSacredSite(pos: LatLng): { site: SacredSite; distanceKm: number } {
  const sites = Object.values(SACRED_SITES);
  let nearest = sites[0];
  let minDistance = calculateDistanceKm(pos, nearest.location);

  for (let i = 1; i < sites.length; i++) {
    const d = calculateDistanceKm(pos, sites[i].location);
    if (d < minDistance) {
      minDistance = d;
      nearest = sites[i];
    }
  }

  return { site: nearest, distanceKm: minDistance };
}

/**
 * Interpolates a position along a polyline of coordinates given a completion ratio [0.0 - 1.0]
 */
export function interpolatePathPosition(
  coordinates: [number, number][],
  ratio: number
): { position: LatLng; segmentIndex: number; bearing: number } {
  if (coordinates.length === 0) {
    return { position: { lat: 21.4225, lng: 39.8262 }, segmentIndex: 0, bearing: 0 };
  }
  if (coordinates.length === 1 || ratio <= 0) {
    return {
      position: { lat: coordinates[0][0], lng: coordinates[0][1] },
      segmentIndex: 0,
      bearing: 0,
    };
  }
  if (ratio >= 1) {
    const last = coordinates[coordinates.length - 1];
    const prev = coordinates[coordinates.length - 2];
    const bearing = calculateBearing({ lat: prev[0], lng: prev[1] }, { lat: last[0], lng: last[1] });
    return {
      position: { lat: last[0], lng: last[1] },
      segmentIndex: coordinates.length - 2,
      bearing,
    };
  }

  // Calculate segment lengths
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = { lat: coordinates[i][0], lng: coordinates[i][1] };
    const p2 = { lat: coordinates[i + 1][0], lng: coordinates[i + 1][1] };
    const len = calculateDistanceKm(p1, p2);
    segmentLengths.push(len);
    totalLength += len;
  }

  const targetDist = totalLength * ratio;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const len = segmentLengths[i];
    if (accumulated + len >= targetDist || i === segmentLengths.length - 1) {
      const segRatio = len > 0 ? (targetDist - accumulated) / len : 0;
      const p1 = coordinates[i];
      const p2 = coordinates[i + 1];

      const lat = p1[0] + (p2[0] - p1[0]) * segRatio;
      const lng = p1[1] + (p2[1] - p1[1]) * segRatio;
      const bearing = calculateBearing({ lat: p1[0], lng: p1[1] }, { lat: p2[0], lng: p2[1] });

      return {
        position: { lat, lng },
        segmentIndex: i,
        bearing,
      };
    }
    accumulated += len;
  }

  const last = coordinates[coordinates.length - 1];
  return { position: { lat: last[0], lng: last[1] }, segmentIndex: coordinates.length - 1, bearing: 0 };
}

/**
 * Calculates Estimated Time of Arrival (ETA) in human-readable French format
 */
export function calculateEta(distanceRemainingKm: number, speedKmH: number, fallbackSpeedKmH: number = 4.5): string {
  const speed = speedKmH > 0.5 ? speedKmH : fallbackSpeedKmH;
  const hours = distanceRemainingKm / speed;
  const totalMinutes = Math.round(hours * 60);

  if (totalMinutes <= 1) return 'Moins d’une minute';
  if (totalMinutes < 60) return `~${totalMinutes} min`;

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `~${h}h ${m}min` : `~${h}h`;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}
