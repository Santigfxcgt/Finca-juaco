/**
 * Persistent local storage manager for room photographs
 * Guarantees that uploaded images never disappear from the client,
 * surviving browser restarts, session clears, and API polling updates.
 */

const STORAGE_KEY = 'colmena_custom_room_photos_v1';

export function getAllStoredRoomPhotos(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading stored room photos from localStorage:', e);
    return {};
  }
}

export function getStoredRoomPhoto(roomId: string): string | null {
  if (typeof window === 'undefined' || !roomId) return null;
  const all = getAllStoredRoomPhotos();
  return all[roomId] || null;
}

export function setStoredRoomPhoto(roomId: string, photoUrlOrBase64: string): void {
  if (typeof window === 'undefined' || !roomId || !photoUrlOrBase64) return;
  try {
    const all = getAllStoredRoomPhotos();
    all[roomId] = photoUrlOrBase64;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Error saving stored room photo to localStorage:', e);
  }
}

export function removeStoredRoomPhoto(roomId: string): void {
  if (typeof window === 'undefined' || !roomId) return;
  try {
    const all = getAllStoredRoomPhotos();
    delete all[roomId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Error removing stored room photo from localStorage:', e);
  }
}

const EXP_STORAGE_KEY = 'colmena_custom_experience_photos_v1';

export function getAllStoredExperiencePhotos(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(EXP_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading stored experience photos from localStorage:', e);
    return {};
  }
}

export function getStoredExperiencePhoto(expId: string): string | null {
  if (typeof window === 'undefined' || !expId) return null;
  const all = getAllStoredExperiencePhotos();
  return all[expId] || null;
}

export function setStoredExperiencePhoto(expId: string, photoUrlOrBase64: string): void {
  if (typeof window === 'undefined' || !expId || !photoUrlOrBase64) return;
  try {
    const all = getAllStoredExperiencePhotos();
    all[expId] = photoUrlOrBase64;
    localStorage.setItem(EXP_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Error saving stored experience photo to localStorage:', e);
  }
}

export function removeStoredExperiencePhoto(expId: string): void {
  if (typeof window === 'undefined' || !expId) return;
  try {
    const all = getAllStoredExperiencePhotos();
    delete all[expId];
    localStorage.setItem(EXP_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Error removing stored experience photo from localStorage:', e);
  }
}

const SEASONAL_STORAGE_KEY = 'colmena_custom_seasonal_photos_v1';

export function getAllStoredSeasonalPhotos(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SEASONAL_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading stored seasonal photos from localStorage:', e);
    return {};
  }
}

export function getStoredSeasonalPhoto(seasonId: string): string | null {
  if (typeof window === 'undefined' || !seasonId) return null;
  const all = getAllStoredSeasonalPhotos();
  return all[seasonId] || null;
}

export function setStoredSeasonalPhoto(seasonId: string, photoUrlOrBase64: string): void {
  if (typeof window === 'undefined' || !seasonId || !photoUrlOrBase64) return;
  try {
    const all = getAllStoredSeasonalPhotos();
    all[seasonId] = photoUrlOrBase64;
    localStorage.setItem(SEASONAL_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Error saving stored seasonal photo to localStorage:', e);
  }
}

export function removeStoredSeasonalPhoto(seasonId: string): void {
  if (typeof window === 'undefined' || !seasonId) return;
  try {
    const all = getAllStoredSeasonalPhotos();
    delete all[seasonId];
    localStorage.setItem(SEASONAL_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Error removing stored seasonal photo from localStorage:', e);
  }
}

