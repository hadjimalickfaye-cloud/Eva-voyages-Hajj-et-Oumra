import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AgencyConfig,
  DocumentType,
  NotificationLog,
  Package,
  PaymentMethod,
  PilgrimDocument,
  PilgrimDossier,
  Transaction,
  WorkflowStatus,
  UserAccount,
  UserRole,
  BadgeSettings,
  SosAlert,
} from '../types';
import {
  INITIAL_AGENCY_CONFIG,
  INITIAL_DOSSIERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PACKAGES,
  DEFAULT_ADMIN_ACCOUNT,
  DEFAULT_GUIDE_ACCOUNT,
  AUTHORIZED_ADMIN_PROFILES,
} from '../data/mockData';
import { cacheAllDossiersOffline } from '../utils/offlineStorage';

interface AppContextType {
  // Navigation & View
  currentView: 'PILGRIM' | 'ADMIN';
  setCurrentView: (view: 'PILGRIM' | 'ADMIN') => void;
  pilgrimActiveTab: 'PACKAGES' | 'REGISTER' | 'TRACKING' | 'PAYMENT' | 'GUIDE' | 'QIBLA' | 'QURAN' | 'PRAYER' | 'SACRED_TRACKER';
  setPilgrimActiveTab: (tab: 'PACKAGES' | 'REGISTER' | 'TRACKING' | 'PAYMENT' | 'GUIDE' | 'QIBLA' | 'QURAN' | 'PRAYER' | 'SACRED_TRACKER') => void;
  adminActiveTab: 'DASHBOARD' | 'DOSSIERS' | 'PACKAGES' | 'TRANSACTIONS' | 'ANALYTICS' | 'NOTIFICATIONS' | 'SETTINGS' | 'BADGES' | 'GUIDE_RADAR';
  setAdminActiveTab: (tab: 'DASHBOARD' | 'DOSSIERS' | 'PACKAGES' | 'TRANSACTIONS' | 'ANALYTICS' | 'NOTIFICATIONS' | 'SETTINGS' | 'BADGES' | 'GUIDE_RADAR') => void;

  // Selected State
  selectedPackageId: string | null;
  setSelectedPackageId: (id: string | null) => void;
  selectedDossierId: string | null;
  setSelectedDossierId: (id: string | null) => void;
  trackingQueryCode: string;
  setTrackingQueryCode: (code: string) => void;

  // Data
  agencyConfig: AgencyConfig;
  updateAgencyConfig: (config: Partial<AgencyConfig>) => void;
  packages: Package[];
  isLoadingPackages: boolean;
  refreshPackages: (durationMs?: number) => Promise<void>;
  dossiers: PilgrimDossier[];
  notifications: NotificationLog[];

  // Package Management (Back-office)
  addPackage: (pkg: Omit<Package, 'id'>) => void;
  updatePackage: (id: string, pkg: Partial<Package>) => void;
  deletePackage: (id: string) => void;

  // Dossier Management
  registerPilgrim: (data: Omit<PilgrimDossier, 'id' | 'trackingCode' | 'createdAt' | 'updatedAt'>) => PilgrimDossier;
  updateDossierStatus: (
    dossierId: string,
    newStatus: WorkflowStatus,
    extra?: {
      flightDetails?: PilgrimDossier['flightDetails'];
      trainDetails?: PilgrimDossier['trainDetails'];
      notes?: string;
    }
  ) => void;
  updateDossierDocument: (dossierId: string, docType: DocumentType, doc: PilgrimDocument) => void;
  reviewDocument: (dossierId: string, docType: DocumentType, approved: boolean, reason?: string) => void;
  updateDossier: (dossierId: string, updates: Partial<PilgrimDossier>) => void;
  joinWhatsAppGroup: (dossierId: string) => void;
  toggleWhatsAppJoined: (dossierId: string, joined?: boolean) => void;
  sendWhatsAppInvitation: (dossierId: string) => void;

  // Payment Processing (Wave / Orange Money)
  processPayment: (params: {
    dossierId: string;
    amountFCFA: number;
    method: PaymentMethod;
    paymentType?: 'DEPOSIT' | 'FULL' | 'BALANCE';
    phone: string;
    reference?: string;
  }) => { success: boolean; transaction: Transaction; receiptNumber: string };

  // Notifications
  sendNotification: (notification: Omit<NotificationLog, 'id' | 'sentAt' | 'status'>) => NotificationLog;
  recentLiveToast: NotificationLog | null;
  clearLiveToast: () => void;

  // Helpers
  formatFCFA: (amount: number) => string;

  // Two-Account System (Client vs Back-Office)
  currentUser: UserAccount | null;
  loginAsAdmin: (customEmail?: string) => boolean;
  loginAsPilgrim: (trackingCode?: string) => boolean;
  loginWithCredentials: (
    role: UserRole,
    identifier: string,
    passcode: string
  ) => { success: boolean; error?: string };
  registerClientAccount: (
    name: string,
    email: string,
    phone?: string,
    trackingCode?: string,
    firstName?: string,
    lastName?: string,
    password?: string
  ) => UserAccount;
  switchToBackOffice: (customEmail?: string, customName?: string) => UserAccount;
  isBackOfficeDomain: (email?: string) => boolean;
  getMyDossier: () => PilgrimDossier | undefined;
  logout: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalRole: UserRole;
  setAuthModalRole: (role: UserRole) => void;
  authModalMode: 'LOGIN' | 'REGISTER';
  setAuthModalMode: (mode: 'LOGIN' | 'REGISTER') => void;
  openAuthModal: (role?: UserRole, mode?: 'LOGIN' | 'REGISTER') => void;
  navigateToSpace: (targetRole: UserRole) => void;

  // Pilgrim Profile Photo
  updateUserProfilePhoto: (photoUrlOrDataUrl: string) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;

  // Guide Pèlerin (Awa Kane) & Real-time SOS Supervision
  loginAsGuide: () => boolean;
  isGuideEmail: (email?: string) => boolean;
  isGuide: boolean;
  activeSosAlerts: SosAlert[];
  triggerSosAlert: (params: {
    lat: number;
    lng: number;
    nearestSiteName?: string;
    distanceKm?: number;
    pilgrimName?: string;
    trackingCode?: string;
    phone?: string;
    avatar?: string;
    message?: string;
  }) => SosAlert;
  resolveSosAlert: (alertId: string, notes?: string) => void;
  acknowledgeSosAlert: (alertId: string) => void;

  // Badge Customization (CamScanner Model: Editable Hotel Medina & Makkah)
  badgeSettings: BadgeSettings;
  updateBadgeSettings: (settings: Partial<BadgeSettings>) => void;
  updateDossierBadgeSettings: (dossierId: string, settings: Partial<BadgeSettings>) => void;
  applyBadgeHotelsToAll: (hotelMedine: string, hotelMakkah: string) => void;
  applyBadgeHotelsToDossiers: (dossierIds: string[], hotelMedine?: string, hotelMakkah?: string) => void;
  isAuthorizedAdminEmail: (email?: string) => boolean;
  authorizedAdminProfiles: typeof AUTHORIZED_ADMIN_PROFILES;
}

export const isGuideEmail = (email?: string): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return clean === 'awa.kane@evavoyages.com' || clean.includes('awa.kane');
};

export const isGuideAccount = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  return user.role === 'GUIDE' || isGuideEmail(user.email);
};

export const isAuthorizedAdminEmail = (email?: string): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    clean === 'hadjimalickfaye@gmail.com' ||
    clean.includes('hadjimalickfaye') ||
    clean === 'direction@evavoyages.com' ||
    clean === 'awa.kane@evavoyages.com' ||
    clean.includes('awa.kane') ||
    clean === 'awa.diop@evavoyages.com' ||
    clean === 'fatoubinetou.seye@evavoyages.com' ||
    clean === 'abdou.diouf@evavoyages.com' ||
    clean.endsWith('@evavoyage.com') ||
    clean.endsWith('@evavoyages.com') ||
    clean === 'evavoyages1@gmail.com' ||
    clean.endsWith('@evavoyages.sn')
  );
};

export const isBackOfficeDomain = (email?: string): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    clean === 'hadjimalickfaye@gmail.com' ||
    clean.includes('hadjimalickfaye') ||
    clean === 'direction@evavoyages.com' ||
    clean === 'awa.kane@evavoyages.com' ||
    clean.includes('awa.kane') ||
    clean === 'awa.diop@evavoyages.com' ||
    clean === 'fatoubinetou.seye@evavoyages.com' ||
    clean === 'abdou.diouf@evavoyages.com' ||
    clean.includes('awa.diop') ||
    clean.includes('fatoubinetou') ||
    clean.includes('abdou.diouf') ||
    clean.endsWith('@evavoyage.com') ||
    clean.endsWith('@evavoyages.com') ||
    clean.includes('@evavoyage.com') ||
    clean.includes('@evavoyages.com') ||
    clean === 'evavoyages1@gmail.com' ||
    clean.endsWith('@evavoyages.sn')
  );
};

// Urgent audio chime for SOS emergency alerts
export const playEmergencyChime = () => {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(587.33, now + 0.18);
    osc.frequency.setValueAtTime(880, now + 0.36);
    osc.frequency.setValueAtTime(587.33, now + 0.54);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.85);
  } catch (err) {
    console.warn('Audio alert not permitted:', err);
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PACKAGES: 'eva_voyages_packages_v1',
  DOSSIERS: 'eva_voyages_dossiers_v3',
  NOTIFICATIONS: 'eva_voyages_notifications_v3',
  CONFIG: 'eva_voyages_config_v2',
  AUTH_USER: 'eva_voyages_auth_user_v2',
  REGISTERED_USERS: 'eva_voyages_registered_users_v2',
  BADGE_SETTINGS: 'eva_voyages_badge_settings_v2',
  SOS_ALERTS: 'eva_voyages_sos_alerts_v1',
};

export const DEFAULT_BADGE_SETTINGS: BadgeSettings = {
  badgeTitle: 'OUMRAH GAMOU 2026 VIP',
  hotelMedine: 'THE BILTMORE',
  hotelMakkah: 'ROTANA',
  phoneSenegal: '+221 78 639 10 00',
  phoneSaudi: '0543625106',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<'PILGRIM' | 'ADMIN'>('PILGRIM');
  const [pilgrimActiveTab, setPilgrimActiveTab] = useState<'PACKAGES' | 'REGISTER' | 'TRACKING' | 'PAYMENT' | 'GUIDE' | 'QIBLA' | 'QURAN' | 'PRAYER' | 'SACRED_TRACKER'>('PACKAGES');
  const [adminActiveTab, setAdminActiveTab] = useState<'DASHBOARD' | 'DOSSIERS' | 'PACKAGES' | 'TRANSACTIONS' | 'ANALYTICS' | 'NOTIFICATIONS' | 'SETTINGS' | 'BADGES' | 'GUIDE_RADAR'>('DASHBOARD');

  // Active SOS Emergency Alerts (Live detection & guide notification)
  const [activeSosAlerts, setActiveSosAlerts] = useState<SosAlert[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SOS_ALERTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Profile Photo Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Authentication State: Real Accounts Only (No Demo Account Fallback)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH_USER) || localStorage.getItem('eva_voyages_auth_user_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role === 'ADMIN' || parsed.role === 'GUIDE') {
          if (!isAuthorizedAdminEmail(parsed.email)) {
            return null;
          }
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Persistent Registered Users Database
  const [registeredUsers, setRegisteredUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(registeredUsers));
    } catch {}
  }, [registeredUsers]);

  const isGuide = currentUser?.role === 'GUIDE' || isGuideEmail(currentUser?.email);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalRole, setAuthModalRole] = useState<UserRole>('PILGRIM');
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'REGISTER'>('REGISTER');

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>('pkg-hajj-prestige-2026');
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);
  const [trackingQueryCode, setTrackingQueryCode] = useState<string>(
    currentUser?.linkedTrackingCode || ''
  );

  const [recentLiveToast, setRecentLiveToast] = useState<NotificationLog | null>(null);

  // Agency Config State
  const [agencyConfig, setAgencyConfig] = useState<AgencyConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_AGENCY_CONFIG,
          ...parsed,
          phone: parsed.phone === '+221 33 825 40 40' ? '+221 78 639 10 00' : (parsed.phone || '+221 78 639 10 00'),
          whatsapp: parsed.whatsapp === '+221 77 650 90 90' ? '+221 78 639 10 00' : (parsed.whatsapp || '+221 78 639 10 00'),
          notificationPhone: '+221 78 639 10 00',
          waveMerchantNumber: !parsed.waveMerchantNumber || parsed.waveMerchantNumber.includes('77 650 90 90') || parsed.waveMerchantNumber.includes('78 639 10 00')
            ? '+221 76 161 61 66 (EVA VOYAGES SN)'
            : parsed.waveMerchantNumber,
          waveLogoUrl: '/assets/wave_logo.png',
          orangeMoneyLogoUrl: '/assets/orange_money_logo.png',
          logoUrl: '/logo.png',
        };
      }
      return INITIAL_AGENCY_CONFIG;
    } catch {
      return INITIAL_AGENCY_CONFIG;
    }
  });

  // Packages State
  const [packages, setPackages] = useState<Package[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PACKAGES);
      if (!saved) return INITIAL_PACKAGES;
      const parsed: Package[] = JSON.parse(saved);
      return parsed.map((p) => {
        const initial = INITIAL_PACKAGES.find((ip) => ip.id === p.id);
        const link = p.whatsappGroupLink || initial?.whatsappGroupLink || `https://chat.whatsapp.com/invite/EVA${p.type === 'HAJJ' ? 'Hajj2026' : 'Oumra2026'}`;
        return {
          ...p,
          whatsappGroupName: p.whatsappGroupName || initial?.whatsappGroupName || `EVA Voyages - ${p.title} 🕋`,
          whatsappGroupLink: link,
          whatsappGroupDescription: p.whatsappGroupDescription || initial?.whatsappGroupDescription || 'Groupe WhatsApp officiel d\'encadrement des pèlerins.',
          whatsappAdminPhone: p.whatsappAdminPhone || initial?.whatsappAdminPhone || '+221 78 639 10 00',
          whatsappQrCodeUrl: p.whatsappQrCodeUrl || initial?.whatsappQrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(link)}`,
        };
      });
    } catch {
      return INITIAL_PACKAGES;
    }
  });

  // Package Catalog Loading State & Simulation
  const [isLoadingPackages, setIsLoadingPackages] = useState<boolean>(true);

  // Initial packages load simulation (skeleton display during data retrieval)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingPackages(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const refreshPackages = async (durationMs: number = 700): Promise<void> => {
    setIsLoadingPackages(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.PACKAGES);
          if (saved) {
            const parsed: Package[] = JSON.parse(saved);
            setPackages(parsed);
          }
        } catch {}
        setIsLoadingPackages(false);
        resolve();
      }, durationMs);
    });
  };

  // Dossiers State (Clean real database: no demo records)
  const [dossiers, setDossiers] = useState<PilgrimDossier[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DOSSIERS);
      if (!saved) return INITIAL_DOSSIERS;
      const parsed: PilgrimDossier[] = JSON.parse(saved);
      const demoIds = ['dos-000', 'dos-001', 'dos-002', 'dos-003', 'dos-004', 'dos-005', 'dos-006'];
      return parsed
        .filter((d) => !demoIds.includes(d.id) && !d.id.startsWith('dos-00'))
        .map((d) => {
          const pkg = INITIAL_PACKAGES.find((p) => p.id === d.packageId);
          const whatsappGroupName =
            d.packageSnapshot?.whatsappGroupName ||
            pkg?.whatsappGroupName ||
            `EVA Voyages - ${d.packageSnapshot?.title || 'Package'} 🕋`;
          const whatsappGroupLink =
            d.packageSnapshot?.whatsappGroupLink ||
            pkg?.whatsappGroupLink ||
            `https://chat.whatsapp.com/invite/EVA${d.packageSnapshot?.type === 'HAJJ' ? 'Hajj2026' : 'Oumra2026'}`;

          return {
            ...d,
            packageSnapshot: {
              ...d.packageSnapshot,
              whatsappGroupName,
              whatsappGroupLink,
            },
            whatsappStatus: d.whatsappStatus || 'INVITATION_SENT',
          };
        });
    } catch {
      return INITIAL_DOSSIERS;
    }
  });

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  // Persist to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PACKAGES, JSON.stringify(packages));
  }, [packages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DOSSIERS, JSON.stringify(dossiers));
    cacheAllDossiersOffline(dossiers);
  }, [dossiers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(agencyConfig));
  }, [agencyConfig]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SOS_ALERTS, JSON.stringify(activeSosAlerts));
    } catch {}
  }, [activeSosAlerts]);

  // Real-time synchronization across browser tabs (Pilgrim <-> Back-Office <-> Guide)
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('eva_voyages_live_sync');
      channel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'DOSSIERS_UPDATED' && Array.isArray(payload)) {
          setDossiers(payload);
        } else if (type === 'NOTIFICATIONS_UPDATED' && Array.isArray(payload)) {
          setNotifications(payload);
        } else if (type === 'SOS_ALERT_TRIGGERED' && payload) {
          setActiveSosAlerts((prev) => [payload, ...prev.filter((a) => a.id !== payload.id)]);
          setRecentLiveToast({
            id: `toast-${Date.now()}`,
            type: 'SMS',
            direction: 'INBOUND',
            sender: `URGENCE SOS (${payload.pilgrimName})`,
            message: `🚨 ALERTE PÈLERIN ÉGARÉ : ${payload.pilgrimName} (${payload.trackingCode}) - ${payload.nearestSiteName}`,
            sentAt: new Date().toISOString(),
            status: 'RECEIVED',
            trigger: 'SOS_ALERT',
          });
          playEmergencyChime();
        } else if (type === 'SOS_ALERT_RESOLVED' && payload?.alertId) {
          setActiveSosAlerts((prev) =>
            prev.map((a) => (a.id === payload.alertId ? { ...a, status: 'RESOLVED' as const } : a))
          );
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not available:', e);
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.DOSSIERS && e.newValue) {
        try {
          setDossiers(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === STORAGE_KEYS.NOTIFICATIONS && e.newValue) {
        try {
          setNotifications(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === STORAGE_KEYS.SOS_ALERTS && e.newValue) {
        try {
          setActiveSosAlerts(JSON.parse(e.newValue));
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  // Badge Settings State (CamScanner Model: Editable Hotel Medina & Makkah)
  const [badgeSettings, setBadgeSettings] = useState<BadgeSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BADGE_SETTINGS);
      return saved ? { ...DEFAULT_BADGE_SETTINGS, ...JSON.parse(saved) } : DEFAULT_BADGE_SETTINGS;
    } catch {
      return DEFAULT_BADGE_SETTINGS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BADGE_SETTINGS, JSON.stringify(badgeSettings));
  }, [badgeSettings]);

  const updateBadgeSettings = (updates: Partial<BadgeSettings>) => {
    setBadgeSettings((prev) => ({ ...prev, ...updates }));
  };

  const updateDossierBadgeSettings = (dossierId: string, updates: Partial<BadgeSettings>) => {
    setDossiers((prev) =>
      prev.map((dos) =>
        dos.id === dossierId
          ? {
              ...dos,
              badgeSettings: {
                ...dos.badgeSettings,
                ...updates,
              },
              updatedAt: new Date().toISOString(),
            }
          : dos
      )
    );
  };

  const applyBadgeHotelsToAll = (hotelMedine: string, hotelMakkah: string) => {
    updateBadgeSettings({ hotelMedine, hotelMakkah });
    setDossiers((prev) =>
      prev.map((dos) => ({
        ...dos,
        badgeSettings: {
          ...dos.badgeSettings,
          hotelMedine,
          hotelMakkah,
        },
        updatedAt: new Date().toISOString(),
      }))
    );
  };

  const applyBadgeHotelsToDossiers = (
    dossierIds: string[],
    hotelMedine?: string,
    hotelMakkah?: string
  ) => {
    if (!dossierIds || dossierIds.length === 0) return;
    setDossiers((prev) =>
      prev.map((dos) => {
        if (!dossierIds.includes(dos.id)) return dos;
        return {
          ...dos,
          badgeSettings: {
            ...dos.badgeSettings,
            ...(hotelMedine !== undefined && hotelMedine.trim() !== '' ? { hotelMedine: hotelMedine.trim().toUpperCase() } : {}),
            ...(hotelMakkah !== undefined && hotelMakkah.trim() !== '' ? { hotelMakkah: hotelMakkah.trim().toUpperCase() } : {}),
          },
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Authentication & Portal Separation Actions
  const openAuthModal = (role: UserRole = 'PILGRIM', mode: 'LOGIN' | 'REGISTER' = 'REGISTER') => {
    setAuthModalRole(role);
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const navigateToSpace = (targetRole: UserRole) => {
    if (targetRole === 'ADMIN') {
      if (currentUser?.role === 'ADMIN' && isAuthorizedAdminEmail(currentUser.email)) {
        setCurrentView('ADMIN');
      } else {
        openAuthModal('ADMIN');
      }
    } else {
      setCurrentView('PILGRIM');
    }
  };

  const getAdminProfileInfo = (email: string, customName?: string) => {
    const profile = AUTHORIZED_ADMIN_PROFILES.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (profile) {
      return {
        name: customName?.trim() || profile.name,
        title: profile.title,
        phone: profile.phone || '+221 78 639 10 00',
      };
    }
    const cleanPrefix = email.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = cleanPrefix.charAt(0).toUpperCase() + cleanPrefix.slice(1);
    return {
      name: customName?.trim() || (email === 'evavoyages1@gmail.com' ? 'EVA Voyages (Direction)' : formattedName),
      title: 'Personnel Agréé Agence Hajj & Oumra',
      phone: '+221 78 639 10 00',
    };
  };

  const loginAsAdmin = (customEmail?: string, customName?: string) => {
    const emailToUse =
      customEmail && isAuthorizedAdminEmail(customEmail)
        ? customEmail.trim().toLowerCase()
        : 'hadjimalickfaye@gmail.com';
    const profileInfo = getAdminProfileInfo(emailToUse, customName);
    const adminAccount: UserAccount = {
      ...DEFAULT_ADMIN_ACCOUNT,
      name: profileInfo.name,
      email: emailToUse,
      title: profileInfo.title,
      phone: profileInfo.phone,
    };
    setCurrentUser(adminAccount);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(adminAccount));
    setCurrentView('ADMIN');
    return true;
  };

  const loginAsGuide = (): boolean => {
    setCurrentUser(DEFAULT_GUIDE_ACCOUNT);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(DEFAULT_GUIDE_ACCOUNT));
    setCurrentView('ADMIN');
    setAdminActiveTab('GUIDE_RADAR');
    setIsAuthModalOpen(false);

    sendNotification({
      type: 'SMS',
      recipientPhone: '+221 78 639 10 00',
      sender: 'EVA VOYAGES',
      message: `Compte Spécial Guide Pèlerin Connecté : Awa Kane active sur la supervision GPS et réceptionnaire prioritaire des alertes SOS en temps réel.`,
      trigger: 'MANUAL',
    });

    return true;
  };

  const switchToBackOffice = (customEmail?: string, customName?: string): UserAccount => {
    const emailToUse = customEmail?.trim().toLowerCase() || 'hadjimalickfaye@gmail.com';

    // Automatic detection of Guide Pèlerin Awa Kane
    if (isGuideEmail(emailToUse)) {
      loginAsGuide();
      return DEFAULT_GUIDE_ACCOUNT;
    }

    const profileInfo = getAdminProfileInfo(emailToUse, customName);
    const adminAccount: UserAccount = {
      id: `acc-admin-${Date.now()}`,
      role: 'ADMIN',
      name: profileInfo.name,
      email: emailToUse,
      phone: profileInfo.phone,
      title: profileInfo.title,
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(adminAccount);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(adminAccount));
    setCurrentView('ADMIN');
    setIsAuthModalOpen(false);

    sendNotification({
      type: 'SMS',
      recipientPhone: '+221 78 639 10 00',
      sender: 'EVA VOYAGES',
      message: `Back-Office: Connexion réussie au compte ${adminAccount.name} (${emailToUse}) - ${adminAccount.title}.`,
      trigger: 'MANUAL',
    });

    return adminAccount;
  };

  const getMyDossier = (): PilgrimDossier | undefined => {
    if (!currentUser || currentUser.role !== 'PILGRIM') return undefined;
    const userEmail = currentUser.email?.trim().toLowerCase();
    const userCode = currentUser.linkedTrackingCode?.trim().toUpperCase();
    const userPhone = currentUser.phone ? currentUser.phone.replace(/[^0-9]/g, '') : '';
    const userFullName = currentUser.name?.trim().toLowerCase();

    return dossiers.find((d) => {
      if (userCode && d.trackingCode.toUpperCase() === userCode) return true;
      if (userEmail && d.personalInfo.email.toLowerCase() === userEmail) return true;
      if (userPhone && userPhone.length > 6 && d.personalInfo.phone.replace(/[^0-9]/g, '').includes(userPhone)) return true;
      if (userFullName) {
        const dFullName = `${d.personalInfo.firstName} ${d.personalInfo.lastName}`.trim().toLowerCase();
        if (dFullName === userFullName) return true;
      }
      return false;
    });
  };

  const loginAsPilgrim = (trackingCode?: string) => {
    if (!trackingCode) return false;
    const code = trackingCode.trim().toUpperCase();
    const matchingDossier = dossiers.find((d) => d.trackingCode.toUpperCase() === code);
    if (!matchingDossier) return false;

    const pilgrimAccount: UserAccount = {
      id: `acc-${matchingDossier.id}`,
      role: 'PILGRIM',
      name: `${matchingDossier.personalInfo.firstName} ${matchingDossier.personalInfo.lastName}`,
      firstName: matchingDossier.personalInfo.firstName,
      lastName: matchingDossier.personalInfo.lastName,
      email: matchingDossier.personalInfo.email,
      phone: matchingDossier.personalInfo.phone,
      title: `Pèlerin Inscrit (${matchingDossier.packageSnapshot.title})`,
      linkedTrackingCode: code,
      avatar: matchingDossier.documents.photo?.fileUrl || matchingDossier.personalInfo.photoUrl,
      createdAt: matchingDossier.createdAt,
    };
    setCurrentUser(pilgrimAccount);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(pilgrimAccount));
    setTrackingQueryCode(code);
    setCurrentView('PILGRIM');
    return true;
  };

  const loginWithCredentials = (
    role: UserRole,
    identifier: string,
    passcode: string
  ): { success: boolean; error?: string } => {
    const idClean = identifier.trim().toLowerCase();

    // Automatic detection of Guide Pèlerin Awa Kane
    if (isGuideEmail(idClean)) {
      if (!passcode || passcode.trim().length < 3) {
        return { success: false, error: 'Veuillez saisir votre mot de passe pour le compte Guide.' };
      }
      loginAsGuide();
      return { success: true };
    }

    // If identifier has backoffice domain or authorized personnel email
    if (isBackOfficeDomain(idClean)) {
      if (!passcode || passcode.trim().length < 4) {
        return { success: false, error: 'Veuillez renseigner votre mot de passe administrateur sécurisé.' };
      }
      switchToBackOffice(idClean);
      return { success: true };
    }

    if (role === 'ADMIN') {
      const passClean = passcode.trim();

      // Strict validation: must be an authorized address
      if (!isAuthorizedAdminEmail(idClean)) {
        return {
          success: false,
          error:
            "Accès strictement refusé : Seules les adresses e-mail officielles reconnues de l'agence (hadjimalickfaye@gmail.com, direction@evavoyages.com, awa.kane@evavoyages.com, awa.diop@evavoyages.com, @evavoyages.com) sont autorisées à accéder au Back-Office.",
        };
      }

      if (passClean.length >= 4) {
        const profileInfo = getAdminProfileInfo(idClean);
        const adminAccount: UserAccount = {
          id: `acc-admin-${Date.now()}`,
          role: 'ADMIN',
          name: profileInfo.name,
          email: idClean,
          phone: profileInfo.phone,
          title: profileInfo.title,
          createdAt: new Date().toISOString(),
        };
        setCurrentUser(adminAccount);
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(adminAccount));
        setCurrentView('ADMIN');
        return { success: true };
      }
      return {
        success: false,
        error: 'Mot de passe administrateur incorrect (au moins 4 caractères requis).',
      };
    } else {
      const passClean = passcode.trim();
      const passUpper = passClean.toUpperCase();

      // 1. Search in real registered users first
      const foundUser = registeredUsers.find(
        (u) =>
          u.email.toLowerCase() === idClean ||
          (u.phone && u.phone.replace(/[^0-9]/g, '') === identifier.replace(/[^0-9]/g, '')) ||
          (u.linkedTrackingCode && u.linkedTrackingCode.toUpperCase() === passUpper)
      );

      if (foundUser) {
        if (foundUser.password && foundUser.password !== passClean && foundUser.linkedTrackingCode !== passUpper) {
          return { success: false, error: 'Mot de passe client incorrect.' };
        }
        setCurrentUser(foundUser);
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(foundUser));
        if (foundUser.linkedTrackingCode) {
          setTrackingQueryCode(foundUser.linkedTrackingCode);
        }
        setCurrentView('PILGRIM');
        return { success: true };
      }

      // 2. Search in existing dossiers
      const matchingDossier = dossiers.find(
        (d) =>
          d.trackingCode.toUpperCase() === passUpper ||
          d.trackingCode.toUpperCase() === identifier.trim().toUpperCase() ||
          d.personalInfo.email.toLowerCase() === idClean ||
          d.personalInfo.phone.replace(/[^0-9]/g, '') === identifier.replace(/[^0-9]/g, '')
      );

      if (matchingDossier) {
        const pilgrimAcc: UserAccount = {
          id: `acc-${matchingDossier.id}`,
          role: 'PILGRIM',
          name: `${matchingDossier.personalInfo.firstName} ${matchingDossier.personalInfo.lastName}`,
          firstName: matchingDossier.personalInfo.firstName,
          lastName: matchingDossier.personalInfo.lastName,
          email: matchingDossier.personalInfo.email,
          phone: matchingDossier.personalInfo.phone,
          title: `Pèlerin Inscrit (${matchingDossier.packageSnapshot.title})`,
          linkedTrackingCode: matchingDossier.trackingCode,
          avatar: matchingDossier.documents.photo?.fileUrl || matchingDossier.personalInfo.photoUrl,
          createdAt: matchingDossier.createdAt,
        };

        // Persist to registeredUsers list
        setRegisteredUsers((prev) => {
          const filtered = prev.filter((u) => u.email.toLowerCase() !== pilgrimAcc.email.toLowerCase());
          return [pilgrimAcc, ...filtered];
        });

        setCurrentUser(pilgrimAcc);
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(pilgrimAcc));
        setTrackingQueryCode(matchingDossier.trackingCode);
        setCurrentView('PILGRIM');
        return { success: true };
      }

      return {
        success: false,
        error: "Aucun compte client ou dossier pèlerin trouvé avec ces coordonnées. Veuillez vérifier vos identifiants ou créer votre compte.",
      };
    }
  };

  const registerClientAccount = (
    name: string,
    email: string,
    phone?: string,
    trackingCode?: string,
    firstName?: string,
    lastName?: string,
    password?: string
  ): UserAccount => {
    const emailClean = email.trim().toLowerCase();

    // Check if back-office domain entered (@evavoyage.com) -> auto switch!
    if (isBackOfficeDomain(emailClean)) {
      return switchToBackOffice(emailClean, name);
    }

    const cleanFirst = firstName?.trim() || name.split(' ')[0] || '';
    const cleanLast = lastName?.trim() || name.split(' ').slice(1).join(' ') || '';
    const cleanName = name?.trim() || `${cleanFirst} ${cleanLast}`.trim() || emailClean.split('@')[0];

    // Find any existing dossier for this user
    const existingDossier = dossiers.find(
      (d) =>
        (trackingCode && d.trackingCode.toUpperCase() === trackingCode.toUpperCase()) ||
        d.personalInfo.email.toLowerCase() === emailClean ||
        (phone && phone.length > 5 && d.personalInfo.phone.replace(/[^0-9]/g, '') === phone.replace(/[^0-9]/g, ''))
    );

    const linkedCode = trackingCode || existingDossier?.trackingCode;

    const newAcc: UserAccount = {
      id: `acc-${Date.now()}`,
      role: 'PILGRIM',
      name: cleanName,
      firstName: cleanFirst,
      lastName: cleanLast,
      email: emailClean,
      phone: phone || existingDossier?.personalInfo.phone || '+221 77 000 00 00',
      password: password || undefined,
      title: linkedCode ? `Pèlerin Inscrit (${linkedCode})` : 'Pèlerin Client',
      linkedTrackingCode: linkedCode,
      avatar: existingDossier?.documents.photo?.fileUrl || existingDossier?.personalInfo.photoUrl,
      createdAt: new Date().toISOString(),
    };

    setRegisteredUsers((prev) => {
      const filtered = prev.filter((u) => u.email.toLowerCase() !== emailClean);
      return [newAcc, ...filtered];
    });

    setCurrentUser(newAcc);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(newAcc));

    if (linkedCode) {
      setTrackingQueryCode(linkedCode);
    }
    setCurrentView('PILGRIM');
    return newAcc;
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentView('PILGRIM');
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem('eva_voyages_auth_user_v1');
  };

  // Update Pilgrim Profile Photo with live synchronization to linked dossier & Back-Office
  const updateUserProfilePhoto = (photoUrlOrDataUrl: string) => {
    if (!currentUser) return;
    const updatedUser: UserAccount = {
      ...currentUser,
      avatar: photoUrlOrDataUrl || undefined,
    };
    setCurrentUser(updatedUser);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(updatedUser));

    const code = currentUser.linkedTrackingCode?.toUpperCase();
    const userEmail = currentUser.email.toLowerCase();

    setDossiers((prev) => {
      const next = prev.map((d) => {
        const isMatch =
          (code && d.trackingCode.toUpperCase() === code) ||
          d.personalInfo.email.toLowerCase() === userEmail;
        if (isMatch) {
          const updatedPhoto: PilgrimDocument = {
            id: d.documents.photo?.id || `doc-photo-${Date.now()}`,
            type: 'photo',
            title: "Photo d'identité réglementaire (Fond blanc)",
            fileName: 'Photo_Profil_Compte.jpg',
            fileUrl: photoUrlOrDataUrl,
            fileSize: '650 Ko',
            uploadedAt: new Date().toISOString(),
            status: 'APPROVED',
          };
          return {
            ...d,
            personalInfo: {
              ...d.personalInfo,
              photoUrl: photoUrlOrDataUrl,
            },
            documents: {
              ...d.documents,
              photo: updatedPhoto,
            },
            updatedAt: new Date().toISOString(),
          };
        }
        return d;
      });

      try {
        const channel = new BroadcastChannel('eva_voyages_live_sync');
        channel.postMessage({ type: 'DOSSIERS_UPDATED', payload: next });
        channel.close();
      } catch {}

      return next;
    });

    sendNotification({
      type: 'SMS',
      recipientPhone: '+221 78 639 10 00',
      sender: 'EVA VOYAGES SYNC',
      message: `[Synchronisation Temps Réel] Photo de profil mise à jour pour ${currentUser.name} (${code || currentUser.email}) et transmise au Back-Office.`,
      trigger: 'STATUS_CHANGE',
    });
  };

  // Emergency SOS Pèlerin Égaré Trigger
  const triggerSosAlert = (params: {
    lat: number;
    lng: number;
    nearestSiteName?: string;
    distanceKm?: number;
    pilgrimName?: string;
    trackingCode?: string;
    phone?: string;
    avatar?: string;
    message?: string;
  }): SosAlert => {
    const name = params.pilgrimName || currentUser?.name || 'Pèlerin EVA Voyages';
    const code = params.trackingCode || currentUser?.linkedTrackingCode || 'EVA-HJ26-9284';
    const phone = params.phone || currentUser?.phone || '+221 77 541 23 89';
    const avatar = params.avatar || currentUser?.avatar;
    const site = params.nearestSiteName || 'Mina / Lieux Saints';
    const dist = params.distanceKm !== undefined ? params.distanceKm : 0.8;

    const newAlert: SosAlert = {
      id: `sos-${Date.now()}`,
      timestamp: new Date().toISOString(),
      pilgrimName: name,
      trackingCode: code,
      phone,
      email: currentUser?.email,
      avatar,
      location: { lat: params.lat, lng: params.lng },
      nearestSiteName: site,
      distanceKm: dist,
      status: 'ACTIVE',
      notes: params.message || 'Déclenchement bouton SOS Pèlerin Égaré',
    };

    setActiveSosAlerts((prev) => {
      const updated = [newAlert, ...prev.filter((a) => a.trackingCode !== code)];
      try {
        localStorage.setItem(STORAGE_KEYS.SOS_ALERTS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    sendNotification({
      type: 'SMS',
      direction: 'INBOUND',
      recipientPhone: '+221 78 639 10 00',
      sender: `URGENCE SOS (${name})`,
      message: `🚨 [ALERTE SOS PÈLERIN ÉGARÉ] : Le pèlerin ${name} (${code}) a activé le bouton de détresse ! Proximité : ${site}. Coordonnées GPS : ${params.lat.toFixed(5)}, ${params.lng.toFixed(5)}. Téléphone : ${phone}. Guide Awa Kane et Back-Office alertés en direct.`,
      trigger: 'SOS_ALERT',
    });

    playEmergencyChime();

    try {
      const channel = new BroadcastChannel('eva_voyages_live_sync');
      channel.postMessage({ type: 'SOS_ALERT_TRIGGERED', payload: newAlert });
      channel.close();
    } catch {}

    return newAlert;
  };

  const resolveSosAlert = (alertId: string, notes?: string) => {
    setActiveSosAlerts((prev) => {
      const updated = prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'RESOLVED' as const,
              resolvedAt: new Date().toISOString(),
              notes: notes || a.notes,
            }
          : a
      );
      try {
        localStorage.setItem(STORAGE_KEYS.SOS_ALERTS, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    sendNotification({
      type: 'SMS',
      recipientPhone: '+221 78 639 10 00',
      sender: 'GUIDE AWA KANE',
      message: `✅ [Alerte SOS Résolue] : Le pèlerin égaré a été localisé et secouru avec succès par l'équipe d'encadrement EVA Voyages.`,
      trigger: 'MANUAL',
    });

    try {
      const channel = new BroadcastChannel('eva_voyages_live_sync');
      channel.postMessage({ type: 'SOS_ALERT_RESOLVED', payload: { alertId } });
      channel.close();
    } catch {}
  };

  const acknowledgeSosAlert = (alertId: string) => {
    setActiveSosAlerts((prev) => {
      const updated = prev.map((a) =>
        a.id === alertId && a.status === 'ACTIVE'
          ? { ...a, status: 'ACKNOWLEDGED' as const }
          : a
      );
      try {
        localStorage.setItem(STORAGE_KEYS.SOS_ALERTS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const updateAgencyConfig = (updates: Partial<AgencyConfig>) => {
    setAgencyConfig((prev) => ({ ...prev, ...updates }));
  };

  const formatFCFA = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  const clearLiveToast = () => setRecentLiveToast(null);

  // Dispatch Notification (Both SMS and Email simulator)
  const sendNotification = (notificationData: Omit<NotificationLog, 'id' | 'sentAt' | 'status'>): NotificationLog => {
    const newNotif: NotificationLog = {
      ...notificationData,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sentAt: new Date().toISOString(),
      status: 'DELIVERED',
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setRecentLiveToast(newNotif);

    // Auto dismiss live toast after 7s
    setTimeout(() => {
      setRecentLiveToast((current) => (current?.id === newNotif.id ? null : current));
    }, 7000);

    return newNotif;
  };

  // Back-office Package Management
  const addPackage = (newPkg: Omit<Package, 'id'>) => {
    const id = `pkg-${Date.now()}`;
    const fullPkg: Package = { ...newPkg, id };
    setPackages((prev) => [fullPkg, ...prev]);
  };

  const updatePackage = (id: string, updates: Partial<Package>) => {
    setPackages((prev) =>
      prev.map((pkg) => (pkg.id === id ? { ...pkg, ...updates } : pkg))
    );
  };

  const deletePackage = (id: string) => {
    setPackages((prev) => prev.filter((pkg) => pkg.id !== id));
  };

  // Dossier Registration
  const registerPilgrim = (
    data: Omit<PilgrimDossier, 'id' | 'trackingCode' | 'createdAt' | 'updatedAt'>
  ): PilgrimDossier => {
    const isHajj = data.packageSnapshot.type === 'HAJJ';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `EVA-${isHajj ? 'HJ26' : 'OU26'}-${randNum}`;
    const id = `dos-${Date.now()}`;
    const now = new Date().toISOString();

    // Determine WhatsApp group specific to this package
    const targetPkg = packages.find((p) => p.id === data.packageId);
    const whatsappGroupName =
      data.packageSnapshot.whatsappGroupName ||
      targetPkg?.whatsappGroupName ||
      `EVA Voyages - ${data.packageSnapshot.title} 🕋`;
    const whatsappGroupLink =
      data.packageSnapshot.whatsappGroupLink ||
      targetPkg?.whatsappGroupLink ||
      `https://chat.whatsapp.com/invite/EVA${isHajj ? 'Hajj2026' : 'Oumra2026'}`;
    const whatsappQrCodeUrl =
      data.packageSnapshot.whatsappQrCodeUrl ||
      targetPkg?.whatsappQrCodeUrl ||
      `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(whatsappGroupLink)}`;

    const newDossier: PilgrimDossier = {
      ...data,
      id,
      trackingCode,
      createdAt: now,
      updatedAt: now,
      packageSnapshot: {
        ...data.packageSnapshot,
        whatsappGroupName,
        whatsappGroupLink,
        whatsappQrCodeUrl,
      },
      whatsappStatus: 'INVITATION_SENT',
      whatsappInvitedAt: now,
    };

    setDossiers((prev) => [newDossier, ...prev]);

    // Decrement package spots remaining if available
    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.id === data.packageId && pkg.spotsRemaining > 0
          ? { ...pkg, spotsRemaining: pkg.spotsRemaining - 1 }
          : pkg
      )
    );

    // 1. Send SMS Notification with Package WhatsApp link
    sendNotification({
      dossierId: id,
      trackingCode,
      type: 'SMS',
      recipientPhone: data.personalInfo.phone,
      sender: agencyConfig.smsSenderName,
      message: `${agencyConfig.name}: Salam Alaykum ${data.personalInfo.firstName}. Inscription confirmée au ${data.packageSnapshot.title} (Code: ${trackingCode}). Rejoignez votre Groupe WhatsApp officiel: ${whatsappGroupLink}`,
      trigger: 'REGISTRATION',
    });

    // 2. Send Email Notification with WhatsApp group invite details
    sendNotification({
      dossierId: id,
      trackingCode,
      type: 'EMAIL',
      recipientEmail: data.personalInfo.email,
      sender: agencyConfig.email,
      subject: `Confirmation d'inscription & Accès Groupe WhatsApp [${trackingCode}] - ${agencyConfig.name}`,
      message: `Cher(e) pèlerin(e) ${data.personalInfo.firstName} ${data.personalInfo.lastName},\n\nNous accusons bonne réception de votre dossier d'inscription au ${data.packageSnapshot.title} (${data.packageSnapshot.season}).\n\nCode de dossier: ${trackingCode}\nPackage: ${data.packageSnapshot.title}\nMontant total: ${formatFCFA(data.payment.totalAmountFCFA)}\nStatut actuel: En attente de contrôle des pièces justificatives.\n\nGROUPE WHATSAPP OFFICIEL DU PACKAGE:\nNom du groupe: ${whatsappGroupName}\nLien d'adhésion direct: ${whatsappGroupLink}\nRejoignez dès maintenant vos compagnons de pèlerinage, guides spirituels et commission médicale pour les annonces et préparatifs.\n\nQu'Allah agrée votre intention spirituelle.\n\n${agencyConfig.name} - Service Inscriptions\n${agencyConfig.phone} | ${agencyConfig.whatsapp}`,
      trigger: 'REGISTRATION',
    });

    // 3. Dedicated WhatsApp invite alert log
    sendNotification({
      dossierId: id,
      trackingCode,
      type: 'SMS',
      recipientPhone: data.personalInfo.phone,
      sender: `${agencyConfig.notificationPhone || '+221 78 639 10 00'} (${agencyConfig.name})`,
      message: `WhatsApp EVA: Vous êtes invité(e) à rejoindre le groupe officiel "${whatsappGroupName}". Cliquez ici: ${whatsappGroupLink}`,
      trigger: 'WHATSAPP_INVITE',
    });

    // 4. Inbound Reception Alert on Associated Line +221 78 639 10 00
    sendNotification({
      dossierId: id,
      trackingCode,
      type: 'SMS',
      direction: 'INBOUND',
      recipientPhone: agencyConfig.notificationPhone || '+221 78 639 10 00',
      sender: 'PORTAIL CLIENT EVA',
      message: `[Notification Reçue sur ${agencyConfig.notificationPhone || '+221 78 639 10 00'}] Nouvelle inscription confirmée: ${data.personalInfo.firstName} ${data.personalInfo.lastName} pour ${data.packageSnapshot.title} (Code: ${trackingCode}, Tél: ${data.personalInfo.phone}).`,
      trigger: 'INBOUND_ALERT',
    });

    return newDossier;
  };

  // WhatsApp Group actions
  const joinWhatsAppGroup = (dossierId: string) => {
    setDossiers((prev) =>
      prev.map((dos) => {
        if (dos.id === dossierId) {
          return {
            ...dos,
            whatsappStatus: 'JOINED',
            whatsappJoinedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        return dos;
      })
    );
  };

  const toggleWhatsAppJoined = (dossierId: string, joined?: boolean) => {
    setDossiers((prev) =>
      prev.map((dos) => {
        if (dos.id === dossierId) {
          const isJoined = joined !== undefined ? joined : dos.whatsappStatus !== 'JOINED';
          return {
            ...dos,
            whatsappStatus: isJoined ? 'JOINED' : 'INVITATION_SENT',
            whatsappJoinedAt: isJoined ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return dos;
      })
    );
  };

  const sendWhatsAppInvitation = (dossierId: string) => {
    const dossier = dossiers.find((d) => d.id === dossierId);
    if (!dossier) return;
    const link = dossier.packageSnapshot.whatsappGroupLink || 'https://chat.whatsapp.com/invite/EVAVoyages';
    const groupName = dossier.packageSnapshot.whatsappGroupName || `Groupe EVA - ${dossier.packageSnapshot.title}`;

    sendNotification({
      dossierId: dossier.id,
      trackingCode: dossier.trackingCode,
      type: 'SMS',
      recipientPhone: dossier.personalInfo.phone,
      sender: agencyConfig.smsSenderName,
      message: `${agencyConfig.name}: Rappel d'invitation au Groupe WhatsApp "${groupName}". Rejoignez vos compagnons de voyage: ${link}`,
      trigger: 'WHATSAPP_INVITE',
    });
  };

  // Update Dossier Status
  const updateDossierStatus = (
    dossierId: string,
    newStatus: WorkflowStatus,
    extra?: {
      flightDetails?: PilgrimDossier['flightDetails'];
      trainDetails?: PilgrimDossier['trainDetails'];
      notes?: string;
    }
  ) => {
    let updatedDossier: PilgrimDossier | undefined;

    setDossiers((prev) =>
      prev.map((dos) => {
        if (dos.id === dossierId) {
          const updated: PilgrimDossier = {
            ...dos,
            workflowStatus: newStatus,
            updatedAt: new Date().toISOString(),
            flightDetails: extra?.flightDetails ? { ...dos.flightDetails, ...extra.flightDetails } : dos.flightDetails,
            trainDetails: extra?.trainDetails ? { ...dos.trainDetails, ...extra.trainDetails } : dos.trainDetails,
            adminNotes: extra?.notes !== undefined ? extra.notes : dos.adminNotes,
          };
          updatedDossier = updated;
          return updated;
        }
        return dos;
      })
    );

    if (!updatedDossier) return;

    // Status Notification Message Mapping
    const statusLabels: Record<WorkflowStatus, { sms: string; emailSubject: string; emailBody: string }> = {
      DOCUMENTS_PENDING: {
        sms: `${agencyConfig.name}: Votre dossier ${updatedDossier.trackingCode} est en attente de documents. Merci de télécharger votre passeport et photo sur l'application.`,
        emailSubject: `Rappel pièces justificatives [${updatedDossier.trackingCode}]`,
        emailBody: `Votre passeport biométrique ou photo d'identité est requis pour finaliser l'instruction de votre dossier de voyage.`,
      },
      UNDER_REVIEW: {
        sms: `${agencyConfig.name}: Vos documents pour le dossier ${updatedDossier.trackingCode} sont bien reçus et en cours d'examen par notre équipe.`,
        emailSubject: `Documents reçus et en cours d'examen [${updatedDossier.trackingCode}]`,
        emailBody: `Vos pièces d'identité sont actuellement examinées par notre service client pour validation.`,
      },
      DOCUMENTS_APPROVED: {
        sms: `${agencyConfig.name}: Excellente nouvelle! Vos pièces administratives sont validées pour votre pèlerinage.`,
        emailSubject: `Documents validés avec succès [${updatedDossier.trackingCode}]`,
        emailBody: `Votre dossier est désormais complet et validé. Vos réservations de vol et de transport sont en cours d'émission.`,
      },
      FLIGHT_TICKET_ISSUED: {
        sms: `${agencyConfig.name}: Vos billets d'avion (${updatedDossier.flightDetails?.airline || 'Compagnie confirmée'}, PNR: ${updatedDossier.flightDetails?.pnr || 'Confirmé'}) sont émis! Bons préparatifs.`,
        emailSubject: `Billets d'avion émis - Convocation départ [${updatedDossier.trackingCode}]`,
        emailBody: `Votre réservation aérienne avec la compagnie ${updatedDossier.flightDetails?.airline || 'partenaire'} est confirmée. Vos billets électroniques ainsi que le programme de vol sont disponibles.`,
      },
      READY_FOR_DEPARTURE: {
        sms: `${agencyConfig.name}: Votre dossier est 100% prêt! Retrait du kit pèlerin et convocation à l'aéroport disponibles sur votre espace.`,
        emailSubject: `Dossier complet & Prêt pour le grand départ! [${updatedDossier.trackingCode}]`,
        emailBody: `Votre voyage vers les Lieux Saints approche! Vos billets d'avion, réservations hôtelières et kits sont en ordre.`,
      },
      COMPLETED: {
        sms: `${agencyConfig.name}: Hajj Mabroor wa Sa'y Mashkoor! Qu'Allah agrée vos prières et votre pèlerinage.`,
        emailSubject: `Hajj Mabroor & Oumra Maqboola - ${agencyConfig.name}`,
        emailBody: `Toute l'équipe d'EVA VOYAGES vous remercie pour votre confiance et prie Allah d'agréer chaque invocation et chaque pas accompli sur cette terre sainte.`,
      },
    };

    const statusConfig = statusLabels[newStatus];
    if (statusConfig) {
      // Trigger SMS
      sendNotification({
        dossierId: updatedDossier.id,
        trackingCode: updatedDossier.trackingCode,
        type: 'SMS',
        recipientPhone: updatedDossier.personalInfo.phone,
        sender: agencyConfig.smsSenderName,
        message: statusConfig.sms,
        trigger: 'STATUS_CHANGE',
      });

      // Trigger Email
      sendNotification({
        dossierId: updatedDossier.id,
        trackingCode: updatedDossier.trackingCode,
        type: 'EMAIL',
        recipientEmail: updatedDossier.personalInfo.email,
        sender: agencyConfig.email,
        subject: `${statusConfig.emailSubject} - ${agencyConfig.name}`,
        message: `Salam Alaykum ${updatedDossier.personalInfo.firstName} ${updatedDossier.personalInfo.lastName},\n\n${statusConfig.emailBody}\n\nCode de dossier: ${updatedDossier.trackingCode}\nPour toute question, joignez notre service pèlerins au ${agencyConfig.phone} ou WhatsApp: ${agencyConfig.whatsapp}.\n\nL'équipe ${agencyConfig.name}`,
        trigger: 'STATUS_CHANGE',
      });
    }
  };

  // Upload or update document
  const updateDossierDocument = (dossierId: string, docType: DocumentType, doc: PilgrimDocument) => {
    setDossiers((prev) =>
      prev.map((dos) => {
        if (dos.id === dossierId) {
          const updatedDocs = { ...dos.documents, [docType]: doc };
          return {
            ...dos,
            documents: updatedDocs,
            workflowStatus: dos.workflowStatus === 'DOCUMENTS_PENDING' ? 'UNDER_REVIEW' : dos.workflowStatus,
            updatedAt: new Date().toISOString(),
          };
        }
        return dos;
      })
    );
  };

  // Admin Review Document
  const reviewDocument = (dossierId: string, docType: DocumentType, approved: boolean, reason?: string) => {
    let targetDossier: PilgrimDossier | undefined;

    setDossiers((prev) =>
      prev.map((dos) => {
        if (dos.id === dossierId) {
          const currentDoc = dos.documents[docType];
          if (!currentDoc) return dos;

          const updatedDoc: PilgrimDocument = {
            ...currentDoc,
            status: approved ? 'APPROVED' : 'REJECTED',
            rejectionReason: approved ? undefined : reason || 'Document non conforme ou illisible',
            verifiedAt: new Date().toISOString(),
          };

          const newDocs = { ...dos.documents, [docType]: updatedDoc };

          // Check if all core documents (passport and photo) are approved
          const hasPassport = newDocs.passport?.status === 'APPROVED';
          const hasPhoto = newDocs.photo?.status === 'APPROVED';
          const allDocsOk = hasPassport && hasPhoto;

          let newStatus = dos.workflowStatus;
          if (allDocsOk && (dos.workflowStatus === 'UNDER_REVIEW' || dos.workflowStatus === 'DOCUMENTS_PENDING')) {
            newStatus = 'DOCUMENTS_APPROVED';
          } else if (!approved) {
            newStatus = 'DOCUMENTS_PENDING';
          }

          targetDossier = {
            ...dos,
            documents: newDocs,
            workflowStatus: newStatus,
            updatedAt: new Date().toISOString(),
          };

          return targetDossier;
        }
        return dos;
      })
    );

    if (!targetDossier) return;

    if (!approved) {
      sendNotification({
        dossierId,
        trackingCode: targetDossier.trackingCode,
        type: 'SMS',
        recipientPhone: targetDossier.personalInfo.phone,
        sender: agencyConfig.smsSenderName,
        message: `${agencyConfig.name}: Votre document (${docType.toUpperCase()}) a été rejeté: ${reason || 'Pièce illisible'}. Veuillez le recharger dans votre espace.`,
        trigger: 'STATUS_CHANGE',
      });
    }
  };

  const updateDossier = (dossierId: string, updates: Partial<PilgrimDossier>) => {
    setDossiers((prev) =>
      prev.map((dos) => (dos.id === dossierId ? { ...dos, ...updates, updatedAt: new Date().toISOString() } : dos))
    );
  };

  // Payment Processing (Wave / Orange Money)
  const processPayment = ({
    dossierId,
    amountFCFA,
    method,
    paymentType,
    phone,
    reference,
  }: {
    dossierId: string;
    amountFCFA: number;
    method: PaymentMethod;
    paymentType?: 'DEPOSIT' | 'FULL' | 'BALANCE';
    phone: string;
    reference?: string;
  }): { success: boolean; transaction: Transaction; receiptNumber: string } => {
    const timestamp = Date.now();
    const prefix = method === 'WAVE' ? 'WAV-SN' : method === 'ORANGE_MONEY' ? 'OM-SN' : 'AGN-SN';
    const genRef = reference || `${prefix}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(10000 + Math.random() * 90000)}`;
    const receiptNumber = `REC-EVA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const methodLabel = method === 'WAVE' ? 'Wave Mobile' : method === 'ORANGE_MONEY' ? 'Orange Money' : "Guichet Agence (Espèces/TPE)";

    const transaction: Transaction = {
      id: `tx-${timestamp}`,
      dossierId,
      date: new Date().toISOString(),
      amountFCFA,
      method,
      paymentType: paymentType || 'DEPOSIT',
      reference: genRef,
      phone,
      status: 'COMPLETED',
      receiptNumber,
      operatorNotes:
        method === 'WAVE'
          ? 'Transaction validée avec succès via la passerelle Wave Sénégal/UEMOA.'
          : method === 'ORANGE_MONEY'
          ? 'Transaction validée avec succès via Orange Money API Sénégal.'
          : "Paiement direct effectué et validé au guichet officiel de l'agence EVA Voyages (Espèces / Chèque / TPE).",
    };

    let targetDossier: PilgrimDossier | undefined;

    setDossiers((prev) =>
      prev.map((dos) => {
        if (dos.id === dossierId) {
          const newAmountPaid = dos.payment.amountPaidFCFA + amountFCFA;
          const remaining = Math.max(0, dos.payment.totalAmountFCFA - newAmountPaid);
          const paymentStatus: PilgrimDossier['payment']['paymentStatus'] =
            remaining === 0 ? 'PAID' : newAmountPaid > 0 ? 'PARTIAL' : 'UNPAID';

          targetDossier = {
            ...dos,
            payment: {
              ...dos.payment,
              amountPaidFCFA: newAmountPaid,
              remainingBalanceFCFA: remaining,
              paymentStatus,
              transactions: [transaction, ...dos.payment.transactions],
            },
            updatedAt: new Date().toISOString(),
          };
          return targetDossier;
        }
        return dos;
      })
    );

    const dossier = targetDossier || dossiers.find((d) => d.id === dossierId);
    const tracking = dossier ? dossier.trackingCode : 'EVA-XXXX';
    const pilgrimName = dossier ? `${dossier.personalInfo.firstName} ${dossier.personalInfo.lastName}` : 'Pèlerin';
    const remainingAfter = dossier ? Math.max(0, dossier.payment.totalAmountFCFA - (dossier.payment.amountPaidFCFA + amountFCFA)) : 0;

    // Send Automatic SMS confirmation to Pilgrim
    sendNotification({
      dossierId,
      trackingCode: tracking,
      type: 'SMS',
      recipientPhone: phone || dossier?.personalInfo.phone,
      sender: `${agencyConfig.notificationPhone || '+221 78 639 10 00'} (${agencyConfig.name})`,
      message: `${agencyConfig.name}: Paiement ${methodLabel} de ${formatFCFA(amountFCFA)} enregistré avec succès. Réf: ${genRef}. Reçu: ${receiptNumber}. Reste à payer: ${formatFCFA(remainingAfter)}.`,
      trigger: 'PAYMENT',
    });

    // Send Inbound Alert to Agency Line +221 78 639 10 00
    sendNotification({
      dossierId,
      trackingCode: tracking,
      type: 'SMS',
      direction: 'INBOUND',
      recipientPhone: agencyConfig.notificationPhone || '+221 78 639 10 00',
      sender: method === 'AGENCY_CASH' ? 'GUICHET AGENCE' : `PASSERELLE ${method}`,
      message: `[Notification Reçue sur ${agencyConfig.notificationPhone || '+221 78 639 10 00'}] Encaissement ${methodLabel} de ${formatFCFA(amountFCFA)} validé pour le dossier ${tracking} (${pilgrimName}). Reste: ${formatFCFA(remainingAfter)}. Reçu: ${receiptNumber}.`,
      trigger: 'INBOUND_ALERT',
    });

    // Send Automatic Email confirmation with printable receipt
    if (dossier?.personalInfo.email) {
      sendNotification({
        dossierId,
        trackingCode: tracking,
        type: 'EMAIL',
        recipientEmail: dossier.personalInfo.email,
        sender: agencyConfig.email,
        subject: `Reçu officiel de paiement [${receiptNumber}] - ${agencyConfig.name}`,
        message: `Salam Alaykum ${pilgrimName},\n\nNous confirmons la réception effective de votre règlement de ${formatFCFA(amountFCFA)} enregistré par ${methodLabel}.\n\nNuméro de reçu: ${receiptNumber}\nRéférence: ${genRef}\nDossier: ${tracking}\nPackage: ${dossier.packageSnapshot.title}\nMontant encaissé: ${formatFCFA(amountFCFA)}\nReste à solder: ${formatFCFA(remainingAfter)}\n\nVotre reçu officiel est téléchargeable sur votre espace de suivi.\n\n${agencyConfig.name}\n${agencyConfig.phone} | ${agencyConfig.address}`,
        trigger: 'PAYMENT',
      });
    }

    return { success: true, transaction, receiptNumber };
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        pilgrimActiveTab,
        setPilgrimActiveTab,
        adminActiveTab,
        setAdminActiveTab,
        selectedPackageId,
        setSelectedPackageId,
        selectedDossierId,
        setSelectedDossierId,
        trackingQueryCode,
        setTrackingQueryCode,
        agencyConfig,
        updateAgencyConfig,
        packages,
        isLoadingPackages,
        refreshPackages,
        dossiers,
        notifications,
        addPackage,
        updatePackage,
        deletePackage,
        registerPilgrim,
        updateDossierStatus,
        updateDossierDocument,
        reviewDocument,
        updateDossier,
        joinWhatsAppGroup,
        toggleWhatsAppJoined,
        sendWhatsAppInvitation,
        processPayment,
        sendNotification,
        recentLiveToast,
        clearLiveToast,
        formatFCFA,
        currentUser,
        loginAsAdmin,
        loginAsPilgrim,
        loginWithCredentials,
        registerClientAccount,
        switchToBackOffice,
        isBackOfficeDomain,
        getMyDossier,
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalRole,
        setAuthModalRole,
        authModalMode,
        setAuthModalMode,
        openAuthModal,
        navigateToSpace,
        updateUserProfilePhoto,
        isProfileModalOpen,
        setIsProfileModalOpen,
        loginAsGuide,
        isGuideEmail,
        isGuide,
        activeSosAlerts,
        triggerSosAlert,
        resolveSosAlert,
        acknowledgeSosAlert,
        badgeSettings,
        updateBadgeSettings,
        updateDossierBadgeSettings,
        applyBadgeHotelsToAll,
        applyBadgeHotelsToDossiers,
        isAuthorizedAdminEmail,
        authorizedAdminProfiles: AUTHORIZED_ADMIN_PROFILES,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
