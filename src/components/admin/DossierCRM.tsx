import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PilgrimDossier, WorkflowStatus, DocumentType, Package } from '../../types';
import {
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  CreditCard,
  Plus,
  MessageCircle,
  X,
  RotateCcw,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Building2,
  User,
  ShieldCheck,
  Check,
  Plane,
  FolderDown,
  Scan,
  QrCode,
  FileSpreadsheet,
  FileType2,
  FileText,
  ChevronDown,
  ChevronUp,
  Layers,
  LayoutGrid,
  Calendar,
  MapPin,
  Users,
  Sparkles,
} from 'lucide-react';
import { DossierDetailModal } from './DossierDetailModal';
import { PilgrimDocumentsModal } from './PilgrimDocumentsModal';
import { generatePdfReceipt } from '../../utils/generatePdfReceipt';
import { AgencyScanVerifyModal } from './AgencyScanVerifyModal';
import { PilgrimBookingPassModal } from '../common/PilgrimBookingPassModal';
import { FicheRenseignementsModal } from '../common/FicheRenseignementsModal';
import { AdminDocumentLightboxModal } from './AdminDocumentLightboxModal';
import { exportDossiersToCsv, exportDossiersToExcel, exportDossiersToPdf } from '../../utils/exportDossiers';

export const DossierCRM: React.FC = () => {
  const {
    dossiers,
    packages,
    formatFCFA,
    selectedDossierId,
    setSelectedDossierId,
    selectedPackageId,
    setSelectedPackageId,
    setPilgrimActiveTab,
    setCurrentView,
    agencyConfig,
    isGuide,
  } = useApp();

  // Search & Filters State
  const [search, setSearch] = useState<string>('');
  const [packageFilter, setPackageFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'>('ALL');
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState<string>('ALL');
  const [packageTypeFilter, setPackageTypeFilter] = useState<'ALL' | 'HAJJ' | 'OUMRA'>('ALL');
  const [whatsappStatusFilter, setWhatsappStatusFilter] = useState<'ALL' | 'JOINED' | 'INVITATION_SENT' | 'PENDING'>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Export Dropdown State
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Sorting and Pagination State for high volumes
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'NAME_ASC' | 'NAME_DESC' | 'PAID_DESC' | 'BALANCE_DESC'>('DATE_DESC');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // View Mode: Grouped by Package (Hajj & Oumra) vs Global Flat Table
  const [crmViewMode, setCrmViewMode] = useState<'GROUPED' | 'LIST'>('GROUPED');
  const [collapsedPackages, setCollapsedPackages] = useState<Record<string, boolean>>({});

  const togglePackageCollapse = (pkgId: string) => {
    setCollapsedPackages((prev) => ({
      ...prev,
      [pkgId]: !prev[pkgId],
    }));
  };

  const expandAllPackages = () => {
    setCollapsedPackages({});
  };

  const collapseAllPackages = () => {
    const all: Record<string, boolean> = {};
    packages.forEach((p) => {
      all[p.id] = true;
    });
    setCollapsedPackages(all);
  };

  const [inspectDossier, setInspectDossier] = useState<PilgrimDossier | null>(() => {
    return selectedDossierId ? dossiers.find((d) => d.id === selectedDossierId) || null : null;
  });
  const [documentsModalDossier, setDocumentsModalDossier] = useState<PilgrimDossier | null>(null);
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [passDossier, setPassDossier] = useState<PilgrimDossier | null>(null);
  const [ficheDossier, setFicheDossier] = useState<PilgrimDossier | null>(null);
  const [lightboxPreview, setLightboxPreview] = useState<{
    dossier: PilgrimDossier;
    docType: DocumentType;
  } | null>(null);

  // Close export menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (packageFilter !== 'ALL') count++;
    if (paymentStatusFilter !== 'ALL') count++;
    if (workflowStatusFilter !== 'ALL') count++;
    if (packageTypeFilter !== 'ALL') count++;
    if (whatsappStatusFilter !== 'ALL') count++;
    return count;
  }, [search, packageFilter, paymentStatusFilter, workflowStatusFilter, packageTypeFilter, whatsappStatusFilter]);

  const handleResetFilters = () => {
    setSearch('');
    setPackageFilter('ALL');
    setPaymentStatusFilter('ALL');
    setWorkflowStatusFilter('ALL');
    setPackageTypeFilter('ALL');
    setWhatsappStatusFilter('ALL');
    setCurrentPage(1);
  };

  // Filter and Sort
  const filteredDossiers = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = dossiers.filter((d) => {
      // 1. Search by Name (first name, last name), Code, Phone, Passport
      const fullName = `${d.personalInfo.firstName} ${d.personalInfo.lastName}`.toLowerCase();
      const reverseFullName = `${d.personalInfo.lastName} ${d.personalInfo.firstName}`.toLowerCase();
      const matchesSearch =
        !q ||
        fullName.includes(q) ||
        reverseFullName.includes(q) ||
        d.trackingCode.toLowerCase().includes(q) ||
        d.personalInfo.phone.includes(q) ||
        d.personalInfo.passportNumber.toLowerCase().includes(q) ||
        (d.personalInfo.email && d.personalInfo.email.toLowerCase().includes(q));

      // 2. Filter by Package
      const matchesPackage = packageFilter === 'ALL' || d.packageId === packageFilter;

      // 3. Filter by Payment Status
      let matchesPayment = true;
      if (paymentStatusFilter === 'PAID') {
        matchesPayment = d.payment.remainingBalanceFCFA === 0 || d.payment.paymentStatus === 'PAID';
      } else if (paymentStatusFilter === 'PARTIAL') {
        matchesPayment =
          d.payment.amountPaidFCFA > 0 &&
          d.payment.remainingBalanceFCFA > 0 &&
          d.payment.paymentStatus !== 'PAID';
      } else if (paymentStatusFilter === 'UNPAID') {
        matchesPayment = d.payment.amountPaidFCFA === 0 || d.payment.paymentStatus === 'UNPAID';
      }

      // 4. Filter by Workflow Status
      const matchesWorkflow = workflowStatusFilter === 'ALL' || d.workflowStatus === workflowStatusFilter;

      // 5. Filter by Package Type (Hajj vs Oumra)
      const matchesPackageType =
        packageTypeFilter === 'ALL' || d.packageSnapshot.type === packageTypeFilter;

      // 6. Filter by WhatsApp Status
      const matchesWhatsapp =
        whatsappStatusFilter === 'ALL' ||
        (whatsappStatusFilter === 'JOINED' && d.whatsappStatus === 'JOINED') ||
        (whatsappStatusFilter === 'INVITATION_SENT' && d.whatsappStatus === 'INVITATION_SENT') ||
        (whatsappStatusFilter === 'PENDING' && (!d.whatsappStatus || d.whatsappStatus === 'PENDING'));

      return matchesSearch && matchesPackage && matchesPayment && matchesWorkflow && matchesPackageType && matchesWhatsapp;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'DATE_DESC') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === 'DATE_ASC') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sortBy === 'NAME_ASC') {
        const nameA = `${a.personalInfo.lastName} ${a.personalInfo.firstName}`.toLowerCase();
        const nameB = `${b.personalInfo.lastName} ${b.personalInfo.firstName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'NAME_DESC') {
        const nameA = `${a.personalInfo.lastName} ${a.personalInfo.firstName}`.toLowerCase();
        const nameB = `${b.personalInfo.lastName} ${b.personalInfo.firstName}`.toLowerCase();
        return nameB.localeCompare(nameA);
      }
      if (sortBy === 'PAID_DESC') {
        return b.payment.amountPaidFCFA - a.payment.amountPaidFCFA;
      }
      if (sortBy === 'BALANCE_DESC') {
        return b.payment.remainingBalanceFCFA - a.payment.remainingBalanceFCFA;
      }
      return 0;
    });
  }, [
    dossiers,
    search,
    packageFilter,
    paymentStatusFilter,
    workflowStatusFilter,
    packageTypeFilter,
    whatsappStatusFilter,
    sortBy,
  ]);

  // Packages categorized into Hajj and Oumra for grouped view
  const hajjPackages = useMemo(() => {
    return packages.filter(
      (p) =>
        p.type === 'HAJJ' &&
        (packageTypeFilter === 'ALL' || packageTypeFilter === 'HAJJ') &&
        (packageFilter === 'ALL' || packageFilter === p.id)
    );
  }, [packages, packageTypeFilter, packageFilter]);

  const oumraPackages = useMemo(() => {
    return packages.filter(
      (p) =>
        p.type === 'OUMRA' &&
        (packageTypeFilter === 'ALL' || packageTypeFilter === 'OUMRA') &&
        (packageFilter === 'ALL' || packageFilter === p.id)
    );
  }, [packages, packageTypeFilter, packageFilter]);

  const getDossiersForPackage = (pkg: Package) => {
    return filteredDossiers.filter(
      (d) => d.packageId === pkg.id || d.packageSnapshot?.title === pkg.title
    );
  };

  // Aggregate Stats on Filtered Data
  const stats = useMemo(() => {
    let totalPaid = 0;
    let totalTarget = 0;
    let countPaid = 0;
    let countPartial = 0;
    let countUnpaid = 0;

    filteredDossiers.forEach((d) => {
      totalPaid += d.payment.amountPaidFCFA;
      totalTarget += d.payment.totalAmountFCFA;
      if (d.payment.remainingBalanceFCFA === 0 || d.payment.paymentStatus === 'PAID') {
        countPaid++;
      } else if (d.payment.amountPaidFCFA > 0) {
        countPartial++;
      } else {
        countUnpaid++;
      }
    });

    const totalRemaining = Math.max(0, totalTarget - totalPaid);
    const globalPercent = totalTarget > 0 ? Math.round((totalPaid / totalTarget) * 100) : 0;

    return { totalPaid, totalTarget, totalRemaining, globalPercent, countPaid, countPartial, countUnpaid };
  }, [filteredDossiers]);

  // Pagination calculation
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredDossiers.length / pageSize));
  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const paginatedDossiers = useMemo(() => {
    if (pageSize === -1) return filteredDossiers;
    const start = (effectiveCurrentPage - 1) * pageSize;
    return filteredDossiers.slice(start, start + pageSize);
  }, [filteredDossiers, effectiveCurrentPage, pageSize]);

  const getFilterSummary = (): string => {
    const parts: string[] = [];
    if (search.trim()) parts.push(`Recherche: "${search.trim()}"`);
    if (packageFilter !== 'ALL') {
      const p = packages.find((pkg) => pkg.id === packageFilter);
      if (p) parts.push(`Package: ${p.title}`);
    }
    if (packageTypeFilter !== 'ALL') parts.push(`Type: ${packageTypeFilter}`);
    if (paymentStatusFilter !== 'ALL') parts.push(`Paiement: ${paymentStatusFilter}`);
    if (workflowStatusFilter !== 'ALL') parts.push(`Statut: ${workflowStatusFilter}`);
    return parts.length > 0 ? parts.join(' | ') : 'Tous critères confondus';
  };

  const handleExportCsv = () => {
    exportDossiersToCsv({
      dossiers: filteredDossiers,
      agencyConfig,
      filterLabel: getFilterSummary(),
      maskFinancials: isGuide,
    });
    setShowExportMenu(false);
  };

  const handleExportExcel = () => {
    exportDossiersToExcel({
      dossiers: filteredDossiers,
      agencyConfig,
      filterLabel: getFilterSummary(),
      maskFinancials: isGuide,
    });
    setShowExportMenu(false);
  };

  const handleExportPdf = () => {
    exportDossiersToPdf({
      dossiers: filteredDossiers,
      agencyConfig,
      filterLabel: getFilterSummary(),
    });
    setShowExportMenu(false);
  };

  const statusBadge = (status: WorkflowStatus) => {
    const map: Record<WorkflowStatus, { label: string; class: string }> = {
      DOCUMENTS_PENDING: { label: 'Doc. Manquants', class: 'bg-red-50 text-red-700 border-red-200' },
      UNDER_REVIEW: { label: 'En Examen', class: 'bg-amber-50 text-amber-800 border-amber-200' },
      DOCUMENTS_APPROVED: { label: 'Docs Validés', class: 'bg-blue-50 text-blue-800 border-blue-200' },
      FLIGHT_TICKET_ISSUED: { label: 'Billet & Vol Confirmés', class: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
      READY_FOR_DEPARTURE: { label: 'Prêt Embarquement', class: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
      COMPLETED: { label: 'Accompli', class: 'bg-stone-100 text-stone-800 border-stone-200' },
    };

    const s = map[status] || { label: status, class: 'bg-stone-50 text-stone-700' };
    return (
      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${s.class} whitespace-nowrap`}>
        {s.label}
      </span>
    );
  };

  const paymentBadge = (dossier: PilgrimDossier) => {
    const isPaid = dossier.payment.remainingBalanceFCFA === 0 || dossier.payment.paymentStatus === 'PAID';
    const isPartial = dossier.payment.amountPaidFCFA > 0 && !isPaid;

    if (isPaid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />
          <span>Soldé (100%)</span>
        </span>
      );
    }
    if (isPartial) {
      const pct = Math.round((dossier.payment.amountPaidFCFA / dossier.payment.totalAmountFCFA) * 100);
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-700" />
          <span>Acompte ({pct}%)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
        <AlertCircle className="w-3 h-3 text-rose-600" />
        <span>Non payé</span>
      </span>
    );
  };

  const renderPilgrimTableRow = (dossier: PilgrimDossier, hidePackageCol: boolean = false) => {
    return (
      <tr
        key={dossier.id}
        className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
        onClick={() => setInspectDossier(dossier)}
      >
        {/* Code */}
        <td className="px-5 py-3.5 font-mono font-bold text-emerald-950 whitespace-nowrap">
          <span className="px-2 py-0.5 rounded-md bg-stone-100 group-hover:bg-emerald-100/60 transition-colors">
            {dossier.trackingCode}
          </span>
        </td>

        {/* Pilgrim Name, Photo Avatar & Contact */}
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            {/* Photo Avatar thumbnail */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setLightboxPreview({ dossier, docType: 'photo' });
              }}
              className="w-9 h-9 rounded-full bg-stone-100 border border-stone-300 overflow-hidden shrink-0 relative group/avatar cursor-zoom-in shadow-2xs"
              title="Cliquer pour agrandir la photo d'identité"
            >
              {dossier.documents.photo?.fileUrl ? (
                <img
                  src={dossier.documents.photo.fileUrl}
                  alt={dossier.personalInfo.lastName}
                  className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-stone-500 text-[11px] bg-slate-100">
                  {dossier.personalInfo.firstName[0]}
                  {dossier.personalInfo.lastName[0]}
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Eye className="w-3 h-3" />
              </div>
            </div>

            <div>
              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                <span>{dossier.personalInfo.lastName.toUpperCase()} {dossier.personalInfo.firstName}</span>
              </div>
              <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                {dossier.personalInfo.phone}
              </div>
            </div>
          </div>
        </td>

        {/* Package OR Room Type Formula */}
        {!hidePackageCol ? (
          <td className="px-5 py-3.5">
            <div className="font-medium text-stone-800 truncate max-w-xs flex items-center gap-1">
              <span className="text-[11px]">
                {dossier.packageSnapshot.type === 'HAJJ' ? '🕋' : '🌙'}
              </span>
              <span className="truncate">{dossier.packageSnapshot.title}</span>
            </div>
            <div className="text-[10px] text-stone-400 capitalize mt-0.5">
              Chambre {dossier.packageSnapshot.roomType} · {dossier.packageSnapshot.season}
            </div>
          </td>
        ) : (
          <td className="px-5 py-3.5 whitespace-nowrap">
            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-stone-100 text-stone-800 font-semibold capitalize text-[11px]">
              Chambre {dossier.packageSnapshot.roomType || 'Standard'}
            </span>
            <div className="text-[10px] text-stone-400 font-mono mt-0.5">
              Formule {formatFCFA(dossier.payment.totalAmountFCFA)}
            </div>
          </td>
        )}

        {/* Administrative Pieces */}
        <td className="px-5 py-3.5 whitespace-nowrap">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-stone-500 font-medium">Passeport:</span>
                <span className="font-mono font-bold text-stone-800 text-[11px]">
                  {dossier.personalInfo.passportNumber || 'En attente'}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxPreview({ dossier, docType: 'passport' });
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  dossier.documents.passport?.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : dossier.documents.passport?.fileUrl
                    ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                }`}
                title="Inspecter le scan du passeport"
              >
                <Eye className="w-3 h-3" />
                <span>
                  {dossier.documents.passport?.status === 'APPROVED'
                    ? 'Validé'
                    : dossier.documents.passport?.fileUrl
                    ? 'En examen'
                    : 'Manquant'}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-stone-500">Photo 4x4 :</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxPreview({ dossier, docType: 'photo' });
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  dossier.documents.photo?.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : dossier.documents.photo?.fileUrl
                    ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
                title="Inspecter la photo d'identité"
              >
                <Eye className="w-3 h-3" />
                <span>
                  {dossier.documents.photo?.status === 'APPROVED'
                    ? 'Validé'
                    : dossier.documents.photo?.fileUrl
                    ? 'En examen'
                    : 'À fournir'}
                </span>
              </button>
            </div>
          </div>
        </td>

        {/* WhatsApp Status */}
        <td className="px-5 py-3.5 whitespace-nowrap">
          {dossier.whatsappStatus === 'JOINED' ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366] fill-current" />
              <span>Rejoint</span>
            </span>
          ) : dossier.whatsappStatus === 'INVITATION_SENT' ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 text-[#135ca5] border border-blue-200 text-[11px] font-bold">
              <MessageCircle className="w-3.5 h-3.5 text-[#135ca5]" />
              <span>Invité</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
              <span>À intégrer</span>
            </span>
          )}
          <span className="text-[10px] text-stone-400 block truncate max-w-[130px] mt-0.5">
            {dossier.packageSnapshot.whatsappGroupName || dossier.packageSnapshot.title}
          </span>
        </td>

        {/* Workflow Status */}
        <td className="px-5 py-3.5 whitespace-nowrap">
          {statusBadge(dossier.workflowStatus)}
        </td>

        {/* Payment Breakdown & Status Badge (Admin Only, hidden for Guide) */}
        {!isGuide ? (
          <td className="px-5 py-3.5 text-right font-mono whitespace-nowrap">
            <div className="flex items-center justify-end gap-1.5 mb-1">
              {paymentBadge(dossier)}
            </div>
            <div className="font-black text-stone-900 tabular-nums">
              {formatFCFA(dossier.payment.amountPaidFCFA)}
            </div>
            <div className="text-[10px] text-stone-400 tabular-nums">
              / {formatFCFA(dossier.payment.totalAmountFCFA)}
            </div>
            {/* Progress Bar */}
            <div className="w-24 h-1.5 bg-stone-100 rounded-full overflow-hidden mt-1 ml-auto">
              <div
                className={`h-full rounded-full transition-all ${
                  dossier.payment.remainingBalanceFCFA === 0
                    ? 'bg-emerald-500'
                    : dossier.payment.amountPaidFCFA > 0
                    ? 'bg-[#135ca5]'
                    : 'bg-stone-300'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    dossier.payment.totalAmountFCFA > 0
                      ? Math.round(
                          (dossier.payment.amountPaidFCFA / dossier.payment.totalAmountFCFA) * 100
                        )
                      : 0
                  )}%`,
                }}
              />
            </div>
          </td>
        ) : (
          <td className="px-5 py-3.5 text-right whitespace-nowrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
              <Check className="w-3 h-3 text-emerald-700" />
              <span>Enregistré</span>
            </span>
            <p className="text-[9px] text-stone-400 mt-0.5">Tarifs confidentiels Direction</p>
          </td>
        )}

        {/* Actions */}
        <td className="px-5 py-3.5 text-center">
          <div className="flex items-center justify-center gap-1">
            {/* WhatsApp Direct from Official Line */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const cleanPhone = dossier.personalInfo.phone.replace(/[^0-9]/g, '');
                const groupLink =
                  dossier.packageSnapshot.whatsappGroupLink ||
                  'https://chat.whatsapp.com/invite/EVAHajj2026';
                const msg = `Salam Alaykum ${dossier.personalInfo.firstName}, message de votre agence EVA Voyages (+221 78 639 10 00) concernant votre dossier ${dossier.trackingCode} (${dossier.packageSnapshot.title}). Voici également le lien d'accès à votre groupe officiel: ${groupLink}`;
                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#25D366] hover:text-emerald-800 transition-colors cursor-pointer"
              title="Contacter le pèlerin par WhatsApp (depuis la ligne +221 78 639 10 00)"
            >
              <MessageCircle className="w-4 h-4" />
            </button>

            {/* Fiche de Renseignements Pèlerin Modal */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFicheDossier(dossier);
              }}
              className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-700 text-purple-700 hover:text-white transition-colors border border-purple-200 cursor-pointer"
              title="Ouvrir, Imprimer & Transmettre la Fiche de Renseignements (PDF / WhatsApp)"
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* View & Print Pilgrim Booking Pass with QR Code */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPassDossier(dossier);
              }}
              className="p-1.5 rounded-lg bg-blue-50 hover:bg-[#135ca5] text-[#135ca5] hover:text-white transition-colors border border-blue-200 cursor-pointer"
              title="Afficher & Imprimer le Pass Pèlerin et QR Code de réservation"
            >
              <QrCode className="w-4 h-4" />
            </button>

            {/* Download Official PDF Receipt */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                generatePdfReceipt({
                  dossier,
                  agencyConfig,
                  autoDownload: true,
                });
              }}
              className="p-1.5 rounded-lg bg-orange-50 hover:bg-[#f15a24] text-[#ea580c] hover:text-white transition-colors border border-orange-200 cursor-pointer"
              title="Générer & Télécharger le reçu officiel en PDF"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Inspect Dossier Modal */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setInspectDossier(dossier);
              }}
              className="p-1.5 rounded-lg bg-stone-100 hover:bg-emerald-100 hover:text-emerald-900 text-stone-600 transition-colors cursor-pointer"
              title="Ouvrir le dossier complet"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderPackageGroupCard = (pkg: Package) => {
    const pkgDossiers = getDossiersForPackage(pkg);
    const isCollapsed = !!collapsedPackages[pkg.id];
    const pkgSpotsTotal = pkg.spotsTotal || 0;
    const pkgSpotsRemaining = Math.max(0, pkgSpotsTotal - pkgDossiers.length);
    const pkgTotalPaid = pkgDossiers.reduce((acc, d) => acc + d.payment.amountPaidFCFA, 0);
    const pkgTotalExpected = pkgDossiers.reduce((acc, d) => acc + d.payment.totalAmountFCFA, 0);
    const pkgRemaining = Math.max(0, pkgTotalExpected - pkgTotalPaid);
    const pkgWhatsappJoined = pkgDossiers.filter((d) => d.whatsappStatus === 'JOINED').length;
    const isHajj = pkg.type === 'HAJJ';

    return (
      <div key={pkg.id} className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden transition-all">
        {/* Package Header Banner */}
        <div
          onClick={() => togglePackageCollapse(pkg.id)}
          className="p-5 bg-gradient-to-r from-stone-50 via-white to-stone-50/60 hover:bg-stone-100/50 cursor-pointer transition-colors border-b border-stone-200"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Left: Package Identity */}
            <div className="flex items-start gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold ${
                  isHajj ? 'bg-emerald-900 text-amber-300 shadow-xs' : 'bg-[#135ca5] text-white shadow-xs'
                }`}
              >
                {isHajj ? '🕋' : '🌙'}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      isHajj
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-blue-100 text-[#135ca5] border border-blue-300'
                    }`}
                  >
                    {isHajj ? 'Hajj 1447H' : 'Oumra 1447H'}
                  </span>
                  <span className="text-xs font-semibold text-stone-500">{pkg.season}</span>
                  <span className="text-[11px] font-mono text-stone-400">· {pkg.durationDays} Jours</span>
                </div>
                <h3 className="text-base font-bold text-stone-900 mt-1">{pkg.title}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>{pkg.departureDate} au {pkg.returnDate}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Plane className="w-3.5 h-3.5 text-stone-400" />
                    <span>{pkg.airline} ({pkg.flightType})</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>Makkah: {pkg.hotelMakkah.name} ({pkg.hotelMakkah.stars}★)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Metrics & Actions */}
            <div
              className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Registered pilgrims count badge */}
              <div className="bg-stone-100/90 px-3.5 py-2 rounded-2xl border border-stone-200">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Pèlerins Inscrits
                </span>
                <div className="flex items-baseline gap-1 mt-0.5 font-mono">
                  <span className="text-base font-black text-stone-900">{pkgDossiers.length}</span>
                  <span className="text-xs text-stone-500">/ {pkgSpotsTotal} places</span>
                  <span
                    className={`text-[10px] font-bold ml-1.5 px-1.5 py-0.2 rounded-full ${
                      pkgSpotsRemaining <= 5 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {pkgSpotsRemaining} libre{pkgSpotsRemaining > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Financial metric (if not guide) */}
              {!isGuide && (
                <div className="bg-emerald-50 px-3.5 py-2 rounded-2xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Encaissé Package
                  </span>
                  <div className="text-sm font-black text-emerald-950 font-mono mt-0.5">
                    {formatFCFA(pkgTotalPaid)}
                  </div>
                  {pkgRemaining > 0 && (
                    <span className="text-[9px] text-stone-500 block">
                      Solde: {formatFCFA(pkgRemaining)}
                    </span>
                  )}
                </div>
              )}

              {/* WhatsApp group count */}
              <div className="bg-green-50 px-3 py-2 rounded-2xl border border-green-200 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                <div>
                  <span className="text-[9px] font-bold text-green-900 block uppercase">Convoi WhatsApp</span>
                  <span className="text-xs font-bold text-green-800 font-mono">
                    {pkgWhatsappJoined}/{pkgDossiers.length} <span className="font-normal text-[10px]">connectés</span>
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPackageId(pkg.id);
                    setCurrentView('PILGRIM');
                    setPilgrimActiveTab('REGISTER');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title={`Inscrire un pèlerin pour ${pkg.title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Inscrire</span>
                </button>

                <button
                  type="button"
                  onClick={() => togglePackageCollapse(pkg.id)}
                  className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                  title={isCollapsed ? 'Déplier la liste des pèlerins' : 'Replier la liste'}
                >
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Package Content: Enrolled Pilgrims Table or Clean Empty State */}
        {!isCollapsed && (
          <div>
            {pkgDossiers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50/75 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-2.5">Code Dossier</th>
                      <th className="px-5 py-2.5">Pèlerin (Photo & Contact)</th>
                      <th className="px-5 py-2.5">Formule Chambre</th>
                      <th className="px-5 py-2.5">Pièces Administratives</th>
                      <th className="px-5 py-2.5">Groupe WhatsApp</th>
                      <th className="px-5 py-2.5">Statut Dossier</th>
                      {!isGuide ? (
                        <th className="px-5 py-2.5 text-right">Règlement & Statut</th>
                      ) : (
                        <th className="px-5 py-2.5 text-right">Statut Enregistrement</th>
                      )}
                      <th className="px-5 py-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {pkgDossiers.map((dossier) => renderPilgrimTableRow(dossier, true))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-stone-50/40 space-y-2.5">
                <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                  <Users className="w-5 h-5 text-stone-400" />
                </div>
                <p className="text-xs font-bold text-stone-700">
                  Aucun pèlerin inscrit pour {pkg.title} pour le moment.
                </p>
                <p className="text-[11px] text-stone-500 max-w-md mx-auto">
                  Toutes les nouvelles inscriptions effectuées pour ce package via l'application mobile ou le guichet agence seront automatiquement regroupées ici.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPackageId(pkg.id);
                    setCurrentView('PILGRIM');
                    setPilgrimActiveTab('REGISTER');
                  }}
                  className="mt-1 px-3.5 py-1.5 rounded-xl bg-[#135ca5] hover:bg-[#0c3f74] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Inscrire le 1er pèlerin pour ce package</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900">CRM Centralisé des Pèlerins</h2>
            <span className="text-xs bg-slate-900 text-white font-mono px-2 py-0.5 rounded-full font-bold">
              {filteredDossiers.length} {filteredDossiers.length > 1 ? 'dossiers' : 'dossier'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Recherche avancée multicritères, gestion des cohortes volumineuses, contrôle des visas Nusuk et encaissements Wave / OM.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Ouvrir le scanner de QR codes et vérification guichet"
          >
            <Scan className="w-3.5 h-3.5 text-emerald-200" />
            <span>Scanner Pass Agence</span>
          </button>
          {/* Multi-Format Export Dropdown (Excel, PDF, CSV) */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3.5 py-2 rounded-xl border border-stone-300 text-stone-800 hover:bg-stone-50 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs bg-white cursor-pointer"
              title="Exporter les pèlerins filtrés en Excel, PDF ou CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#f15a24]" />
              <span>Exporter la Cohorte ({filteredDossiers.length})</span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 py-1.5 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3.5 py-2 border-b border-stone-100 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  Sélectionner le format d'export
                </div>

                {/* 1. EXCEL */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full px-3.5 py-2.5 text-left text-xs hover:bg-emerald-50/70 text-stone-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div>
                    <span className="font-bold block text-stone-900">Format Microsoft Excel (.xls)</span>
                    <span className="text-[10px] text-stone-500 block">Colonnes formatées & totaux financiers</span>
                  </div>
                </button>

                {/* 2. PDF */}
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="w-full px-3.5 py-2.5 text-left text-xs hover:bg-orange-50/70 text-stone-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#f15a24] flex items-center justify-center shrink-0">
                    <FileType2 className="w-4 h-4 text-[#ea580c]" />
                  </div>
                  <div>
                    <span className="font-bold block text-stone-900">Rapport Officiel PDF (A4 Paysage)</span>
                    <span className="text-[10px] text-stone-500 block">En-tête officiel agréé & statistiques</span>
                  </div>
                </button>

                {/* 3. CSV */}
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full px-3.5 py-2.5 text-left text-xs hover:bg-blue-50/70 text-stone-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#135ca5] flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4 text-[#135ca5]" />
                  </div>
                  <div>
                    <span className="font-bold block text-stone-900">Fichier CSV (Universel UTF-8)</span>
                    <span className="text-[10px] text-stone-500 block">Séparateur point-virgule avec BOM</span>
                  </div>
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setCurrentView('PILGRIM');
              setPilgrimActiveTab('REGISTER');
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Inscrire un Pèlerin</span>
          </button>
        </div>
      </div>

      {/* Clean Database Notice (when 0 dossiers) */}
      {dossiers.length === 0 && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/90 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-emerald-950">Comptes & Dossiers Démo Nettoyés</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">Base Réelle Prête</span>
              </div>
              <p className="text-xs text-emerald-850 mt-0.5 max-w-2xl leading-relaxed">
                Le back-office est nettoyé de toutes les données démo. Les futures inscriptions de vos pèlerins réels seront automatiquement regroupées et classées sous chaque package Hajj et Oumra respectif ci-dessous.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setCurrentView('PILGRIM');
              setPilgrimActiveTab('REGISTER');
            }}
            className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-200" />
            <span>Inscrire le 1er Pèlerin</span>
          </button>
        </div>
      )}

      {/* SEARCH & ADVANCED FILTERS PANEL */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-4">
        {/* Row 1: Main Search Bar + Quick Operator & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Nom / Mot-clé search */}
          <div className="relative md:col-span-5">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Rechercher par Nom, Prénom, Code Dossier, Passeport ou Téléphone..."
              className="w-full pl-9 pr-9 py-2.5 rounded-2xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 text-xs bg-stone-50/50 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 rounded-full"
                title="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtre 1: Package */}
          <div className="md:col-span-3">
            <select
              value={packageFilter}
              onChange={(e) => {
                setPackageFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-2xl border border-stone-300 bg-white font-medium text-xs focus:ring-2 focus:ring-emerald-700"
            >
              <option value="ALL">Tous les Packages ({packages.length})</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.type === 'HAJJ' ? '🕋 [Hajj]' : '🌙 [Oumra]'} {pkg.title}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre 2: Statut de Paiement (Admin Only) */}
          {!isGuide && (
            <div className="md:col-span-2">
              <select
                value={paymentStatusFilter}
                onChange={(e) => {
                  setPaymentStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className={`w-full px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all focus:ring-2 focus:ring-emerald-700 ${
                  paymentStatusFilter === 'PAID'
                    ? 'border-emerald-400 bg-emerald-50/70 text-emerald-900'
                    : paymentStatusFilter === 'PARTIAL'
                    ? 'border-amber-400 bg-amber-50/70 text-amber-900'
                    : paymentStatusFilter === 'UNPAID'
                    ? 'border-rose-400 bg-rose-50/70 text-rose-900'
                    : 'border-stone-300 bg-white text-stone-700'
                }`}
              >
                <option value="ALL">Paiement : Tous</option>
                <option value="PAID">✅ Soldés (100% payé)</option>
                <option value="PARTIAL">⏳ Acomptes versés</option>
                <option value="UNPAID">❌ Non payés (0 FCFA)</option>
              </select>
            </div>
          )}

          {/* Button to toggle Advanced Filters */}
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all ${
                showAdvancedFilters || activeFiltersCount > 0
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtres Avancés</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#f15a24] text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Quick Filter Badges (Statut Paiement & Type Voyage) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
          {/* Quick Segmented Payment Filter Buttons (Admin Only) */}
          {!isGuide && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">
                Règlement :
              </span>
              <button
                type="button"
                onClick={() => {
                  setPaymentStatusFilter('ALL');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                  paymentStatusFilter === 'ALL'
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Tous ({dossiers.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentStatusFilter('PAID');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                  paymentStatusFilter === 'PAID'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <Check className="w-3 h-3" />
                <span>Soldés 100%</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentStatusFilter('PARTIAL');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                  paymentStatusFilter === 'PARTIAL'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Acomptes en cours</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentStatusFilter('UNPAID');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                  paymentStatusFilter === 'UNPAID'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <AlertCircle className="w-3 h-3" />
                <span>Non payés</span>
              </button>
            </div>
          )}

          {/* Quick Package Type Segment */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">
              Type :
            </span>
            <button
              type="button"
              onClick={() => {
                setPackageTypeFilter('ALL');
                setCurrentPage(1);
              }}
              className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                packageTypeFilter === 'ALL'
                  ? 'bg-[#135ca5] text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Tous
            </button>
            <button
              type="button"
              onClick={() => {
                setPackageTypeFilter('HAJJ');
                setCurrentPage(1);
              }}
              className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                packageTypeFilter === 'HAJJ'
                  ? 'bg-[#135ca5] text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              🕋 Hajj 1447H
            </button>
            <button
              type="button"
              onClick={() => {
                setPackageTypeFilter('OUMRA');
                setCurrentPage(1);
              }}
              className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                packageTypeFilter === 'OUMRA'
                  ? 'bg-[#135ca5] text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              🌙 Oumra
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters Section */}
        {showAdvancedFilters && (
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3 animate-in fade-in duration-200 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <span className="font-bold text-stone-800 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#135ca5]" />
                <span>Paramètres de Filtrage & Tri Avancés</span>
              </span>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-stone-500 hover:text-red-700 font-semibold flex items-center gap-1 text-[11px]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Réinitialiser tous les filtres</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Statut Workflow / Dossier */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Statut Administratif & Vol
                </label>
                <select
                  value={workflowStatusFilter}
                  onChange={(e) => {
                    setWorkflowStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-medium"
                >
                  <option value="ALL">Tous les statuts de dossier</option>
                  <option value="DOCUMENTS_PENDING">Documents Manquants</option>
                  <option value="UNDER_REVIEW">En Examen Administratif</option>
                  <option value="DOCUMENTS_APPROVED">Documents Validés</option>
                  <option value="FLIGHT_TICKET_ISSUED">Billet d'Avion & Vol Confirmés</option>
                  <option value="READY_FOR_DEPARTURE">Prêt à l'Embarquement</option>
                  <option value="COMPLETED">Pèlerinage Accompli</option>
                </select>
              </div>

              {/* Statut Groupe WhatsApp */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Intégration WhatsApp
                </label>
                <select
                  value={whatsappStatusFilter}
                  onChange={(e) => {
                    setWhatsappStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-medium"
                >
                  <option value="ALL">Tous les états WhatsApp</option>
                  <option value="JOINED">Discussion rejointe (Actif)</option>
                  <option value="INVITATION_SENT">Invitation SMS envoyée</option>
                  <option value="PENDING">À inviter / Non intégré</option>
                </select>
              </div>

              {/* Tri des résultats */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1 flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Trier la cohorte par</span>
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-medium"
                >
                  <option value="DATE_DESC">Date d'inscription (Plus récent d'abord)</option>
                  <option value="DATE_ASC">Date d'inscription (Plus ancien d'abord)</option>
                  <option value="NAME_ASC">Nom du pèlerin (A à Z)</option>
                  <option value="NAME_DESC">Nom du pèlerin (Z à A)</option>
                  {!isGuide && (
                    <>
                      <option value="PAID_DESC">Montant encaissé (Décroissant)</option>
                      <option value="BALANCE_DESC">Solde restant dû (Décroissant)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Row 3: Active Filters Pills */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-[11px] font-bold text-stone-400">Filtres actifs :</span>

            {search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-stone-800 font-medium">
                <span>Recherche: "{search}"</span>
                <X className="w-3 h-3 cursor-pointer text-stone-500 hover:text-stone-900" onClick={() => setSearch('')} />
              </span>
            )}

            {packageFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-[#135ca5] font-medium border border-blue-200">
                <span>Package: {packages.find((p) => p.id === packageFilter)?.title || packageFilter}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setPackageFilter('ALL')} />
              </span>
            )}

            {paymentStatusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 font-medium border border-amber-200">
                <span>
                  Paiement :{' '}
                  {paymentStatusFilter === 'PAID'
                    ? 'Soldé 100%'
                    : paymentStatusFilter === 'PARTIAL'
                    ? 'Acompte versé'
                    : 'Non payé'}
                </span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setPaymentStatusFilter('ALL')} />
              </span>
            )}

            {workflowStatusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-900 font-medium border border-purple-200">
                <span>Statut : {workflowStatusFilter}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setWorkflowStatusFilter('ALL')} />
              </span>
            )}

            {packageTypeFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-900 font-medium border border-indigo-200">
                <span>Type : {packageTypeFilter}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setPackageTypeFilter('ALL')} />
              </span>
            )}

            {whatsappStatusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-900 font-medium border border-emerald-200">
                <span>WhatsApp : {whatsappStatusFilter}</span>
                <X className="w-3 h-3 cursor-pointer" onClick={() => setWhatsappStatusFilter('ALL')} />
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-red-600 hover:text-red-800 ml-auto flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Tout effacer</span>
            </button>
          </div>
        )}
      </div>

      {/* SYNTHESIS ANALYTICS KPI BAR (Optimized for Large Cohorts) */}
      {!isGuide ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Pèlerins Filtrés
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-stone-900 font-mono">{filteredDossiers.length}</span>
              <span className="text-[11px] text-stone-400 font-mono">/ {dossiers.length} total</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Soldés (100%)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-emerald-900 font-mono">{stats.countPaid}</span>
              <span className="text-[11px] text-emerald-700">pèlerins</span>
            </div>
          </div>

          <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
              Acomptes Versés
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-amber-900 font-mono">{stats.countPartial}</span>
              <span className="text-[11px] text-amber-700">partiels</span>
            </div>
          </div>

          <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
              Non Payés
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-rose-900 font-mono">{stats.countUnpaid}</span>
              <span className="text-[11px] text-rose-700">en attente</span>
            </div>
          </div>

          <div className="bg-sky-50/70 p-3.5 rounded-2xl border border-sky-200 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0369a1] block">
              Encaissé Sélection
            </span>
            <div className="text-sm font-black text-[#0369a1] font-mono truncate mt-0.5">
              {formatFCFA(stats.totalPaid)}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Pèlerins dans la Cohorte
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-stone-900 font-mono">{filteredDossiers.length}</span>
              <span className="text-[11px] text-stone-400 font-mono">/ {dossiers.length} total</span>
            </div>
          </div>

          <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
              Passeports & Docs Conformes
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-blue-900 font-mono">
                {filteredDossiers.filter((d) => d.documents.passport?.status === 'APPROVED').length}
              </span>
              <span className="text-[11px] text-blue-700">validés</span>
            </div>
          </div>

          <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 block">
              Vols & Billets Émis
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-indigo-900 font-mono">
                {filteredDossiers.filter((d) => d.flightDetails?.flightNumber).length}
              </span>
              <span className="text-[11px] text-indigo-700">pèlerins</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Groupe WhatsApp Rejoint
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-emerald-900 font-mono">
                {filteredDossiers.filter((d) => d.whatsappStatus === 'JOINED').length}
              </span>
              <span className="text-[11px] text-emerald-700">connectés</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE SWITCHER & GROUP CONTROLS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl">
          <button
            type="button"
            onClick={() => setCrmViewMode('GROUPED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              crmViewMode === 'GROUPED'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Vue Groupée par Package (Hajj & Oumra)</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                crmViewMode === 'GROUPED' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {hajjPackages.length + oumraPackages.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCrmViewMode('LIST')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              crmViewMode === 'LIST'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Vue Liste Complète (Tableau Global)</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                crmViewMode === 'LIST' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {filteredDossiers.length}
            </span>
          </button>
        </div>

        {crmViewMode === 'GROUPED' ? (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={expandAllPackages}
              className="px-2.5 py-1 text-stone-600 hover:text-stone-900 font-semibold rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Tout déplier
            </button>
            <span className="text-stone-300">|</span>
            <button
              type="button"
              onClick={collapseAllPackages}
              className="px-2.5 py-1 text-stone-600 hover:text-stone-900 font-semibold rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Tout replier
            </button>
          </div>
        ) : (
          <span className="text-xs text-stone-500 font-medium">
            Affichage de {paginatedDossiers.length} sur {filteredDossiers.length} pèlerins
          </span>
        )}
      </div>

      {/* 1. GROUPED VIEW: BY PACKAGE (HAJJ & OUMRA) */}
      {crmViewMode === 'GROUPED' ? (
        <div className="space-y-6">
          {hajjPackages.length === 0 && oumraPackages.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-stone-200 shadow-sm text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-stone-700 text-sm">Aucun package ne correspond à votre filtre</p>
                <p className="text-xs text-stone-400">
                  Réinitialisez les filtres pour afficher l'ensemble des formules Hajj et Oumra.
                </p>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <>
              {/* SECTION HAJJ */}
              {hajjPackages.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🕋</span>
                      <h3 className="text-base font-extrabold text-stone-900">
                        Packages Pèlerinage Hajj 1447H
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-extrabold border border-emerald-200">
                        {hajjPackages.length} formule{hajjPackages.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="text-xs text-stone-500 font-medium">
                      {hajjPackages.reduce((acc, p) => acc + getDossiersForPackage(p).length, 0)} pèlerin(s) inscrit(s)
                    </span>
                  </div>

                  <div className="space-y-4">
                    {hajjPackages.map(renderPackageGroupCard)}
                  </div>
                </div>
              )}

              {/* SECTION OUMRA */}
              {oumraPackages.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🌙</span>
                      <h3 className="text-base font-extrabold text-stone-900">
                        Packages Pèlerinage Oumra 1447H / 2026
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#135ca5] text-xs font-extrabold border border-blue-200">
                        {oumraPackages.length} formule{oumraPackages.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="text-xs text-stone-500 font-medium">
                      {oumraPackages.reduce((acc, p) => acc + getDossiersForPackage(p).length, 0)} pèlerin(s) inscrit(s)
                    </span>
                  </div>

                  <div className="space-y-4">
                    {oumraPackages.map(renderPackageGroupCard)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* 2. FLAT LIST VIEW (GLOBAL CRM TABLE) */
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden space-y-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3">Code Dossier</th>
                  <th className="px-5 py-3">Pèlerin (Photo & Contact)</th>
                  <th className="px-5 py-3">Package & Formule</th>
                  <th className="px-5 py-3">Pièces Administratives</th>
                  <th className="px-5 py-3">Groupe WhatsApp</th>
                  <th className="px-5 py-3">Statut Dossier</th>
                  {!isGuide ? (
                    <th className="px-5 py-3 text-right">Règlement & Statut</th>
                  ) : (
                    <th className="px-5 py-3 text-right">Statut Enregistrement</th>
                  )}
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100">
                {paginatedDossiers.map((dossier) => renderPilgrimTableRow(dossier, false))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredDossiers.length === 0 && (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-stone-700 text-sm">Aucun pèlerin ne correspond à vos filtres</p>
                <p className="text-xs text-stone-400">
                  Essayez d'ajuster les filtres par nom, package ou statut de paiement.
                </p>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Réinitialiser tous les filtres
                </button>
              )}
            </div>
          )}

          {/* PAGINATION TOOLBAR FOR LARGE COHORTS */}
          {filteredDossiers.length > 0 && (
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600">
              <div className="flex items-center gap-2">
                <span>Afficher</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-stone-300 bg-white font-medium"
                >
                  <option value={10}>10 pèlerins / page</option>
                  <option value={25}>25 pèlerins / page</option>
                  <option value={50}>50 pèlerins / page</option>
                  <option value={-1}>Tous les pèlerins</option>
                </select>
                <span className="text-stone-400">
                  (Affichage de {paginatedDossiers.length} sur {filteredDossiers.length} pèlerins)
                </span>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={effectiveCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Page précédente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1 px-2 font-mono font-semibold">
                    <span>Page {effectiveCurrentPage} sur {totalPages}</span>
                  </div>

                  <button
                    type="button"
                    disabled={effectiveCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Page suivante"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inspector Modal */}
      <DossierDetailModal
        dossier={inspectDossier}
        isOpen={!!inspectDossier}
        onClose={() => setInspectDossier(null)}
      />

      {/* In-Agency Scanner & Verification Modal */}
      <AgencyScanVerifyModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
      />

      {/* Pilgrim Booking Pass & QR Modal */}
      {passDossier && (
        <PilgrimBookingPassModal
          dossier={passDossier}
          isOpen={!!passDossier}
          onClose={() => setPassDossier(null)}
        />
      )}

      {/* Fiche de Renseignements Pèlerin Modal */}
      <FicheRenseignementsModal
        dossier={ficheDossier}
        isOpen={!!ficheDossier}
        onClose={() => setFicheDossier(null)}
      />

      {/* Admin High-Definition Lightbox Inspection Modal */}
      <AdminDocumentLightboxModal
        dossier={lightboxPreview?.dossier || null}
        docType={lightboxPreview?.docType || 'passport'}
        isOpen={!!lightboxPreview}
        onClose={() => setLightboxPreview(null)}
      />
    </div>
  );
};
