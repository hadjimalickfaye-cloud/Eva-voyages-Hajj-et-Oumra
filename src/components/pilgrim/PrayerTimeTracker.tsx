import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  PrayerLocation,
  PILGRIMAGE_LOCATIONS,
  CALCULATION_METHODS,
  CalculationMethod,
  PrayerTimings,
  AladhanPrayerData,
  PrayerItem,
  fetchPrayerTimes,
  calculateNextPrayer,
  NextPrayerStatus,
  PilgrimAdhanAudio,
  cleanTimeString,
} from '../../utils/prayerTimesApi';
import {
  Clock,
  Compass,
  MapPin,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Sparkles,
  Info,
  Calendar,
  RotateCw,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  CloudSun,
  CheckCircle2,
  Share2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  BookOpen,
} from 'lucide-react';

export const PrayerTimeTracker: React.FC = () => {
  const { setPilgrimActiveTab } = useApp();

  // Location selection (Default: Makkah al-Mukarramah)
  const [selectedLocation, setSelectedLocation] = useState<PrayerLocation>(PILGRIMAGE_LOCATIONS[0]);
  const [isUsingGps, setIsUsingGps] = useState<boolean>(false);
  const [gpsLocation, setGpsLocation] = useState<PrayerLocation | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Calculation method (Default: Umm al-Qura University, Makkah - Method 4)
  const [selectedMethodId, setSelectedMethodId] = useState<number>(4);
  const [isMethodModalOpen, setIsMethodModalOpen] = useState<boolean>(false);

  // Prayer data state
  const [prayerData, setPrayerData] = useState<AladhanPrayerData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time ticker
  const [nowDate, setNowDate] = useState<Date>(new Date());
  const [nextStatus, setNextStatus] = useState<NextPrayerStatus | null>(null);

  // Audio & Notifications
  const [isPlayingAdhan, setIsPlayingAdhan] = useState<boolean>(false);
  const [soundNotificationEnabled, setSoundNotificationEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('eva_adhan_alert_enabled') === 'true';
    } catch {
      return false;
    }
  });
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Selected date for query (defaults to today)
  const [activeDateOffset, setActiveDateOffset] = useState<number>(0); // 0 = today, +1 = tomorrow, -1 = yesterday
  const [showFiqhGuide, setShowFiqhGuide] = useState<boolean>(false);

  // Active location coordinates
  const activeLocation = isUsingGps && gpsLocation ? gpsLocation : selectedLocation;

  // 1. Fetch Prayer Times when location, method, or date changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const targetDate = new Date();
    if (activeDateOffset !== 0) {
      targetDate.setDate(targetDate.getDate() + activeDateOffset);
    }

    fetchPrayerTimes(activeLocation.lat, activeLocation.lng, selectedMethodId, targetDate)
      .then((data) => {
        if (isMounted) {
          setPrayerData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error in fetchPrayerTimes:', err);
          setError('Impossible de récupérer les horaires via Aladhan API. Utilisation du mode hors-ligne.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeLocation.lat, activeLocation.lng, selectedMethodId, activeDateOffset]);

  // 2. Real-time countdown timer ticking every second
  useEffect(() => {
    const timer = setInterval(() => {
      const current = new Date();
      setNowDate(current);

      if (prayerData?.timings) {
        const status = calculateNextPrayer(prayerData.timings, current, activeLocation.timezone);
        setNextStatus(status);

        // If prayer time reached (remainingSeconds === 0) and sound alerts enabled
        if (status.remainingSeconds === 0 && soundNotificationEnabled) {
          PilgrimAdhanAudio.playAdhanChime();
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`C'est l'heure de la prière : ${status.nextPrayer.nameFr}`, {
              body: `Horaires officiels à ${activeLocation.name}. L'appel à la prière retentit.`,
              icon: '/logo.png',
            });
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [prayerData, activeLocation.timezone, soundNotificationEnabled, activeLocation.name]);

  // Handle GPS location detection
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Determine if inside Saudi Arabia (roughly lat 16-32, lng 34-55)
        const isSaudi = lat >= 16 && lat <= 32 && lng >= 34 && lng <= 55;

        const customGpsLoc: PrayerLocation = {
          id: 'gps_device',
          name: isSaudi ? 'Position GPS en Arabie Saoudite' : 'Votre Position GPS Actuelle',
          arabicName: isSaudi ? 'المملكة العربية السعودية · موقعك الحالي' : 'موقعك الجغرافي الحالي',
          city: isSaudi ? 'Arabie Saoudite' : 'Position Détectée',
          country: isSaudi ? 'Saudi Arabia' : 'Local',
          lat,
          lng,
          timezone: isSaudi ? 'Asia/Riyadh' : Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Riyadh',
          isHolySite: isSaudi,
          description: `Coordonnées GPS : ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`,
        };

        setGpsLocation(customGpsLoc);
        setIsUsingGps(true);
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(`Erreur GPS (${err.message}). Veuillez autoriser l'accès à la localisation.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Toggle Adhan audio preview
  const handleToggleAdhan = async () => {
    if (isPlayingAdhan) {
      PilgrimAdhanAudio.stop();
      setIsPlayingAdhan(false);
    } else {
      setIsPlayingAdhan(true);
      await PilgrimAdhanAudio.playAdhanChime();
      setIsPlayingAdhan(false);
    }
  };

  // Toggle notification permission & alert
  const handleToggleNotification = async () => {
    const nextVal = !soundNotificationEnabled;
    setSoundNotificationEnabled(nextVal);
    try {
      localStorage.setItem('eva_adhan_alert_enabled', String(nextVal));
    } catch {
      // ignore
    }

    if (nextVal && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      } catch (e) {
        console.warn('Notification permission error', e);
      }
    }
  };

  // Helper icon for prayers
  const renderPrayerIcon = (type: PrayerItem['iconType'], className = 'w-5 h-5') => {
    switch (type) {
      case 'fajr':
        return <Sunrise className={className} />;
      case 'sunrise':
        return <Sun className={className} />;
      case 'dhuhr':
        return <Sun className={className} />;
      case 'asr':
        return <CloudSun className={className} />;
      case 'maghrib':
        return <Sunset className={className} />;
      case 'isha':
      case 'night':
        return <Moon className={className} />;
      default:
        return <Clock className={className} />;
    }
  };

  // Extract prayer cards list from timings
  const prayerCards: PrayerItem[] = prayerData?.timings
    ? [
        {
          id: 'Fajr',
          nameFr: 'Fajr',
          nameAr: 'الفجر',
          time: cleanTimeString(prayerData.timings.Fajr),
          isObligatory: true,
          iconType: 'fajr',
          description: 'Prière de l\'aube (2 rakats sunnah + 2 rakats fard)',
          hajjMerit: 'Au Haram : 100 000 prières. Moment béni pour le Tawaf.',
        },
        {
          id: 'Sunrise',
          nameFr: 'Chourouk',
          nameAr: 'الشروق',
          time: cleanTimeString(prayerData.timings.Sunrise),
          isObligatory: false,
          iconType: 'sunrise',
          description: 'Lever du soleil · Prière de la Douha recommandée',
          hajjMerit: 'Sunnah d\'invoquer jusqu\'au lever du soleil au Masjid al-Haram.',
        },
        {
          id: 'Dhuhr',
          nameFr: 'Dhuhr',
          nameAr: 'الظهر',
          time: cleanTimeString(prayerData.timings.Dhuhr),
          isObligatory: true,
          iconType: 'dhuhr',
          description: 'Prière du zénith (4 rakats / 2 rakats en voyage Qasr)',
          hajjMerit: 'À Arafat : prié combiné et raccourci avec le Asr.',
        },
        {
          id: 'Asr',
          nameFr: 'Asr',
          nameAr: 'العصر',
          time: cleanTimeString(prayerData.timings.Asr),
          isObligatory: true,
          iconType: 'asr',
          description: 'Prière médiane (4 rakats / 2 rakats en voyage Qasr)',
          hajjMerit: 'Jour d\'Arafat : le moment culminant des invocations.',
        },
        {
          id: 'Maghrib',
          nameFr: 'Maghrib',
          nameAr: 'المغرب',
          time: cleanTimeString(prayerData.timings.Maghrib),
          isObligatory: true,
          iconType: 'maghrib',
          description: 'Coucher du soleil (3 rakats non raccourcies)',
          hajjMerit: 'Pendant le Hajj : accompli à Muzdalifah combiné avec l\'Isha.',
        },
        {
          id: 'Isha',
          nameFr: 'Isha',
          nameAr: 'العشاء',
          time: cleanTimeString(prayerData.timings.Isha),
          isObligatory: true,
          iconType: 'isha',
          description: 'Prière de la nuit (4 rakats / 2 rakats en Qasr)',
          hajjMerit: 'Accomplie sous le ciel étoilé de Muzdalifah avec le Maghrib.',
        },
      ]
    : [];

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Top Banner & Title with Zero-pill discipline */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-amiri text-2xl text-[#135ca5] font-bold">
                حَيَّ عَلَى الصَّلَاةِ · حَيَّ عَلَى الْفَلَاحِ
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
              Horaires des Prières en Arabie Saoudite & Lieux Saints
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span className="font-bold text-[#135ca5]">API Aladhan Officielle</span>
              <span aria-hidden="true">·</span>
              <span>Université Oumm al-Qura (La Mecque)</span>
              <span aria-hidden="true">·</span>
              <span>Calcul Astronomique Précis</span>
              {prayerData?.source === 'LOCAL_CACHE' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 font-medium">Données en cache hors-ligne</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleAdhan}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isPlayingAdhan
                  ? 'bg-amber-500 text-white shadow-md animate-pulse'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
              }`}
              title="Écouter l'appel à la prière"
            >
              {isPlayingAdhan ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#135ca5]" />}
              <span>{isPlayingAdhan ? 'Arrêter Adhan' : 'Écouter Adhan'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleNotification}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                soundNotificationEnabled
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
              title="Activer le rappel sonore à l'heure exacte de la prière"
            >
              {soundNotificationEnabled ? (
                <Bell className="w-4 h-4 text-emerald-600" />
              ) : (
                <BellOff className="w-4 h-4 text-stone-400" />
              )}
              <span>{soundNotificationEnabled ? 'Rappel Actif' : 'Activer Rappel'}</span>
            </button>
          </div>
        </div>

        {/* Location Selector Tabs (Holy Sites vs Current GPS) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">
              Sélectionnez votre Lieu de Pèlerinage :
            </span>
            {isUsingGps && gpsLocation && (
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Position GPS active ({gpsLocation.lat.toFixed(2)}°, {gpsLocation.lng.toFixed(2)}°)</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {PILGRIMAGE_LOCATIONS.map((loc) => {
              const isSelected = !isUsingGps && selectedLocation.id === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    setIsUsingGps(false);
                    setSelectedLocation(loc);
                  }}
                  className={`p-3 rounded-2xl text-left transition-all border cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#135ca5] text-white border-[#135ca5] shadow-sm'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">
                      {loc.id === 'makkah' ? '🕋' : loc.id === 'madinah' ? '🕌' : loc.id === 'mina' ? '⛺' : loc.id === 'jeddah' ? '✈️' : '🇸🇳'}
                    </span>
                    {loc.isHolySite && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        Haram
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <strong className="block text-xs font-bold truncate leading-tight">
                      {loc.name.split(' (')[0]}
                    </strong>
                    <span
                      className={`text-[10px] block truncate font-amiri mt-0.5 ${
                        isSelected ? 'text-amber-200' : 'text-stone-500'
                      }`}
                    >
                      {loc.arabicName.split(' · ')[0]}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* GPS Auto-detect Button */}
            <button
              type="button"
              onClick={handleGetGpsLocation}
              disabled={gpsLoading}
              className={`p-3 rounded-2xl text-left transition-all border cursor-pointer flex flex-col justify-between ${
                isUsingGps
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">📍</span>
                {gpsLoading && <RotateCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
              </div>
              <div className="mt-2">
                <strong className="block text-xs font-bold truncate leading-tight">
                  Ma Position GPS
                </strong>
                <span
                  className={`text-[10px] block truncate mt-0.5 ${
                    isUsingGps ? 'text-emerald-200' : 'text-emerald-700'
                  }`}
                >
                  {gpsLoading ? 'Détection en cours...' : 'GPS Arabie / Direct'}
                </span>
              </div>
            </button>
          </div>

          {gpsError && (
            <div className="mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-xl">
              {gpsError}
            </div>
          )}
        </div>
      </div>

      {/* Dominant Hero Card: Next Prayer & Countdown */}
      <div className="relative bg-gradient-to-br from-[#0c3f74] via-[#135ca5] to-[#092c53] text-white rounded-3xl p-6 sm:p-8 shadow-xl overflow-hidden border border-blue-400/20">
        {/* Background Kaaba Motif or Subtle Radial Glow */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#f15a24]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column: Next Prayer Highlight */}
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-extrabold text-amber-300 bg-amber-400/20 border border-amber-400/30 px-3 py-1 rounded-full">
                Prochaine Prière
              </span>
              {nextStatus?.isPrayerTimeNow && (
                <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 rounded-full animate-pulse">
                  C'est l'heure de la prière !
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {nextStatus ? nextStatus.nextPrayer.nameFr : 'Chargement...'}
              </h2>
              {nextStatus && (
                <span className="font-amiri text-3xl sm:text-4xl text-amber-300 font-bold">
                  {nextStatus.nextPrayer.nameAr}
                </span>
              )}
            </div>

            <p className="text-sm text-stone-200">
              Heure de l'Adhan :{' '}
              <strong className="text-white text-base font-bold font-mono">
                {nextStatus?.nextPrayer.time || '--:--'}
              </strong>{' '}
              · Lieu : <span className="font-semibold text-amber-200">{activeLocation.name}</span>
            </p>

            {/* Date Hijri & Gregorian banner */}
            {prayerData?.date && (
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-stone-300 font-medium">
                <span className="text-amber-300 font-amiri font-bold text-sm">
                  {prayerData.date.hijri.day} {prayerData.date.hijri.monthAr} {prayerData.date.hijri.year}هـ
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {prayerData.date.gregorian.weekdayFr} {prayerData.date.gregorian.day} {prayerData.date.gregorian.monthFr} {prayerData.date.gregorian.year}
                </span>
                <span aria-hidden="true">·</span>
                <span>Fuseau : GMT+3 (Riyadh)</span>
              </div>
            )}
          </div>

          {/* Right Column: Digital Countdown Clock & Progress */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 flex flex-col items-center justify-center text-center min-w-[280px] shadow-lg">
            <span className="text-xs text-stone-300 font-medium uppercase tracking-wider mb-1">
              Temps restant avant l'Adhan
            </span>
            <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white tabular-nums my-1">
              {nextStatus ? nextStatus.timeString : '00:00:00'}
            </div>
            <div className="text-[11px] text-amber-200 font-medium mt-1">
              {nextStatus?.currentPrayer ? (
                <span>Prière actuelle : {nextStatus.currentPrayer.nameFr} ({nextStatus.currentPrayer.time})</span>
              ) : (
                <span>En attente de la prochaine prière</span>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-white/20 rounded-full h-2 mt-4 overflow-hidden">
              <div
                className="bg-amber-400 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${nextStatus?.progressPercent || 0}%` }}
              />
            </div>
            <div className="w-full flex justify-between text-[10px] text-stone-300 mt-1 font-mono">
              <span>{nextStatus?.currentPrayer?.nameFr || 'Précédente'}</span>
              <span>{nextStatus?.progressPercent || 0}%</span>
              <span>{nextStatus?.nextPrayer.nameFr}</span>
            </div>
          </div>
        </div>

        {/* Date Selector Strips (-1 jour, Aujourd'hui, +1 jour) */}
        <div className="mt-6 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-300">Consulter :</span>
            <div className="flex items-center gap-1 p-0.5 bg-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveDateOffset(-1)}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeDateOffset === -1 ? 'bg-white text-stone-900 font-bold' : 'text-stone-200 hover:text-white'
                }`}
              >
                Hier
              </button>
              <button
                type="button"
                onClick={() => setActiveDateOffset(0)}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeDateOffset === 0 ? 'bg-white text-stone-900 font-bold' : 'text-stone-200 hover:text-white'
                }`}
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                onClick={() => setActiveDateOffset(1)}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeDateOffset === 1 ? 'bg-white text-stone-900 font-bold' : 'text-stone-200 hover:text-white'
                }`}
              >
                Demain
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMethodModalOpen(true)}
              className="text-stone-200 hover:text-white underline underline-offset-4 cursor-pointer text-xs flex items-center gap-1"
            >
              <span>Méthode : Oumm al-Qura (Officielle)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid of the 5 Daily Prayers + Shurooq */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900">
            Les 5 Prières Quotidiennes à {activeLocation.name}
          </h2>
          <span className="text-xs text-stone-500">
            Heures exactes de l'Adhan
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-stone-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {prayerCards.map((item) => {
              const isNext = nextStatus?.nextPrayer.id === item.id;
              const isCurrent = nextStatus?.currentPrayer?.id === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                    isNext
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40 shadow-sm'
                      : isCurrent
                      ? 'bg-blue-50/70 border-blue-200 shadow-2xs'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {isNext && (
                    <div className="absolute top-0 right-0 left-0 h-1 bg-amber-400" />
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isNext
                            ? 'bg-amber-400 text-stone-950'
                            : isCurrent
                            ? 'bg-[#135ca5] text-white'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {renderPrayerIcon(item.iconType, 'w-4 h-4')}
                      </div>

                      <span className="font-amiri text-lg font-bold text-stone-700">
                        {item.nameAr}
                      </span>
                    </div>

                    <div className="pt-2">
                      <span className="text-xs font-bold text-stone-600 block">
                        {item.nameFr}
                      </span>
                      <div className="text-2xl font-black text-stone-900 font-mono tracking-tight tabular-nums">
                        {item.time}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-100">
                    {isNext ? (
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-tight block">
                        Prochaine prière
                      </span>
                    ) : isCurrent ? (
                      <span className="text-[10px] font-bold text-[#135ca5] uppercase tracking-tight block">
                        En cours
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-400 block truncate">
                        {item.isObligatory ? 'Obligatoire (Fard)' : 'Sunnah (Douha)'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Additional Pilgrimage Prayer Times (Imsak, Midnight, Last Third for Tahajjud) */}
      {prayerData?.timings && (
        <div className="bg-stone-100/70 rounded-2xl p-4 border border-stone-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-700" />
            <span className="text-xs font-bold text-stone-800">
              Moments Spirituels Clés pour le Pèlerin (Nuits au Haram) :
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <span className="text-stone-500">Imsak (Jeûne) : </span>
              <strong className="font-mono text-stone-900 font-bold">{prayerData.timings.Imsak}</strong>
            </div>
            <span className="text-stone-300">·</span>
            <div>
              <span className="text-stone-500">Minuit Islamique (Nisf al-Layl) : </span>
              <strong className="font-mono text-stone-900 font-bold">{prayerData.timings.Midnight}</strong>
            </div>
            <span className="text-stone-300">·</span>
            <div>
              <span className="text-stone-500">Dernier Tiers (Tahajjud & Duas) : </span>
              <strong className="font-mono text-indigo-800 font-bold">
                {prayerData.timings.Lastthird || '02:18'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Accordion / Callout: Fiqh du Pèlerin en Arabie Saoudite */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
            <Building2 className="w-5 h-5 text-[#135ca5]" />
            <span>Règles de Prière durant le Pèlerinage (Makkah, Madinah, Mina, Arafat)</span>
          </div>

          <button
            type="button"
            onClick={() => setShowFiqhGuide(!showFiqhGuide)}
            className="text-xs font-bold text-[#135ca5] hover:text-[#0c3f74] cursor-pointer"
          >
            {showFiqhGuide ? 'Masquer les conseils' : 'Afficher les conseils de prière'}
          </button>
        </div>

        {showFiqhGuide && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs text-stone-600">
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-1.5">
              <strong className="text-[#0c3f74] font-bold block text-sm">
                1. Les Mérites Immenses au Haram
              </strong>
              <p className="leading-relaxed">
                Le Prophète ﷺ a enseigné qu'une prière accomplie dans la Sainte Mosquée de La Mecque (Masjid al-Haram) équivaut à <strong>100 000 prières</strong> ailleurs, et au Masjid an-Nabawi à Médine à <strong>1 000 prières</strong>. Veillez à accomplir un maximum de prières en groupe au Haram.
              </p>
            </div>

            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-1.5">
              <strong className="text-emerald-950 font-bold block text-sm">
                2. Raccourcissement (Qasr) en Voyage
              </strong>
              <p className="leading-relaxed">
                Durant le voyage et le séjour du Hajj (notamment à Mina), le pèlerin raccourcit les prières de 4 rakats (Dhuhr, Asr, Isha) à <strong>2 rakats</strong>. Le Fajr (2 rakats) et le Maghrib (3 rakats) ne sont jamais raccourcis.
              </p>
            </div>

            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-1.5">
              <strong className="text-amber-950 font-bold block text-sm">
                3. Regroupement (Jam') à Arafat & Muzdalifah
              </strong>
              <p className="leading-relaxed">
                Le 9 Dhul-Hijjah à Arafat, Dhuhr et Asr sont accomplis ensemble en avance (Jam' Taqdim) avec 2 rakats chacun. Le soir à Muzdalifah, Maghrib (3 rakats) et Isha (2 rakats) sont regroupés en retard (Jam' Ta'khir).
              </p>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
              <strong className="text-stone-900 font-bold block text-sm">
                4. Les Deux Rakats après le Tawaf
              </strong>
              <p className="leading-relaxed">
                Après avoir accompli les 7 tours du Tawaf autour de la Kaaba, il est recommandé d'accomplir 2 rakats légères derrière le <strong>Maqam Ibrahim</strong> (ou dans n'importe quel endroit du Haram si la foule est dense) en récitant Sourate Al-Kafirun et Sourate Al-Ikhlas.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Calculation Method Selection Modal */}
      {isMethodModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                Choisir la méthode de calcul astronomique
              </h3>
              <button
                type="button"
                onClick={() => setIsMethodModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Pour le Hajj et la Oumra en Arabie Saoudite, la méthode officielle et recommandée est celle de l'Université Oumm al-Qura de La Mecque.
            </p>

            <div className="space-y-2">
              {CALCULATION_METHODS.map((method) => {
                const isSelected = selectedMethodId === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethodId(method.id);
                      setIsMethodModalOpen(false);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-[#135ca5] text-stone-900'
                        : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-xs font-bold">{method.name}</strong>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#135ca5]" />}
                    </div>
                    <p className="text-[11px] text-stone-500">{method.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsMethodModalOpen(false)}
                className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold cursor-pointer"
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
