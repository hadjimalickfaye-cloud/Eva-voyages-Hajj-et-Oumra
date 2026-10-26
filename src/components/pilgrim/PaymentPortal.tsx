import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod, Transaction, PilgrimDossier } from '../../types';
import {
  CreditCard,
  QrCode,
  Smartphone,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  Maximize2,
  Download,
  MessageCircle,
  Building2,
  Clock,
  Search,
  User,
  Upload,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { OfficialReceiptModal } from '../common/OfficialReceiptModal';
import { PilgrimBookingPassModal } from '../common/PilgrimBookingPassModal';
import { getOfflineDossierByCode } from '../../utils/offlineStorage';
import { scanImageFileForQr, extractTrackingCode, playScanSuccessBeep } from '../../utils/qrScanner';
import { WAVE_OFFICIAL_NUMBER, openWaveApp } from '../../utils/wavePayment';
import { ExternalLink } from 'lucide-react';

export const PaymentPortal: React.FC = () => {
  const {
    dossiers,
    processPayment,
    formatFCFA,
    agencyConfig,
    trackingQueryCode,
    setTrackingQueryCode,
    setPilgrimActiveTab,
    currentUser,
    getMyDossier,
    openAuthModal,
  } = useApp();

  // Strict privacy resolution: only the authenticated pilgrim's dossier
  const myDossier = getMyDossier();

  const [activeTrackingCode, setActiveTrackingCode] = useState<string>(() => {
    if (myDossier) return myDossier.trackingCode;
    if (currentUser?.linkedTrackingCode) return currentUser.linkedTrackingCode;
    if (trackingQueryCode) return trackingQueryCode;
    return '';
  });

  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isScanningQrFile, setIsScanningQrFile] = useState<boolean>(false);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync when user account or tracking code in global state changes
  useEffect(() => {
    const updated = getMyDossier();
    if (updated) {
      setActiveTrackingCode(updated.trackingCode);
    } else if (currentUser?.linkedTrackingCode) {
      setActiveTrackingCode(currentUser.linkedTrackingCode);
    } else if (trackingQueryCode) {
      setActiveTrackingCode(trackingQueryCode);
    }
  }, [currentUser, trackingQueryCode]);

  // Identify EXCLUSIVELY the single concerned pilgrim dossier
  const currentDossier: PilgrimDossier | undefined = useMemo(() => {
    if (myDossier) return myDossier;
    if (!activeTrackingCode) return undefined;
    const clean = activeTrackingCode.trim().toUpperCase();
    return (
      dossiers.find((d) => d.trackingCode.toUpperCase() === clean) ||
      getOfflineDossierByCode(clean) ||
      undefined
    );
  }, [myDossier, activeTrackingCode, dossiers]);

  // Payment Configuration Form State
  const [paymentTypeOption, setPaymentTypeOption] = useState<'DEPOSIT' | 'FULL' | 'CUSTOM'>('DEPOSIT');
  const [method, setMethod] = useState<PaymentMethod>('WAVE');
  const [amount, setAmount] = useState<number>(500000);
  const [phone, setPhone] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [completedDossier, setCompletedDossier] = useState<PilgrimDossier | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [showBookingPassModal, setShowBookingPassModal] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Sync phone and amount whenever the single concerned dossier is loaded or updated
  useEffect(() => {
    if (currentDossier) {
      if (currentDossier.personalInfo.phone) {
        setPhone(currentDossier.personalInfo.phone);
      } else if (currentUser?.phone) {
        setPhone(currentUser.phone);
      }

      const balance = currentDossier.payment.remainingBalanceFCFA;
      if (balance <= 0) {
        setAmount(0);
        setPaymentTypeOption('FULL');
      } else if (paymentTypeOption === 'FULL') {
        setAmount(balance);
      } else if (paymentTypeOption === 'DEPOSIT') {
        setAmount(Math.min(500000, balance));
      }
    }
  }, [currentDossier?.id, currentDossier?.payment.remainingBalanceFCFA]);

  const handlePaymentTypeChange = (type: 'DEPOSIT' | 'FULL' | 'CUSTOM') => {
    setPaymentTypeOption(type);
    if (!currentDossier) return;
    const balance = currentDossier.payment.remainingBalanceFCFA;
    if (type === 'FULL') {
      setAmount(balance);
    } else if (type === 'DEPOSIT') {
      setAmount(Math.min(500000, balance));
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    const clean = manualCodeInput.trim().toUpperCase();
    if (!clean) {
      setLookupError('Veuillez saisir votre numéro de dossier (ex: EVA-HJ26-9284).');
      return;
    }

    const found =
      dossiers.find((d) => d.trackingCode.toUpperCase() === clean) ||
      getOfflineDossierByCode(clean);

    if (found) {
      setActiveTrackingCode(found.trackingCode);
      setTrackingQueryCode(found.trackingCode);
      setManualCodeInput('');
      playScanSuccessBeep();
    } else {
      setLookupError(
        `Aucun dossier pèlerin trouvé pour la référence "${clean}". Vérifiez votre code (ex: EVA-HJ26-9284).`
      );
    }
  };

  const handleQrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningQrFile(true);
    setLookupError(null);
    try {
      const detected = await scanImageFileForQr(file);
      if (detected) {
        const code = extractTrackingCode(detected);
        if (code) {
          const match =
            dossiers.find((d) => d.trackingCode.toUpperCase() === code.toUpperCase()) ||
            getOfflineDossierByCode(code);
          if (match) {
            setActiveTrackingCode(match.trackingCode);
            setTrackingQueryCode(match.trackingCode);
            playScanSuccessBeep();
          } else {
            setActiveTrackingCode(code);
            setTrackingQueryCode(code);
          }
        } else {
          setLookupError(`Code détecté (${detected}) mais format non reconnu.`);
        }
      } else {
        setLookupError('Aucun QR Code valide détecté sur cette image. Veuillez essayer une autre photo.');
      }
    } catch {
      setLookupError('Erreur lors de la lecture du QR code.');
    } finally {
      setIsScanningQrFile(false);
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
    }
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDossier) return;

    if (amount <= 0 && currentDossier.payment.remainingBalanceFCFA > 0) {
      alert('Veuillez saisir un montant de versement supérieur à 0 FCFA.');
      return;
    }

    setIsProcessing(true);

    if (method === 'WAVE') {
      openWaveApp(Number(amount));
    }

    setTimeout(() => {
      const result = processPayment({
        dossierId: currentDossier.id,
        amountFCFA: Number(amount),
        method,
        paymentType: paymentTypeOption === 'FULL' ? 'FULL' : 'DEPOSIT',
        phone,
      });

      setIsProcessing(false);
      setCompletedTx(result.transaction);
      setCompletedDossier(currentDossier);
    }, 1800);
  };

  const copyRef = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Brand Header with Privacy Guarantee */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 px-2 bg-white rounded-xl border border-stone-200 shadow-xs flex items-center justify-center">
              <img src="/logo.png" alt="EVA Voyages" className="h-8 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-[#135ca5] tracking-tight">{agencyConfig.name}</span>
                <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-700 text-white font-bold uppercase">
                  Terminal Privé Sécurisé
                </span>
              </div>
              <h2 className="text-lg font-black text-stone-900">
                Paiement Sécurisé : Espace Personnel du Pèlerin
              </h2>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 self-start sm:self-auto bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Données Strictement Confidentielles</span>
          </span>
        </div>
        <p className="text-xs text-stone-600">
          Effectuez vos versements d'<strong>Acompte</strong> ou le <strong>Solde Intégral</strong> 24h/24 en toute sécurité. Les reçus fiscaux officiels avec quittance et attestations PDF certifiées sont délivrés instantanément.
        </p>
      </div>

      {completedTx ? (
        /* Transaction Success State */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-md text-center space-y-5 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>

          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest">
              Paiement Confirmé avec Succès
            </span>
            <h3 className="text-2xl font-black text-stone-900 mt-1">
              Versement de {formatFCFA(completedTx.amountFCFA)} reçu
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Opérateur : <strong>{completedTx.method === 'WAVE' ? 'Wave Digital Finance' : completedTx.method === 'ORANGE_MONEY' ? 'Orange Money' : 'Guichet Central Agence'}</strong> · Réf : <span className="font-mono">{completedTx.reference}</span>
            </p>
          </div>

          {/* Receipt card */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 max-w-md mx-auto text-xs text-left space-y-2">
            <div className="flex justify-between border-b border-stone-200 pb-2">
              <span className="text-stone-500">Numéro de reçu :</span>
              <strong className="font-mono text-stone-900">{completedTx.receiptNumber}</strong>
            </div>
            <div className="flex justify-between border-b border-stone-200 pb-2">
              <span className="text-stone-500">Dossier pèlerin :</span>
              <strong className="font-mono text-[#135ca5]">{completedDossier?.trackingCode}</strong>
            </div>
            <div className="flex justify-between border-b border-stone-200 pb-2">
              <span className="text-stone-500">Pèlerin bénéficiaire :</span>
              <span className="font-bold text-stone-900">
                {completedDossier?.personalInfo.firstName} {completedDossier?.personalInfo.lastName}
              </span>
            </div>
            <div className="flex justify-between border-b border-stone-200 pb-2">
              <span className="text-stone-500">Bénéficiaire agence :</span>
              <span className="font-bold text-stone-900">{agencyConfig.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Date & Heure :</span>
              <span>{new Date(completedTx.date).toLocaleString('fr-FR')}</span>
            </div>
          </div>

          {/* Notifications confirmation summary */}
          <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200 max-w-md mx-auto text-xs text-[#0c3f74] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#f15a24]" />
              <span>SMS & Email de confirmation envoyés au {phone || completedDossier?.personalInfo.phone}</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Délivré
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowReceiptModal(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#135ca5] hover:bg-[#0c3f74] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#f15a24]" />
              <span>Télécharger le Reçu Officiel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCompletedTx(null);
                setTrackingQueryCode(completedDossier?.trackingCode || '');
                setPilgrimActiveTab('TRACKING');
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <span>Accéder à mon espace de suivi</span>
            </button>
          </div>
        </div>
      ) : !currentDossier ? (
        /* CASE 1: No Dossier Identified Yet -> Private Identification Wall (ZERO other pilgrims exposed) */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="text-center space-y-2 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#135ca5] to-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-black text-stone-900 text-lg">
              Identification de Votre Dossier Pèlerin
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Pour préserver la stricte confidentialité de vos données personnelles et financières, les dossiers d'autres pèlerins ne sont pas affichés. Saisissez votre référence de dossier personnelle pour procéder à votre versement.
            </p>
          </div>

          {/* Form to enter tracking code */}
          <form onSubmit={handleLookupSubmit} className="max-w-md mx-auto space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Votre Référence de Dossier (ex: SMS de confirmation) :
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value.toUpperCase())}
                  placeholder="Ex: EVA-HJ26-9284"
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 font-mono text-sm font-bold uppercase focus:ring-2 focus:ring-[#135ca5] bg-stone-50/50"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-[#135ca5] hover:bg-[#0c3f74] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Accéder</span>
                </button>
              </div>
            </div>

            {lookupError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-start gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{lookupError}</span>
              </div>
            )}

            {/* Quick Upload QR Code Scanner */}
            <div className="pt-2 text-center">
              <input
                ref={qrFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleQrFileUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={isScanningQrFile}
                onClick={() => qrFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isScanningQrFile ? 'Détection du QR code...' : 'Scanner / Importer le QR Code de mon reçu'}</span>
              </button>
            </div>
          </form>

          {/* Account shortcuts */}
          <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => openAuthModal('PILGRIM', 'LOGIN')}
              className="text-[#135ca5] font-bold hover:underline flex items-center gap-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>Vous avez un compte ? Se connecter</span>
            </button>
            <span className="hidden sm:inline text-stone-300">·</span>
            <button
              type="button"
              onClick={() => setPilgrimActiveTab('PACKAGES')}
              className="text-stone-600 font-semibold hover:text-stone-900"
            >
              Pas encore inscrit ? Découvrir les formules
            </button>
          </div>
        </div>
      ) : (
        /* CASE 2: Single Concerned Pilgrim Dossier EXCLUSIVELY Displayed */
        <form onSubmit={handlePay} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-6">
          {/* Step 1: EXCLUSIVELY the Concerned Pilgrim's Dossier */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>1. Votre Dossier Pèlerin Personnel</span>
              </label>

              {/* Discreet code changer if needed (never lists all users) */}
              {!currentUser?.linkedTrackingCode && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTrackingCode('');
                    setTrackingQueryCode('');
                  }}
                  className="text-[11px] text-[#135ca5] hover:underline font-semibold"
                >
                  Changer de référence
                </button>
              )}
            </div>

            {/* Dedicated Pilgrim Dossier Card */}
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/40 via-white to-blue-50/30 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#135ca5] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs overflow-hidden">
                    {currentDossier.documents.photo?.fileUrl ? (
                      <img
                        src={currentDossier.documents.photo.fileUrl}
                        alt="Pèlerin"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>
                        {currentDossier.personalInfo.firstName[0]}
                        {currentDossier.personalInfo.lastName[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm sm:text-base text-stone-900">
                        {currentDossier.personalInfo.firstName} {currentDossier.personalInfo.lastName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Dossier Personnel
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                      <span>Réf :</span>
                      <strong className="font-mono text-[#135ca5] font-black">{currentDossier.trackingCode}</strong>
                      <button
                        type="button"
                        onClick={() => copyRef(currentDossier.trackingCode)}
                        className="text-stone-400 hover:text-stone-600 transition-colors"
                        title="Copier le code de dossier"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <span>· Tél : {currentDossier.personalInfo.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="self-stretch sm:self-auto flex items-center justify-between sm:justify-end gap-2">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-xl ${
                      currentDossier.payment.remainingBalanceFCFA === 0
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {currentDossier.payment.remainingBalanceFCFA === 0
                      ? 'Dossier 100% Soldé'
                      : `Solde Restant : ${formatFCFA(currentDossier.payment.remainingBalanceFCFA)}`}
                  </span>
                </div>
              </div>

              {/* Financial Metrics in 3 Clean Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-stone-200/70">
                <div className="p-3 bg-white rounded-xl border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Formule Choisie</span>
                  <span className="text-xs font-bold text-stone-800 block truncate" title={currentDossier.packageSnapshot.title}>
                    {currentDossier.packageSnapshot.title}
                  </span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">
                    Coût Total : <strong>{formatFCFA(currentDossier.packageSnapshot.priceFCFA)}</strong>
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Déjà Réglé</span>
                  <span className="text-sm font-black text-emerald-700 block">
                    {formatFCFA(currentDossier.payment.amountPaidFCFA)}
                  </span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">
                    Sur quittance certifiée
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-stone-200">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Reste à Solder</span>
                  <span className={`text-sm font-black block ${currentDossier.payment.remainingBalanceFCFA === 0 ? 'text-emerald-700' : 'text-[#f15a24]'}`}>
                    {formatFCFA(currentDossier.payment.remainingBalanceFCFA)}
                  </span>
                  <span className="text-[10px] text-stone-500 block mt-0.5">
                    {currentDossier.payment.remainingBalanceFCFA === 0 ? 'Aucun montant dû' : 'Éligible Wave & OM'}
                  </span>
                </div>
              </div>

              {/* Privacy Reassurance Note */}
              <div className="text-[11px] text-emerald-800 flex items-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Cet écran de règlement est sécurisé et strictement restreint à <strong>{currentDossier.personalInfo.firstName} {currentDossier.personalInfo.lastName}</strong>.
                </span>
              </div>
            </div>
          </div>

          {/* If dossier is already fully paid */}
          {currentDossier.payment.remainingBalanceFCFA === 0 ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-emerald-700" />
              </div>
              <h4 className="font-black text-sm text-emerald-950">
                Félicitations ! Votre dossier est intégralement soldé (100%)
              </h4>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                Votre paiement a été intégralement honoré. Vous pouvez dès à présent télécharger votre reçu officiel certifié, consulter votre pass pèlerin ou vérifier vos titres de voyage.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Télécharger le Reçu Officiel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBookingPassModal(true)}
                  className="px-4 py-2 rounded-xl border border-emerald-300 text-emerald-900 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Pass Réservation & QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTrackingQueryCode(currentDossier.trackingCode);
                    setPilgrimActiveTab('TRACKING');
                  }}
                  className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  <span>Suivre mon dossier</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 2: LES DEUX TYPES DE PAIEMENT */}
              <div className="pt-2 border-t border-stone-100">
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-2.5">
                  2. Les Deux Types de Paiement (Modalité de Versement)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                  {/* Type 1: Acompte */}
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange('DEPOSIT')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      paymentTypeOption === 'DEPOSIT'
                        ? 'border-[#135ca5] bg-blue-50/70 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase text-[#135ca5] block">TYPE 1</span>
                    <span className="font-bold text-xs text-stone-900 block mt-0.5">Acompte / Tranche</span>
                    <span className="text-[10px] text-stone-500 block mt-1">Versement partiel souple</span>
                  </button>

                  {/* Type 2: Règlement Intégral / Solde */}
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange('FULL')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      paymentTypeOption === 'FULL'
                        ? 'border-[#f15a24] bg-orange-50/70 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase text-[#f15a24] block">TYPE 2</span>
                    <span className="font-bold text-xs text-stone-900 block mt-0.5">Solde Intégral 100%</span>
                    <span className="text-[10px] text-stone-500 block mt-1">
                      {formatFCFA(currentDossier.payment.remainingBalanceFCFA)}
                    </span>
                  </button>

                  {/* Type 3: Libre */}
                  <button
                    type="button"
                    onClick={() => handlePaymentTypeChange('CUSTOM')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      paymentTypeOption === 'CUSTOM'
                        ? 'border-slate-800 bg-slate-100 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase text-stone-600 block">OPTION LIBRE</span>
                    <span className="font-bold text-xs text-stone-900 block mt-0.5">Montant Libre</span>
                    <span className="text-[10px] text-stone-500 block mt-1">Saisie personnalisée</span>
                  </button>
                </div>

                {/* Quick amounts tailored to the remaining balance */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {[
                    Math.min(250000, currentDossier.payment.remainingBalanceFCFA),
                    Math.min(500000, currentDossier.payment.remainingBalanceFCFA),
                    Math.min(1000000, currentDossier.payment.remainingBalanceFCFA),
                    currentDossier.payment.remainingBalanceFCFA,
                  ]
                    .filter((val, idx, arr) => val > 0 && arr.indexOf(val) === idx)
                    .map((quickAmount, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setAmount(quickAmount);
                          setPaymentTypeOption(
                            quickAmount === currentDossier.payment.remainingBalanceFCFA ? 'FULL' : 'CUSTOM'
                          );
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all tabular-nums cursor-pointer ${
                          amount === quickAmount
                            ? 'border-[#135ca5] bg-[#135ca5] text-white shadow-xs'
                            : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        {formatFCFA(quickAmount)}
                      </button>
                    ))}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Montant exact à débiter (FCFA) :
                  </label>
                  <input
                    type="number"
                    required
                    min={10000}
                    max={currentDossier.payment.remainingBalanceFCFA}
                    value={amount}
                    onChange={(e) => {
                      setAmount(Number(e.target.value));
                      setPaymentTypeOption('CUSTOM');
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 font-mono text-base font-bold focus:ring-2 focus:ring-[#135ca5] bg-stone-50"
                  />
                  <span className="text-[10px] text-stone-400 block mt-1">
                    Reste total à solder : {formatFCFA(currentDossier.payment.remainingBalanceFCFA)}
                  </span>
                </div>
              </div>

              {/* Step 3: LES MODES DE RÈGLEMENT */}
              <div className="pt-2 border-t border-stone-100">
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-3">
                  3. Choisissez votre Mode de Règlement (Mobile Money ou Paiement à l'Agence)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {/* Option 1: Wave */}
                  <button
                    type="button"
                    onClick={() => setMethod('WAVE')}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all relative cursor-pointer ${
                      method === 'WAVE'
                        ? 'border-[#1DC4FF] bg-gradient-to-b from-[#1DC4FF]/15 to-white text-stone-900 shadow-md ring-2 ring-[#1DC4FF]/25'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white p-1 border border-sky-100 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src={agencyConfig.waveLogoUrl || '/assets/wave_logo.png'}
                        alt="Wave Sénégal"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-black text-xs text-stone-900">WAVE SÉNÉGAL</span>
                        <span className="text-[8px] bg-cyan-100 text-cyan-800 font-black px-1.5 py-0.2 rounded-full">
                          0% Frais
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 block mt-0.5">Verser au +221 76 161 61 66</span>
                    </div>
                  </button>

                  {/* Option 2: Orange Money */}
                  <button
                    type="button"
                    onClick={() => setMethod('ORANGE_MONEY')}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all relative cursor-pointer ${
                      method === 'ORANGE_MONEY'
                        ? 'border-[#f15a24] bg-gradient-to-b from-[#f15a24]/15 to-white text-stone-900 shadow-md ring-2 ring-[#f15a24]/25'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white p-1 border border-orange-100 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src={agencyConfig.orangeMoneyLogoUrl || '/assets/orange_money_logo.png'}
                        alt="Orange Money"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-black text-xs text-stone-900">ORANGE MONEY</span>
                        <span className="text-[8px] bg-orange-100 text-[#d94917] font-black px-1.5 py-0.2 rounded-full">
                          #144#391#
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 block mt-0.5">Code Marchand / OTP</span>
                    </div>
                  </button>

                  {/* Option 3: Paiement à l'Agence */}
                  <button
                    type="button"
                    onClick={() => setMethod('AGENCY_CASH')}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all relative cursor-pointer ${
                      method === 'AGENCY_CASH'
                        ? 'border-emerald-600 bg-gradient-to-b from-emerald-500/15 to-white text-stone-900 shadow-md ring-2 ring-emerald-500/25'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white p-1 border border-emerald-100 shadow-sm flex items-center justify-center overflow-hidden shrink-0 text-emerald-700">
                      <Building2 className="w-7 h-7 text-emerald-700" />
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-black text-xs text-stone-900">PAIEMENT À L'AGENCE</span>
                        <span className="text-[8px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded-full">
                          Siège Dakar
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 block mt-0.5">Espèces / Chèque / TPE</span>
                    </div>
                  </button>
                </div>

                {/* Direct WhatsApp Payment Support Box with User Number */}
                <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white border-2 border-emerald-500/40 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-emerald-300 uppercase tracking-wider">
                          Assistance Paiement Mobile WhatsApp
                        </span>
                        <span className="text-[9px] bg-emerald-500/30 text-emerald-200 font-semibold px-2 py-0.2 rounded-full border border-emerald-400/30">
                          En Ligne
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-200 mt-0.5">
                        Besoin d'aide ou transmission de quittance Wave / OM ? Contactez notre caisse au <strong className="text-white font-mono">{agencyConfig.whatsapp || '+221 78 639 10 00'}</strong> pour le dossier <strong className="font-mono text-amber-300">{currentDossier.trackingCode}</strong>.
                      </p>
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/221786391000?text=${encodeURIComponent(
                      `Salam Alaykum ${agencyConfig.name}, je souhaite une assistance pour effectuer un paiement via ${method === 'WAVE' ? 'Wave' : method === 'ORANGE_MONEY' ? 'Orange Money' : 'Caisse'} pour mon dossier ${currentDossier.trackingCode} (${currentDossier.personalInfo.firstName} ${currentDossier.personalInfo.lastName}).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-transform hover:scale-[1.02] shadow-md self-stretch sm:self-auto justify-center"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp : +221 78 639 10 00</span>
                  </a>
                </div>

                {/* WAVE Interface: Direct redirection to client Wave app (+221 76 161 61 66) */}
                {method === 'WAVE' ? (
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-cyan-50/90 via-white to-blue-50/50 rounded-2xl border-2 border-[#1DC4FF]/50 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-cyan-100 flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white p-1 border border-sky-200 shadow-xs flex items-center justify-center shrink-0">
                          <img
                            src={agencyConfig.waveLogoUrl || '/assets/wave_logo.png'}
                            alt="Wave"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-xs text-stone-900">
                              Paiement Direct Wave Digital Finance
                            </h4>
                            <span className="text-[9px] bg-cyan-100 text-cyan-800 font-black px-1.5 py-0.5 rounded-full">
                              0% Frais
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-600 block mt-0.5">
                            Numéro Destinataire : <strong className="text-[#135ca5] font-mono">{WAVE_OFFICIAL_NUMBER}</strong> (EVA VOYAGES)
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Compte Certifié</span>
                      </span>
                    </div>

                    {/* Direct Wave Redirection Card */}
                    <div className="p-4 bg-white rounded-2xl border-2 border-[#1DC4FF] shadow-sm space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#135ca5] bg-cyan-100 px-2 py-0.5 rounded-full">
                            Redirection Directe Wave
                          </span>
                          <h5 className="font-black text-sm text-stone-900">
                            Verser directement depuis votre compte Wave
                          </h5>
                          <p className="text-xs text-stone-600 leading-relaxed">
                            Le choix de Wave vous mène directement sur votre application <strong>Wave</strong> pour verser <strong>{formatFCFA(amount)}</strong> sur le numéro officiel <strong className="font-mono text-stone-900">{WAVE_OFFICIAL_NUMBER}</strong> (EVA VOYAGES).
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => openWaveApp(amount)}
                          className="px-4 py-3 bg-[#1DC4FF] hover:bg-[#00b2f5] text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shrink-0 transition-transform hover:scale-[1.02] shadow-md cursor-pointer"
                        >
                          <Smartphone className="w-4 h-4 text-slate-950" />
                          <span>Ouvrir l'application Wave</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-950" />
                        </button>
                      </div>

                      <div className="p-2.5 bg-cyan-50/80 rounded-xl border border-cyan-100 flex items-center gap-2 text-[11px] text-cyan-950">
                        <CheckCircle2 className="w-4 h-4 text-[#135ca5] shrink-0" />
                        <span>
                          Transfert direct vers le <strong>{WAVE_OFFICIAL_NUMBER}</strong> : aucun code QR à scanner, l'ordre est exécuté immédiatement depuis votre solde Wave.
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Votre Numéro de Téléphone Mobile (pour réception du reçu certifié & notification SMS)
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+221 78 000 00 00"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-cyan-300 font-mono text-xs bg-white font-bold text-stone-900"
                      />
                    </div>
                  </div>
                ) : method === 'ORANGE_MONEY' ? (
                  /* ORANGE MONEY Interface with official Logo */
                  <div className="p-4 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 rounded-2xl border-2 border-[#f15a24]/40 space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-orange-100 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white p-0.5 border border-orange-200 shadow-xs flex items-center justify-center shrink-0">
                          <img
                            src={agencyConfig.orangeMoneyLogoUrl || '/assets/orange_money_logo.png'}
                            alt="Orange Money"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-xs font-bold text-stone-800">
                          Compte Marchand Orange Money : <strong>{agencyConfig.orangeMoneyMerchantNumber}</strong>
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-[#d94917] bg-orange-100 px-2 py-0.5 rounded-lg">
                        #144#391#
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Numéro de Téléphone Mobile Orange Money
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+221 77 000 00 00"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-orange-300 font-mono text-xs bg-white font-bold"
                      />
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-orange-100 text-[11px] text-stone-600 flex items-center gap-2">
                      <img
                        src={agencyConfig.orangeMoneyLogoUrl || '/assets/orange_money_logo.png'}
                        alt="Orange Money"
                        className="w-4 h-4 object-contain shrink-0"
                      />
                      <span>
                        Composez <strong>#144#391#</strong> sur votre mobile ou confirmez la notification OTP envoyée par Orange.
                      </span>
                    </div>
                  </div>
                ) : (
                  /* PAIEMENT À L'AGENCE (Siège EVA Voyages) */
                  <div className="p-5 bg-gradient-to-br from-emerald-50/90 via-white to-blue-50/40 rounded-2xl border-2 border-emerald-600/40 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-emerald-100 gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div>
                          <h4 className="font-black text-xs text-stone-900">
                            Règlement Direct au Siège de l'Agence EVA Voyages
                          </h4>
                          <span className="text-[10px] text-emerald-800 font-semibold">
                            Guichet Caisse Officiel Agréé
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                        Avenue Cheikh Anta Diop, Dakar
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-stone-900">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>Horaires d'Ouverture Caisse :</span>
                        </div>
                        <p className="text-[11px] text-stone-600">
                          Lundi à Samedi de <strong>08h30 à 18h30</strong> sans interruption.
                        </p>
                        <p className="text-[10px] text-stone-500">
                          Service d'accueil dédié pour les pèlerins et leurs familles.
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-stone-900">
                          <CreditCard className="w-3.5 h-3.5 text-[#135ca5]" />
                          <span>Modes de Règlement Acceptés :</span>
                        </div>
                        <ul className="text-[11px] text-stone-600 space-y-0.5 list-disc list-inside">
                          <li>Espèces (Cash FCFA) avec comptage sécurisé</li>
                          <li>Chèque bancaire certifié à l'ordre d'EVA Voyages</li>
                          <li>Terminal Carte Bancaire (TPE Visa / Mastercard)</li>
                        </ul>
                      </div>
                    </div>

                    {/* Booking Pass & QR Code Card Preview for current pilgrim */}
                    <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shrink-0">
                          <QrCode className="w-8 h-8 text-[#135ca5]" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                            Pass Visite Guichet & QR Réservation
                          </span>
                          <h5 className="font-black text-sm text-white">
                            Dossier {currentDossier.trackingCode}
                          </h5>
                          <p className="text-[11px] text-stone-300">
                            Présentez ce QR Code au guichet pour vérification instantanée et remise de votre reçu certifié.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowBookingPassModal(true)}
                        className="px-4 py-2.5 bg-[#f15a24] hover:bg-[#d94917] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shrink-0 transition-transform hover:scale-[1.02] cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Ouvrir Mon Pass & QR Code</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Numéro de Téléphone pour la Confirmation SMS de votre Passage :
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+221 77 000 00 00"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 font-mono text-xs bg-white font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className={`w-full py-4 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                  isProcessing
                    ? 'bg-stone-500 cursor-wait'
                    : method === 'WAVE'
                    ? 'bg-[#135ca5] hover:bg-[#0c3f74]'
                    : method === 'ORANGE_MONEY'
                    ? 'bg-[#f15a24] hover:bg-[#d94917]'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                <Lock className="w-4 h-4 text-[#f15a24]" />
                <span>
                  {isProcessing
                    ? `Traitement sécurisé du versement ${method}...`
                    : method === 'AGENCY_CASH'
                    ? `Enregistrer mon passage au guichet (${formatFCFA(amount)}) & Générer Reçu`
                    : `Effectuer le versement de ${formatFCFA(amount)} via ${method === 'WAVE' ? 'Wave' : 'Orange Money'}`}
                </span>
              </button>
            </>
          )}
        </form>
      )}

      {/* Official receipt modal */}
      {completedDossier && (
        <OfficialReceiptModal
          dossier={completedDossier}
          transaction={completedTx || undefined}
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

      {/* Pilgrim Booking Pass & QR Modal */}
      {currentDossier && (
        <PilgrimBookingPassModal
          dossier={currentDossier}
          isOpen={showBookingPassModal}
          onClose={() => setShowBookingPassModal(false)}
        />
      )}
    </div>
  );
};
