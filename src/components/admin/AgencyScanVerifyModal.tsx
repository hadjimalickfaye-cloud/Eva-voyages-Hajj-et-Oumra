import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { PilgrimDossier, Transaction } from '../../types';
import {
  X,
  Camera,
  Scan,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  User,
  ShieldCheck,
  FileText,
  Search,
  Building2,
  Printer,
  Download,
  ArrowRight,
  Phone,
  Calendar,
  Wallet,
  Check,
  Clock,
  Sparkles,
  RefreshCw,
  SwitchCamera,
  Upload,
  Zap,
  QrCode,
} from 'lucide-react';
import { generatePdfReceipt } from '../../utils/generatePdfReceipt';
import {
  scanFrameForQr,
  scanImageFileForQr,
  extractTrackingCode,
  playScanSuccessBeep,
} from '../../utils/qrScanner';

interface AgencyScanVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrackingCode?: string;
}

export const AgencyScanVerifyModal: React.FC<AgencyScanVerifyModalProps> = ({
  isOpen,
  onClose,
  initialTrackingCode,
}) => {
  const { dossiers, processPayment, formatFCFA, agencyConfig, currentUser } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>(initialTrackingCode || '');
  const [selectedDossier, setSelectedDossier] = useState<PilgrimDossier | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccessBeep, setScanSuccessBeep] = useState<boolean>(false);
  const [lastDetectedCode, setLastDetectedCode] = useState<string | null>(null);

  // Counter Payment Form State
  const [encashAmount, setEncashAmount] = useState<number>(0);
  const [encashSubMethod, setEncashSubMethod] = useState<'ESPECES' | 'CHEQUE' | 'TPE'>('ESPECES');
  const [encashPaymentType, setEncashPaymentType] = useState<'DEPOSIT' | 'FULL'>('FULL');
  const [encashNotes, setEncashNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [completedEncashment, setCompletedEncashment] = useState<{
    receiptNumber: string;
    transaction: Transaction;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-select if initialTrackingCode provided
  useEffect(() => {
    if (initialTrackingCode) {
      const match = dossiers.find(
        (d) => d.trackingCode.toUpperCase() === initialTrackingCode.toUpperCase()
      );
      if (match) {
        setSelectedDossier(match);
        setSearchQuery(match.trackingCode);
        setEncashAmount(match.payment.remainingBalanceFCFA || 0);
      }
    }
  }, [initialTrackingCode, dossiers]);

  // Clean camera stream on close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setSelectedDossier(null);
      setCompletedEncashment(null);
      setSearchQuery('');
      setLastDetectedCode(null);
    }
  }, [isOpen]);

  const startCamera = async (targetFacing?: 'environment' | 'user') => {
    const facing = targetFacing || cameraFacing;
    setCameraError(null);
    setIsCameraActive(true);
    setLastDetectedCode(null);

    try {
      stopCamera();

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
        startScanningLoop();
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError('Accès à la caméra indisponible ou refusé. Vérifiez vos autorisations.');
      setIsCameraActive(false);
    }
  };

  const startScanningLoop = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
    }

    let lastScanTime = 0;

    const tick = async (timestamp: number) => {
      // High-speed throttled frame analysis (~12 fps)
      if (timestamp - lastScanTime > 80 && videoRef.current && scratchCanvasRef.current) {
        lastScanTime = timestamp;
        try {
          const rawCode = await scanFrameForQr(videoRef.current, scratchCanvasRef.current);
          if (rawCode) {
            const tracking = extractTrackingCode(rawCode);
            if (tracking) {
              handleCodeDetected(tracking);
              return; // Stop animation loop upon detection
            }
          }
        } catch (e) {
          // ignore transient frame read errors
        }
      }

      scanLoopRef.current = requestAnimationFrame(tick);
    };

    scanLoopRef.current = requestAnimationFrame(tick);
  };

  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  const handleCodeDetected = (code: string) => {
    playScanSuccessBeep();
    setLastDetectedCode(code);
    setSearchQuery(code);

    const cleanCode = code.toUpperCase().trim();
    const match = dossiers.find(
      (d) =>
        d.trackingCode.toUpperCase() === cleanCode ||
        d.trackingCode.toUpperCase().includes(cleanCode) ||
        cleanCode.includes(d.trackingCode.toUpperCase()) ||
        d.personalInfo.passportNumber.toUpperCase() === cleanCode
    );

    if (match) {
      handleSelectDossier(match);
    } else {
      setCameraError(`Code QR détecté ("${code}"), mais aucun dossier correspondant trouvé dans la base.`);
      stopCamera();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraError(null);
    const rawCode = await scanImageFileForQr(file);
    if (rawCode) {
      const code = extractTrackingCode(rawCode);
      if (code) {
        handleCodeDetected(code);
      } else {
        setCameraError(`Contenu QR lu ("${rawCode}"), mais aucun identifiant de dossier valide.`);
      }
    } else {
      setCameraError('Aucun QR code détectable sur cette image. Assurez-vous que le QR est net et bien éclairé.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectDossier = (dossier: PilgrimDossier) => {
    setSelectedDossier(dossier);
    setSearchQuery(dossier.trackingCode);
    setEncashAmount(dossier.payment.remainingBalanceFCFA || 0);
    setEncashPaymentType(dossier.payment.remainingBalanceFCFA > 0 ? 'FULL' : 'DEPOSIT');
    setCompletedEncashment(null);
    stopCamera();
    setScanSuccessBeep(true);
    setTimeout(() => setScanSuccessBeep(false), 2000);
  };

  // Filter dossiers based on search input (code, name, passport, phone)
  const matchingDossiers = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dossiers.slice(0, 5);
    return dossiers.filter(
      (d) =>
        d.trackingCode.toLowerCase().includes(q) ||
        `${d.personalInfo.firstName} ${d.personalInfo.lastName}`.toLowerCase().includes(q) ||
        d.personalInfo.passportNumber.toLowerCase().includes(q) ||
        d.personalInfo.phone.includes(q)
    );
  }, [searchQuery, dossiers]);

  // Quick simulate scan trigger with demo codes
  const handleSimulateScan = (code: string) => {
    const d = dossiers.find((item) => item.trackingCode.toUpperCase() === code.toUpperCase());
    if (d) {
      handleSelectDossier(d);
    }
  };

  const handleExecuteEncashment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDossier || encashAmount <= 0) return;

    setIsProcessing(true);

    const subMethodLabel =
      encashSubMethod === 'ESPECES'
        ? 'Règlement Espèces Guichet'
        : encashSubMethod === 'CHEQUE'
        ? 'Règlement Chèque Certifié'
        : 'Règlement Carte Bancaire TPE';

    const cashierName = currentUser?.name || 'Agent Guichet EVA Voyages';
    const operatorNote = `${subMethodLabel}. Encaissé par ${cashierName} au siège EVA Voyages. ${encashNotes.trim()}`;

    setTimeout(() => {
      const result = processPayment({
        dossierId: selectedDossier.id,
        amountFCFA: encashAmount,
        method: 'AGENCY_CASH',
        paymentType: encashPaymentType === 'FULL' ? 'FULL' : 'DEPOSIT',
        phone: selectedDossier.personalInfo.phone,
        reference: `AGC-${Date.now().toString().slice(-6)}`,
      });

      setIsProcessing(false);
      setCompletedEncashment({
        receiptNumber: result.receiptNumber,
        transaction: result.transaction,
      });

      // Automatically generate stamped PDF receipt
      generatePdfReceipt({
        dossier: {
          ...selectedDossier,
          payment: {
            ...selectedDossier.payment,
            amountPaidFCFA: selectedDossier.payment.amountPaidFCFA + encashAmount,
            remainingBalanceFCFA: Math.max(0, selectedDossier.payment.remainingBalanceFCFA - encashAmount),
          },
        },
        transaction: result.transaction,
        agencyConfig,
        autoDownload: true,
      });

      // Update selected dossier in view
      const updated = dossiers.find((d) => d.id === selectedDossier.id);
      if (updated) {
        setSelectedDossier(updated);
      }
    }, 1200);
  };

  const handleDownloadReceipt = () => {
    if (!selectedDossier || !completedEncashment) return;
    generatePdfReceipt({
      dossier: selectedDossier,
      transaction: completedEncashment.transaction,
      agencyConfig,
      autoDownload: true,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#135ca5] text-white flex items-center justify-center font-black shadow-md shrink-0">
              <Scan className="w-5 h-5 text-[#f15a24]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Guichet & Contrôle Agence
                </span>
                <span className="text-xs text-stone-400 font-mono">Back-Office Scanner</span>
              </div>
              <h3 className="text-base font-black text-white">
                Vérification Pass Pèlerin & Encaissement Caisse
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Search & Camera Bar */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
            {/* Hidden file input for QR image upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Scannez ou saisissez : N° Dossier (EVA-HJ26-...), Nom, Passeport..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 bg-white font-mono text-xs font-bold focus:ring-2 focus:ring-[#135ca5] focus:outline-none"
                />
              </div>

              {/* Action Buttons: Camera + File Upload */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={isCameraActive ? stopCamera : () => startCamera()}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isCameraActive
                      ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                      : 'bg-[#135ca5] text-white hover:bg-[#0c3f74] shadow-xs'
                  }`}
                >
                  <Camera className="w-4 h-4 text-[#f15a24]" />
                  <span>{isCameraActive ? 'Arrêter Scanner' : 'Scanner Caméra'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Lire un QR code depuis une image ou capture d'écran"
                >
                  <Upload className="w-3.5 h-3.5 text-stone-600" />
                  <span className="hidden sm:inline">Importer QR</span>
                </button>
              </div>
            </div>

            {/* High-Speed Live Scanner Viewport */}
            {isCameraActive && (
              <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-[#135ca5] aspect-video max-h-72 flex items-center justify-center shadow-inner">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                  style={{ transform: cameraFacing === 'user' ? 'scaleX(-1)' : 'none' }}
                />
                <canvas ref={scratchCanvasRef} className="hidden" />

                {/* Scanning HUD Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-between p-3 pointer-events-none">
                  {/* Top Bar */}
                  <div className="w-full flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 text-emerald-400 text-[10px] font-bold border border-emerald-500/40 backdrop-blur-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Scanner Actif · Détection Automatique</span>
                    </div>

                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 text-white text-[11px] font-bold rounded-xl border border-slate-700 flex items-center gap-1 shadow-md transition-colors cursor-pointer"
                      title="Basculer entre caméra arrière et avant"
                    >
                      <SwitchCamera className="w-3.5 h-3.5 text-amber-400" />
                      <span>{cameraFacing === 'environment' ? 'Caméra Arrière' : 'Caméra Avant'}</span>
                    </button>
                  </div>

                  {/* Reticle with Animated Laser Line */}
                  <div className="relative w-52 h-52 sm:w-60 sm:h-60 border-2 border-[#135ca5]/50 rounded-2xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                    {/* Corner brackets */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

                    {/* Moving Laser Beam */}
                    <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#f15a24] to-transparent shadow-[0_0_12px_#f15a24] animate-bounce" />

                    <span className="text-[10px] text-stone-300 font-mono tracking-wider bg-black/60 px-2.5 py-0.5 rounded-full">
                      Cadrez le QR Code
                    </span>
                  </div>

                  {/* Bottom Instructions */}
                  <div className="text-[11px] text-white/90 bg-black/75 px-3 py-1 rounded-full font-medium">
                    Détection instantanée des badges, passeports & reçus de dossier
                  </div>
                </div>
              </div>
            )}

            {lastDetectedCode && (
              <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>QR Code reconnu : <strong className="font-mono text-emerald-950">{lastDetectedCode}</strong></span>
              </div>
            )}

            {cameraError && (
              <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Quick Pilgrim Selector Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-stone-500 font-bold uppercase">Recherche Rapide Pèlerins :</span>
              {dossiers.slice(0, 4).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleSimulateScan(d.trackingCode)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono font-bold transition-colors ${
                    selectedDossier?.id === d.id
                      ? 'bg-[#135ca5] text-white border-[#135ca5]'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {d.trackingCode} ({d.personalInfo.lastName})
                </button>
              ))}
            </div>
          </div>

          {/* If no dossier selected yet: show search matches list */}
          {!selectedDossier && matchingDossiers.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                Sélectionnez le dossier correspondant ({matchingDossiers.length}) :
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchingDossiers.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => handleSelectDossier(d)}
                    className="p-3.5 rounded-2xl border border-stone-200 hover:border-[#135ca5] hover:bg-blue-50/40 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-xs bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-stone-600 text-xs overflow-hidden shrink-0">
                        {d.documents.photo?.fileUrl ? (
                          <img src={d.documents.photo.fileUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          d.personalInfo.firstName[0] + d.personalInfo.lastName[0]
                        )}
                      </div>
                      <div>
                        <span className="font-mono text-xs font-black text-[#135ca5] block">
                          {d.trackingCode}
                        </span>
                        <h5 className="font-bold text-xs text-stone-900">
                          {d.personalInfo.firstName} {d.personalInfo.lastName}
                        </h5>
                        <span className="text-[10px] text-stone-500 block">
                          Passeport: {d.personalInfo.passportNumber || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full block mb-1 ${
                          d.payment.remainingBalanceFCFA === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {d.payment.remainingBalanceFCFA === 0
                          ? 'Soldé'
                          : 'Reste: ' + formatFCFA(d.payment.remainingBalanceFCFA)}
                      </span>
                      <span className="text-[10px] text-stone-400">Cliquer pour charger →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dossier Verified & Details Section */}
          {selectedDossier && (
            <div className="space-y-6">
              {/* Identity & Status Card */}
              <div className="p-5 rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-50/50 via-white to-blue-50/30 shadow-sm relative">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-stone-100 border-2 border-emerald-500/40 overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                      {selectedDossier.documents.photo?.fileUrl ? (
                        <img
                          src={selectedDossier.documents.photo.fileUrl}
                          alt="Pèlerin"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-stone-500 text-sm">
                          {selectedDossier.personalInfo.firstName[0]}
                          {selectedDossier.personalInfo.lastName[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-[#135ca5] bg-white px-2.5 py-0.5 rounded-lg border border-stone-200">
                          {selectedDossier.trackingCode}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Identité Validée
                        </span>
                      </div>
                      <h4 className="text-base font-black text-stone-900 mt-1">
                        {selectedDossier.personalInfo.firstName} {selectedDossier.personalInfo.lastName}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-stone-600 mt-0.5">
                        <span>Passeport : <strong className="font-mono text-stone-900">{selectedDossier.personalInfo.passportNumber || 'N/A'}</strong></span>
                        <span>·</span>
                        <span>Tél : {selectedDossier.personalInfo.phone}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDossier(null);
                      setSearchQuery('');
                      setCompletedEncashment(null);
                    }}
                    className="text-xs font-semibold text-stone-500 hover:text-stone-800 underline self-start sm:self-auto"
                  >
                    Changer de Pèlerin
                  </button>
                </div>

                {/* Financial Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-center">
                  <div className="p-3 bg-white rounded-2xl border border-stone-200">
                    <span className="text-[10px] font-bold uppercase text-stone-500 block">Total Forfait</span>
                    <span className="font-mono text-sm font-black text-stone-900 block mt-0.5">
                      {formatFCFA(selectedDossier.payment.totalAmountFCFA)}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-stone-200">
                    <span className="text-[10px] font-bold uppercase text-blue-600 block">Total Déjà Encaissé</span>
                    <span className="font-mono text-sm font-black text-[#135ca5] block mt-0.5">
                      {formatFCFA(selectedDossier.payment.amountPaidFCFA)}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-2xl border ${
                      selectedDossier.payment.remainingBalanceFCFA === 0
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase block">
                      {selectedDossier.payment.remainingBalanceFCFA === 0 ? 'Statut Dossier' : 'Reste à Régler'}
                    </span>
                    <span className="font-mono text-sm font-black block mt-0.5">
                      {selectedDossier.payment.remainingBalanceFCFA === 0
                        ? 'SOLDÉ (100%)'
                        : formatFCFA(selectedDossier.payment.remainingBalanceFCFA)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Form: Encaisser au Guichet (Espèces / TPE / Chèque) */}
              <div className="bg-white rounded-3xl border-2 border-[#135ca5]/30 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#f15a24] flex items-center justify-center font-bold">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-stone-900">
                        Enregistrement de Paiement au Guichet Agence
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Encaissement direct en agence avec délivrance immédiate de reçu officiel certifié
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-mono">
                    Caisse Siège EVA
                  </span>
                </div>

                {completedEncashment ? (
                  /* Success Confirmation Alert */
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="font-black text-sm text-emerald-950">
                        Encaissement Guichet Validé avec Succès !
                      </h5>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Reçu N° <strong className="font-mono">{completedEncashment.receiptNumber}</strong> généré et SMS de confirmation envoyé au pèlerin.
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleDownloadReceipt}
                        className="px-4 py-2 bg-[#135ca5] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-[#0c3f74]"
                      >
                        <Printer className="w-4 h-4 text-[#f15a24]" />
                        <span>Ré-imprimer le Reçu PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCompletedEncashment(null);
                          setEncashAmount(selectedDossier.payment.remainingBalanceFCFA || 0);
                        }}
                        className="px-4 py-2 bg-white text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold hover:bg-stone-50"
                      >
                        Nouveau Versement
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Encashment Form */
                  <form onSubmit={handleExecuteEncashment} className="space-y-4">
                    {/* Method Choice: Espèces, Chèque, TPE */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-2">
                        Mode d'encaissement au comptoir :
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setEncashSubMethod('ESPECES')}
                          className={`p-3 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                            encashSubMethod === 'ESPECES'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                              : 'border-stone-200 text-stone-600 bg-white hover:bg-stone-50'
                          }`}
                        >
                          <Wallet className="w-4 h-4 text-emerald-700" />
                          <span>Espèces (Cash FCFA)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEncashSubMethod('TPE')}
                          className={`p-3 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                            encashSubMethod === 'TPE'
                              ? 'border-[#135ca5] bg-blue-50 text-[#135ca5] shadow-xs'
                              : 'border-stone-200 text-stone-600 bg-white hover:bg-stone-50'
                          }`}
                        >
                          <CreditCard className="w-4 h-4 text-[#135ca5]" />
                          <span>Carte Bancaire (TPE)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEncashSubMethod('CHEQUE')}
                          className={`p-3 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                            encashSubMethod === 'CHEQUE'
                              ? 'border-purple-600 bg-purple-50 text-purple-950 shadow-xs'
                              : 'border-stone-200 text-stone-600 bg-white hover:bg-stone-50'
                          }`}
                        >
                          <FileText className="w-4 h-4 text-purple-700" />
                          <span>Chèque Certifié</span>
                        </button>
                      </div>
                    </div>

                    {/* Amount & Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                          Montant Encaissé (FCFA) :
                        </label>
                        <input
                          type="number"
                          value={encashAmount || ''}
                          onChange={(e) => setEncashAmount(Number(e.target.value))}
                          min={1000}
                          step={5000}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono text-sm font-black focus:ring-2 focus:ring-[#135ca5] bg-stone-50"
                        />
                        <div className="flex gap-2 mt-1.5">
                          {selectedDossier.payment.remainingBalanceFCFA > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setEncashAmount(selectedDossier.payment.remainingBalanceFCFA);
                                setEncashPaymentType('FULL');
                              }}
                              className="text-[10px] font-bold text-[#135ca5] underline"
                            >
                              Solde restant ({formatFCFA(selectedDossier.payment.remainingBalanceFCFA)})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEncashAmount(500000);
                              setEncashPaymentType('DEPOSIT');
                            }}
                            className="text-[10px] font-bold text-stone-500 underline"
                          >
                            Acompte type (500 000 FCFA)
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                          Nature du règlement :
                        </label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => setEncashPaymentType('DEPOSIT')}
                            className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                              encashPaymentType === 'DEPOSIT'
                                ? 'bg-blue-100 text-[#135ca5] border-[#135ca5]'
                                : 'bg-stone-50 text-stone-600 border-stone-200'
                            }`}
                          >
                            Acompte / Tranche
                          </button>
                          <button
                            type="button"
                            onClick={() => setEncashPaymentType('FULL')}
                            className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                              encashPaymentType === 'FULL'
                                ? 'bg-orange-100 text-[#f15a24] border-[#f15a24]'
                                : 'bg-stone-50 text-stone-600 border-stone-200'
                            }`}
                          >
                            Solde Intégral (100%)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Agent Notes / Cashier Ref */}
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                        Note caisse / N° de pièce (optionnel) :
                      </label>
                      <input
                        type="text"
                        value={encashNotes}
                        onChange={(e) => setEncashNotes(e.target.value)}
                        placeholder="Ex: Reçu remis en mains propres par Awa Diop, billetage vérifié"
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                      />
                    </div>

                    {/* Submit Action */}
                    <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                      <div className="text-xs text-stone-500">
                        Total à enregistrer : <strong className="font-mono text-stone-900 text-sm">{formatFCFA(encashAmount)}</strong>
                      </div>

                      <button
                        type="submit"
                        disabled={isProcessing || encashAmount <= 0}
                        className="px-6 py-3 rounded-2xl bg-[#135ca5] hover:bg-[#0c3f74] text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                      >
                        <Check className="w-4 h-4 text-[#f15a24]" />
                        <span>
                          {isProcessing
                            ? 'Enregistrement & Génération PDF...'
                            : `Valider Encaissement de ${formatFCFA(encashAmount)}`}
                        </span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-stone-400" />
            <span>EVA Voyages Siège - Ligne Agence : {agencyConfig.notificationPhone || '+221 78 639 10 00'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            Fermer le Contrôleur
          </button>
        </div>
      </div>
    </div>
  );
};
