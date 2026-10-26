import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  LatLng,
  SacredSite,
  SacredTransitRoute,
  SACRED_SITES,
  GuideLocation,
  RouteWaypoint,
} from '../../../data/sacredSitesData';

interface LeafletSacredMapProps {
  userPosition: LatLng;
  heading: number;
  selectedRoute: SacredTransitRoute;
  pathHistory: LatLng[];
  primaryGuide: GuideLocation;
  followUser: boolean;
  onSiteClick?: (site: SacredSite) => void;
  className?: string;
}

export const LeafletSacredMap: React.FC<LeafletSacredMapProps> = ({
  userPosition,
  heading,
  selectedRoute,
  pathHistory,
  primaryGuide,
  followUser,
  onSiteClick,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer references
  const userMarkerRef = useRef<L.Marker | null>(null);
  const guideMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const breadcrumbPolylineRef = useRef<L.Polyline | null>(null);
  const sitesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const waypointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const geofenceLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userPosition.lat, userPosition.lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      // Add CartoDB Voyager tiles (very clean, light, excellent contrast for Saudi holy sites)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Initialize Layer Groups
      geofenceLayerGroupRef.current = L.layerGroup().addTo(map);
      sitesLayerGroupRef.current = L.layerGroup().addTo(map);
      waypointsLayerGroupRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Render Sacred Sites and Geofences
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !sitesLayerGroupRef.current || !geofenceLayerGroupRef.current) return;

    sitesLayerGroupRef.current.clearLayers();
    geofenceLayerGroupRef.current.clearLayers();

    // Add Geofence circles for sacred sites
    (Object.values(SACRED_SITES) as SacredSite[]).forEach((site: SacredSite) => {
      // Circular geofence boundary
      const circle = L.circle([site.location.lat, site.location.lng], {
        radius: site.radiusMeters,
        color: site.color,
        fillColor: site.color,
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '4, 6',
      });
      circle.addTo(geofenceLayerGroupRef.current!);

      // Custom HTML Marker Icon
      const iconHtml = `
        <div class="relative group cursor-pointer transition-transform hover:scale-110">
          <div class="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white" style="background-color: ${site.color}; color: white;">
            <span class="text-base font-black">${getSiteIconEmoji(site.iconType)}</span>
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-stone-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md border border-white/20 pointer-events-none">
            ${site.name.split(' ')[0]}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-sacred-site-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([site.location.lat, site.location.lng], { icon: customIcon });

      // Rich popup
      const popupHtml = `
        <div class="p-3 text-stone-900 font-sans max-w-xs space-y-2">
          <div class="flex items-center gap-2 border-b border-stone-200 pb-1.5">
            <span class="text-xl">${getSiteIconEmoji(site.iconType)}</span>
            <div>
              <h4 class="font-extrabold text-xs text-stone-900 leading-tight">${site.name}</h4>
              <p class="font-amiri text-xs text-stone-500">${site.arabicName}</p>
            </div>
          </div>
          <p class="text-[11px] text-stone-600 leading-snug">${site.description}</p>
          <div class="p-2 bg-stone-50 rounded-lg border border-stone-200 text-[10px] space-y-1">
            <p><strong class="text-stone-800">Rituels :</strong> ${site.ritualSignificance}</p>
            ${site.hajjDay ? `<p><strong class="text-stone-800">Date Hajj :</strong> <span class="text-amber-700 font-bold">${site.hajjDay}</span></p>` : ''}
            ${site.elevationMeters ? `<p><strong class="text-stone-800">Altitude :</strong> ${site.elevationMeters}m</p>` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { minWidth: 260, maxWidth: 300 });

      marker.on('click', () => {
        if (onSiteClick) onSiteClick(site);
      });

      marker.addTo(sitesLayerGroupRef.current!);
    });
  }, [onSiteClick]);

  // 3. Render Route Polyline & Waypoints
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove previous route polyline
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
    }

    if (waypointsLayerGroupRef.current) {
      waypointsLayerGroupRef.current.clearLayers();
    }

    // Full Route Corridor Polyline (dashed animated look)
    routePolylineRef.current = L.polyline(selectedRoute.pathCoordinates, {
      color: '#135ca5',
      weight: 5,
      opacity: 0.7,
      dashArray: '8, 8',
      lineCap: 'round',
    }).addTo(map);

    // Waypoint Markers along the route
    selectedRoute.waypoints.forEach((wp: RouteWaypoint, index: number) => {
      const isStart = index === 0;
      const isEnd = index === selectedRoute.waypoints.length - 1;

      const wpIconHtml = `
        <div class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white shadow-md border-2 border-white ${
          isStart ? 'bg-emerald-600' : isEnd ? 'bg-amber-600' : 'bg-slate-700'
        }">
          ${isStart ? 'A' : isEnd ? 'B' : index}
        </div>
      `;

      const wpIcon = L.divIcon({
        html: wpIconHtml,
        className: 'custom-waypoint-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const wpMarker = L.marker([wp.location.lat, wp.location.lng], { icon: wpIcon });
      wpMarker.bindPopup(`
        <div class="p-2 font-sans text-xs">
          <strong class="block text-stone-900 font-bold">${wp.name}</strong>
          <span class="text-stone-500 text-[11px] block mt-0.5">Étape: +${wp.distanceFromStartKm.toFixed(1)} km</span>
          ${wp.note ? `<p class="text-[10px] text-amber-700 mt-1">${wp.note}</p>` : ''}
        </div>
      `);

      if (waypointsLayerGroupRef.current) {
        wpMarker.addTo(waypointsLayerGroupRef.current);
      }
    });

    // Fit map bounds to route if not following user
    if (!followUser && routePolylineRef.current) {
      map.fitBounds(routePolylineRef.current.getBounds(), { padding: [40, 40] });
    }
  }, [selectedRoute, followUser]);

  // 4. Render User Position (Pilgrim pulsing marker with heading arrow)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const userIconHtml = `
      <div class="relative flex items-center justify-center w-12 h-12">
        <!-- Radar Pulse Waves -->
        <span class="absolute w-12 h-12 rounded-full bg-[#f15a24]/30 animate-ping"></span>
        <span class="absolute w-8 h-8 rounded-full bg-[#135ca5]/40 animate-pulse"></span>

        <!-- Center Core -->
        <div class="relative w-7 h-7 rounded-full bg-gradient-to-tr from-[#135ca5] to-[#f15a24] text-white flex items-center justify-center shadow-lg border-2 border-white">
          <svg class="w-4 h-4 transition-transform duration-300" style="transform: rotate(${heading}deg);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 19V5m0 0l-4 4m4-4l4 4"/>
          </svg>
        </div>

        <!-- Label Pill -->
        <div class="absolute -top-6 whitespace-nowrap bg-[#f15a24] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md border border-white">
          Moi (Pèlerin)
        </div>
      </div>
    `;

    const userDivIcon = L.divIcon({
      html: userIconHtml,
      className: 'user-pilgrim-marker',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([userPosition.lat, userPosition.lng], {
        icon: userDivIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      userMarkerRef.current.bindPopup(`
        <div class="p-2 font-sans text-xs">
          <strong class="text-stone-900 block font-bold">Votre position en direct</strong>
          <span class="text-stone-500 text-[11px]">Cap : ${heading}° · Précision : Haute</span>
        </div>
      `);
    } else {
      userMarkerRef.current.setLatLng([userPosition.lat, userPosition.lng]);
      userMarkerRef.current.setIcon(userDivIcon);
    }

    // Auto-pan if following user
    if (followUser) {
      map.panTo([userPosition.lat, userPosition.lng], { animate: true, duration: 0.5 });
    }
  }, [userPosition, heading, followUser]);

  // 5. Render Breadcrumb Path History (solid green path behind user)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (breadcrumbPolylineRef.current) {
      map.removeLayer(breadcrumbPolylineRef.current);
    }

    if (pathHistory.length > 1) {
      const latLngs: [number, number][] = pathHistory.map((p) => [p.lat, p.lng]);
      breadcrumbPolylineRef.current = L.polyline(latLngs, {
        color: '#10b981',
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }
  }, [pathHistory]);

  // 6. Render EVA Voyages Guide & Convoy Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const guideIconHtml = `
      <div class="relative flex items-center justify-center cursor-pointer group">
        <div class="w-9 h-9 rounded-2xl bg-[#0c3f74] text-white flex items-center justify-center shadow-lg border-2 border-amber-400">
          <span class="text-sm font-black">${primaryGuide.vehicleType === 'BUS' ? '🚌' : '👳‍♂️'}</span>
        </div>
        <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#0c3f74] text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-md shadow-md border border-amber-400/50 pointer-events-none">
          Guide EVA (${primaryGuide.name.split(' ')[0]})
        </div>
      </div>
    `;

    const guideDivIcon = L.divIcon({
      html: guideIconHtml,
      className: 'guide-convoy-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (!guideMarkerRef.current) {
      guideMarkerRef.current = L.marker([primaryGuide.location.lat, primaryGuide.location.lng], {
        icon: guideDivIcon,
        zIndexOffset: 900,
      }).addTo(map);
    } else {
      guideMarkerRef.current.setLatLng([primaryGuide.location.lat, primaryGuide.location.lng]);
      guideMarkerRef.current.setIcon(guideDivIcon);
    }

    guideMarkerRef.current.bindPopup(`
      <div class="p-3 font-sans text-xs max-w-xs space-y-2">
        <div class="flex items-center gap-2 border-b border-stone-200 pb-1.5">
          <div class="w-7 h-7 rounded-lg bg-[#0c3f74] text-white flex items-center justify-center font-bold">
            ${primaryGuide.vehicleType === 'BUS' ? '🚌' : '👳‍♂️'}
          </div>
          <div>
            <h4 class="font-bold text-stone-900">${primaryGuide.name}</h4>
            <span class="text-[10px] text-amber-600 font-semibold block">${primaryGuide.role}</span>
          </div>
        </div>
        <div class="space-y-1 text-[11px] text-stone-600">
          <p><strong>Statut :</strong> <span class="text-emerald-700 font-bold">En déplacement convoi</span></p>
          <p><strong>Vitesse :</strong> ${primaryGuide.speedKmH} km/h</p>
          ${primaryGuide.vehicleNumber ? `<p><strong>Véhicule :</strong> ${primaryGuide.vehicleNumber}</p>` : ''}
        </div>
        <div class="pt-2 flex items-center gap-2">
          <a
            href="${primaryGuide.whatsapp}"
            target="_blank"
            rel="noopener noreferrer"
            class="flex-1 py-1.5 px-2 bg-[#25D366] text-black font-bold text-center rounded-lg text-[10px]"
          >
            WhatsApp Convoi
          </a>
          <a
            href="tel:${primaryGuide.phone}"
            class="py-1.5 px-2 bg-stone-100 text-stone-800 font-bold rounded-lg text-[10px]"
          >
            Appeler
          </a>
        </div>
      </div>
    `);
  }, [primaryGuide]);

  return (
    <div className={`relative w-full h-full min-h-[420px] rounded-3xl overflow-hidden shadow-inner ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
};

function getSiteIconEmoji(iconType: string): string {
  switch (iconType) {
    case 'kaaba':
      return '🕋';
    case 'tent':
      return '⛺';
    case 'crescent':
      return '🌙';
    case 'mountain':
      return '⛰️';
    case 'steles':
      return '🗿';
    case 'mosque':
      return '🕌';
    case 'bus':
      return '🚌';
    default:
      return '📍';
  }
}
