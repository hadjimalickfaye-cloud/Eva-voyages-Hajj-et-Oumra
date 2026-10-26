export interface LatLng {
  lat: number;
  lng: number;
}

export interface SacredSite {
  id: string;
  name: string;
  arabicName: string;
  category: 'HARAM' | 'MINA' | 'MUZDALIFAH' | 'ARAFAT' | 'MEDINA' | 'CAMP_AGENCY';
  location: LatLng;
  description: string;
  ritualSignificance: string;
  hajjDay?: string;
  elevationMeters?: number;
  iconType: 'kaaba' | 'tent' | 'crescent' | 'mountain' | 'steles' | 'mosque' | 'flag' | 'bus';
  color: string;
  radiusMeters: number; // Geofence detection radius
}

export interface RouteWaypoint {
  name: string;
  location: LatLng;
  note?: string;
  distanceFromStartKm: number;
  isCheckpoint?: boolean;
}

export interface SacredTransitRoute {
  id: string;
  title: string;
  arabicTitle: string;
  stageName: string;
  hajjDate: string;
  startSiteId: string;
  endSiteId: string;
  distanceKm: number;
  estimatedWalkDurationMinutes: number;
  estimatedBusDurationMinutes: number;
  description: string;
  talbiyah: {
    arabic: string;
    transliteration: string;
    french: string;
  };
  keyRitualActions: string[];
  waypoints: RouteWaypoint[];
  pathCoordinates: [number, number][]; // [lat, lng] array for polyline
}

export interface GuideLocation {
  id: string;
  name: string;
  role: string;
  phone: string;
  whatsapp: string;
  location: LatLng;
  heading: number;
  speedKmH: number;
  status: 'ONLINE' | 'ACTIVE_MOVING' | 'STATIONARY';
  lastUpdated: string;
  vehicleType: 'BUS' | 'WALKING' | 'TENT_OFFICE';
  vehicleNumber?: string;
}

export const SACRED_SITES: Record<string, SacredSite> = {
  AL_HARAM: {
    id: 'AL_HARAM',
    name: 'Masjid al-Haram & Sainte Kaaba',
    arabicName: 'المسجد الحرام والكعبة المشرفة',
    category: 'HARAM',
    location: { lat: 21.4225, lng: 39.8262 },
    description: "Le centre de l'Islam et le lieu le plus saint de la terre. Lieu du Tawaf et du Sa'y (Safa-Marwa).",
    ritualSignificance: 'Tawaf Qudum (arrivée), Tawaf Ifadah (pilier du Hajj), et Tawaf Wadaa (adieu). Prière vaut 100 000 prières.',
    hajjDay: "8, 10 et 12-13 Dhul-Hijjah",
    elevationMeters: 277,
    iconType: 'kaaba',
    color: '#d97706',
    radiusMeters: 600,
  },
  MINA_CAMP: {
    id: 'MINA_CAMP',
    name: 'Campement EVA Voyages - Cité de Mina',
    arabicName: 'مخيم إيفا رحلات بمشعر منى',
    category: 'MINA',
    location: { lat: 21.4133, lng: 39.8933 },
    description: 'Campement officiel EVA Voyages Maktab 42. Tentes climatisées avec assistance médicale et repas.',
    ritualSignificance: "Journée de Tarwiyah (8 Dhul-Hijjah) et séjour des trois jours de Tashriq (11, 12, 13 Dhul-Hijjah).",
    hajjDay: '8, 10, 11, 12 Dhul-Hijjah',
    elevationMeters: 310,
    iconType: 'tent',
    color: '#059669',
    radiusMeters: 800,
  },
  JAMARAT: {
    id: 'JAMARAT',
    name: 'Pont des Jamarat (Stèles de Lapidation)',
    arabicName: 'جسر الجمرات',
    category: 'MINA',
    location: { lat: 21.4194, lng: 39.8732 },
    description: 'Complexe à 5 niveaux pour la lapidation sécurisée des stèles sataniques.',
    ritualSignificance: 'Jour 10: Grande stèle (Al-Aqaba) avec 7 cailloux. Jours 11-12: Les 3 stèles (Sughra, Wusta, Kubra).',
    hajjDay: '10, 11, 12 Dhul-Hijjah',
    elevationMeters: 295,
    iconType: 'steles',
    color: '#dc2626',
    radiusMeters: 450,
  },
  MUZDALIFAH: {
    id: 'MUZDALIFAH',
    name: "Mash'ar al-Haram - Muzdalifah",
    arabicName: 'المشعر الحرام بمزدلفة',
    category: 'MUZDALIFAH',
    location: { lat: 21.3850, lng: 39.9050 },
    description: 'Plaine sacrée sous les étoiles entre Arafat et Mina. Lieu de recueillement et de ramassage des cailloux.',
    ritualSignificance: 'Prière conjointe raccourcie de Maghrib et Isha, nuitée sous la voûte céleste et collecte des cailloux pour les Jamarat.',
    hajjDay: 'Nuit du 9 au 10 Dhul-Hijjah',
    elevationMeters: 300,
    iconType: 'crescent',
    color: '#4f46e5',
    radiusMeters: 1200,
  },
  ARAFAT: {
    id: 'ARAFAT',
    name: 'Mont Arafat & Jabal ar-Rahmah',
    arabicName: 'جبل الرحمة ومسجد نمرة بعرفات',
    category: 'ARAFAT',
    location: { lat: 21.3549, lng: 39.9841 },
    description: 'Le coeur absolu du Hajj : « Al-Hajj Arafah ». Mont de la Miséricorde et Mosquée Nimra.',
    ritualSignificance: 'Station sacrée obligatoire de midi au coucher du soleil (Wouqouf). Invocations ferventes et repentir.',
    hajjDay: '9 Dhul-Hijjah (Jour de Arafat)',
    elevationMeters: 350,
    iconType: 'mountain',
    color: '#b45309',
    radiusMeters: 1500,
  },
  MADINAH_HARAM: {
    id: 'MADINAH_HARAM',
    name: 'Al-Masjid an-Nabawi (Médine)',
    arabicName: 'المسجد النبوي الشريف والروضة المباركة',
    category: 'MEDINA',
    location: { lat: 24.4672, lng: 39.6111 },
    description: 'La Sainte Mosquée du Prophète (saw), le Dôme Vert et la Noble Rawdah.',
    ritualSignificance: 'Salutations au Prophète (saw) et prière dans la Rawdah, jardin du Paradis. Prière vaut 1 000 prières.',
    elevationMeters: 608,
    iconType: 'mosque',
    color: '#047857',
    radiusMeters: 900,
  },
};

export const SACRED_TRANSIT_ROUTES: SacredTransitRoute[] = [
  {
    id: 'MINA_TO_ARAFAT',
    title: 'Mina ➔ Mont Arafat (Jour du Grand Rassemblement)',
    arabicTitle: 'الانتقال من منى إلى صعيد عرفات',
    stageName: 'Étape 2 : Le Pilier Suprême du Hajj',
    hajjDate: '9 Dhul-Hijjah (Matin)',
    startSiteId: 'MINA_CAMP',
    endSiteId: 'ARAFAT',
    distanceKm: 14.5,
    estimatedWalkDurationMinutes: 190,
    estimatedBusDurationMinutes: 45,
    description: 'Déplacement majestueux des pèlerins au lever du soleil du 9 Dhul-Hijjah vers la plaine bénie de Arafat en scandant la Talbiyah.',
    talbiyah: {
      arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لاَ شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لاَ شَرِيكَ لَكَ',
      transliteration: 'Labbayka Allāhumma Labbayk, Labbayka Lā Sharīka Laka Labbayk, Inna-l-Ḥamda Wan-Ni’mata Laka Wal-Mulk, Lā Sharīka Lak',
      french: 'Me voici à Toi, Seigneur, me voici ! Tu n’as aucun associé, me voici ! Certes, la louange, les bienfaits et la royauté T’appartiennent ! Tu n’as aucun associé !',
    },
    keyRitualActions: [
      'Réciter continuellement la Talbiyah tout au long du trajet',
      "Passage près de la Mosquée Nimra à l'entrée d'Arafat",
      'Regroupement sous les tentes EVA Voyages Zone C à Arafat',
      'Accomplir les prières de Dhohr et Asr combinées et raccourcies à deux rakats chacune',
      'Se consacrer aux invocations et supplications personnelles face à la Qibla jusqu’au maghrib',
    ],
    waypoints: [
      { name: 'Départ Tentes EVA Voyages Mina Maktab 42', location: { lat: 21.4133, lng: 39.8933 }, distanceFromStartKm: 0, isCheckpoint: true },
      { name: 'Sortie Vallée de Mina (Route Piétonne Mashair 2)', location: { lat: 21.4080, lng: 39.9040 }, distanceFromStartKm: 2.1 },
      { name: 'Traversée du corridor Muzdalifah Nord', location: { lat: 21.3910, lng: 39.9250 }, distanceFromStartKm: 5.5, note: 'Voie ombragée avec brumisateurs d’eau' },
      { name: 'Poste de Contrôle Sécurité & Médical Arabie', location: { lat: 21.3780, lng: 39.9470 }, distanceFromStartKm: 8.8, isCheckpoint: true },
      { name: 'Limite territoriale Sacrée de Arafat (Bornes officielles)', location: { lat: 21.3650, lng: 39.9680 }, distanceFromStartKm: 12.0, note: 'Vous êtes désormais dans le sanctuaire de Arafat' },
      { name: 'Mosquée Nimra & Avenue d’Arafat', location: { lat: 21.3580, lng: 39.9770 }, distanceFromStartKm: 13.5 },
      { name: 'Arrivée Campement EVA Voyages Arafat / Jabal ar-Rahmah', location: { lat: 21.3549, lng: 39.9841 }, distanceFromStartKm: 14.5, isCheckpoint: true },
    ],
    pathCoordinates: [
      [21.4133, 39.8933],
      [21.4110, 39.8980],
      [21.4080, 39.9040],
      [21.4020, 39.9120],
      [21.3960, 39.9190],
      [21.3910, 39.9250],
      [21.3850, 39.9340],
      [21.3800, 39.9420],
      [21.3780, 39.9470],
      [21.3740, 39.9540],
      [21.3690, 39.9610],
      [21.3650, 39.9680],
      [21.3610, 39.9730],
      [21.3580, 39.9770],
      [21.3560, 39.9810],
      [21.3549, 39.9841],
    ],
  },
  {
    id: 'ARAFAT_TO_MUZDALIFAH',
    title: 'Arafat ➔ Muzdalifah (Le Départ Sacré / An-Nafrah)',
    arabicTitle: 'النفيرة من عرفات إلى مزدلفة',
    stageName: 'Étape 3 : La Nuit Bénie sous les étoiles',
    hajjDate: '9 Dhul-Hijjah (Après coucher du soleil)',
    startSiteId: 'ARAFAT',
    endSiteId: 'MUZDALIFAH',
    distanceKm: 8.8,
    estimatedWalkDurationMinutes: 110,
    estimatedBusDurationMinutes: 30,
    description: 'La grande Nafrah : dès le coucher du soleil à Arafat, la marée humaine se déplace dans la sérénité et le calme vers Muzdalifah.',
    talbiyah: {
      arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
      transliteration: 'Rabbanā ātinā fī-d-dunyā ḥasanatan wa fī-l-ākhirati ḥasanatan wa qinā ‘adhāba-n-nār',
      french: 'Seigneur, accorde-nous belle part ici-bas, et belle part dans l’au-delà, et préserve-nous du châtiment du Feu !',
    },
    keyRitualActions: [
      'Marcher avec calme et solennité conformément à la Sunnah (As-Sakinah)',
      'Ne pas prier Maghrib à Arafat : la prière se fait obligatoirement combinée à Muzdalifah',
      'À l’arrivée à Muzdalifah, prier Maghrib (3 rakats) puis Isha (2 rakats raccourcie) avec un seul adhan et deux iqamahs',
      'Passer la nuitée à ciel ouvert à Muzdalifah',
      'Ramasser les cailloux (7 pour le jour 10, ou 49/70 pour les jours suivants) de la taille d’un pois chiche',
    ],
    waypoints: [
      { name: 'Départ Tentes EVA Voyages Arafat', location: { lat: 21.3549, lng: 39.9841 }, distanceFromStartKm: 0, isCheckpoint: true },
      { name: 'Point de jonction Route Piétonne Nafrah 1', location: { lat: 21.3600, lng: 39.9740 }, distanceFromStartKm: 1.4 },
      { name: 'Passage des portes de sortie d’Arafat', location: { lat: 21.3680, lng: 39.9580 }, distanceFromStartKm: 3.2, isCheckpoint: true },
      { name: 'Station Métro Al Mashaaer Al Mugaddassah 3', location: { lat: 21.3740, lng: 39.9430 }, distanceFromStartKm: 5.1 },
      { name: 'Entrée dans la plaine sacrée de Muzdalifah', location: { lat: 21.3810, lng: 39.9230 }, distanceFromStartKm: 7.2, note: 'Panneaux officiels : Début du périmètre de Muzdalifah' },
      { name: 'Arrivée Mash’ar al-Haram & Campement EVA Muzdalifah', location: { lat: 21.3850, lng: 39.9050 }, distanceFromStartKm: 8.8, isCheckpoint: true },
    ],
    pathCoordinates: [
      [21.3549, 39.9841],
      [21.3580, 39.9780],
      [21.3620, 39.9710],
      [21.3660, 39.9630],
      [21.3700, 39.9550],
      [21.3740, 39.9430],
      [21.3780, 39.9320],
      [21.3810, 39.9230],
      [21.3830, 39.9140],
      [21.3850, 39.9050],
    ],
  },
  {
    id: 'MUZDALIFAH_TO_JAMARAT',
    title: 'Muzdalifah ➔ Jamarat & Mina (Jour du Sacrifice / Aïd)',
    arabicTitle: 'الانتقال من مزدلفة إلى رمي الجمرات بمنى',
    stageName: "Étape 4 : Le Grand Jour de l'Aïd al-Adha",
    hajjDate: '10 Dhul-Hijjah (Aube)',
    startSiteId: 'MUZDALIFAH',
    endSiteId: 'JAMARAT',
    distanceKm: 5.4,
    estimatedWalkDurationMinutes: 70,
    estimatedBusDurationMinutes: 20,
    description: 'Après la prière du Fajr et le Wouqouf au Mash’ar al-Haram, départ matinal vers le Pont des Jamarat pour la lapidation de la Grande Stèle.',
    talbiyah: {
      arabic: 'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، لاَ إِلَهَ إِلاَّ اللَّهُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، وَلِلَّهِ الْحَمْدُ',
      transliteration: 'Allāhu Akbar, Allāhu Akbar, Lā Ilāha Illa-llāh, Allāhu Akbar, Allāhu Akbar, Wa Lillāhi-l-Ḥamd',
      french: 'Allah est le Plus Grand, Allah est le Plus Grand, il n’y a de divinité digne d’adoration qu’Allah ! Allah est le Plus Grand et à Lui la louange !',
    },
    keyRitualActions: [
      'Prier Fajr à Muzdalifah puis invoquer Allah jusqu’aux premières lueurs du jour',
      'Traverser la vallée de Muhassir à pas plus rapides selon la Sunnah',
      'Arrivée au pont des Jamarat : lancer 7 cailloux sur la Grande Stèle (Jamarat al-Aqaba) en disant « Allahu Akbar » à chaque jet',
      'Cesser la Talbiyah au premier caillou lancé',
      'Procéder au sacrifice (Hady), puis rasage de la tête ou coupe des cheveux (Tahallul initial)',
    ],
    waypoints: [
      { name: 'Départ Muzdalifah (Mash’ar al-Haram)', location: { lat: 21.3850, lng: 39.9050 }, distanceFromStartKm: 0, isCheckpoint: true },
      { name: 'Franchissement Vallée de Wadi Muhassir', location: { lat: 21.3980, lng: 39.8970 }, distanceFromStartKm: 2.0, note: 'Marcher d’un pas plus soutenu selon la tradition prophétique' },
      { name: 'Entrée dans Mina par le flanc Sud', location: { lat: 21.4080, lng: 39.8890 }, distanceFromStartKm: 3.4 },
      { name: 'Passage devant la Mosquée Al-Khayf', location: { lat: 21.4140, lng: 39.8810 }, distanceFromStartKm: 4.5 },
      { name: 'Arrivée Complexe du Pont des Jamarat (Niveau 1)', location: { lat: 21.4194, lng: 39.8732 }, distanceFromStartKm: 5.4, isCheckpoint: true },
    ],
    pathCoordinates: [
      [21.3850, 39.9050],
      [21.3910, 39.9010],
      [21.3980, 39.8970],
      [21.4030, 39.8930],
      [21.4080, 39.8890],
      [21.4120, 39.8840],
      [21.4150, 39.8790],
      [21.4194, 39.8732],
    ],
  },
  {
    id: 'MINA_TO_HARAM',
    title: 'Mina ➔ Sainte Kaaba (Tawaf Al-Ifadah & Sa’y)',
    arabicTitle: 'الانتقال من منى إلى الحرم لطواف الإفاضة',
    stageName: 'Étape 5 : Tawaf Majeur & Désacralisation',
    hajjDate: '10-11 Dhul-Hijjah',
    startSiteId: 'MINA_CAMP',
    endSiteId: 'AL_HARAM',
    distanceKm: 7.8,
    estimatedWalkDurationMinutes: 95,
    estimatedBusDurationMinutes: 25,
    description: 'Descente de Mina vers le Masjid al-Haram pour accomplir le Tawaf Al-Ifadah et le Sa’y entre Safa et Marwa (Tahallul complet).',
    talbiyah: {
      arabic: 'اللَّهُمَّ زِدْ هَذَا الْبَيْتَ تَشْرِيفاً وَتَعْظِيماً وَتَكْرِيماً وَمَهَابَةً',
      transliteration: 'Allāhumma zid hādhā-l-Bayta tashrīfan wa ta‘ẓīman wa takrīman wa mahābah',
      french: 'Ô Allah, augmente la noblesse, la grandeur, l’honneur et la vénération de cette Sainte Maison !',
    },
    keyRitualActions: [
      'Entrée au Masjid al-Haram par la Porte du Roi Abdulaziz ou Bab as-Salam',
      'Accomplir 7 tours de Tawaf autour de la Kaaba sacrée',
      'Prier deux rakats derrière le Maqam Ibrahim si possible',
      'Boire de l’eau bénite de Zamzam',
      'Accomplir le Sa’y (7 parcours) entre les monts Safa et Marwa',
      'Retourner passer les nuits de Tashriq à Mina',
    ],
    waypoints: [
      { name: 'Départ Tentes EVA Voyages Mina', location: { lat: 21.4133, lng: 39.8933 }, distanceFromStartKm: 0, isCheckpoint: true },
      { name: 'Tunnels de Mina vers Al-Aziziyah', location: { lat: 21.4180, lng: 39.8750 }, distanceFromStartKm: 2.2 },
      { name: 'Avenue Prince Majid & Quartier Al-Aziziyah', location: { lat: 21.4200, lng: 39.8560 }, distanceFromStartKm: 4.5 },
      { name: 'Tunnel Mahbas Al-Jinn (Accès Bus & Piétons Haram)', location: { lat: 21.4230, lng: 39.8390 }, distanceFromStartKm: 6.5, isCheckpoint: true },
      { name: 'Esplanade du Masjid al-Haram (Porte King Fahd #79)', location: { lat: 21.4225, lng: 39.8262 }, distanceFromStartKm: 7.8, isCheckpoint: true },
    ],
    pathCoordinates: [
      [21.4133, 39.8933],
      [21.4150, 39.8860],
      [21.4170, 39.8790],
      [21.4190, 39.8710],
      [21.4200, 39.8630],
      [21.4210, 39.8540],
      [21.4220, 39.8450],
      [21.4230, 39.8370],
      [21.4228, 39.8310],
      [21.4225, 39.8262],
    ],
  },
  {
    id: 'MAKKAH_TO_MINA',
    title: 'La Mecque (Haram) ➔ Mina (Jour de Tarwiyah)',
    arabicTitle: 'الانتقال من مكة إلى منى في يوم التروية',
    stageName: 'Étape 1 : Le Début du Grand Voyage',
    hajjDate: '8 Dhul-Hijjah',
    startSiteId: 'AL_HARAM',
    endSiteId: 'MINA_CAMP',
    distanceKm: 8.2,
    estimatedWalkDurationMinutes: 100,
    estimatedBusDurationMinutes: 25,
    description: 'Mise en état d’Ihram depuis l’hôtel ou le Haram, puis départ en convoi vers la cité des tentes de Mina pour y passer la journée et la nuit.',
    talbiyah: {
      arabic: 'لَبَّيْكَ حَجّاً، لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ',
      transliteration: 'Labbayka Ḥajjan, Labbayka Allāhumma Labbayk',
      french: 'Me voici pour le Hajj, me voici Seigneur à Ton appel, me voici !',
    },
    keyRitualActions: [
      'Formuler l’intention du Hajj (Niyyah) et prononcer la Talbiyah',
      'Port de l’Ihram pour les hommes (deux étoffes blanches sans couture)',
      'Départ vers Mina avec les bus ou cortèges piétons EVA Voyages',
      'Accomplir à Mina les prières de Dhohr, Asr, Maghrib, Isha et Fajr raccourcies sans les combiner',
      'Se reposer avant la journée solennelle de Arafat',
    ],
    waypoints: [
      { name: 'Départ Esplanade du Haram / Hôtels Makkah', location: { lat: 21.4225, lng: 39.8262 }, distanceFromStartKm: 0, isCheckpoint: true },
      { name: 'Tunnel Al-Aziziyah', location: { lat: 21.4220, lng: 39.8450 }, distanceFromStartKm: 2.1 },
      { name: 'Passage sous le pont des Jamarat', location: { lat: 21.4194, lng: 39.8732 }, distanceFromStartKm: 5.2 },
      { name: 'Allée Centrale des Tentes de Mina', location: { lat: 21.4150, lng: 39.8850 }, distanceFromStartKm: 6.8 },
      { name: 'Arrivée Campement EVA Voyages Maktab 42', location: { lat: 21.4133, lng: 39.8933 }, distanceFromStartKm: 8.2, isCheckpoint: true },
    ],
    pathCoordinates: [
      [21.4225, 39.8262],
      [21.4228, 39.8310],
      [21.4230, 39.8370],
      [21.4220, 39.8450],
      [21.4210, 39.8540],
      [21.4200, 39.8630],
      [21.4190, 39.8710],
      [21.4170, 39.8790],
      [21.4150, 39.8860],
      [21.4133, 39.8933],
    ],
  },
];

export const MOCK_GUIDES: GuideLocation[] = [
  {
    id: 'guide-01',
    name: 'Oustaz Ibrahima Ndiaye',
    role: 'Guide Religieux & Chef Convoi Principal',
    phone: '+221 78 639 10 00',
    whatsapp: 'https://wa.me/221786391000',
    location: { lat: 21.4080, lng: 39.9040 },
    heading: 105,
    speedKmH: 4.8,
    status: 'ACTIVE_MOVING',
    lastUpdated: 'À l’instant',
    vehicleType: 'WALKING',
  },
  {
    id: 'guide-02',
    name: 'Dr. Abdoulaye Sow',
    role: 'Médecin Chef & Convoi Bus VIP #12',
    phone: '+221 77 650 90 90',
    whatsapp: 'https://wa.me/221786391000',
    location: { lat: 21.3910, lng: 39.9250 },
    heading: 95,
    speedKmH: 28.5,
    status: 'ACTIVE_MOVING',
    lastUpdated: 'Il y a 30s',
    vehicleType: 'BUS',
    vehicleNumber: 'BUS-EVA-12',
  },
  {
    id: 'guide-03',
    name: 'Sokhna Awa Diop',
    role: 'Permanence Tente Mina Maktab 42',
    phone: '+221 76 161 61 66',
    whatsapp: 'https://wa.me/221786391000',
    location: { lat: 21.4133, lng: 39.8933 },
    heading: 0,
    speedKmH: 0,
    status: 'STATIONARY',
    lastUpdated: 'Il y a 2m',
    vehicleType: 'TENT_OFFICE',
  },
];
