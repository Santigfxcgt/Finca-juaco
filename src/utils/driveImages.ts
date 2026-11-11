/**
 * Utilidades para detección y conversión de URLs de Google Drive a enlaces de visualización directa
 * Finca Don Joaco - Hotel Boutique & Cabañas Campestres
 */

/**
 * Extrae el identificador único (ID) de cualquier formato de enlace de Google Drive
 */
export function extractDriveId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Si ya es un ID directo de Drive (alfanumérico de entre 20 y 45 caracteres)
  if (/^[a-zA-Z0-9_-]{20,45}$/.test(trimmed)) {
    return trimmed;
  }

  // Coincidencia con formato /file/d/ID/view o /d/ID
  const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]{20,45})/);
  if (matchD && matchD[1]) return matchD[1];

  // Coincidencia con parámetro ?id=ID o &id=ID
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{20,45})/);
  if (matchId && matchId[1]) return matchId[1];

  // Coincidencia con carpetas /folders/ID
  const matchFolder = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{20,45})/);
  if (matchFolder && matchFolder[1]) return matchFolder[1];

  return null;
}

/**
 * Convierte un ID o enlace de Google Drive en una URL directa de visualización mediante CDN
 * @param urlOrId URL completa de Drive o ID de archivo
 * @returns URL directa para etiqueta <img src="...">
 */
export function formatDirectDriveUrl(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();

  // Si es un enlace de Drive o ID de Drive, convertirlo al endpoint directo CDN
  if (trimmed.includes('drive.google.com') || /^[a-zA-Z0-9_-]{25,45}$/.test(trimmed)) {
    const id = extractDriveId(trimmed);
    if (id) {
      // Endpoint de CDN Google Photos/Drive: alta disponibilidad, sin bloqueo de cookies
      return `https://lh3.googleusercontent.com/d/${id}`;
    }
  }

  return trimmed;
}

/**
 * Fallback de imágenes locales en caso de falla o retraso de carga
 */
export const LOCAL_ROOM_FALLBACKS: Record<string, string> = {
  'room-1': '/rooms/habitacion-doble.jpg',
  'room-2': '/rooms/habitacion-triple-madera.jpg',
  'room-3': '/rooms/habitacion-triple-tallada.jpg',
  'room-4': '/rooms/habitacion-triple-colonial.jpg',
  'room-5': '/rooms/habitacion-triple-campestre.jpg',
  'room-6': '/rooms/habitacion-cuadruple-ladrillo.jpg',
  'room-7': '/rooms/habitacion-cuadruple-ladrillo.jpg',
  default: '/rooms/habitacion-doble.jpg'
};

export function getRoomFallbackImage(roomId?: string): string {
  if (roomId && LOCAL_ROOM_FALLBACKS[roomId]) {
    return LOCAL_ROOM_FALLBACKS[roomId];
  }
  return LOCAL_ROOM_FALLBACKS.default;
}
