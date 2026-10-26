import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LatLng,
  SacredSite,
  SacredTransitRoute,
  SACRED_SITES,
  SACRED_TRANSIT_ROUTES,
  MOCK_GUIDES,
  GuideLocation,
} from '../data/sacredSitesData';
import {
  calculateDistanceKm,
  calculateBearing,
  interpolatePathPosition,
  calculateEta,
  findNearestSacredSite,
  isInsideSiteGeofence,
} from '../utils/geoUtils';

export interface TrackingState {
  trackingMode: 'REAL_GPS' | 'SIMULATION';
  travelMode: 'WALKING' | 'BUS';
  userPosition: LatLng;
  accuracy: number | null;
  heading: number;
  speedKmH: number;
  altitude: number | null;
  isGpsActive: boolean;
  gpsError: string | null;
  pathHistory: LatLng[];
  selectedRoute: SacredTransitRoute;
  simulationProgress: number; // 0 to 1
  isSimulationPlaying: boolean;
  simulationSpeedMultiplier: 1 | 2 | 5 | 10;
  activeGeofenceSite: SacredSite | null;
  nearestSite: { site: SacredSite; distanceKm: number };
  distanceToDestinationKm: number;
  eta: string;
  primaryGuide: GuideLocation;
  distanceToGuideKm: number;
  bearingToGuide: number;
  bearingToKaaba: number;
}

export function useRealtimeTracking() {
  const [trackingMode, setTrackingMode] = useState<'REAL_GPS' | 'SIMULATION'>('SIMULATION');
  const [travelMode, setTravelMode] = useState<'WALKING' | 'BUS'>('WALKING');
  const [selectedRoute, setSelectedRoute] = useState<SacredTransitRoute>(SACRED_TRANSIT_ROUTES[0]);

  // Initial user position at start of current route
  const [userPosition, setUserPosition] = useState<LatLng>(() => {
    const startCoord = SACRED_TRANSIT_ROUTES[0].pathCoordinates[0];
    return { lat: startCoord[0], lng: startCoord[1] };
  });

  const [accuracy, setAccuracy] = useState<number | null>(6.5);
  const [heading, setHeading] = useState<number>(105);
  const [speedKmH, setSpeedKmH] = useState<number>(4.8);
  const [altitude, setAltitude] = useState<number | null>(310);
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<LatLng[]>([
    { lat: SACRED_TRANSIT_ROUTES[0].pathCoordinates[0][0], lng: SACRED_TRANSIT_ROUTES[0].pathCoordinates[0][1] },
  ]);

  // Simulation controls
  const [simulationProgress, setSimulationProgress] = useState<number>(0.12);
  const [isSimulationPlaying, setIsSimulationPlaying] = useState<boolean>(true);
  const [simulationSpeedMultiplier, setSimulationSpeedMultiplier] = useState<1 | 2 | 5 | 10>(2);

  // Guide and convoy tracking
  const [primaryGuide, setPrimaryGuide] = useState<GuideLocation>(MOCK_GUIDES[0]);

  // References for intervals and watchId
  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<number | null>(null);

  // 1. Switch Transit Route
  const handleSelectRoute = useCallback((routeId: string) => {
    const found = SACRED_TRANSIT_ROUTES.find((r) => r.id === routeId);
    if (!found) return;
    setSelectedRoute(found);
    setSimulationProgress(0);
    const startCoord = found.pathCoordinates[0];
    const initialPos = { lat: startCoord[0], lng: startCoord[1] };
    setUserPosition(initialPos);
    setPathHistory([initialPos]);
  }, []);

  // 2. Real GPS Tracking via Geolocation API
  const startRealGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('La géolocalisation n’est pas supportée par votre navigateur.');
      return;
    }

    setGpsError(null);
    setIsGpsActive(true);
    setTrackingMode('REAL_GPS');
    setIsSimulationPlaying(false);

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = pos.coords;
        const newPos: LatLng = { lat: coords.latitude, lng: coords.longitude };
        setUserPosition(newPos);
        setAccuracy(coords.accuracy ? Math.round(coords.accuracy) : null);
        setAltitude(coords.altitude ? Math.round(coords.altitude) : null);

        // Speed conversion from m/s to km/h
        if (coords.speed !== null && coords.speed !== undefined && !isNaN(coords.speed)) {
          setSpeedKmH(Math.max(0, Math.round(coords.speed * 3.6 * 10) / 10));
        }

        if (coords.heading !== null && coords.heading !== undefined && !isNaN(coords.heading)) {
          setHeading(Math.round(coords.heading));
        }

        setPathHistory((prev) => {
          const last = prev[prev.length - 1];
          if (!last || calculateDistanceKm(last, newPos) > 0.005) {
            return [...prev.slice(-100), newPos];
          }
          return prev;
        });
      },
      (err) => {
        let msg = 'Impossible de récupérer votre position GPS.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Autorisation GPS refusée. Veuillez autoriser la localisation ou basculer en mode simulation.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Signal GPS introuvable. Vérifiez votre connexion satellite/réseau.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Délai d’attente GPS dépassé.';
        }
        setGpsError(msg);
        setIsGpsActive(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 15000,
      }
    );
  }, []);

  const stopRealGps = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsGpsActive(false);
  }, []);

  // 3. Simulation Animation Loop
  useEffect(() => {
    if (trackingMode !== 'SIMULATION' || !isSimulationPlaying) {
      if (simIntervalRef.current) {
        window.clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      return;
    }

    // Step calculation: 0.1s tick
    const baseSpeedKmH = travelMode === 'BUS' ? 35 : 5.0;
    const distanceStepKm = (baseSpeedKmH / 3600) * 0.1 * simulationSpeedMultiplier;
    const stepRatio = distanceStepKm / Math.max(0.5, selectedRoute.distanceKm);

    simIntervalRef.current = window.setInterval(() => {
      setSimulationProgress((prev) => {
        let next = prev + stepRatio;
        if (next >= 1) {
          next = 1;
          setIsSimulationPlaying(false);
        }

        const interpolated = interpolatePathPosition(selectedRoute.pathCoordinates, next);
        setUserPosition(interpolated.position);
        if (interpolated.bearing > 0) {
          setHeading(Math.round(interpolated.bearing));
        }
        setSpeedKmH(travelMode === 'BUS' ? Math.round(32 + Math.random() * 6) : Math.round((4.6 + Math.random() * 0.8) * 10) / 10);

        setPathHistory((old) => {
          const last = old[old.length - 1];
          if (!last || calculateDistanceKm(last, interpolated.position) > 0.01) {
            return [...old.slice(-120), interpolated.position];
          }
          return old;
        });

        // Also subtly update guide position to keep convoy dynamic
        setPrimaryGuide((curr) => {
          const guideProgress = Math.min(1, Math.max(0, next + 0.025)); // Guide slightly ahead
          const guidePos = interpolatePathPosition(selectedRoute.pathCoordinates, guideProgress);
          return {
            ...curr,
            location: guidePos.position,
            heading: guidePos.bearing,
            speedKmH: travelMode === 'BUS' ? 36 : 5.1,
          };
        });

        return next;
      });
    }, 100);

    return () => {
      if (simIntervalRef.current) {
        window.clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, [trackingMode, isSimulationPlaying, simulationSpeedMultiplier, travelMode, selectedRoute]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (simIntervalRef.current !== null) {
        window.clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  // 4. Calculations: Geofence, Distances, ETA, Bearing to Kaaba, Guide
  const endSite = SACRED_SITES[selectedRoute.endSiteId] || SACRED_SITES.ARAFAT;
  const kaabaSite = SACRED_SITES.AL_HARAM;

  const distanceToDestinationKm = calculateDistanceKm(userPosition, endSite.location);
  const distanceToGuideKm = calculateDistanceKm(userPosition, primaryGuide.location);
  const bearingToGuide = calculateBearing(userPosition, primaryGuide.location);
  const bearingToKaaba = calculateBearing(userPosition, kaabaSite.location);

  const nearestSite = findNearestSacredSite(userPosition);

  // Check geofence
  let activeGeofenceSite: SacredSite | null = null;
  for (const site of Object.values(SACRED_SITES)) {
    if (isInsideSiteGeofence(userPosition, site)) {
      activeGeofenceSite = site;
      break;
    }
  }

  const eta = calculateEta(distanceToDestinationKm, speedKmH, travelMode === 'BUS' ? 30 : 4.5);

  const toggleSimulation = () => {
    if (simulationProgress >= 1) {
      setSimulationProgress(0);
      const startCoord = selectedRoute.pathCoordinates[0];
      setUserPosition({ lat: startCoord[0], lng: startCoord[1] });
      setPathHistory([{ lat: startCoord[0], lng: startCoord[1] }]);
    }
    setIsSimulationPlaying((prev) => !prev);
  };

  const resetSimulation = () => {
    setSimulationProgress(0);
    setIsSimulationPlaying(false);
    const startCoord = selectedRoute.pathCoordinates[0];
    const initialPos = { lat: startCoord[0], lng: startCoord[1] };
    setUserPosition(initialPos);
    setPathHistory([initialPos]);
  };

  return {
    trackingMode,
    setTrackingMode: (mode: 'REAL_GPS' | 'SIMULATION') => {
      if (mode === 'REAL_GPS') {
        startRealGps();
      } else {
        stopRealGps();
        setTrackingMode('SIMULATION');
      }
    },
    travelMode,
    setTravelMode,
    userPosition,
    setUserPosition,
    accuracy,
    heading,
    speedKmH,
    altitude,
    isGpsActive,
    gpsError,
    pathHistory,
    selectedRoute,
    selectRoute: handleSelectRoute,
    simulationProgress,
    isSimulationPlaying,
    toggleSimulation,
    resetSimulation,
    simulationSpeedMultiplier,
    setSimulationSpeedMultiplier,
    activeGeofenceSite,
    nearestSite,
    distanceToDestinationKm,
    eta,
    primaryGuide,
    distanceToGuideKm,
    bearingToGuide,
    bearingToKaaba,
    startRealGps,
    stopRealGps,
  };
}
