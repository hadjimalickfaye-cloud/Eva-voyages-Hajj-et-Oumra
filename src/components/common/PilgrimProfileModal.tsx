import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Camera,
  Upload,
  Check,
  User,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';

interface PilgrimProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  {
    id: 'av-1',
    label: 'Pèlerin Homme (Ihram)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'av-2',
    label: 'Pèlerine Dame (Voile Blanc)',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'av-3',
    label: 'Pèlerin Homme (Tenue Traditionnelle)',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'av-4',
    label: 'Pèlerine Dame (Élégance Sérénité)',
    url: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=400&q=80',
  },
];

export const PilgrimProfileModal: React.FC<PilgrimProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserProfilePhoto, getMyDossier } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(currentUser?.avatar || null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSavedSuccess, setIsSavedSuccess] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const myDossier = getMyDossier();

  if (!isOpen) return null;

  // Handle local file upload (JPG, PNG, WebP)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (JPG, PNG ou WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewPhoto(reader.result);
        setIsSavedSuccess(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Start live camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setCameraError('Impossible d’accéder à la caméra. Veuillez autoriser l’accès ou importer une photo.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  // Capture photo from video stream
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Square crop centered
      const video = videoRef.current;
      const minDim = Math.min(video.videoWidth, video.videoHeight);
      const startX = (video.videoWidth - minDim) / 2;
      const startY = (video.videoHeight - minDim) / 2;
      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 400, 400);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setPreviewPhoto(dataUrl);
      setIsSavedSuccess(false);
      stopCamera();
    }
  };

  const handleSave = () => {
    if (!previewPhoto) return;
    updateUserProfilePhoto(previewPhoto);
    setIsSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleRemovePhoto = () => {
    setPreviewPhoto(null);
    updateUserProfilePhoto('');
    setIsSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleCloseModal = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#135ca5] to-[#0c3f74] text-white flex items-center justify-center shadow-md">
              <Camera className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900 tracking-tight">
                Photo de Profil du Pèlerin
              </h2>
              <p className="text-xs text-stone-500">
                Synchronisation en direct avec le compte client et le Back-Office EVA Voyages
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Toast */}
        {isSavedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Photo mise à jour avec succès et transmise en temps réel au Back-Office !</span>
          </div>
        )}

        {/* Current / Preview Photo Display */}
        <div className="flex flex-col items-center justify-center space-y-3 py-2">
          <div className="relative group">
            <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white shadow-xl ring-2 ring-[#135ca5]/30 bg-stone-100 flex items-center justify-center">
              {isCameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : previewPhoto ? (
                <img
                  src={previewPhoto}
                  alt={currentUser?.name || 'Photo pèlerin'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-stone-400 p-4 text-center">
                  <User className="w-12 h-12 stroke-1" />
                  <span className="text-[10px] font-bold mt-1">Aucune photo</span>
                </div>
              )}
            </div>

            <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
              ✓
            </span>
          </div>

          <div className="text-center">
            <h3 className="font-extrabold text-stone-900 text-sm">
              {currentUser?.name || 'Pèlerin EVA Voyages'}
            </h3>
            <p className="text-xs text-stone-500">
              {currentUser?.linkedTrackingCode ? (
                <span className="font-mono text-[#f15a24] font-bold">
                  Dossier : {currentUser.linkedTrackingCode}
                </span>
              ) : (
                currentUser?.email
              )}
            </p>
            {myDossier?.packageSnapshot && (
              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#135ca5] border border-blue-200">
                {myDossier.packageSnapshot.title}
              </span>
            )}
          </div>
        </div>

        {/* Camera error if any */}
        {cameraError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
            {cameraError}
          </div>
        )}

        {/* Action Controls */}
        {isCameraActive ? (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={capturePhoto}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Prendre la photo maintenant</span>
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
            >
              Annuler
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Upload & Camera Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-stone-800 font-bold text-xs cursor-pointer group"
              >
                <Upload className="w-5 h-5 text-[#135ca5] group-hover:scale-110 transition-transform" />
                <span>Importer une photo</span>
                <span className="text-[10px] text-stone-500 font-normal">Fichier JPG / PNG</span>
              </button>

              <button
                type="button"
                onClick={startCamera}
                className="p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-stone-800 font-bold text-xs cursor-pointer group"
              >
                <Camera className="w-5 h-5 text-[#f15a24] group-hover:scale-110 transition-transform" />
                <span>Prendre une photo</span>
                <span className="text-[10px] text-stone-500 font-normal">Caméra en direct</span>
              </button>
            </div>

            {/* Curated Presets Carousel */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Ou sélectionner un avatar pèlerin réglementaire :</span>
              </span>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AVATARS.map((preset) => {
                  const isSelected = previewPhoto === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setPreviewPhoto(preset.url);
                        setIsSavedSuccess(false);
                      }}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer p-0.5 ${
                        isSelected
                          ? 'border-[#135ca5] ring-2 ring-blue-400'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                      title={preset.label}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-14 object-cover rounded-lg"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#135ca5] text-white flex items-center justify-center text-[9px] font-black">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Real-time Back Office Sync Assurance Note */}
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-[11px] text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#135ca5] shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Synchronisation automatique Back-Office & Guide :</strong>
                <span>
                  Cette photo est instantanément répercutée sur votre badge pèlerin, votre fiche consulaire et l'interface de contrôle du personnel d'EVA Voyages et du guide pèlerin.
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              {previewPhoto ? (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!previewPhoto}
                  className={`px-5 py-2 rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all cursor-pointer ${
                    previewPhoto
                      ? 'bg-[#135ca5] hover:bg-[#0c3f74] text-white shadow-blue-900/20'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistrer ma photo</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
