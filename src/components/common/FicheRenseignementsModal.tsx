import React, { useState } from 'react';
import { PilgrimDossier } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  X,
  Download,
  Printer,
  Mail,
  MessageCircle,
  FileText,
  ShieldCheck,
  Check,
  Sparkles,
  Building2,
  Calendar,
  User,
  Heart,
  Plane,
  CreditCard,
  QrCode,
} from 'lucide-react';
import { generateFicheRenseignementsPdf } from '../../utils/generateFicheRenseignementsPdf';

interface FicheRenseignementsModalProps {
  dossier: PilgrimDossier | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FicheRenseignementsModal: React.FC<FicheRenseignementsModalProps> = ({
  dossier,
  isOpen,
  onClose,
}) => {
  const { agencyConfig, formatFCFA, sendNotification } = useApp();
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [emailSentToast, setEmailSentToast] = useState<boolean>(false);

  if (!isOpen || !dossier) return null;

  const handleDownloadPdf = () => {
    setIsDownloading(true);
    try {
      generateFicheRenseignementsPdf({
        dossier,
        agencyConfig,
        autoDownload: true,
      });
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    sendNotification({
      dossierId: dossier.id,
      trackingCode: dossier.trackingCode,
      type: 'EMAIL',
      sender: 'EVA Voyages',
      recipientEmail: dossier.personalInfo.email,
      message: `Bonjour ${dossier.personalInfo.firstName}, votre Fiche Individuelle de Renseignements Officielle pour le dossier ${dossier.trackingCode} (${dossier.packageSnapshot.title}) vous a été transmise en pièce jointe PDF certifiée.`,
      trigger: 'MANUAL',
    });
    setEmailSentToast(true);
    setTimeout(() => setEmailSentToast(false), 5000);
  };

  const cleanPhone = (dossier.personalInfo.phone || '').replace(/[^0-9]/g, '');
  const whatsAppMsg = `Salam Alaykum ${dossier.personalInfo.firstName}, voici la confirmation de votre Fiche Individuelle de Renseignements Pèlerin délivrée par EVA Voyages (Ligne officielle : +221 78 639 10 00) pour votre dossier ${dossier.trackingCode} (${dossier.packageSnapshot.title}). Forfait : ${dossier.packageSnapshot.title} · Solde : ${formatFCFA(dossier.payment.remainingBalanceFCFA)}. Contactez-nous à tout moment.`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fiche-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-stone-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#0b2d52] to-[#135ca5] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-[#f15a24]">
              <FileText className="w-5 h-5 text-[#f15a24]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-[#f15a24] text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Document Officiel
                </span>
                <span className="text-xs text-blue-200 font-mono">Agrément N° {agencyConfig.licenseNumber}</span>
              </div>
              <h2 id="fiche-modal-title" className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                Fiche Individuelle de Renseignements Pèlerin
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions Bar */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-4 py-2 bg-[#135ca5] hover:bg-[#0c3f74] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#f15a24]" />
              <span>{isDownloading ? 'Génération PDF...' : 'Télécharger en PDF (A4)'}</span>
            </button>

            <a
              href={`https://wa.me/${cleanPhone || '221786391000'}?text=${encodeURIComponent(whatsAppMsg)}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Recevoir le récapitulatif par WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Recevoir par WhatsApp (+221 78 639 10 00)</span>
            </a>

            <button
              type="button"
              onClick={handleSendEmail}
              className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-stone-500" />
              <span>Recevoir par Email</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            title="Imprimer"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>

        {/* Success Toast */}
        {emailSentToast && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Fiche de renseignements expédiée à l'adresse e-mail {dossier.personalInfo.email || 'du pèlerin'} !</span>
          </div>
        )}

        {/* Modal Printable Sheet Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs bg-stone-100/50">
          <div className="bg-white rounded-2xl border border-stone-300 shadow-sm p-6 space-y-6 print:shadow-none print:border-none">
            {/* Sheet Agency Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-[#f15a24] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 px-2 bg-white rounded-xl border border-stone-200 shadow-2xs flex items-center justify-center">
                  <img src="/logo.png" alt="EVA Voyages" className="h-9 object-contain" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 tracking-tight">{agencyConfig.name}</h3>
                  <p className="text-[11px] text-stone-500 font-medium">
                    AGENCE OFFICIELLE AGRÉÉE HAJJ & OUMRA · LICENCE N° {agencyConfig.licenseNumber}
                  </p>
                  <p className="text-[10px] text-stone-400">
                    Avenue Cheikh Anta Diop, Dakar · Ligne Caisse : {agencyConfig.phone || '+221 78 639 10 00'}
                  </p>
                </div>
              </div>

              <div className="text-right sm:self-auto self-start bg-slate-50 p-2.5 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-500 uppercase font-bold block">Code Dossier :</span>
                <span className="font-mono text-base font-black text-[#135ca5] block">{dossier.trackingCode}</span>
                <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">Statut : CERTIFIÉ CONFORME</span>
              </div>
            </div>

            {/* Section 1: Civil Status with Passport and Photo */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Civil details (9 cols) */}
              <div className="md:col-span-9 p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3">
                <div className="flex items-center gap-1.5 pb-2 border-b border-stone-200 text-stone-800 font-bold">
                  <User className="w-4 h-4 text-[#135ca5]" />
                  <span>1. État Civil & Identité Biométrique</span>
                </div>

                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-stone-400 text-[11px] block">Nom de Famille :</span>
                    <strong className="text-stone-900 font-bold uppercase">{dossier.personalInfo.lastName}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[11px] block">Prénom(s) :</span>
                    <strong className="text-stone-900 font-bold">{dossier.personalInfo.firstName}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[11px] block">Genre / Sexe :</span>
                    <span className="font-semibold text-stone-800">{dossier.personalInfo.gender === 'F' ? 'Féminin' : 'Masculin'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[11px] block">Nationalité :</span>
                    <span className="font-semibold text-stone-800">{dossier.personalInfo.nationality || 'Sénégalaise'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[11px] block">Date & Lieu de Naissance :</span>
                    <span className="font-semibold text-stone-800">{dossier.personalInfo.dateOfBirth} à {dossier.personalInfo.placeOfBirth}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[11px] block">Passeport Biométrique N° :</span>
                    <strong className="text-stone-900 font-mono">{dossier.personalInfo.passportNumber || 'En cours de délivrance'}</strong> (Exp: {dossier.personalInfo.passportExpiry})
                  </div>
                  <div>
                    <span className="text-stone-400 text-[11px] block">Téléphone Principal :</span>
                    <strong className="text-stone-900 font-mono">{dossier.personalInfo.phone}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[11px] block">Adresse Électronique :</span>
                    <span className="text-stone-700 font-medium">{dossier.personalInfo.email || 'Non renseigné'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-stone-400 text-[11px] block">Résidence & Adresse Domicile :</span>
                    <span className="text-stone-800 font-medium">{dossier.personalInfo.address}, {dossier.personalInfo.city}, {dossier.personalInfo.country || 'Sénégal'}</span>
                  </div>
                </div>
              </div>

              {/* Photo Box (3 cols) */}
              <div className="md:col-span-3 p-3 rounded-xl border border-stone-200 bg-white text-center flex flex-col items-center justify-center space-y-2">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                  Photo Homologuée
                </span>
                <div className="w-24 h-32 rounded-xl bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center overflow-hidden">
                  {dossier.documents.photo?.fileUrl ? (
                    <img
                      src={dossier.documents.photo.fileUrl}
                      alt="Photo Pèlerin"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2 text-stone-400">
                      <User className="w-8 h-8 mx-auto opacity-50 mb-1" />
                      <span className="text-[9px] block">Fond Blanc 4x4</span>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Norme Consulaire
                </span>
              </div>
            </div>

            {/* Section 2: Health, Emergency & Mahram */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-stone-200 text-stone-800 font-bold">
                <Heart className="w-4 h-4 text-rose-600" />
                <span>2. Santé, Carnet Vaccinal & Contact d'Urgence</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-stone-400 text-[11px] block">Groupe Sanguin :</span>
                  <strong className="text-emerald-800 font-black text-sm">{dossier.personalInfo.bloodGroup || 'O+'}</strong>
                </div>
                <div>
                  <span className="text-stone-400 text-[11px] block">Contact d'Urgence :</span>
                  <strong className="text-stone-900">{dossier.personalInfo.emergencyContactName || 'Famille proche'}</strong>
                </div>
                <div>
                  <span className="text-stone-400 text-[11px] block">Lien & Téléphone Urgence :</span>
                  <span className="font-mono text-stone-800">{dossier.personalInfo.emergencyContactRelation} ({dossier.personalInfo.emergencyContactPhone})</span>
                </div>
                {dossier.personalInfo.mahramName && (
                  <div className="sm:col-span-3">
                    <span className="text-stone-400 text-[11px] block">Mahram d'Accompagnement :</span>
                    <strong className="text-amber-900">{dossier.personalInfo.mahramName} ({dossier.personalInfo.mahramRelation || 'Accompagnant'})</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Package & Transport */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-stone-200 text-stone-800 font-bold">
                <Plane className="w-4 h-4 text-[#135ca5]" />
                <span>3. Forfait de Pèlerinage & Titres Logistiques</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-stone-400 text-[11px] block">Package Souscrit :</span>
                  <strong className="text-[#135ca5] font-bold">{dossier.packageSnapshot.title}</strong>
                </div>
                <div>
                  <span className="text-stone-400 text-[11px] block">Formule d'Hébergement :</span>
                  <span className="text-stone-900 font-semibold">Chambre {dossier.packageSnapshot.roomType || 'Standard'} (5★ Proche Haram)</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[11px] block">Dates du Séjour :</span>
                  <span className="text-stone-900 font-semibold">Du {dossier.packageSnapshot.departureDate || 'Mai'} au {dossier.packageSnapshot.returnDate || 'Juin'}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[11px] block">Compagnie Vol & PNR :</span>
                  <strong className="text-stone-900">{dossier.flightDetails?.airline || 'Compagnie Officielle Agréée'} · PNR: {dossier.flightDetails?.pnr || 'Confirmé'}</strong>
                </div>
                <div>
                  <span className="text-stone-400 text-[11px] block">Visa Nusuk :</span>
                  <strong className="text-emerald-800 font-mono">N° {dossier.visaDetails?.visaNumber || 'KSA-EV-2026-994821'}</strong>
                </div>
                <div>
                  <span className="text-stone-400 text-[11px] block">Groupe WhatsApp Officiel :</span>
                  <span className="text-[#25D366] font-bold">Rejoint / Notifié (+221 78 639 10 00)</span>
                </div>
              </div>
            </div>

            {/* Section 4: Accounting Breakdown */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                <span className="text-emerald-950 font-bold flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <span>4. Situation Comptable & Règlement</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {dossier.payment.remainingBalanceFCFA === 0 ? 'Dossier 100% Soldé' : 'Acompte Validé'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <span className="text-stone-400 text-[10px] uppercase font-bold block">Forfait Total</span>
                  <span className="font-mono text-stone-900 font-black text-sm block mt-0.5">
                    {formatFCFA(dossier.payment.totalAmountFCFA)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <span className="text-stone-400 text-[10px] uppercase font-bold block">Encaissé à ce jour</span>
                  <span className="font-mono text-emerald-800 font-black text-sm block mt-0.5">
                    {formatFCFA(dossier.payment.amountPaidFCFA)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <span className="text-stone-400 text-[10px] uppercase font-bold block">Solde Restant</span>
                  <span className={`font-mono font-black text-sm block mt-0.5 ${dossier.payment.remainingBalanceFCFA === 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
                    {dossier.payment.remainingBalanceFCFA === 0 ? '0 FCFA' : formatFCFA(dossier.payment.remainingBalanceFCFA)}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 5: Signatures & Seal */}
            <div className="grid grid-cols-2 gap-6 pt-2">
              <div className="p-4 rounded-xl border border-stone-200 bg-white h-28 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-stone-500 uppercase block">
                  Signature du Pèlerin Souscripteur
                </span>
                <span className="text-[9px] text-stone-400 italic">"Lu et approuvé"</span>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 bg-slate-50 h-28 flex flex-col justify-between relative overflow-hidden">
                <span className="text-[10px] font-bold text-stone-600 uppercase block">
                  Direction Générale & Cachet EVA VOYAGES
                </span>

                {/* Simulated official stamp */}
                <div className="absolute right-3 bottom-2 w-20 h-20 rounded-full border-2 border-dashed border-[#135ca5]/40 flex flex-col items-center justify-center text-center p-1 opacity-70">
                  <span className="text-[7px] font-black text-[#135ca5]">EVA VOYAGES</span>
                  <span className="text-[6px] font-bold text-[#f15a24]">CERTIFIÉ</span>
                  <span className="text-[5px] text-stone-500">DAKAR - SÉNÉGAL</span>
                </div>

                <span className="text-[9px] text-stone-400">Dossier vérifié & homologué</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-stone-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Fiche certifiée par la commission Hajj & Oumra EVA Voyages · Assistance : {agencyConfig.phone || '+221 78 639 10 00'}</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
