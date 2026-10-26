/**
 * Wave Payment Configuration & Direct Deep Linking
 * Official EVA VOYAGES Wave recipient number: +221 76 161 61 66
 */

export const WAVE_OFFICIAL_NUMBER = '+221 76 161 61 66';
export const WAVE_RAW_PHONE = '+221761616166';
export const WAVE_DISPLAY_RECIPIENT = 'EVA VOYAGES (+221 76 161 61 66)';

/**
 * Builds the direct Wave link that opens the Wave application or web account
 * to transfer money directly to the agency's official number (+221 76 161 61 66).
 */
export const getWavePaymentUrl = (amount?: number): string => {
  const encodedPhone = encodeURIComponent(WAVE_RAW_PHONE);
  if (amount && amount > 0) {
    const cleanAmount = Math.round(amount);
    return `https://wave.com/send?phone=${encodedPhone}&amount=${cleanAmount}`;
  }
  return `https://wave.com/send?phone=${encodedPhone}`;
};

/**
 * Triggers the opening of the client's Wave app / account to complete
 * the payment directly to +221 76 161 61 66.
 */
export const openWaveApp = (amount?: number): void => {
  const url = getWavePaymentUrl(amount);
  try {
    // Attempt window.open with fallback to window.location
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      // Popup blocked or mobile browser preference: redirect directly
      window.location.href = url;
    }
  } catch {
    window.location.href = url;
  }
};
