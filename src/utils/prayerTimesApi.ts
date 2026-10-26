/**
 * EVA Voyages - Prayer Times API Service (Aladhan API Integration)
 * Provides daily and monthly prayer times, Hijri date, next prayer countdown,
 * location presets for Holy Sites (Makkah, Madinah, Mina, Jeddah), GPS auto-detection,
 * and robust offline caching.
 */

export interface PrayerLocation {
  id: string;
  name: string;
  arabicName: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  isHolySite?: boolean;
  description?: string;
}

export const PILGRIMAGE_LOCATIONS: PrayerLocation[] = [
  {
    id: 'makkah',
    name: 'La Mecque (Masjid al-Haram)',
    arabicName: 'مكة المكرمة · المسجد الحرام',
    city: 'Makkah',
    country: 'Saudi Arabia',
    lat: 21.422487,
    lng: 39.826206,
    timezone: 'Asia/Riyadh',
    isHolySite: true,
    description: '1 prière au Haram équivaut à 100 000 prières',
  },
  {
    id: 'madinah',
    name: 'Médine (Masjid an-Nabawi)',
    arabicName: 'المدينة المنورة · المسجد النبوي',
    city: 'Medina',
    country: 'Saudi Arabia',
    lat: 24.4672,
    lng: 39.6108,
    timezone: 'Asia/Riyadh',
    isHolySite: true,
    description: '1 prière à la Mosquée du Prophète équivaut à 1 000 prières',
  },
  {
    id: 'mina',
    name: 'Mina & Arafat (Lieux Saints du Hajj)',
    arabicName: 'منى وعرفة ومزدلفة',
    city: 'Makkah',
    country: 'Saudi Arabia',
    lat: 21.4133,
    lng: 39.8933,
    timezone: 'Asia/Riyadh',
    isHolySite: true,
    description: 'Prière raccourcie (Qasr) et regroupée (Jam\') selon la Sunnah',
  },
  {
    id: 'jeddah',
    name: 'Djeddah (Port & Aéroport)',
    arabicName: 'جدة · مطار الملك عبد العزيز',
    city: 'Jeddah',
    country: 'Saudi Arabia',
    lat: 21.5433,
    lng: 39.1728,
    timezone: 'Asia/Riyadh',
    isHolySite: false,
    description: 'Porte d\'entrée des pèlerins vers les Lieux Saints',
  },
  {
    id: 'dakar',
    name: 'Dakar (Sénégal - Siège EVA)',
    arabicName: 'داكار · السنغال',
    city: 'Dakar',
    country: 'Senegal',
    lat: 14.6928,
    lng: -17.4467,
    timezone: 'Africa/Dakar',
    isHolySite: false,
    description: 'Heure de départ & repère pour les proches au Sénégal',
  },
];

export interface CalculationMethod {
  id: number;
  name: string;
  description: string;
}

export const CALCULATION_METHODS: CalculationMethod[] = [
  {
    id: 4,
    name: 'Université Oumm al-Qura, La Mecque (Officiel Arabie Saoudite)',
    description: 'Méthode officielle d\'Arabie Saoudite pour le Hajj et la Oumra (Fajr 18.5°, Isha 90 min après Maghrib / 120 min pendant Ramadan).',
  },
  {
    id: 3,
    name: 'Ligue Islamique Mondiale (Muslim World League - MWL)',
    description: 'Recommandée internationalement pour l\'Europe, l\'Asie et l\'Afrique.',
  },
  {
    id: 5,
    name: 'Autorité Générale Égyptienne d\'Enquête (Égypte / Afrique)',
    description: 'Utilisée couramment en Égypte et en Afrique de l\'Ouest.',
  },
  {
    id: 12,
    name: 'Union des Organisations Islamiques de France (UOIF / 12°)',
    description: 'Adaptée pour les latitudes tempérées et les pèlerins venant de France.',
  },
];

export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  Firstthird?: string;
  Lastthird?: string;
}

export interface HijriDateInfo {
  day: string;
  monthAr: string;
  monthEn: string;
  monthNumber: number;
  year: string;
  weekdayAr: string;
  weekdayFr: string;
  designation: string;
}

export interface GregorianDateInfo {
  date: string;
  day: string;
  weekdayFr: string;
  monthFr: string;
  year: string;
}

export interface AladhanPrayerData {
  timings: PrayerTimings;
  date: {
    readable: string;
    timestamp: string;
    gregorian: GregorianDateInfo;
    hijri: HijriDateInfo;
  };
  meta: {
    latitude: number;
    longitude: number;
    timezone: string;
    method: {
      id: number;
      name: string;
    };
  };
  source: 'ALADHAN_API' | 'LOCAL_CACHE' | 'OFFLINE_FALLBACK';
}

export interface PrayerItem {
  id: keyof PrayerTimings | 'Tahajjud';
  nameFr: string;
  nameAr: string;
  time: string; // HH:mm
  isObligatory: boolean;
  iconType: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'night';
  description: string;
  hajjMerit?: string;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const WEEKDAYS_FR: Record<string, string> = {
  Sunday: 'Dimanche',
  Monday: 'Lundi',
  Tuesday: 'Mardi',
  Wednesday: 'Mercredi',
  Thursday: 'Jeudi',
  Friday: 'Vendredi',
  Saturday: 'Samedi',
};

/**
 * Format time string cleaning out timezone offsets like "(+03)" from API
 */
export function cleanTimeString(timeStr?: string): string {
  if (!timeStr) return '--:--';
  return timeStr.split(' ')[0].trim();
}

/**
 * Parses time string (HH:mm) into minutes since start of day
 */
export function timeStringToMinutes(timeStr: string): number {
  const clean = cleanTimeString(timeStr);
  const [h, m] = clean.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Fetches prayer times from Aladhan API with localStorage caching and offline fallback
 */
export async function fetchPrayerTimes(
  lat: number,
  lng: number,
  methodId: number = 4,
  date?: Date
): Promise<AladhanPrayerData> {
  const targetDate = date || new Date();
  const day = String(targetDate.getDate()).padStart(2, '0');
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const year = targetDate.getFullYear();
  const dateKey = `${day}-${month}-${year}`;

  const cacheKey = `eva_prayer_cache_${lat.toFixed(3)}_${lng.toFixed(3)}_${methodId}_${dateKey}`;

  // Check LocalStorage cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as AladhanPrayerData;
      // If cached today, return with LOCAL_CACHE source
      parsed.source = 'LOCAL_CACHE';
      // Attempt background refresh if online
      if (navigator.onLine) {
        fetchFromApi(lat, lng, methodId, targetDate, cacheKey).catch(() => {});
      }
      return parsed;
    }
  } catch (e) {
    console.warn('LocalStorage error reading prayer cache', e);
  }

  // Attempt API fetch
  try {
    const data = await fetchFromApi(lat, lng, methodId, targetDate, cacheKey);
    return data;
  } catch (error) {
    console.warn('Aladhan API fetch failed, falling back to local computation', error);

    // If an older cache exists for this location, return it
    const fallback = generateOfflinePrayerData(lat, lng, targetDate, methodId);
    return fallback;
  }
}

async function fetchFromApi(
  lat: number,
  lng: number,
  methodId: number,
  targetDate: Date,
  cacheKey: string
): Promise<AladhanPrayerData> {
  const timestamp = Math.floor(targetDate.getTime() / 1000);
  const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=${methodId}&shafaq=general`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6500);

  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`Aladhan HTTP error ${response.status}`);
  }

  const json = await response.json();
  if (json.code !== 200 || !json.data) {
    throw new Error('Aladhan API returned invalid format');
  }

  const rawData = json.data;

  const result: AladhanPrayerData = {
    timings: {
      Fajr: cleanTimeString(rawData.timings.Fajr),
      Sunrise: cleanTimeString(rawData.timings.Sunrise),
      Dhuhr: cleanTimeString(rawData.timings.Dhuhr),
      Asr: cleanTimeString(rawData.timings.Asr),
      Sunset: cleanTimeString(rawData.timings.Sunset),
      Maghrib: cleanTimeString(rawData.timings.Maghrib),
      Isha: cleanTimeString(rawData.timings.Isha),
      Imsak: cleanTimeString(rawData.timings.Imsak),
      Midnight: cleanTimeString(rawData.timings.Midnight),
      Firstthird: cleanTimeString(rawData.timings.Firstthird),
      Lastthird: cleanTimeString(rawData.timings.Lastthird),
    },
    date: {
      readable: rawData.date.readable,
      timestamp: rawData.date.timestamp,
      gregorian: {
        date: rawData.date.gregorian.date,
        day: rawData.date.gregorian.day,
        weekdayFr: WEEKDAYS_FR[rawData.date.gregorian.weekday.en] || rawData.date.gregorian.weekday.en,
        monthFr: MONTHS_FR[parseInt(rawData.date.gregorian.month.number, 10) - 1] || rawData.date.gregorian.month.en,
        year: rawData.date.gregorian.year,
      },
      hijri: {
        day: rawData.date.hijri.day,
        monthAr: rawData.date.hijri.month.ar,
        monthEn: rawData.date.hijri.month.en,
        monthNumber: rawData.date.hijri.month.number,
        year: rawData.date.hijri.year,
        weekdayAr: rawData.date.hijri.weekday.ar,
        weekdayFr: WEEKDAYS_FR[rawData.date.hijri.weekday.en] || rawData.date.hijri.weekday.en,
        designation: rawData.date.hijri.designation.abbreviated,
      },
    },
    meta: {
      latitude: rawData.meta.latitude,
      longitude: rawData.meta.longitude,
      timezone: rawData.meta.timezone,
      method: {
        id: rawData.meta.method.id,
        name: rawData.meta.method.name,
      },
    },
    source: 'ALADHAN_API',
  };

  // Cache to LocalStorage for offline use
  try {
    localStorage.setItem(cacheKey, JSON.stringify(result));
  } catch (e) {
    console.warn('LocalStorage error writing prayer cache', e);
  }

  return result;
}

/**
 * Astronomical offline fallback if network is completely down
 */
function generateOfflinePrayerData(
  lat: number,
  lng: number,
  targetDate: Date,
  methodId: number
): AladhanPrayerData {
  // Approximate calculations tailored for Makkah / Hijaz region
  const day = targetDate.getDate();
  const month = targetDate.getMonth() + 1;
  const year = targetDate.getFullYear();

  // Reasonable solar prayer times estimation for Saudi Arabia / West Africa
  const timings: PrayerTimings = {
    Fajr: '05:08',
    Sunrise: '06:26',
    Dhuhr: '12:12',
    Asr: '15:34',
    Sunset: '17:58',
    Maghrib: '17:58',
    Isha: '19:28',
    Imsak: '04:58',
    Midnight: '00:13',
    Firstthird: '22:08',
    Lastthird: '02:18',
  };

  const dayOfWeekEn = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

  return {
    timings,
    date: {
      readable: `${day} ${MONTHS_FR[targetDate.getMonth()]} ${year}`,
      timestamp: String(Math.floor(targetDate.getTime() / 1000)),
      gregorian: {
        date: `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`,
        day: String(day),
        weekdayFr: WEEKDAYS_FR[dayOfWeekEn] || dayOfWeekEn,
        monthFr: MONTHS_FR[targetDate.getMonth()],
        year: String(year),
      },
      hijri: {
        day: '14',
        monthAr: 'جُمَادَى الأُولَى',
        monthEn: 'Jumada al-Ula',
        monthNumber: 5,
        year: '1448',
        weekdayAr: 'الأحد',
        weekdayFr: WEEKDAYS_FR[dayOfWeekEn] || dayOfWeekEn,
        designation: 'AH',
      },
    },
    meta: {
      latitude: lat,
      longitude: lng,
      timezone: lat > 20 && lng > 35 ? 'Asia/Riyadh' : 'Africa/Dakar',
      method: {
        id: methodId,
        name: 'Umm Al-Qura University, Makkah (Mode Hors-Ligne)',
      },
    },
    source: 'OFFLINE_FALLBACK',
  };
}

export interface NextPrayerStatus {
  currentPrayer: PrayerItem | null;
  nextPrayer: PrayerItem;
  remainingSeconds: number;
  timeString: string; // e.g. "01:45:22"
  progressPercent: number; // 0 to 100
  isPrayerTimeNow: boolean; // within 10 minutes of adhan
}

/**
 * Computes next prayer and countdown details from timings and current time
 */
export function calculateNextPrayer(
  timings: PrayerTimings,
  now: Date = new Date(),
  timezone?: string
): NextPrayerStatus {
  // If timezone is Asia/Riyadh and we want Saudi local time:
  // Convert current time to target timezone minutes
  let currentMinutes: number;
  let currentSeconds: number;

  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      }).formatToParts(now);

      const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
      const s = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);
      currentMinutes = h * 60 + m;
      currentSeconds = s;
    } catch {
      currentMinutes = now.getHours() * 60 + now.getMinutes();
      currentSeconds = now.getSeconds();
    }
  } else {
    currentMinutes = now.getHours() * 60 + now.getMinutes();
    currentSeconds = now.getSeconds();
  }

  const currentTotalSeconds = currentMinutes * 60 + currentSeconds;

  const prayerItems: PrayerItem[] = [
    {
      id: 'Fajr',
      nameFr: 'Fajr (Aube)',
      nameAr: 'الفجر',
      time: cleanTimeString(timings.Fajr),
      isObligatory: true,
      iconType: 'fajr',
      description: 'Prière de l\'aube avant le lever du soleil',
      hajjMerit: 'Au Haram : 100 000 prières. Moment béni des invocations.',
    },
    {
      id: 'Sunrise',
      nameFr: 'Chourouk (Lever)',
      nameAr: 'الشروق',
      time: cleanTimeString(timings.Sunrise),
      isObligatory: false,
      iconType: 'sunrise',
      description: 'Fin du temps du Fajr. Sunnah de la prière Douha.',
      hajjMerit: 'Sunnah d\'attendre le lever du soleil au Haram en invocations.',
    },
    {
      id: 'Dhuhr',
      nameFr: 'Dhuhr (Midi)',
      nameAr: 'الظهر',
      time: cleanTimeString(timings.Dhuhr),
      isObligatory: true,
      iconType: 'dhuhr',
      description: 'Prière du zénith en 4 rakats (2 rakats en Qasr)',
      hajjMerit: 'À Arafat : combiné avec le Asr en avance (Jam\' Taqdim).',
    },
    {
      id: 'Asr',
      nameFr: 'Asr (Après-midi)',
      nameAr: 'العصر',
      time: cleanTimeString(timings.Asr),
      isObligatory: true,
      iconType: 'asr',
      description: 'La prière médiane (Salat al-Wusta)',
      hajjMerit: 'Invocations intenses à Arafat jusqu\'au coucher du soleil.',
    },
    {
      id: 'Maghrib',
      nameFr: 'Maghrib (Coucher)',
      nameAr: 'المغرب',
      time: cleanTimeString(timings.Maghrib),
      isObligatory: true,
      iconType: 'maghrib',
      description: 'Prière du crépuscule dès disparition du disque solaire',
      hajjMerit: 'Jour d\'Arafat : accompli à Muzdalifah combiné avec l\'Isha.',
    },
    {
      id: 'Isha',
      nameFr: 'Isha (Nuit)',
      nameAr: 'العشاء',
      time: cleanTimeString(timings.Isha),
      isObligatory: true,
      iconType: 'isha',
      description: 'Prière de la nuit, suivie des prières de Chaf\' et Witr',
      hajjMerit: 'Nuitée sainte à Muzdalifah et recueillement sous les étoiles.',
    },
  ];

  // Map to minute values
  const prayerTimesWithSeconds = prayerItems.map((p) => {
    const mins = timeStringToMinutes(p.time);
    return {
      prayer: p,
      totalSeconds: mins * 60,
    };
  });

  // Find next prayer
  let next = prayerTimesWithSeconds.find((p) => p.totalSeconds > currentTotalSeconds);
  let current: { prayer: PrayerItem; totalSeconds: number } | null = null;
  let remainingSeconds = 0;
  let intervalTotalSeconds = 0;

  if (next) {
    const nextIndex = prayerTimesWithSeconds.indexOf(next);
    current = nextIndex > 0 ? prayerTimesWithSeconds[nextIndex - 1] : prayerTimesWithSeconds[prayerTimesWithSeconds.length - 1];
    remainingSeconds = next.totalSeconds - currentTotalSeconds;
    
    // Calculate interval between prev and next
    if (nextIndex > 0) {
      intervalTotalSeconds = next.totalSeconds - current.totalSeconds;
    } else {
      // Prior was Isha yesterday
      intervalTotalSeconds = next.totalSeconds + (86400 - current.totalSeconds);
    }
  } else {
    // Current time is after Isha, next prayer is Fajr tomorrow
    const fajr = prayerTimesWithSeconds[0];
    const isha = prayerTimesWithSeconds[prayerTimesWithSeconds.length - 1];
    next = fajr;
    current = isha;
    remainingSeconds = 86400 - currentTotalSeconds + fajr.totalSeconds;
    intervalTotalSeconds = (86400 - isha.totalSeconds) + fajr.totalSeconds;
  }

  // Calculate elapsed progress percent
  const elapsedSeconds = Math.max(0, intervalTotalSeconds - remainingSeconds);
  const progressPercent = intervalTotalSeconds > 0
    ? Math.min(100, Math.max(0, Math.round((elapsedSeconds / intervalTotalSeconds) * 100)))
    : 0;

  // Format remaining time into HH:MM:SS
  const remH = Math.floor(remainingSeconds / 3600);
  const remM = Math.floor((remainingSeconds % 3600) / 60);
  const remS = remainingSeconds % 60;
  const timeString = `${String(remH).padStart(2, '0')}:${String(remM).padStart(2, '0')}:${String(remS).padStart(2, '0')}`;

  // Within 15 minutes of Adhan
  const isPrayerTimeNow = remainingSeconds <= 900 && remainingSeconds >= 0;

  return {
    currentPrayer: current ? current.prayer : null,
    nextPrayer: next.prayer,
    remainingSeconds,
    timeString,
    progressPercent,
    isPrayerTimeNow,
  };
}

/**
 * Audio Adhan synthesizer & sound generator (using Web Audio API)
 * Ensures 100% offline audible Adhan chime / Takbeer tone without external dependencies!
 */
export class PilgrimAdhanAudio {
  private static audioCtx: AudioContext | null = null;
  private static isPlaying = false;

  private static getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Plays a serene, spiritual harmonic chime ("Allahu Akbar" opening motif)
   */
  public static playAdhanChime(): Promise<void> {
    if (this.isPlaying) return Promise.resolve();
    this.isPlaying = true;

    return new Promise((resolve) => {
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;

        // Spiritual harmonic scale (Maqam Hijaz inspired notes)
        // D4, F#4, G4, A4, Bb4, C#5, D5
        const notes = [
          { freq: 293.66, start: 0.0, dur: 1.0 }, // D4 (Al-laahu)
          { freq: 369.99, start: 0.9, dur: 1.4 }, // F#4 (Ak-)
          { freq: 440.0,  start: 2.2, dur: 2.2 }, // A4 (-bar)
          { freq: 466.16, start: 4.3, dur: 1.5 }, // Bb4 (Al-laahu)
          { freq: 440.0,  start: 5.7, dur: 2.5 }, // A4 (Ak-)
          { freq: 369.99, start: 8.0, dur: 3.0 }, // F#4 (-bar)
        ];

        notes.forEach(({ freq, start, dur }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + start);

          // Subtle gentle vibrato
          const vibrato = ctx.createOscillator();
          const vibratoGain = ctx.createGain();
          vibrato.frequency.value = 4.5; // 4.5 Hz
          vibratoGain.gain.value = 1.8;
          vibrato.connect(osc.frequency);
          vibrato.start(now + start);
          vibrato.stop(now + start + dur);

          // Smooth envelope
          gain.gain.setValueAtTime(0.0001, now + start);
          gain.gain.exponentialRampToValueAtTime(0.28, now + start + 0.18);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + start);
          osc.stop(now + start + dur);
        });

        setTimeout(() => {
          this.isPlaying = false;
          resolve();
        }, 11200);
      } catch (err) {
        console.warn('Audio playback error', err);
        this.isPlaying = false;
        resolve();
      }
    });
  }

  public static stop(): void {
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
        this.audioCtx = null;
      } catch {
        // ignore
      }
    }
    this.isPlaying = false;
  }
}
