import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { useRealtimeTracking } from '../../../hooks/useRealtimeTracking';
import { LeafletSacredMap } from './LeafletSacredMap';
import { SACRED_TRANSIT_ROUTES, SACRED_SITES, SacredSite } from '../../../data/sacredSitesData';
import { formatDistance, getCardinalDirection } from '../../../utils/geoUtils';
import {
  Navigation,
  Compass,
  Play,
  Pause,
  RotateCcw,
  Footprints,
  Bus,
  Radio,
  AlertTriangle,
  PhoneCall,
  MessageCircle,
  MapPin,
  CheckCircle2,
  Share2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp,
  Volume2,
} from 'lucide-react';

export const SacredSitesTracker: React.FC = () => {
  const { agencyConfig, currentUser, triggerSosAlert } = useApp();
  const {
    trackingMode,
    setTrackingMode,
    travelMode,
    setTravelMode,
    userPosition,
    accuracy,
    heading,
    speedKmH,
    altitude,
    isGpsActive,
    gpsError,
    pathHistory,
    selectedRoute,
    selectRoute,
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
  } = useRealtimeTracking();

  const [followUser, setFollowUser] = useState<boolean>(true);
  const [selectedSiteModal, setSelectedSiteModal] = useState<SacredSite | null>(null);
  const [isSosModalOpen, setIsSosModalOpen] = useState<boolean>(false);
  const [isRitualsExpanded, setIsRitualsExpanded] = useState<boolean>(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Trigger SOS alert to Guide Awa Kane and Back-office
  const handleTriggerSos = () => {
    setIsSosModalOpen(true);
    triggerSosAlert({
      lat: userPosition.lat,
      lng: userPosition.lng,
      nearestSiteName: nearestSite.site.name,
      distanceKm: nearestSite.distanceKm,
      pilgrimName: currentUser?.name || 'Pèlerin EVA Voyages',
      trackingCode: currentUser?.linkedTrackingCode || 'EVA-HJ26-9284',
      phone: currentUser?.phone || '+221 77 541 23 89',
      avatar: currentUser?.avatar,
    });
  };

  // Stop audio on unmount or route change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsAudioPlaying(false);
  }, [selectedRoute.id]);

  const handleToggleTalbiyahAudio = () => {
    if (isAudioPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsAudioPlaying(false);
    } else {
      setIsAudioPlaying(true);
      if (!audioRef.current) {
        audioRef.current = new Audio('https://ia800301.us.archive.org/15/items/Talbiyah_Hajj/Talbiyah.mp3');
      }

      audioRef.current.onended = () => setIsAudioPlaying(false);
      audioRef.current.onerror = () => {
        // Fallback to speech synthesis if audio link is blocked or offline
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(selectedRoute.talbiyah.arabic);
          utterance.lang = 'ar-SA';
          utterance.onend = () => setIsAudioPlaying(false);
          utterance.onerror = () => setIsAudioPlaying(false);
          window.speechSynthesis.speak(utterance);
        } else {
          setIsAudioPlaying(false);
        }
      };

      audioRef.current.play().catch(() => {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(selectedRoute.talbiyah.arabic);
          utterance.lang = 'ar-SA';
          utterance.onend = () => setIsAudioPlaying(false);
          utterance.onerror = () => setIsAudioPlaying(false);
          window.speechSynthesis.speak(utterance);
        } else {
          setIsAudioPlaying(false);
        }
      });
    }
  };

  const endSite = SACRED_SITES[selectedRoute.endSiteId] || SACRED_SITES.ARAFAT;
  const progressPercent = Math.round(simulationProgress * 100);
  const distanceTraveledKm = (selectedRoute.distanceKm * simulationProgress).toFixed(1);

  // Share coordinates
  const handleShareLocation = () => {
    const mapsUrl = `https://www.google.com/maps?q=${userPosition.lat},${userPosition.lng}`;
    const text = `Position Pèlerin EVA Voyages (${currentUser?.name || 'Pèlerin'}): ${mapsUrl} - En déplacement vers ${endSite.name}. Vitesse: ${speedKmH} km/h.`;

    if (navigator.share) {
      navigator.share({
        title: 'Ma position pèlerinage - EVA Voyages',
        text,
        url: mapsUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Lien de localisation copié dans le presse-papier !');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-radial from-[#135ca5] to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-amiri text-2xl text-amber-400 font-bold">
                تَتَبُّعُ حَرَكَةِ الحُجَّاجِ فِي المَشَاعِرِ المُقَدَّسَةِ
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#135ca5] text-white text-[10px] font-bold uppercase tracking-wider">
                Suivi GPS Temps Réel
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Système Actif</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Suivi des Déplacements entre les Sites Sacrés
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Carte interactive avec suivi GPS en direct, positionnement du convoi et des guides {agencyConfig.name}, calcul d’itinéraire rituel, boussole vers la Kaaba et assistance d’urgence.
            </p>
          </div>

          {/* Emergency SOS Panic Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={handleTriggerSos}
              className="px-4 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 transition-transform active:scale-95 cursor-pointer animate-pulse"
            >
              <AlertTriangle className="w-4 h-4 text-white" />
              <span>Bouton SOS · Pèlerin Égaré</span>
            </button>

            <button
              type="button"
              onClick={handleShareLocation}
              className="px-3.5 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 border border-stone-700 transition-colors cursor-pointer"
              title="Partager ma position GPS"
            >
              <Share2 className="w-4 h-4 text-[#f15a24]" />
              <span className="hidden sm:inline">Partager GPS</span>
            </button>
          </div>
        </div>

        {/* Geofence Active Alert Toast in Banner */}
        {activeGeofenceSite && (
          <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-200">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-emerald-100">
                  Périmètre Sacré Atteint : {activeGeofenceSite.name}
                </span>
                <span className="text-[11px] text-emerald-300 block font-amiri">
                  {activeGeofenceSite.arabicName}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 font-bold text-[10px] shrink-0">
              Dans la Zone Bénie
            </span>
          </div>
        )}
      </div>

      {/* Route Selector Segmented Bar */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-[#135ca5]" />
            <h3 className="text-xs sm:text-sm font-bold text-stone-900">
              Sélectionnez l'étape de votre pèlerinage :
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-semibold">
            {selectedRoute.stageName} · {selectedRoute.hajjDate}
          </span>
        </div>

        {/* Route Pills Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SACRED_TRANSIT_ROUTES.map((route) => {
            const isSelected = route.id === selectedRoute.id;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => selectRoute(route.id)}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  isSelected
                    ? 'bg-[#135ca5] text-white shadow-md shadow-blue-900/20'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                <span>{route.title}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {route.distanceKm} km
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Live Map & Right Side HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Map View (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden p-2 sm:p-3">
            {/* Map Top Floating Overlay Bar */}
            <div className="absolute top-5 left-5 right-5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              {/* Mode Toggle Pill */}
              <div className="pointer-events-auto bg-stone-900/90 backdrop-blur-md text-white p-1 rounded-2xl shadow-lg border border-white/10 flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setTrackingMode('SIMULATION')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    trackingMode === 'SIMULATION'
                      ? 'bg-[#135ca5] text-white shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mode Simulation</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTrackingMode('REAL_GPS')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    trackingMode === 'REAL_GPS'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Radio className={`w-3.5 h-3.5 ${isGpsActive ? 'text-white animate-pulse' : 'text-stone-400'}`} />
                    <span>Mon GPS Réel</span>
                  </span>
                </button>
              </div>

              {/* Mode Transport Toggle Pill */}
              <div className="pointer-events-auto bg-stone-900/90 backdrop-blur-md text-white p-1 rounded-2xl shadow-lg border border-white/10 flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setTravelMode('WALKING')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    travelMode === 'WALKING'
                      ? 'bg-[#f15a24] text-white shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                  title="Déplacement piéton (vitesse marche ~5 km/h)"
                >
                  <span className="flex items-center gap-1">
                    <Footprints className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">À pied</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTravelMode('BUS')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    travelMode === 'BUS'
                      ? 'bg-[#135ca5] text-white shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                  title="Convoi Navette Bus EVA Voyages"
                >
                  <span className="flex items-center gap-1">
                    <Bus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Navette Bus VIP</span>
                  </span>
                </button>
              </div>
            </div>

            {/* GPS Error Notification if any */}
            {gpsError && trackingMode === 'REAL_GPS' && (
              <div className="absolute top-20 left-5 right-5 z-20 bg-amber-900/95 text-amber-100 p-3 rounded-2xl shadow-lg text-xs border border-amber-500/50 flex items-center justify-between gap-2">
                <span>{gpsError}</span>
                <button
                  type="button"
                  onClick={() => setTrackingMode('SIMULATION')}
                  className="px-2.5 py-1 bg-amber-500 text-stone-950 font-bold rounded-lg text-[11px] shrink-0"
                >
                  Passer en simulation
                </button>
              </div>
            )}

            {/* Map Component Canvas */}
            <LeafletSacredMap
              userPosition={userPosition}
              heading={heading}
              selectedRoute={selectedRoute}
              pathHistory={pathHistory}
              primaryGuide={primaryGuide}
              followUser={followUser}
              onSiteClick={(site) => setSelectedSiteModal(site)}
              className="h-[480px] sm:h-[540px]"
            />

            {/* Map Bottom Floating Controls */}
            <div className="absolute bottom-5 left-5 z-20 pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFollowUser(!followUser)}
                className={`px-3 py-2 rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
                  followUser
                    ? 'bg-[#135ca5] text-white border border-blue-400'
                    : 'bg-white/90 text-stone-800 hover:bg-white border border-stone-200'
                }`}
              >
                <Compass className="w-4 h-4 text-[#f15a24]" />
                <span>{followUser ? 'Recentrage Automatique Activé' : 'Mode Vue Libre'}</span>
              </button>
            </div>
          </div>

          {/* Simulation Controls Deck (When Simulation Active) */}
          {trackingMode === 'SIMULATION' && (
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-extrabold text-stone-800">
                    Contrôleur de Simulation de Trajet
                  </span>
                  <span className="text-[11px] text-stone-500">
                    ({progressPercent}% parcouru · {distanceTraveledKm} km / {selectedRoute.distanceKm} km)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-stone-500 font-semibold mr-1">Vitesse test :</span>
                  {([1, 2, 5, 10] as const).map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setSimulationSpeedMultiplier(spd)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        simulationSpeedMultiplier === spd
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1.5">
                <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden border border-stone-200 p-0.5">
                  <div
                    className="bg-gradient-to-r from-[#135ca5] via-[#f15a24] to-emerald-500 h-full rounded-full transition-all duration-200"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-stone-500 font-semibold px-1">
                  <span>Départ : {selectedRoute.waypoints[0].name.split(' ')[0]}</span>
                  <span>{progressPercent}%</span>
                  <span>Arrivée : {endSite.name.split(' ')[0]}</span>
                </div>
              </div>

              {/* Play / Pause / Reset Buttons */}
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={toggleSimulation}
                  className={`px-6 py-2.5 rounded-2xl text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                    isSimulationPlaying
                      ? 'bg-amber-500 hover:bg-amber-600 text-stone-950'
                      : 'bg-[#135ca5] hover:bg-[#0c3f74] text-white'
                  }`}
                >
                  {isSimulationPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Mettre en Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>{simulationProgress >= 1 ? 'Recommencer Trajet' : 'Démarrer Déplacement'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetSimulation}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Revenir au point de départ"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réinitialiser</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Metrics, Group Compass, Rituals (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Live Flight / Transit HUD Card */}
          <div className="bg-gradient-to-br from-stone-900 to-slate-950 text-white rounded-3xl p-5 border border-stone-800 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-stone-200">
                  Métriques de Progression
                </h3>
              </div>
              <span className="text-[10px] text-amber-400 font-mono font-bold">
                {accuracy ? `±${accuracy}m GPS` : 'Simulation Active'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Metric 1: Vitesse */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-stone-400 block font-semibold">Vitesse Instantanée</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-white">{speedKmH}</span>
                  <span className="text-[11px] text-stone-400">km/h</span>
                </div>
                <span className="text-[9px] text-[#f15a24] font-semibold mt-0.5 block">
                  {travelMode === 'BUS' ? 'Convoi Navette' : 'Allure Marche'}
                </span>
              </div>

              {/* Metric 2: Distance Restante */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-stone-400 block font-semibold">Distance Restante</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-amber-400">
                    {formatDistance(distanceToDestinationKm)}
                  </span>
                </div>
                <span className="text-[9px] text-stone-400 mt-0.5 block truncate">
                  vers {endSite.name.split(' ')[0]}
                </span>
              </div>

              {/* Metric 3: ETA */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-stone-400 block font-semibold">Arrivée Estimée</span>
                <div className="mt-1">
                  <span className="text-lg font-black text-emerald-400">{eta}</span>
                </div>
                <span className="text-[9px] text-stone-400 mt-0.5 block">Sous réserve d’affluence</span>
              </div>

              {/* Metric 4: Cap Kaaba / Qibla */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-stone-400 block font-semibold">Direction Kaaba</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <div
                    className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0"
                    style={{ transform: `rotate(${bearingToKaaba}deg)` }}
                  >
                    ↑
                  </div>
                  <span className="text-sm font-black text-white">{Math.round(bearingToKaaba)}°</span>
                </div>
                <span className="text-[9px] text-stone-400 mt-0.5 block">
                  {getCardinalDirection(bearingToKaaba)}
                </span>
              </div>
            </div>

            {/* Next Checkpoint Waypoint Note */}
            <div className="p-3 rounded-2xl bg-[#135ca5]/20 border border-[#135ca5]/40 text-xs text-blue-200">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wide block mb-1">
                Prochaine balise d'étape :
              </span>
              <p className="font-semibold text-white">
                {selectedRoute.waypoints[Math.min(selectedRoute.waypoints.length - 1, Math.floor(simulationProgress * (selectedRoute.waypoints.length - 1)) + 1)].name}
              </p>
            </div>
          </div>

          {/* Rallier mon Convoi / Guide EVA Voyages Card */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0c3f74] text-white flex items-center justify-center font-bold text-sm">
                  {primaryGuide.vehicleType === 'BUS' ? '🚌' : '👳‍♂️'}
                </div>
                <div>
                  <h3 className="font-bold text-xs text-stone-900">Mon Guide EVA Voyages</h3>
                  <span className="text-[10px] text-stone-500">Convoi Officiel du Package</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                En Ligne
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-600 font-semibold">{primaryGuide.name}</span>
                <span className="text-[11px] text-amber-700 font-bold">{primaryGuide.role}</span>
              </div>

              {/* Relative Vector / Distance To Guide */}
              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-stone-500 uppercase font-bold block">Distance à votre guide</span>
                  <span className="text-base font-extrabold text-[#135ca5]">
                    {formatDistance(distanceToGuideKm)}
                  </span>
                </div>

                {/* Direction Needle to Guide */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full bg-[#135ca5] text-white flex items-center justify-center font-black shadow-md transition-transform"
                    style={{ transform: `rotate(${bearingToGuide}deg)` }}
                    title={`Cap vers le guide : ${Math.round(bearingToGuide)}°`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19V5m0 0l-4 4m4-4l4 4"/>
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-stone-700">
                    {getCardinalDirection(bearingToGuide)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions to reach Guide */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={primaryGuide.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Convoi</span>
              </a>

              <a
                href={`tel:${primaryGuide.phone}`}
                className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#135ca5]" />
                <span>Appeler Guide</span>
              </a>
            </div>
          </div>

          {/* Talbiyah & Rituels du Trajet Accordion */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
            <div
              onClick={() => setIsRitualsExpanded(!isRitualsExpanded)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Talbiyah & Rituels de cette étape</span>
              </div>
              <button
                type="button"
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                {isRitualsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Talbiyah Audio & Text Block */}
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  Invocation Prophétique Recommandée
                </span>
                <button
                  type="button"
                  onClick={handleToggleTalbiyahAudio}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    isAudioPlaying
                      ? 'bg-amber-600 text-white animate-pulse'
                      : 'bg-white text-amber-900 border border-amber-300 shadow-2xs hover:bg-amber-100'
                  }`}
                >
                  <Volume2 className="w-3 h-3 text-amber-600" />
                  <span>{isAudioPlaying ? 'En écoute...' : 'Écouter'}</span>
                </button>
              </div>

              <p className="font-amiri text-lg text-amber-950 font-bold leading-relaxed text-right">
                {selectedRoute.talbiyah.arabic}
              </p>
              <p className="text-[11px] text-amber-900 italic">
                « {selectedRoute.talbiyah.transliteration} »
              </p>
              <p className="text-[11px] text-stone-600">
                {selectedRoute.talbiyah.french}
              </p>
            </div>

            {/* Expandable Ritual Checklist */}
            {isRitualsExpanded && (
              <div className="space-y-2 pt-2 border-t border-stone-100 text-xs animate-fadeIn">
                <span className="text-[11px] font-bold text-stone-800 block">Actions recommandées :</span>
                {selectedRoute.keyRitualActions.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-xl bg-stone-50 border border-stone-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-stone-700 text-[11px]">{action}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sacred Site Detail Modal (When user clicks on any marker) */}
      {selectedSiteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase font-extrabold text-[#135ca5] tracking-wider block">
                  Lieu Saint d'Arabie Saoudite
                </span>
                <h3 className="text-lg font-bold text-stone-900 mt-0.5">
                  {selectedSiteModal.name}
                </h3>
                <p className="font-amiri text-base text-stone-500 font-semibold">
                  {selectedSiteModal.arabicName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSiteModal(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-900 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {selectedSiteModal.description}
            </p>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1.5">
              <p>
                <strong className="text-stone-900">Signification rituelle :</strong>{' '}
                <span className="text-stone-700">{selectedSiteModal.ritualSignificance}</span>
              </p>
              {selectedSiteModal.hajjDay && (
                <p>
                  <strong className="text-stone-900">Jour du Hajj :</strong>{' '}
                  <span className="text-amber-700 font-bold">{selectedSiteModal.hajjDay}</span>
                </p>
              )}
              {selectedSiteModal.elevationMeters && (
                <p>
                  <strong className="text-stone-900">Altitude :</strong>{' '}
                  <span className="text-stone-700">{selectedSiteModal.elevationMeters} m</span>
                </p>
              )}
              <p>
                <strong className="text-stone-900">Distance actuelle :</strong>{' '}
                <span className="text-[#135ca5] font-bold">
                  {formatDistance(nearestSite.distanceKm)}
                </span>
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedSiteModal(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency SOS Panic Modal */}
      {isSosModalOpen && (
        <div className="fixed inset-0 z-50 bg-red-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-red-500 space-y-4">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-red-950">
                  Assistance d'Urgence · Pèlerin Égaré
                </h3>
                <p className="text-xs text-stone-500">
                  Transmettez immédiatement vos coordonnées satellites exactes à la permanence {agencyConfig.name}.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50 rounded-2xl border border-red-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-red-900">
                <span className="font-bold">Vos Coordonnées GPS :</span>
                <span className="font-mono font-bold">{userPosition.lat.toFixed(5)}, {userPosition.lng.toFixed(5)}</span>
              </div>
              <div className="flex justify-between items-center text-stone-600">
                <span>Site le plus proche :</span>
                <span className="font-bold text-stone-800">{nearestSite.site.name} ({formatDistance(nearestSite.distanceKm)})</span>
              </div>
              <div className="flex justify-between items-center text-stone-600">
                <span>Dossier Pèlerin :</span>
                <span className="font-mono font-bold text-[#f15a24]">{currentUser?.linkedTrackingCode || 'EVA-HJ26-9284'}</span>
              </div>
            </div>

            {/* Guide Awa Kane Live Notification Feedback */}
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900 font-semibold animate-fadeIn">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <div>
                <strong className="block text-emerald-950">Alerte transmise en temps réel :</strong>
                <span>Guide Awa Kane (+221 78 639 10 00) et le Back-Office EVA Voyages ont reçu vos coordonnées GPS et se mobilisent.</span>
              </div>
            </div>

            {/* Direct Contact Buttons */}
            <div className="space-y-2">
              <a
                href={`https://wa.me/221786391000?text=${encodeURIComponent(
                  `URGENCE PÈLERIN ÉGARÉ:\nJe suis actuellement égaré(e) lors du déplacement entre les sites sacrés.\nNom: ${currentUser?.name || 'Pèlerin'}\nDossier: ${currentUser?.linkedTrackingCode || 'EVA-HJ26'}\nPosition GPS: https://www.google.com/maps?q=${userPosition.lat},${userPosition.lng}\nProximité: ${nearestSite.site.name}\nMerci de m'indiquer le point de ralliement ou d'envoyer un délégué.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Envoyer SOS WhatsApp avec ma position GPS</span>
              </a>

              <a
                href="tel:+221786391000"
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Appeler la Permanence EVA Voyages (+221 78 639 10 00)</span>
              </a>

              <a
                href="tel:911"
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Numéro Général des Secours Saoudiens (911)</span>
              </a>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSosModalOpen(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
