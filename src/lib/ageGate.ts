/** Soft 18+ acknowledgment (localStorage only — no ID verification). */

export const AGE_ACK_STORAGE_KEY = 'virtuel-rt-age-18-ack';

export function hasAgeAcknowledged(): boolean {
  try {
    return localStorage.getItem(AGE_ACK_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAgeAcknowledged(): void {
  try {
    localStorage.setItem(AGE_ACK_STORAGE_KEY, '1');
  } catch {
    /* ignore quota / private mode */
  }
}
