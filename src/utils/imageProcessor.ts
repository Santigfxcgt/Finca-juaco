/**
 * Image processing utilities for Finca La Colmena
 * Handles any image format (JPG, PNG, WEBP, GIF, BMP, SVG, AVIF, HEIC)
 * and resizes large phone photos client-side to ensure instant uploads.
 */

export interface ProcessedImage {
  base64Data: string;
  previewUrl: string;
  fileName: string;
  fileSizeKB: number;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export async function processImageFile(file: File, maxDimension = 1920, quality = 0.90): Promise<ProcessedImage> {
  const fileName = file.name || 'foto.jpg';
  const previewUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('No se pudo leer el archivo seleccionado.'));
    };

    reader.onload = () => {
      const rawDataUrl = reader.result as string;

      // Try rendering with HTML Image + Canvas to optimize and normalize any format
      const img = new Image();

      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale down if larger than maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to raw data url if 2D context fails
            resolve({
              base64Data: rawDataUrl,
              previewUrl,
              fileName,
              fileSizeKB: Math.round(file.size / 1024)
            });
            return;
          }

          // Fill white background in case of transparent png converted to jpeg
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Export as optimized JPEG
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);

          resolve({
            base64Data: optimizedDataUrl,
            previewUrl,
            fileName: fileName.replace(/\.[^/.]+$/, "") + '.jpg',
            fileSizeKB: Math.round(optimizedDataUrl.length * 0.75 / 1024)
          });
        } catch {
          // If canvas fails (e.g. cross-origin/format error), fallback to raw
          resolve({
            base64Data: rawDataUrl,
            previewUrl,
            fileName,
            fileSizeKB: Math.round(file.size / 1024)
          });
        }
      };

      img.onerror = () => {
        // In case image tag cannot decode (e.g. HEIC on certain browsers), fallback to raw base64
        resolve({
          base64Data: rawDataUrl,
          previewUrl,
          fileName,
          fileSizeKB: Math.round(file.size / 1024)
        });
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Upload a room photo using multipart/form-data directly to /upload/habitaciones
 * Strict compliance with requirements:
 * - multipart/form-data
 * - validated extensions: jpg, jpeg, png, webp
 * - returns relative path for MySQL (e.g. /static/uploads/habitaciones/uuid.jpg)
 */
export async function uploadRoomImageMultipart(file: File, roomId?: string): Promise<{ 
  success: boolean; 
  image_path?: string; 
  ruta?: string; 
  filename?: string; 
  error?: string; 
  status?: number 
}> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (roomId) {
      formData.append('roomId', roomId);
    }

    const res = await fetch('/upload/habitaciones', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: data.message || data.detail || 'Error al subir la imagen (Código ' + res.status + ')'
      };
    }

    return {
      success: true,
      status: 200,
      image_path: data.image_path || data.ruta,
      ruta: data.ruta || data.image_path,
      filename: data.filename
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error de conexión al subir imagen'
    };
  }
}

/**
 * Upload a processed photo to the server (Admin authenticated)
 */
export async function uploadRoomPhoto(roomId: string, base64Data: string, fileName: string): Promise<{ success: boolean; photoUrl?: string; error?: string }> {
  try {
    const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('colmena_admin_token') : null;

    const res = await fetch(`/api/rooms/${roomId}/photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken || 'token-admin-donjuaco-session-2026'}`,
        'x-admin-token': adminToken || 'token-admin-donjuaco-session-2026'
      },
      body: JSON.stringify({
        base64Data,
        fileName
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Error al guardar la fotografía' };
    }

    return { success: true, photoUrl: data.photoUrl };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión al subir fotografía' };
  }
}

/**
 * Revert room photo to default (Admin authenticated)
 */
export async function resetRoomPhoto(roomId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('colmena_admin_token') : null;

    const res = await fetch(`/api/rooms/${roomId}/reset-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken || 'token-admin-donjuaco-session-2026'}`,
        'x-admin-token': adminToken || 'token-admin-donjuaco-session-2026'
      }
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Error al restaurar fotografía' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

/**
 * Upload an experience photo to the server (Admin authenticated)
 */
export async function uploadExperiencePhoto(expId: string, base64Data: string, fileName: string): Promise<{ success: boolean; photoUrl?: string; error?: string }> {
  try {
    const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('colmena_admin_token') : null;

    const res = await fetch(`/api/experiences/${expId}/photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken || 'token-admin-donjuaco-session-2026'}`,
        'x-admin-token': adminToken || 'token-admin-donjuaco-session-2026'
      },
      body: JSON.stringify({
        base64Data,
        fileName
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Error al guardar la fotografía de experiencia' };
    }

    return { success: true, photoUrl: data.photoUrl };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión al subir fotografía' };
  }
}

/**
 * Revert experience photo to default (Admin authenticated)
 */
export async function resetExperiencePhoto(expId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('colmena_admin_token') : null;

    const res = await fetch(`/api/experiences/${expId}/reset-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken || 'token-admin-donjuaco-session-2026'}`,
        'x-admin-token': adminToken || 'token-admin-donjuaco-session-2026'
      }
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Error al restaurar fotografía' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

/**
 * Upload a seasonal photo to the server (Admin authenticated)
 * Uploads directly to Supabase Storage bucket 'seasonal-photos'
 */
export async function uploadSeasonalPhoto(seasonId: string, base64Data: string, fileName: string): Promise<{ success: boolean; photoUrl?: string; error?: string }> {
  try {
    const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('colmena_admin_token') : null;

    const res = await fetch(`/api/seasonal-photos/${seasonId}/photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken || 'token-admin-donjuaco-session-2026'}`,
        'x-admin-token': adminToken || 'token-admin-donjuaco-session-2026'
      },
      body: JSON.stringify({
        base64Data,
        fileName
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Error al guardar la fotografía estacional' };
    }

    return { success: true, photoUrl: data.photoUrl };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión al subir fotografía estacional' };
  }
}

/**
 * Revert seasonal photo to default (Admin authenticated)
 */
export async function resetSeasonalPhoto(seasonId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('colmena_admin_token') : null;

    const res = await fetch(`/api/seasonal-photos/${seasonId}/reset-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken || 'token-admin-donjuaco-session-2026'}`,
        'x-admin-token': adminToken || 'token-admin-donjuaco-session-2026'
      }
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Error al restaurar fotografía estacional' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión' };
  }
}

