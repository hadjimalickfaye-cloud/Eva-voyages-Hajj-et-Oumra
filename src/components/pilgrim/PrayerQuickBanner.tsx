import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  fetchPrayerTimes,
  calculateNextPrayer,
  NextPrayerStatus,
  AladhanPrayerData,
  PILGRIMAGE_LOCATIONS,
  PilgrimAdhanAudio,
} from '../../utils/prayerTimesApi';
import { Clock, ArrowRight, Volume2, Sparkles, MapPin } from 'lucide-react';

export const PrayerQuickBanner: React.FC = () => {
  const { setPilgrimActiveTab } = useApp();
  const [prayerData, setPrayerData] = useState<AladhanPrayerData | null>(null);
  const [nextStatus, setNextStatus] = useState<NextPrayerStatus | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const makkahLoc = PILGRIMAGE_LOCATIONS[0]; // Makkah

  useEffect(() => {
    let isMounted = true;
    fetchPrayerTimes(makkahLoc.lat, makkahLoc.lng, 4, new Date())
      .then((data) => {
        if (isMounted) setPrayerData(data);
      })
      .catch((e) => console.warn('PrayerQuickBanner load error', e));

    return () => {
      isMounted = false;
    };
  }, [makkahLoc.lat, makkahLoc.lng]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (prayerData?.timings) {
        const status = calculateNextPrayer(prayerData.timings, new Date(), makkahLoc.timezone);
        setNextStatus(status);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [prayerData, makkahLoc.timezone]);

  const handlePlayAdhan = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      PilgrimAdhanAudio.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      await PilgrimAdhanAudio.playAdhanChime();
      setIsPlaying(false);
    }
  };

  return (
    <div
      onClick={() => setPilgrimActiveTab('PRAYER')}
      className="mb-6 bg-gradient-to-r from-[#0c3f74] to-[#135ca5] text-white rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-blue-400/20 group"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">
                🕋 Makkah al-Mukarramah · Prochaine Prière
              </span>
              {prayerData?.date?.hijri && (
                <span className="text-[10px] text-stone-300 hidden md:inline">
                  ({prayerData.date.hijri.day} {prayerData.date.hijri.monthAr} {prayerData.date.hijri.year}هـ)
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-sm sm:text-base font-extrabold text-white">
                {nextStatus ? nextStatus.nextPrayer.nameFr : 'Chargement...'}
              </span>
              {nextStatus && (
                <>
                  <span className="font-amiri text-amber-300 font-bold text-base">
                    {nextStatus.nextPrayer.nameAr}
                  </span>
                  <span className="text-xs text-stone-200">
                    à <strong className="text-white font-mono">{nextStatus.nextPrayer.time}</strong>
                  </span>
                  <span className="text-xs text-amber-200 font-mono tabular-nums font-bold">
                    (dans {nextStatus.timeString})
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handlePlayAdhan}
            className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              isPlaying ? 'bg-amber-400 text-stone-900 animate-pulse' : 'bg-white/10 hover:bg-white/20 text-stone-200'
            }`}
            title="Écouter Adhan"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isPlaying ? 'Arrêter' : 'Adhan'}</span>
          </button>

          <span className="px-3 py-1.5 rounded-xl bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1 group-hover:bg-amber-300 transition-colors">
            <span>Horaires & Rituels</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
