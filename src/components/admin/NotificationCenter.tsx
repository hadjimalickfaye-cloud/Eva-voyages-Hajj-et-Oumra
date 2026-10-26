import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NotificationLog } from '../../types';
import {
  Bell,
  MessageSquare,
  Mail,
  Send,
  CheckCircle2,
  Filter,
  Search,
  Smartphone,
  Eye,
  RefreshCw,
  ExternalLink,
  Phone,
  Sparkles,
  Inbox,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Users,
} from 'lucide-react';

export const NotificationCenter: React.FC = () => {
  const { notifications, sendNotification, agencyConfig, dossiers } = useApp();

  const [channelFilter, setChannelFilter] = useState<'ALL' | 'INBOUND' | 'OUTBOUND' | 'WHATSAPP' | 'SMS' | 'EMAIL'>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedNotif, setSelectedNotif] = useState<NotificationLog | null>(null);

  // Quick broadcast & direct messaging composer
  const [targetDossierId, setTargetDossierId] = useState<string>('ALL');
  const [broadcastType, setBroadcastType] = useState<'SMS' | 'WHATSAPP' | 'EMAIL'>('SMS');
  const [broadcastSubject, setBroadcastSubject] = useState<string>('Information importante - EVA VOYAGES');
  const [broadcastMsg, setBroadcastMsg] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const officialNumber = agencyConfig.notificationPhone || '+221 78 639 10 00';

  const inboundCount = notifications.filter((n) => n.direction === 'INBOUND' || n.recipientPhone?.replace(/\s/g, '').includes('786391000')).length;
  const outboundCount = notifications.filter((n) => n.direction !== 'INBOUND' && !n.recipientPhone?.replace(/\s/g, '').includes('786391000')).length;
  const whatsappCount = notifications.filter((n) => n.type === 'WHATSAPP' || n.trigger === 'WHATSAPP_INVITE').length;

  const filtered = notifications.filter((n) => {
    const q = search.toLowerCase();
    const matchesSearch =
      n.message.toLowerCase().includes(q) ||
      (n.recipientPhone && n.recipientPhone.includes(q)) ||
      (n.recipientEmail && n.recipientEmail.toLowerCase().includes(q)) ||
      (n.trackingCode && n.trackingCode.toLowerCase().includes(q)) ||
      n.sender.toLowerCase().includes(q);

    let matchesChannel = true;
    if (channelFilter === 'INBOUND') {
      matchesChannel = n.direction === 'INBOUND' || (n.recipientPhone ? n.recipientPhone.replace(/\s/g, '').includes('786391000') : false);
    } else if (channelFilter === 'OUTBOUND') {
      matchesChannel = n.direction !== 'INBOUND' && (n.recipientPhone ? !n.recipientPhone.replace(/\s/g, '').includes('786391000') : true);
    } else if (channelFilter === 'WHATSAPP') {
      matchesChannel = n.type === 'WHATSAPP' || n.trigger === 'WHATSAPP_INVITE';
    } else if (channelFilter === 'SMS') {
      matchesChannel = n.type === 'SMS' && n.trigger !== 'WHATSAPP_INVITE';
    } else if (channelFilter === 'EMAIL') {
      matchesChannel = n.type === 'EMAIL';
    }

    return matchesSearch && matchesChannel;
  });

  const selectedDossier = dossiers.find((d) => d.id === targetDossierId);

  // Quick message presets
  const applyPreset = (preset: 'RITUELS' | 'DOCS' | 'VOLS' | 'SOLDE' | 'WHATSAPP') => {
    const pName = selectedDossier ? `${selectedDossier.personalInfo.firstName}` : 'pèlerin(e)';
    const pkgTitle = selectedDossier ? selectedDossier.packageSnapshot.title : 'votre pèlerinage';

    switch (preset) {
      case 'RITUELS':
        setBroadcastMsg(`Salam Alaykum cher(e) ${pName}, l'agence EVA Voyages vous convie à la prochaine séance d'orientation et de formation aux rituels (${pkgTitle}). Présence vivement conseillée pour préparer votre séjour sacré.`);
        break;
      case 'DOCS':
        setBroadcastMsg(`Salam Alaykum ${pName}, nous vous prions de bien vouloir finaliser le dépôt de votre passeport biométrique et photo d'identité pour finaliser votre dossier ${selectedDossier?.trackingCode || ''}.`);
        break;
      case 'VOLS':
        setBroadcastMsg(`Excellente nouvelle ${pName} ! Vos réservations et billets d'avion pour ${pkgTitle} sont prêts. Consultez votre espace de suivi ou contactez-nous au ${officialNumber}.`);
        break;
      case 'SOLDE':
        setBroadcastMsg(`Salam Alaykum ${pName}, nous vous rappelons qu'un solde reste à régler sur votre dossier ${selectedDossier?.trackingCode || ''}. Vous pouvez effectuer votre versement via Wave ou Orange Money.`);
        break;
      case 'WHATSAPP':
        setBroadcastMsg(`Salam Alaykum ${pName}, rejoignez le groupe WhatsApp officiel de votre formule pour suivre en temps réel les annonces de vols et l'encadrement par nos Imams.`);
        break;
    }
  };

  const handleOpenDirectWhatsApp = () => {
    if (!selectedDossier) {
      alert('Veuillez sélectionner un pèlerin spécifique pour ouvrir une discussion directe sur WhatsApp.');
      return;
    }
    const cleanPhone = selectedDossier.personalInfo.phone.replace(/[^0-9]/g, '');
    const textEncoded = encodeURIComponent(broadcastMsg || `Salam Alaykum ${selectedDossier.personalInfo.firstName}, message de l'agence EVA Voyages concernant votre dossier ${selectedDossier.trackingCode}.`);
    const waUrl = `https://wa.me/${cleanPhone}?text=${textEncoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Also record in notification audit log
    sendNotification({
      dossierId: selectedDossier.id,
      trackingCode: selectedDossier.trackingCode,
      type: 'WHATSAPP',
      direction: 'OUTBOUND',
      recipientPhone: selectedDossier.personalInfo.phone,
      sender: `${officialNumber} (EVA VOYAGES)`,
      subject: `Message WhatsApp direct - ${selectedDossier.trackingCode}`,
      message: broadcastMsg || 'Conversation WhatsApp ouverte avec le pèlerin',
      trigger: 'MANUAL',
    });
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;

    if (targetDossierId === 'ALL') {
      // Send to all registered pilgrims
      dossiers.forEach((d) => {
        sendNotification({
          dossierId: d.id,
          trackingCode: d.trackingCode,
          type: broadcastType,
          direction: 'OUTBOUND',
          recipientPhone: d.personalInfo.phone,
          recipientEmail: d.personalInfo.email,
          sender: broadcastType === 'EMAIL' ? agencyConfig.email : `${officialNumber} (${agencyConfig.name})`,
          subject: broadcastSubject,
          message: broadcastMsg,
          trigger: 'MANUAL',
        });
      });
      alert(`Message ${broadcastType} transmis avec succès depuis le numéro associé ${officialNumber} à l'ensemble des ${dossiers.length} pèlerins !`);
    } else {
      const d = dossiers.find((dos) => dos.id === targetDossierId);
      if (d) {
        sendNotification({
          dossierId: d.id,
          trackingCode: d.trackingCode,
          type: broadcastType,
          direction: 'OUTBOUND',
          recipientPhone: d.personalInfo.phone,
          recipientEmail: d.personalInfo.email,
          sender: broadcastType === 'EMAIL' ? agencyConfig.email : `${officialNumber} (${agencyConfig.name})`,
          subject: broadcastSubject,
          message: broadcastMsg,
          trigger: 'MANUAL',
        });
        alert(`Message ${broadcastType} envoyé avec succès à ${d.personalInfo.firstName} ${d.personalInfo.lastName} depuis le ${officialNumber} !`);
      }
    }

    setBroadcastMsg('');
  };

  return (
    <div className="space-y-6">
      {/* 1. OFFICIAL ASSOCIATED PHONE BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-[#135ca5] to-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-blue-400/30 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-md border-2 border-emerald-400">
              <img
                src="/assets/whatsapp_logo.png"
                alt="WhatsApp & SMS"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Ligne Officielle Associée Active</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-blue-200">
                  Envoi Pèlerins & Réception Alertes
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
                <span>{officialNumber}</span>
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Ce numéro est synchronisé pour diffuser les messages SMS et WhatsApp aux pèlerins, et pour recevoir en temps réel les notifications d'inscriptions et d'encaissements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-center justify-start md:justify-end flex-wrap">
            <div className="px-3.5 py-2 bg-white/10 rounded-2xl border border-white/20 text-center">
              <span className="text-[10px] text-blue-200 block uppercase font-bold">Sortants</span>
              <span className="text-base font-black text-white">{outboundCount}</span>
            </div>
            <div className="px-3.5 py-2 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 text-center">
              <span className="text-[10px] text-emerald-300 block uppercase font-bold">Reçus Entrants</span>
              <span className="text-base font-black text-emerald-300">{inboundCount}</span>
            </div>
            <div className="px-3.5 py-2 bg-white/10 rounded-2xl border border-white/20 text-center">
              <span className="text-[10px] text-blue-200 block uppercase font-bold">WhatsApp</span>
              <span className="text-base font-black text-white">{whatsappCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN GRID: COMPOSER & AUDIT TRAIL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composer Form (1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
              <Send className="w-4 h-4 text-[#135ca5]" />
              <span>Envoyer un Message aux Pèlerins</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Depuis {officialNumber}
            </span>
          </div>

          <p className="text-[11px] text-stone-500">
            Transmettez des convocations, rappels de documents, confirmations de visas ou ouvrez un échange WhatsApp direct.
          </p>

          <form onSubmit={handleSendBroadcast} className="space-y-3.5 text-xs">
            {/* Canal Selection: SMS vs WhatsApp Direct vs Email */}
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Canal d'expédition</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setBroadcastType('SMS')}
                  className={`py-2 px-2 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-1 ${
                    broadcastType === 'SMS'
                      ? 'bg-[#135ca5] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>SMS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastType('WHATSAPP')}
                  className={`py-2 px-2 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-1 ${
                    broadcastType === 'WHATSAPP'
                      ? 'bg-[#25D366] text-slate-950 shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastType('EMAIL')}
                  className={`py-2 px-2 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-1 ${
                    broadcastType === 'EMAIL'
                      ? 'bg-stone-800 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>E-mail</span>
                </button>
              </div>
            </div>

            {/* Recipient selection */}
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Destinataire(s)</label>
              <select
                value={targetDossierId}
                onChange={(e) => setTargetDossierId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-medium"
              >
                <option value="ALL">Tous les pèlerins inscrits ({dossiers.length})</option>
                {dossiers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.personalInfo.firstName} {d.personalInfo.lastName} · {d.personalInfo.phone} ({d.trackingCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block font-semibold text-stone-700 mb-1 flex items-center justify-between">
                <span>Modèles de messages rapides</span>
                <Sparkles className="w-3.5 h-3.5 text-[#f15a24]" />
              </label>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => applyPreset('RITUELS')}
                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[10px] font-semibold transition-colors"
                >
                  Rituels
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('VOLS')}
                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[10px] font-semibold transition-colors"
                >
                  Vols & Visas
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('DOCS')}
                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[10px] font-semibold transition-colors"
                >
                  Passeport
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('SOLDE')}
                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[10px] font-semibold transition-colors"
                >
                  Paiement
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('WHATSAPP')}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-semibold transition-colors"
                >
                  Groupe WA
                </button>
              </div>
            </div>

            {broadcastType === 'EMAIL' && (
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Objet de l'e-mail</label>
                <input
                  type="text"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Texte du message</label>
              <textarea
                rows={4}
                required
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="Ex: Salam Alaykum, nous vous informons que la réunion d'encadrement aura lieu ce samedi..."
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-sans"
              />
            </div>

            {/* Direct WhatsApp Action button if single recipient */}
            {broadcastType === 'WHATSAPP' && selectedDossier && (
              <button
                type="button"
                onClick={handleOpenDirectWhatsApp}
                className="w-full py-2.5 bg-gradient-to-r from-[#25D366] to-[#1ebe5d] hover:brightness-105 text-slate-950 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <img src="/assets/whatsapp_logo.png" alt="WA" className="w-4 h-4 object-contain" />
                <span>Ouvrir WhatsApp direct ({selectedDossier.personalInfo.phone})</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </button>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-[#135ca5] hover:bg-[#0c3f74] text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {targetDossierId === 'ALL'
                  ? `Diffuser à tous via ${broadcastType}`
                  : `Envoyer message via ${broadcastType}`}
              </span>
            </button>
          </form>
        </div>

        {/* Audit Log (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                <span>Flux de Messagerie & Notifications ({filtered.length})</span>
              </h3>
              <p className="text-[11px] text-stone-500">
                Suivi complet des alertes reçues sur le {officialNumber} et des messages expédiés.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setChannelFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  channelFilter === 'ALL' ? 'bg-white font-bold text-stone-900 shadow-sm' : 'text-stone-600'
                }`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('INBOUND')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  channelFilter === 'INBOUND' ? 'bg-emerald-700 font-bold text-white shadow-sm' : 'text-stone-600'
                }`}
              >
                <ArrowDownLeft className="w-3 h-3" />
                <span>Reçus</span>
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('OUTBOUND')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  channelFilter === 'OUTBOUND' ? 'bg-[#135ca5] font-bold text-white shadow-sm' : 'text-stone-600'
                }`}
              >
                <ArrowUpRight className="w-3 h-3" />
                <span>Envoyés</span>
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('WHATSAPP')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  channelFilter === 'WHATSAPP' ? 'bg-emerald-600 font-bold text-white shadow-sm' : 'text-stone-600'
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('SMS')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  channelFilter === 'SMS' ? 'bg-white font-bold text-stone-900 shadow-sm' : 'text-stone-600'
                }`}
              >
                SMS
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('EMAIL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  channelFilter === 'EMAIL' ? 'bg-white font-bold text-stone-900 shadow-sm' : 'text-stone-600'
                }`}
              >
                E-mails
              </button>
            </div>
          </div>

          {/* Search bar inside log */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par message, numéro (+221...), nom ou code dossier..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white"
            />
          </div>

          {/* List of dispatched & received logs */}
          <div className="divide-y divide-stone-100 max-h-[520px] overflow-y-auto pr-1 space-y-2 text-xs">
            {filtered.map((notif) => {
              const isInbound = notif.direction === 'INBOUND' || (notif.recipientPhone && notif.recipientPhone.replace(/\s/g, '').includes('786391000'));
              const isWhatsApp = notif.type === 'WHATSAPP' || notif.trigger === 'WHATSAPP_INVITE';

              return (
                <div
                  key={notif.id}
                  onClick={() => setSelectedNotif(notif)}
                  className={`pt-2 pb-2.5 flex items-start justify-between gap-3 px-3 rounded-2xl cursor-pointer transition-colors ${
                    isInbound
                      ? 'bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/60'
                      : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isInbound
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isWhatsApp
                          ? 'bg-[#25D366] text-slate-950 shadow-xs'
                          : notif.type === 'SMS'
                          ? 'bg-blue-100 text-[#135ca5]'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isInbound ? (
                        <Inbox className="w-4 h-4 text-white" />
                      ) : isWhatsApp ? (
                        <MessageSquare className="w-4 h-4" />
                      ) : notif.type === 'SMS' ? (
                        <Smartphone className="w-4 h-4" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-stone-900">
                          {isInbound ? 'Alerte Reçue (+221 78 639 10 00)' : isWhatsApp ? 'WhatsApp Envoyé' : notif.type === 'SMS' ? 'SMS Mobile' : 'E-mail'}
                        </span>

                        {isInbound && (
                          <span className="text-[10px] font-black text-emerald-800 bg-emerald-200/80 px-1.5 py-0.2 rounded-md">
                            Entrant Ligne Officielle
                          </span>
                        )}

                        {notif.trackingCode && (
                          <span className="font-mono text-[10px] bg-white border border-stone-200 px-1.5 py-0.2 rounded text-stone-700 font-bold">
                            {notif.trackingCode}
                          </span>
                        )}

                        {notif.trigger === 'WHATSAPP_INVITE' && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                            Lien Groupe WhatsApp
                          </span>
                        )}
                      </div>

                      <p className="text-stone-700 line-clamp-2 mt-0.5 font-sans leading-relaxed">
                        {notif.type === 'EMAIL' && notif.subject ? `[${notif.subject}] ` : ''}
                        {notif.message}
                      </p>

                      <div className="text-[10px] text-stone-400 flex items-center gap-2 pt-0.5">
                        <span>Destinataire: <strong className="text-stone-600">{notif.recipientPhone || notif.recipientEmail}</strong></span>
                        <span>·</span>
                        <span>Émetteur: <strong className="text-stone-600">{notif.sender}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-stone-400 block whitespace-nowrap">
                      {new Date(notif.sentAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className={`text-[10px] font-semibold flex items-center justify-end gap-1 mt-0.5 ${
                      isInbound ? 'text-emerald-700' : 'text-blue-700'
                    }`}>
                      <CheckCircle2 className="w-3 h-3" />
                      {isInbound ? 'Reçu' : 'Délivré'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview modal for clicked notification */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#135ca5]" />
                <span className="font-bold text-sm text-stone-900">
                  Aperçu Message {selectedNotif.type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="text-stone-400 hover:text-stone-900"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between text-stone-500">
                <span>Émetteur :</span>
                <strong className="text-stone-900">{selectedNotif.sender}</strong>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Destinataire :</span>
                <strong className="text-stone-900 font-mono">
                  {selectedNotif.recipientPhone || selectedNotif.recipientEmail}
                </strong>
              </div>
              {selectedNotif.trackingCode && (
                <div className="flex justify-between text-stone-500">
                  <span>Dossier associé :</span>
                  <strong className="text-[#135ca5] font-mono">{selectedNotif.trackingCode}</strong>
                </div>
              )}
              {selectedNotif.subject && (
                <div className="text-stone-500 border-t border-stone-200 pt-2">
                  <span>Objet: </span>
                  <strong className="text-stone-900">{selectedNotif.subject}</strong>
                </div>
              )}
              <div className="p-3 bg-white rounded-xl border border-stone-200 text-stone-800 whitespace-pre-line leading-relaxed font-sans mt-2">
                {selectedNotif.message}
              </div>
            </div>

            <div className="flex justify-between items-center">
              {selectedNotif.recipientPhone && !selectedNotif.recipientPhone.includes('786391000') && (
                <a
                  href={`https://wa.me/${selectedNotif.recipientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Salam Alaykum, suite à notre notification concernant le dossier ${selectedNotif.trackingCode || ''}...`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <img src="/assets/whatsapp_logo.png" alt="WA" className="w-3.5 h-3.5 object-contain" />
                  <span>Répondre par WhatsApp</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl ml-auto"
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
