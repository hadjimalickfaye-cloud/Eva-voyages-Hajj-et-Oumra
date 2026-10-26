import React, { useState } from 'react';
import { PilgrimDossier, DocumentType } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  X,
  Download,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  AlertCircle,
  FileText,
  ShieldCheck,
  User,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { downloadAdminDocPdf } from '../../utils/generateAdminDocPdf';

interface AdminDocumentLightboxModalProps {
  dossier: PilgrimDossier | null;
  docType: DocumentType;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDocumentLightboxModal: React.FC<AdminDocumentLightboxModalProps> = ({
  dossier,
  docType,
  isOpen,
  onClose,
}) => {
  const { reviewDocument, agencyConfig } = useApp();
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  if (!isOpen || !dossier) return null;

  const doc = dossier.documents[docType];
  const docTitle =
    docType === 'passport'
      ? 'Passeport Biométrique (Page Principale & MRZ)'
      : docType === 'photo'
      ? 'Photo d\'Identité Consulaire (Fond Blanc 4x4)'
      : 'Certificat Médical & Carnet Vaccinal';

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(3, prev + 0.25));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.5, prev - 0.25));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  const handleApprove = () => {
    reviewDocument(dossier.id, docType, true);
    onClose();
  };

  const handleReject = () => {
    const reason = prompt(
      'Motif du rejet (notifié immédiatement par SMS au pèlerin) :',
      'Numérisation floue, reflet lumineux ou document expiré'
    );
    if (reason) {
      reviewDocument(dossier.id, docType, false, reason);
      onClose();
    }
  };

  const handleDownloadOriginal = () => {
    setIsDownloading(true);
    try {
      downloadAdminDocPdf({
        dossier,
        docType,
        agencyConfig,
      });
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-200"
    >
      {/* Top Navbar */}
      <div className="p-4 bg-slate-900/90 border-b border-stone-800 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#f15a24]">
            <FileText className="w-5 h-5 text-[#f15a24]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                {dossier.trackingCode}
              </span>
              <span className="text-xs text-stone-300">
                {dossier.personalInfo.lastName.toUpperCase()} {dossier.personalInfo.firstName}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-0.5">{docTitle}</h3>
          </div>
        </div>

        {/* Zoom & Rotate Controls */}
        <div className="hidden sm:flex items-center gap-1.5 bg-stone-800/80 px-3 py-1.5 rounded-2xl border border-stone-700 text-xs">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-700 rounded-lg transition-colors cursor-pointer"
            title="Zoom arrière"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-stone-300 min-w-[42px] text-center font-bold">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-700 rounded-lg transition-colors cursor-pointer"
            title="Zoom avant"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-stone-700 mx-1" />
          <button
            type="button"
            onClick={handleRotate}
            className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-700 rounded-lg transition-colors cursor-pointer"
            title="Pivoter de 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-2 py-1 text-stone-400 hover:text-white text-[10px] rounded hover:bg-stone-700"
          >
            Réinitialiser
          </button>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-full transition-colors cursor-pointer"
          aria-label="Fermer la prévisualisation"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Image Display Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
        {doc?.fileUrl ? (
          <div
            className="transition-transform duration-200 select-none max-w-full max-h-full flex items-center justify-center"
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={doc.fileUrl}
              alt={docTitle}
              className="max-h-[70vh] max-w-[85vw] object-contain rounded-xl shadow-2xl border border-stone-700"
            />
          </div>
        ) : (
          <div className="text-center p-8 bg-stone-900 rounded-2xl border border-stone-800 text-stone-400 space-y-2 max-w-md">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h4 className="font-bold text-white text-base">Pièce justificative non téléversée</h4>
            <p className="text-xs text-stone-400">
              Le pèlerin n'a pas encore transmis ce document dans son dossier. Vous pouvez lui envoyer un rappel par SMS ou WhatsApp.
            </p>
          </div>
        )}

        {/* Floating comparison badge for Passports */}
        {docType === 'passport' && (
          <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-stone-700 text-xs text-white max-w-sm hidden sm:block shadow-xl">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
              Contrôle de Conformité Biométrique
            </span>
            <div className="space-y-1">
              <div>
                Passeport Saisi :{' '}
                <strong className="text-white font-mono">{dossier.personalInfo.passportNumber || 'N/A'}</strong>
              </div>
              <div>
                Date d'expiration :{' '}
                <strong className="text-white font-mono">{dossier.personalInfo.passportExpiry}</strong>
              </div>
              <div className="text-[11px] text-stone-300">
                Doit être valide au moins 6 mois après la date de retour prévue.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-4 bg-slate-900/95 border-t border-stone-800 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 text-xs text-stone-300">
          <span className="font-medium">
            Fichier : {doc?.fileName || 'Non disponible'} ({doc?.fileSize || '-'})
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Statut actuel :{' '}
            <strong
              className={
                doc?.status === 'APPROVED'
                  ? 'text-emerald-400'
                  : doc?.status === 'REJECTED'
                  ? 'text-red-400'
                  : 'text-amber-400'
              }
            >
              {doc?.status === 'APPROVED'
                ? 'Validé'
                : doc?.status === 'REJECTED'
                ? 'Rejeté'
                : 'En attente d\'examen'}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {doc?.fileUrl && (
            <button
              type="button"
              onClick={handleDownloadOriginal}
              disabled={isDownloading}
              className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#f15a24]" />
              <span>{isDownloading ? 'Téléchargement...' : 'Télécharger PDF Certifié'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleReject}
            className="px-4 py-2 bg-rose-900/80 hover:bg-rose-800 border border-rose-700 text-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Rejeter la Pièce
          </button>

          <button
            type="button"
            onClick={handleApprove}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Valider le Document Conforme</span>
          </button>
        </div>
      </div>
    </div>
  );
};
