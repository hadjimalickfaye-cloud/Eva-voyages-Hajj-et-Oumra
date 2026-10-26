/**
 * Passport Biometric & Consular Expiry Rules
 * Official Saudi Hajj & Umrah Ministry + ICAO Rule:
 * Passports must have at least 6 months of validity remaining from travel date.
 */

export interface PassportValidityResult {
  isValid: boolean;
  isExpired: boolean;
  isLessThanSixMonths: boolean;
  daysRemaining: number;
  monthsRemaining: number;
  expiryDateFormatted: string;
  sixMonthsThresholdFormatted: string;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'INVALID_DATE';
  badgeLabel: string;
  badgeColor: 'emerald' | 'amber' | 'rose';
  rejectionTitle?: string;
  rejectionMessage?: string;
}

export function evaluatePassportExpiry(
  expiryDateStr?: string,
  referenceDate: Date = new Date()
): PassportValidityResult {
  if (!expiryDateStr || expiryDateStr.trim() === '') {
    return {
      isValid: false,
      isExpired: false,
      isLessThanSixMonths: true,
      daysRemaining: 0,
      monthsRemaining: 0,
      expiryDateFormatted: 'Non renseignée',
      sixMonthsThresholdFormatted: '',
      status: 'INVALID_DATE',
      badgeLabel: 'Date manquante',
      badgeColor: 'rose',
      rejectionTitle: 'Date d\'expiration manquante',
      rejectionMessage:
        'La date d\'expiration du passeport est requise pour vérifier la conformité consulaire.',
    };
  }

  // Parse YYYY-MM-DD or standard date format
  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) {
    return {
      isValid: false,
      isExpired: false,
      isLessThanSixMonths: true,
      daysRemaining: 0,
      monthsRemaining: 0,
      expiryDateFormatted: expiryDateStr,
      sixMonthsThresholdFormatted: '',
      status: 'INVALID_DATE',
      badgeLabel: 'Date invalide',
      badgeColor: 'rose',
      rejectionTitle: 'Format de date invalide',
      rejectionMessage: 'Veuillez vérifier le format de la date d\'expiration.',
    };
  }

  // Reference date threshold: reference date + 6 months
  const sixMonthsThreshold = new Date(referenceDate);
  sixMonthsThreshold.setMonth(sixMonthsThreshold.getMonth() + 6);

  const diffMs = expiry.getTime() - referenceDate.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const monthsRemaining = Math.max(0, Number((daysRemaining / 30.4375).toFixed(1)));

  const isExpired = diffMs <= 0;
  const isLessThanSixMonths = expiry.getTime() < sixMonthsThreshold.getTime();
  const isValid = !isExpired && !isLessThanSixMonths;

  const expiryFormatted = expiry.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const thresholdFormatted = sixMonthsThreshold.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  if (isExpired) {
    return {
      isValid: false,
      isExpired: true,
      isLessThanSixMonths: true,
      daysRemaining,
      monthsRemaining: 0,
      expiryDateFormatted: expiryFormatted,
      sixMonthsThresholdFormatted: thresholdFormatted,
      status: 'EXPIRED',
      badgeLabel: 'Passeport Expiré',
      badgeColor: 'rose',
      rejectionTitle: 'Passeport Expiré (Rejet Immédiat)',
      rejectionMessage: `Ce document a expiré le ${expiryFormatted}. Il ne peut en aucun cas être accepté pour l'obtention d'un visa Hajj/Oumra ou pour l'émission des billets d'avion.`,
    };
  }

  if (isLessThanSixMonths) {
    return {
      isValid: false,
      isExpired: false,
      isLessThanSixMonths: true,
      daysRemaining,
      monthsRemaining,
      expiryDateFormatted: expiryFormatted,
      sixMonthsThresholdFormatted: thresholdFormatted,
      status: 'EXPIRING_SOON',
      badgeLabel: 'Moins de 6 mois de validité',
      badgeColor: 'rose',
      rejectionTitle: 'Passeport Rejeté : Validité Inférieure à 6 Mois',
      rejectionMessage: `Ce passeport expire le ${expiryFormatted} (il ne reste que ${daysRemaining} jours, soit env. ${monthsRemaining} mois). Selon la réglementation stricte du Ministère du Hajj et de la Oumra d'Arabie Saoudite et les règles OACI, votre passeport doit être valide au minimum 6 mois (au-delà du ${thresholdFormatted}). Veuillez faire renouveler votre passeport.`,
    };
  }

  return {
    isValid: true,
    isExpired: false,
    isLessThanSixMonths: false,
    daysRemaining,
    monthsRemaining,
    expiryDateFormatted: expiryFormatted,
    sixMonthsThresholdFormatted: thresholdFormatted,
    status: 'VALID',
    badgeLabel: `Conforme (> 6 mois)`,
    badgeColor: 'emerald',
  };
}
