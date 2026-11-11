import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const DEFAULT_SUPABASE_PROJECT_REF = 'wxjafauyokuudalwauzg';
const DEFAULT_SUPABASE_URL = `https://${DEFAULT_SUPABASE_PROJECT_REF}.supabase.co`;
const FALLBACK_SUPABASE_KEY = 'sb_publishable_y8ndcvVFZ-_7nebyjgSEkA_IiHVPOYf';

let supabaseClient: SupabaseClient | null = null;

/**
 * Returns or initializes the Supabase client for Storage operations.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_KEY || 
    process.env.SUPABASE_ANON_KEY ||
    FALLBACK_SUPABASE_KEY;

  if (!key) {
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });
      console.log('📦 Cliente de Supabase Storage inicializado correctamente.');
    } catch (err: any) {
      console.warn('⚠️ No se pudo inicializar cliente de Supabase Storage:', err.message);
      return null;
    }
  }

  return supabaseClient;
}

/**
 * Uploads a file buffer directly to a Supabase Storage bucket ('vouchers' or 'rooms').
 * Returns the public CDN URL if successful.
 */
export async function uploadToSupabaseStorage(
  bucket: 'vouchers' | 'rooms' | 'experiences',
  fileName: string,
  buffer: Buffer,
  contentType: string = 'image/jpeg'
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: 'SUPABASE_KEY o SUPABASE_ANON_KEY no configurada en las variables de entorno.'
      };
    }

    // Clean safe filename
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(cleanFileName, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.warn(`⚠️ Error subiendo archivo a Supabase Storage (${bucket}):`, error.message);
      return { success: false, error: error.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    console.log(`✅ Archivo subido con éxito a Supabase Storage [${bucket}]: ${publicUrlData.publicUrl}`);

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl
    };
  } catch (err: any) {
    console.error('❌ Excepción al subir a Supabase Storage:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Health check for Supabase Storage buckets.
 */
export async function checkStorageHealth(): Promise<{
  isConfigured: boolean;
  projectUrl: string;
  bucketsAvailable: string[];
  error?: string;
}> {
  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      isConfigured: false,
      projectUrl: url,
      bucketsAvailable: [],
      error: 'Clave de API de Supabase (SUPABASE_KEY o SUPABASE_ANON_KEY) no definida en .env'
    };
  }

  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      return {
        isConfigured: true,
        projectUrl: url,
        bucketsAvailable: [],
        error: error.message
      };
    }

    const bucketNames = (data || []).map(b => b.name);
    return {
      isConfigured: true,
      projectUrl: url,
      bucketsAvailable: bucketNames
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      projectUrl: url,
      bucketsAvailable: [],
      error: err.message
    };
  }
}
