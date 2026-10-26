import React, { useRef } from 'react';
import { PilgrimDossier } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  X,
  Printer,
  Copy,
  Check,
  Building2,
  ShieldCheck,
  CreditCard,
  QrCode,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface PilgrimBookingPassModalProps {
  dossier: PilgrimDossier;
  isOpen: boolean;
  onClose: () => void;
}

export const PilgrimBookingPassModal: React.FC<PilgrimBookingPassModalProps> = ({
  dossier,
  isOpen,
  onClose,
}) => {
  const { formatFCFA, agencyConfig } = useApp();
  const [copied, setCopied] = React.useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const qrPayload = `EVA-BOOKING:${dossier.trackingCode}|${dossier.personalInfo.passportNumber || 'NOPASS'}|${dossier.payment.remainingBalanceFCFA}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrPayload)}&bgcolor=ffffff&color=135ca5&margin=1`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(dossier.trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const isFullyPaid = dossier.payment.remainingBalanceFCFA === 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-[#135ca5] to-slate-950 text-white p-5 flex items-center justify-between border-b border-white/10 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md">
              <img src="/logo.png" alt="EVA Voyages" className="h-8 w-auto object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f15a24] text-white">
                  Pass Officiel
                </span>
                <span className="text-xs text-blue-200 font-mono">Guichet & Contrôle</span>
              </div>
              <h3 className="text-base font-black text-white">Pass Pèlerin & QR Code Réservation</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Pass Area */}
        <div ref={printRef} className="p-6 space-y-5 bg-white text-stone-900">
          {/* Card Border Container */}
          <div className="rounded-3xl border-2 border-[#135ca5]/30 p-5 bg-gradient-to-b from-blue-50/40 via-white to-stone-50/30 relative overflow-hidden shadow-sm">
            {/* Watermark Logo */}
            <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none select-none">
              <img src="/logo.png" alt="" className="w-64 h-64 object-contain" />
            </div>

            {/* Top Pass Strip */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 px-2 bg-white rounded-xl border border-stone-200 flex items-center justify-center shadow-xs">
                  <img src="/logo.png" alt="EVA Voyages" className="h-8 object-contain" />
                </div>
                <div>
                  <span className="text-xs font-black text-[#135ca5] tracking-tight block">
                    {agencyConfig.name}
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium block">
                    Licence N° {agencyConfig.licenseNumber}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Dossier N°</span>
                <span className="font-mono text-base font-black text-[#135ca5] tracking-wider block">
                  {dossier.trackingCode}
                </span>
              </div>
            </div>

            {/* Pilgrim Identity & QR Section */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              {/* Pilgrim Info */}
              <div className="sm:col-span-7 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
                    {dossier.documents.photo?.fileUrl ? (
                      <img
                        src={dossier.documents.photo.fileUrl}
                        alt="Photo Pèlerin"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-stone-400 text-sm">
                        {dossier.personalInfo.firstName[0]}
                        {dossier.personalInfo.lastName[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      Pèlerin Enregistré
                    </span>
                    <h4 className="font-black text-base text-stone-900 leading-tight">
                      {dossier.personalInfo.firstName} {dossier.personalInfo.lastName}
                    </h4>
                    <span className="text-xs text-stone-600 block mt-0.5">
                      Passeport : <strong className="font-mono text-stone-900">{dossier.personalInfo.passportNumber || 'N/A'}</strong>
                    </span>
                  </div>
                </div>

                <div className="bg-white/90 p-3 rounded-2xl border border-stone-200/80 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Forfait :</span>
                    <strong className="text-stone-900 font-semibold truncate max-w-[180px]">
                      {dossier.packageSnapshot.title}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Chambre :</span>
                    <span className="capitalize font-semibold text-stone-800">
                      {dossier.packageSnapshot.roomType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Saison :</span>
                    <span className="font-semibold text-stone-800">
                      {dossier.packageSnapshot.season}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Téléphone :</span>
                    <span className="font-mono text-stone-800 font-semibold">
                      {dossier.personalInfo.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border-2 border-dashed border-[#135ca5]/40 text-center shadow-xs">
                <div className="w-36 h-36 p-1.5 bg-white rounded-xl border border-stone-200 shadow-xs flex items-center justify-center">
                  <img
                    src={qrUrl}
                    alt={`QR Code ${dossier.trackingCode}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="mt-2 space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-[#135ca5] tracking-wider flex items-center justify-center gap-1">
                    <QrCode className="w-3 h-3" /> Scan Réservation
                  </span>
                  <p className="text-[9px] text-stone-500 leading-tight">
                    À scanner au guichet pour vérification instantanée
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Ledger Status Bar */}
            <div className="mt-4 pt-3.5 border-t border-stone-200/80 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-stone-100/70 rounded-xl">
                <span className="text-[10px] text-stone-500 uppercase font-bold block">Total Forfait</span>
                <span className="font-mono text-xs font-black text-stone-900 block mt-0.5">
                  {formatFCFA(dossier.payment.totalAmountFCFA)}
                </span>
              </div>

              <div className="p-2 bg-blue-50/70 rounded-xl">
                <span className="text-[10px] text-blue-700 uppercase font-bold block">Déjà Réglé</span>
                <span className="font-mono text-xs font-black text-[#135ca5] block mt-0.5">
                  {formatFCFA(dossier.payment.amountPaidFCFA)}
                </span>
              </div>

              <div
                className={`p-2 rounded-xl ${
                  isFullyPaid ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'
                }`}
              >
                <span className="text-[10px] uppercase font-bold block">
                  {isFullyPaid ? 'Statut' : 'Reste à Solder'}
                </span>
                <span className="font-mono text-xs font-black block mt-0.5">
                  {isFullyPaid ? '100% Soldé' : formatFCFA(dossier.payment.remainingBalanceFCFA)}
                </span>
              </div>
            </div>
          </div>

          {/* In-Agency Visit Guide Box */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5 shadow-sm text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#f15a24]" />
                <span className="font-bold text-stone-200">
                  Accueil & Caisse Centrale : Siège EVA Voyages
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Paiement au Guichet Agréé
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-300">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#1DC4FF] shrink-0 mt-0.5" />
                <span>{agencyConfig.address || 'Avenue Cheikh Anta Diop, Dakar - Sénégal'}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>Lundi - Samedi : 08h30 à 18h30 sans interruption</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Téléphone : <strong>{agencyConfig.notificationPhone || '+221 78 639 10 00'}</strong></span>
              </div>
              <div className="flex items-start gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#f15a24] shrink-0 mt-0.5" />
                <span>Moyens acceptés : Espèces FCFA, Chèque certifié, TPE</span>
              </div>
            </div>

            <div className="pt-1.5 text-[10px] text-stone-400 italic">
              Présentez ce QR Code ou donnez votre code <strong>{dossier.trackingCode}</strong> à l'agent d'accueil pour éditer immédiatement votre reçu officiel certifié.
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3.5 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-stone-500" />}
            <span>{copied ? 'Code copié !' : 'Copier Code Dossier'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#135ca5] hover:bg-[#0c3f74] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4 text-[#f15a24]" />
              <span>Imprimer le Pass</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl text-xs font-semibold"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
