import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Compass,
  AlertTriangle,
  PhoneCall,
  MessageCircle,
  MapPin,
  CheckCircle2,
  Radio,
  Search,
  Filter,
  Volume2,
  Send,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Zap,
  Info,
} from 'lucide-react';
import { SACRED_SITES } from '../../data/sacredSitesData';
import { formatDistance } from '../../utils/geoUtils';

// Simulated sacred site coordinates for pilgrims
const PILGRIM_POSITIONS: Record<string, { lat: number; lng: number; siteName: string; battery: number }> = {
  'EVA-HJ26-9284': { lat: 21.4172, lng: 39.8784, siteName: 'Mina - Tentes Secteur A (Camp EVA)', battery: 92 },
  'EVA-OU26-3108': { lat: 21.4225, lng: 39.8262, siteName: 'Makkah - Esplanade du Haram (Kaaba)', battery: 78 },
  'EVA-HJ26-5542': { lat: 21.4190, lng: 39.8820, siteName: 'Mina - Allée Centrale Jamarat', battery: 65 },
  'EVA-OU26-7819': { lat: 24.4686, lng: 39.6142, siteName: 'Médine - Cour de la Mosquée du Prophète ﷺ', battery: 84 },
  'EVA-HJ26-1049': { lat: 21.3549, lng: 39.9841, siteName: 'Arafat - Jabal Ar-Rahmah', battery: 45 },
  'EVA-OU26-9921': { lat: 21.4010, lng: 39.8970, siteName: 'Muzdalifah - Zone de repos convoi', battery: 88 },
};

export const GuidePilgrimTrackerView: React.FC = () => {
  const {
    dossiers,
    currentUser,
    activeSosAlerts,
    resolveSosAlert,
    triggerSosAlert,
    sendNotification,
    agencyConfig,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'SOS_ONLY' | 'NEARBY'>('ALL');
  const [selectedPilgrimCode, setSelectedPilgrimCode] = useState<string | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcastSent, setIsBroadcastSent] = useState(false);

  // Guide Awa Kane position (at Mina official agency base camp)
  const guidePosition = { lat: 21.4168, lng: 39.8779 };

  // Calculate distance from Guide Awa Kane
  const calculateDistanceToGuide = (lat: number, lng: number): number => {
    const R = 6371; // km
    const dLat = ((lat - guidePosition.lat) * Math.PI) / 180;
    const dLng = ((lng - guidePosition.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((guidePosition.lat * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  };

  // Filtered pilgrims
  const filteredDossiers = dossiers.filter((d) => {
    const nameMatch =
      d.personalInfo.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.personalInfo.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.trackingCode.toLowerCase().includes(searchTerm.toLowerCase());

    if (!nameMatch) return false;

    const hasActiveSos = activeSosAlerts.some(
      (a) => a.trackingCode === d.trackingCode && a.status === 'ACTIVE'
    );

    if (filterMode === 'SOS_ONLY') return hasActiveSos;
    return true;
  });

  const activeAlertsCount = activeSosAlerts.filter((a) => a.status === 'ACTIVE').length;

  // Handle sending a group announcement
  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    sendNotification({
      type: 'SMS',
      sender: `Guide Awa Kane (${agencyConfig.name})`,
      recipientPhone: '+221 78 639 10 00',
      message: `[Message Convoi EVA Voyages - Guide Awa Kane] : ${broadcastMessage}`,
      trigger: 'MANUAL',
    });

    setIsBroadcastSent(true);
    setBroadcastMessage('');
    setTimeout(() => setIsBroadcastSent(false), 3000);
  };

  // Quick simulate SOS for testing
  const handleSimulateSosForPilgrim = (dossier: (typeof dossiers)[0]) => {
    const pos = PILGRIM_POSITIONS[dossier.trackingCode] || {
      lat: 21.4172,
      lng: 39.8784,
      siteName: 'Mina - Secteur Tentes B',
      battery: 50,
    };

    triggerSosAlert({
      lat: pos.lat,
      lng: pos.lng,
      nearestSiteName: pos.siteName,
      distanceKm: calculateDistanceToGuide(pos.lat, pos.lng),
      pilgrimName: `${dossier.personalInfo.firstName} ${dossier.personalInfo.lastName}`,
      trackingCode: dossier.trackingCode,
      phone: dossier.personalInfo.phone,
      avatar: dossier.documents.photo?.fileUrl || dossier.personalInfo.photoUrl,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Top Banner: Guide Command Center Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#0c3f74] text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-amiri text-2xl text-amber-400 font-bold">
                مُرَاقَبَةُ الحُجَّاجِ وَالمُرْشِدَةُ المُعْتَمَدَةُ
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f15a24] text-white text-[10px] font-bold uppercase tracking-wider">
                Compte Guide Spécial · Awa Kane
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Radar Pèlerins Actif</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Supervision en Temps Réel de Tous les Pèlerins & Alertes SOS
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Poste de commandement de la Guide Référente <strong>Awa Kane</strong> ({agencyConfig.name}). Suivi GPS des pèlerins, détection immédiate des pèlerins égarés, liaison WhatsApp / Téléphonique d'urgence et diffusion au convoi.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-stone-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Guide active : <strong>Awa Kane</strong> (awa.kane@evavoyages.com)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
                <span>Ligne permanence : <strong>+221 78 639 10 00</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>Poste guide : <strong>Camp Mina VIP EVA Voyages (Tentes A-12)</strong></span>
              </span>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Pèlerins</span>
              <span className="text-2xl font-black text-white">{dossiers.length}</span>
              <span className="text-[9px] text-emerald-400 block font-semibold mt-0.5">Sous surveillance</span>
            </div>

            <div className={`p-3.5 rounded-2xl border text-center transition-all ${
              activeAlertsCount > 0
                ? 'bg-red-950/80 border-red-500 animate-pulse'
                : 'bg-white/5 border-white/10'
            }`}>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Alertes SOS</span>
              <span className={`text-2xl font-black ${activeAlertsCount > 0 ? 'text-red-400' : 'text-stone-300'}`}>
                {activeAlertsCount}
              </span>
              <span className={`text-[9px] font-bold block mt-0.5 ${activeAlertsCount > 0 ? 'text-red-300' : 'text-stone-400'}`}>
                {activeAlertsCount > 0 ? 'PÈLERIN ÉGARÉ' : 'Aucun égaré'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Synchro Live</span>
              <span className="text-2xl font-black text-emerald-400">100%</span>
              <span className="text-[9px] text-stone-300 block font-semibold mt-0.5">Temps Réel</span>
            </div>
          </div>
        </div>
      </div>

      {/* EMERGENCY SOS ALERT BANNER (High Visibility when any alert is active) */}
      {activeAlertsCount > 0 && (
        <div className="space-y-3">
          {activeSosAlerts
            .filter((alert) => alert.status === 'ACTIVE')
            .map((alert) => (
              <div
                key={alert.id}
                className="bg-red-950 text-white rounded-3xl p-5 border-2 border-red-500 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-bounce-subtle"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center shrink-0 shadow-lg text-white animate-pulse">
                    <AlertTriangle className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-red-600 text-white font-black text-[10px] rounded-full uppercase tracking-wider animate-pulse">
                        URGENCE IMMÉDIATE · PÈLERIN ÉGARÉ
                      </span>
                      <span className="text-xs text-red-200">
                        {new Date(alert.timestamp).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                      <span>{alert.pilgrimName}</span>
                      <span className="font-mono text-xs text-amber-300 font-bold">
                        ({alert.trackingCode})
                      </span>
                    </h3>

                    <p className="text-xs text-red-200">
                      Localisation détectée : <strong>{alert.nearestSiteName}</strong> · Coordonnées GPS :{' '}
                      <span className="font-mono text-white font-bold">
                        {alert.location.lat.toFixed(5)}, {alert.location.lng.toFixed(5)}
                      </span>{' '}
                      · Distance à Guide Awa Kane :{' '}
                      <strong className="text-amber-300">{formatDistance(alert.distanceKm)}</strong>
                    </p>
                  </div>
                </div>

                {/* Direct Action Buttons for Guide */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
                  <a
                    href={`https://wa.me/${alert.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Salam Alaykum ${alert.pilgrimName}, ici votre guide Awa Kane (EVA Voyages). J'ai bien reçu votre alerte SOS. Restez sur place, je vous localise et viens à votre rencontre.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-transform active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp Secours</span>
                  </a>

                  <a
                    href={`tel:${alert.phone}`}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-colors"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Appeler Pèlerin</span>
                  </a>

                  <a
                    href={`https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-stone-700 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Google Maps</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => resolveSosAlert(alert.id, 'Pèlerin rejoint et assisté par Guide Awa Kane')}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Marquer Secouru</span>
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Broadcast Message Tool (Guide to all pilgrims) */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#f15a24]" />
            <h3 className="text-xs sm:text-sm font-extrabold text-stone-900">
              Diffuser une Consigne ou Point de Rassemblement au Convoi
            </h3>
          </div>
          <span className="text-[11px] text-stone-500 font-semibold">
            Notification instantanée SMS & WhatsApp aux pèlerins
          </span>
        </div>

        {isBroadcastSent && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Consigne diffusée avec succès à tous les pèlerins en temps réel !</span>
          </div>
        )}

        <form onSubmit={handleBroadcast} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="Ex : Rassemblement à 16h30 aux tentes VIP Secteur A pour le départ vers Muzdalifah..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#135ca5]"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#135ca5] hover:bg-[#0c3f74] text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Diffuser au convoi</span>
          </button>
        </form>
      </div>

      {/* Main Content: Pilgrim Filter and Live Grid */}
      <div className="space-y-4">
        {/* Filter bar */}
        <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom ou code dossier..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#135ca5]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-[#135ca5] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Tous ({dossiers.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('SOS_ONLY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterMode === 'SOS_ONLY'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span>Alertes SOS ({activeAlertsCount})</span>
            </button>
          </div>
        </div>

        {/* Pilgrims Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDossiers.map((dossier) => {
            const pos = PILGRIM_POSITIONS[dossier.trackingCode] || {
              lat: 21.4172,
              lng: 39.8784,
              siteName: 'Mina - Secteur Tentes Camp EVA',
              battery: 80,
            };

            const distKm = calculateDistanceToGuide(pos.lat, pos.lng);
            const isSosActive = activeSosAlerts.some(
              (a) => a.trackingCode === dossier.trackingCode && a.status === 'ACTIVE'
            );

            const pilgrimPhoto =
              dossier.documents.photo?.fileUrl ||
              dossier.personalInfo.photoUrl ||
              (dossier.personalInfo.gender === 'F'
                ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'
                : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80');

            return (
              <div
                key={dossier.id}
                className={`bg-white rounded-3xl p-5 border shadow-xs space-y-4 transition-all ${
                  isSosActive
                    ? 'border-red-500 ring-2 ring-red-500/20 shadow-red-900/10'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                {/* Pilgrim Header with Photo and SOS Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={pilgrimPhoto}
                        alt={dossier.personalInfo.firstName}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-stone-200 shadow-xs"
                      />
                      <span
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          isSosActive ? 'bg-red-600 animate-ping' : 'bg-emerald-500'
                        }`}
                      />
                    </div>

                    <div>
                      <h4 className="font-extrabold text-stone-900 text-sm leading-tight">
                        {dossier.personalInfo.firstName} {dossier.personalInfo.lastName}
                      </h4>
                      <span className="font-mono text-xs font-bold text-[#f15a24] block">
                        {dossier.trackingCode}
                      </span>
                      <span className="text-[10px] text-stone-500 block truncate max-w-[150px]">
                        {dossier.packageSnapshot.title}
                      </span>
                    </div>
                  </div>

                  {isSosActive ? (
                    <span className="px-2 py-1 bg-red-600 text-white font-black text-[9px] rounded-lg uppercase tracking-wider animate-pulse">
                      🚨 SOS ÉGARÉ
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded-md border border-emerald-200">
                      Normal
                    </span>
                  )}
                </div>

                {/* Location & Proximity Metrics */}
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-stone-500 text-[10px] uppercase font-bold">Position :</span>
                    <span className="text-stone-800 font-semibold text-right text-[11px] truncate">
                      {pos.siteName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-stone-500">Distance Guide Awa Kane :</span>
                    <strong className="text-[#135ca5]">{formatDistance(distKm)}</strong>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-200/60">
                    <span>GPS : {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}</span>
                    <span className="font-bold text-emerald-700">Batterie : {pos.battery}%</span>
                  </div>
                </div>

                {/* Quick actions for Guide */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/${dossier.personalInfo.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Salam Alaykum ${dossier.personalInfo.firstName}, ici votre guide Awa Kane (EVA Voyages). Comment se déroule votre pèlerinage ?`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={`tel:${dossier.personalInfo.phone}`}
                    className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-[#135ca5]" />
                    <span>Appeler</span>
                  </a>
                </div>

                {/* Simulation trigger button to test SOS */}
                <div className="pt-1">
                  {isSosActive ? (
                    <button
                      type="button"
                      onClick={() => {
                        const alert = activeSosAlerts.find((a) => a.trackingCode === dossier.trackingCode);
                        if (alert) resolveSosAlert(alert.id);
                      }}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Résoudre l'alerte SOS de ce pèlerin</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSimulateSosForPilgrim(dossier)}
                      className="w-full py-1.5 bg-stone-50 hover:bg-red-50 hover:text-red-700 text-stone-500 border border-stone-200 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Tester la détection temps réel d'un pèlerin égaré"
                    >
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span>Simuler déclenchement SOS Pèlerin</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
