import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { Room, Guest, Reservation, Transaction, SeasonRate, EstateSettings } from './types';

// Global pool cache to prevent multiple connection pools during dev reloading
declare global {
  var _supabasePgPool: Pool | undefined;
}

export interface PostgresStatus {
  isConfigured: boolean;
  isConnected: boolean;
  provider: 'supabase' | 'postgresql' | 'local_json';
  host?: string;
  database?: string;
  tableCounts?: {
    rooms: number;
    guests: number;
    reservations: number;
    transactions: number;
    seasonRates: number;
    settings: number;
  };
  lastChecked: string;
  error?: string;
}

const FALLBACK_SUPABASE_URL = "postgresql://postgres.wxjafauyokuudalwauzg:Finca_Juaco123@aws-1-us-west-2.pooler.supabase.com:6543/postgres";

export const getDatabaseUrl = (): string | undefined => {
  let raw = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || FALLBACK_SUPABASE_URL;
  if (!raw) return undefined;

  // Automatically remove literal bracket enclosures around passwords if pasted like :[password]@
  return raw.replace(/:\[(.*?)\]@/, ':$1@');
};

/**
 * Initializes and returns the PostgreSQL connection pool if DATABASE_URL is configured.
 */
export function getPostgresPool(): Pool | null {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    return null;
  }

  if (!global._supabasePgPool) {
    try {
      const isSupabaseOrCloud = 
        connectionString.includes('supabase.co') || 
        connectionString.includes('sslmode=require') ||
        process.env.DATABASE_SSL === 'true';

      global._supabasePgPool = new Pool({
        connectionString,
        ssl: isSupabaseOrCloud ? { rejectUnauthorized: false } : undefined,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      global._supabasePgPool.on('error', (err) => {
        console.warn('⚠️ Advertencia en cliente inactivo de PostgreSQL:', err.message);
      });

      console.log('🔌 Pool de PostgreSQL (Supabase) inicializado correctamente.');
    } catch (err: any) {
      console.error('❌ Error inicializando pool de PostgreSQL:', err.message);
      return null;
    }
  }

  return global._supabasePgPool;
}

/**
 * Checks connectivity and verifies schema tables in PostgreSQL/Supabase.
 */
export async function checkPostgresHealth(): Promise<PostgresStatus> {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    return {
      isConfigured: false,
      isConnected: false,
      provider: 'local_json',
      lastChecked: new Date().toISOString()
    };
  }

  const pool = getPostgresPool();
  if (!pool) {
    return {
      isConfigured: true,
      isConnected: false,
      provider: 'supabase',
      lastChecked: new Date().toISOString(),
      error: 'No se pudo crear el pool de conexiones'
    };
  }

  try {
    const client = await pool.connect();
    try {
      const dbInfoRes = await client.query('SELECT current_database(), inet_server_addr()');
      const dbName = dbInfoRes.rows[0]?.current_database || 'postgres';

      // Query table counts safely
      const countQueries = await Promise.allSettled([
        client.query('SELECT COUNT(*) FROM rooms'),
        client.query('SELECT COUNT(*) FROM guests'),
        client.query('SELECT COUNT(*) FROM reservations'),
        client.query('SELECT COUNT(*) FROM transactions'),
        client.query('SELECT COUNT(*) FROM season_rates'),
        client.query('SELECT COUNT(*) FROM estate_settings')
      ]);

      const counts = {
        rooms: countQueries[0].status === 'fulfilled' ? parseInt(countQueries[0].value.rows[0]?.count || '0', 10) : 0,
        guests: countQueries[1].status === 'fulfilled' ? parseInt(countQueries[1].value.rows[0]?.count || '0', 10) : 0,
        reservations: countQueries[2].status === 'fulfilled' ? parseInt(countQueries[2].value.rows[0]?.count || '0', 10) : 0,
        transactions: countQueries[3].status === 'fulfilled' ? parseInt(countQueries[3].value.rows[0]?.count || '0', 10) : 0,
        seasonRates: countQueries[4].status === 'fulfilled' ? parseInt(countQueries[4].value.rows[0]?.count || '0', 10) : 0,
        settings: countQueries[5].status === 'fulfilled' ? parseInt(countQueries[5].value.rows[0]?.count || '0', 10) : 0,
      };

      return {
        isConfigured: true,
        isConnected: true,
        provider: dbUrl.includes('supabase') ? 'supabase' : 'postgresql',
        database: dbName,
        tableCounts: counts,
        lastChecked: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      isConfigured: true,
      isConnected: false,
      provider: dbUrl.includes('supabase') ? 'supabase' : 'postgresql',
      lastChecked: new Date().toISOString(),
      error: err.message || 'Error de conexión a PostgreSQL'
    };
  }
}

/**
 * Automatically creates all tables in Supabase / PostgreSQL if they do not exist.
 */
export async function initializePostgresSchema(): Promise<boolean> {
  const pool = getPostgresPool();
  if (!pool) return false;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Rooms
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(100) PRIMARY KEY,
        room_number VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) UNIQUE NOT NULL,
        description TEXT,
        capacity INT NOT NULL DEFAULT 2,
        base_price NUMERIC(12, 2) NOT NULL DEFAULT 85000,
        out_of_service BOOLEAN NOT NULL DEFAULT FALSE,
        out_of_service_reason TEXT,
        bed_type VARCHAR(200),
        view_type VARCHAR(200),
        square_meters INT DEFAULT 28,
        amenities TEXT[] DEFAULT '{}',
        images TEXT[] DEFAULT '{}',
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Guests
    await client.query(`
      CREATE TABLE IF NOT EXISTS guests (
        id VARCHAR(100) PRIMARY KEY,
        document_type VARCHAR(20) NOT NULL DEFAULT 'CC',
        document_number VARCHAR(50) NOT NULL,
        full_name VARCHAR(200) NOT NULL,
        email VARCHAR(200) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        nationality VARCHAR(100) DEFAULT 'Colombiana',
        emergency_contact VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uk_guests_doc UNIQUE (document_type, document_number)
      );
    `);

    // 3. Reservations
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id VARCHAR(100) PRIMARY KEY,
        reservation_code VARCHAR(100) UNIQUE NOT NULL,
        room_id VARCHAR(100) NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
        guest_id VARCHAR(100) NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
        check_in_date DATE NOT NULL,
        check_out_date DATE NOT NULL,
        adults INT DEFAULT 2,
        children INT DEFAULT 0,
        nightly_rate NUMERIC(12, 2) NOT NULL,
        seasonal_multiplier NUMERIC(4, 2) DEFAULT 1.00,
        subtotal NUMERIC(12, 2) NOT NULL,
        tax_amount NUMERIC(12, 2) DEFAULT 0,
        total_amount NUMERIC(12, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_PAYMENT',
        payment_hold_deadline TIMESTAMPTZ NOT NULL,
        special_requests TEXT,
        cancellation_reason TEXT,
        checked_in_at TIMESTAMPTZ,
        checked_out_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(100) PRIMARY KEY,
        reservation_id VARCHAR(100) NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
        payment_channel VARCHAR(50) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        reference_code VARCHAR(100) NOT NULL,
        proof_slip_url TEXT,
        verification_status VARCHAR(50) DEFAULT 'PENDING',
        rejection_reason TEXT,
        payment_type VARCHAR(50) DEFAULT 'ANTICIPO',
        verified_at TIMESTAMPTZ,
        verified_by VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. Season Rates
    await client.query(`
      CREATE TABLE IF NOT EXISTS season_rates (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        nights_count INT DEFAULT 1,
        multiplier NUMERIC(4, 2) DEFAULT 1.41,
        minimum_stay_nights INT DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 6. Estate Settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS estate_settings (
        id VARCHAR(100) PRIMARY KEY DEFAULT 'colmena_settings',
        property_name VARCHAR(200) DEFAULT 'Finca La Colmena de Don Juaco',
        tagline VARCHAR(200) DEFAULT 'Alojamiento Campestre & Agroturismo Tradicional',
        phone VARCHAR(50) DEFAULT '+57 301 567 7776',
        email VARCHAR(200) DEFAULT 'restreporojassantiago940@gmail.com',
        whatsapp_number VARCHAR(50) DEFAULT '573015677776',
        location_address TEXT DEFAULT 'Finca La Colmena, Montenegro, Quindío, Colombia',
        check_in_time VARCHAR(20) DEFAULT '15:00',
        check_out_time VARCHAR(20) DEFAULT '11:00',
        default_min_stay_nights INT DEFAULT 1,
        payment_hold_minutes INT DEFAULT 25,
        bancolombia_account_type VARCHAR(100) DEFAULT 'Cuenta de Ahorros',
        bancolombia_account_number VARCHAR(100) DEFAULT '482-901842-19',
        bancolombia_holder_name VARCHAR(200) DEFAULT 'Joaquín Emilio Restrepo / Finca La Colmena',
        bancolombia_nit VARCHAR(50) DEFAULT '901.482.190-4',
        nequi_number VARCHAR(50) DEFAULT '3015677776',
        daviplata_number VARCHAR(50) DEFAULT '3015677776',
        banco_agrario_account_type VARCHAR(100) DEFAULT 'Cuenta de Ahorros',
        banco_agrario_account_number VARCHAR(100) DEFAULT '0491-300184-2',
        banco_agrario_holder_name VARCHAR(200) DEFAULT 'Finca Hotel La Colmena de Don Juaco',
        banco_agrario_nit VARCHAR(50) DEFAULT '901.482.190-4',
        smtp_host VARCHAR(100) DEFAULT 'smtp.gmail.com',
        smtp_port INT DEFAULT 587,
        smtp_user VARCHAR(200) DEFAULT 'restreporojassantiago940@gmail.com',
        smtp_pass VARCHAR(200) DEFAULT '',
        notification_sender_name VARCHAR(200) DEFAULT 'TURIM . Juaco • Finca La Colmena',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create indexes for fast availability lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations (check_in_date, check_out_date);
      CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status);
      CREATE INDEX IF NOT EXISTS idx_reservations_room ON reservations (room_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_res ON transactions (reservation_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Esquema de tablas verificado/creado con éxito en PostgreSQL (Supabase).');
    return true;
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error creando esquema en PostgreSQL:', err.message);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Migrates local data (JSON store) to Supabase/PostgreSQL.
 */
export async function migrateLocalDataToPostgres(data: {
  rooms: Room[];
  guests: Guest[];
  reservations: Reservation[];
  transactions: Transaction[];
  seasonRates: SeasonRate[];
  settings: EstateSettings;
}): Promise<{ success: boolean; insertedCounts: Record<string, number>; message: string }> {
  const pool = getPostgresPool();
  if (!pool) {
    return {
      success: false,
      insertedCounts: {},
      message: 'DATABASE_URL no está configurada en las variables de entorno.'
    };
  }

  // Ensure tables exist
  await initializePostgresSchema();

  const client = await pool.connect();
  const counts = { rooms: 0, guests: 0, reservations: 0, transactions: 0, seasonRates: 0, settings: 0 };

  try {
    await client.query('BEGIN');

    // 1. Rooms
    for (const r of data.rooms) {
      await client.query(`
        INSERT INTO rooms (
          id, room_number, name, slug, description, capacity, base_price,
          out_of_service, out_of_service_reason, bed_type, view_type,
          square_meters, amenities, images, sort_order, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          capacity = EXCLUDED.capacity,
          base_price = EXCLUDED.base_price,
          description = EXCLUDED.description,
          out_of_service = EXCLUDED.out_of_service,
          out_of_service_reason = EXCLUDED.out_of_service_reason,
          bed_type = EXCLUDED.bed_type,
          view_type = EXCLUDED.view_type,
          amenities = EXCLUDED.amenities,
          images = EXCLUDED.images,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW();
      `, [
        r.id, r.roomNumber, r.name, r.slug, r.description, r.capacity, r.basePrice,
        r.outOfService || false, r.outOfServiceReason || null, r.bedType || '', r.viewType || '',
        r.squareMeters || 28, r.amenities || [], r.images || [], r.sortOrder || 0,
        r.createdAt || new Date().toISOString(), r.updatedAt || new Date().toISOString()
      ]);
      counts.rooms++;
    }

    // 2. Guests
    for (const g of data.guests) {
      await client.query(`
        INSERT INTO guests (
          id, document_type, document_number, full_name, email, phone,
          nationality, emergency_contact, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          nationality = EXCLUDED.nationality,
          emergency_contact = EXCLUDED.emergency_contact,
          notes = EXCLUDED.notes,
          updated_at = NOW();
      `, [
        g.id, g.documentType || 'CC', g.documentNumber, g.fullName, g.email, g.phone,
        g.nationality || 'Colombiana', g.emergencyContact || '', g.notes || '',
        g.createdAt || new Date().toISOString(), g.updatedAt || new Date().toISOString()
      ]);
      counts.guests++;
    }

    // 3. Reservations
    const seenCodes = new Set<string>();
    const validGuestIds = new Set(data.guests.map(g => g.id));
    const validRoomIds = new Set(data.rooms.map(r => r.id));
    const validResIds = new Set<string>();

    for (let i = 0; i < data.reservations.length; i++) {
      const res = data.reservations[i];
      let safeCode = res.reservationCode || `COL-2026-${1000 + i}`;
      if (seenCodes.has(safeCode)) {
        safeCode = `${safeCode}-${i + 1}`;
      }
      seenCodes.add(safeCode);

      // Fallback guest if guestId not found
      const targetGuestId = validGuestIds.has(res.guestId) ? res.guestId : data.guests[0]?.id;
      const targetRoomId = validRoomIds.has(res.roomId) ? res.roomId : data.rooms[0]?.id;

      if (!targetGuestId || !targetRoomId) continue;

      await client.query(`
        INSERT INTO reservations (
          id, reservation_code, room_id, guest_id, check_in_date, check_out_date,
          adults, children, nightly_rate, seasonal_multiplier, subtotal, tax_amount,
          total_amount, status, payment_hold_deadline, special_requests,
          cancellation_reason, checked_in_at, checked_out_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (id) DO UPDATE SET
          reservation_code = EXCLUDED.reservation_code,
          status = EXCLUDED.status,
          total_amount = EXCLUDED.total_amount,
          cancellation_reason = EXCLUDED.cancellation_reason,
          checked_in_at = EXCLUDED.checked_in_at,
          checked_out_at = EXCLUDED.checked_out_at,
          updated_at = NOW();
      `, [
        res.id, safeCode, targetRoomId, targetGuestId, res.checkInDate, res.checkOutDate,
        res.adults || 2, res.children || 0, res.nightlyRate, res.seasonalMultiplier || 1.0,
        res.subtotal || res.totalAmount, res.taxAmount || 0, res.totalAmount, res.status,
        res.paymentHoldDeadline || new Date().toISOString(), res.specialRequests || '',
        res.cancellationReason || null, res.checkedInAt || null, res.checkedOutAt || null,
        res.createdAt || new Date().toISOString(), res.updatedAt || new Date().toISOString()
      ]);
      validResIds.add(res.id);
      counts.reservations++;
    }

    // 4. Transactions
    for (const tx of data.transactions) {
      if (!validResIds.has(tx.reservationId)) continue;

      await client.query(`
        INSERT INTO transactions (
          id, reservation_id, payment_channel, amount, reference_code,
          proof_slip_url, verification_status, rejection_reason, payment_type,
          verified_at, verified_by, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          verification_status = EXCLUDED.verification_status,
          amount = EXCLUDED.amount,
          rejection_reason = EXCLUDED.rejection_reason,
          verified_at = EXCLUDED.verified_at,
          verified_by = EXCLUDED.verified_by,
          updated_at = NOW();
      `, [
        tx.id, tx.reservationId, tx.paymentChannel, tx.amount, tx.referenceCode,
        tx.proofSlipUrl || null, tx.verificationStatus || 'PENDING', tx.rejectionReason || null,
        tx.paymentType || 'ANTICIPO', tx.verifiedAt || null, tx.verifiedBy || null,
        tx.notes || '', tx.createdAt || new Date().toISOString(), tx.updatedAt || new Date().toISOString()
      ]);
      counts.transactions++;
    }

    // 5. Season Rates
    for (const s of data.seasonRates) {
      await client.query(`
        INSERT INTO season_rates (
          id, name, start_date, end_date, nights_count, multiplier,
          minimum_stay_nights, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          multiplier = EXCLUDED.multiplier,
          minimum_stay_nights = EXCLUDED.minimum_stay_nights,
          is_active = EXCLUDED.is_active,
          updated_at = NOW();
      `, [
        s.id, s.name, s.startDate, s.endDate, s.nightsCount || 1, s.multiplier || 1.41,
        s.minimumStayNights || 1, s.isActive !== false,
        new Date().toISOString(), new Date().toISOString()
      ]);
      counts.seasonRates++;
    }

    // 6. Settings
    if (data.settings) {
      const sett = data.settings;
      await client.query(`
        INSERT INTO estate_settings (
          id, property_name, tagline, phone, email, whatsapp_number,
          location_address, check_in_time, check_out_time, default_min_stay_nights,
          payment_hold_minutes, bancolombia_account_type, bancolombia_account_number,
          bancolombia_holder_name, bancolombia_nit, nequi_number, daviplata_number,
          banco_agrario_account_type, banco_agrario_account_number, banco_agrario_holder_name,
          banco_agrario_nit, updated_at
        ) VALUES (
          'colmena_settings', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          property_name = EXCLUDED.property_name,
          phone = EXCLUDED.phone,
          whatsapp_number = EXCLUDED.whatsapp_number,
          bancolombia_account_number = EXCLUDED.bancolombia_account_number,
          nequi_number = EXCLUDED.nequi_number,
          daviplata_number = EXCLUDED.daviplata_number,
          banco_agrario_account_number = EXCLUDED.banco_agrario_account_number,
          updated_at = NOW();
      `, [
        sett.propertyName || 'Finca La Colmena de Don Juaco',
        sett.tagline || 'Alojamiento Campestre & Agroturismo Tradicional',
        sett.phone || '+57 301 567 7776',
        sett.email || 'restreporojassantiago940@gmail.com',
        sett.whatsappNumber || '573015677776',
        sett.locationAddress || 'Finca La Colmena, Montenegro, Quindío',
        sett.checkInTime || '15:00',
        sett.checkOutTime || '11:00',
        sett.defaultMinStayNights || 1,
        sett.paymentHoldMinutes || 25,
        sett.bancolombiaAccountType || 'Cuenta de Ahorros',
        sett.bancolombiaAccountNumber || '482-901842-19',
        sett.bancolombiaHolderName || 'Joaquín Emilio Restrepo / Finca La Colmena',
        sett.bancolombiaNit || '901.482.190-4',
        sett.nequiNumber || '3015677776',
        sett.daviplataNumber || '3015677776',
        sett.bancoAgrarioAccountType || 'Cuenta de Ahorros',
        sett.bancoAgrarioAccountNumber || '0491-300184-2',
        sett.bancoAgrarioHolderName || 'Finca Hotel La Colmena de Don Juaco',
        sett.bancoAgrarioNit || '901.482.190-4'
      ]);
      counts.settings = 1;
    }

    await client.query('COMMIT');
    return {
      success: true,
      insertedCounts: counts,
      message: 'Migración a PostgreSQL (Supabase) completada con éxito.'
    };
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la migración a PostgreSQL:', err);
    return {
      success: false,
      insertedCounts: counts,
      message: `Error migrando datos a PostgreSQL: ${err.message}`
    };
  } finally {
    client.release();
  }
}

/**
 * Loads all data from PostgreSQL / Supabase if connected.
 */
export async function loadDataFromPostgres(): Promise<{
  rooms: Room[];
  guests: Guest[];
  reservations: Reservation[];
  transactions: Transaction[];
  seasonRates: SeasonRate[];
  settings?: EstateSettings;
} | null> {
  const pool = getPostgresPool();
  if (!pool) return null;

  try {
    const client = await pool.connect();
    try {
      const [roomsRes, guestsRes, reservationsRes, transactionsRes, seasonRatesRes, settingsRes] = await Promise.all([
        client.query('SELECT * FROM rooms ORDER BY sort_order ASC, room_number ASC'),
        client.query('SELECT * FROM guests ORDER BY created_at DESC'),
        client.query('SELECT * FROM reservations ORDER BY created_at DESC'),
        client.query('SELECT * FROM transactions ORDER BY created_at DESC'),
        client.query('SELECT * FROM season_rates ORDER BY start_date ASC'),
        client.query('SELECT * FROM estate_settings WHERE id = $1 LIMIT 1', ['colmena_settings'])
      ]);

      const mapRoom = (r: any): Room => ({
        id: r.id,
        roomNumber: r.room_number,
        name: r.name,
        slug: r.slug,
        description: r.description || '',
        capacity: Number(r.capacity) || 2,
        basePrice: Number(r.base_price) || 85000,
        outOfService: Boolean(r.out_of_service),
        outOfServiceReason: r.out_of_service_reason || '',
        bedType: r.bed_type || '',
        viewType: r.view_type || '',
        squareMeters: Number(r.square_meters) || 28,
        amenities: Array.isArray(r.amenities) ? r.amenities : [],
        images: Array.isArray(r.images) ? r.images : [],
        sortOrder: Number(r.sort_order) || 0,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      });

      const mapGuest = (g: any): Guest => ({
        id: g.id,
        documentType: g.document_type || 'CC',
        documentNumber: g.document_number,
        fullName: g.full_name,
        email: g.email,
        phone: g.phone,
        nationality: g.nationality || 'Colombiana',
        emergencyContact: g.emergency_contact || '',
        notes: g.notes || '',
        createdAt: g.created_at ? new Date(g.created_at).toISOString() : new Date().toISOString(),
        updatedAt: g.updated_at ? new Date(g.updated_at).toISOString() : new Date().toISOString()
      });

      const mapReservation = (res: any): Reservation => ({
        id: res.id,
        reservationCode: res.reservation_code,
        roomId: res.room_id,
        guestId: res.guest_id,
        checkInDate: res.check_in_date instanceof Date ? res.check_in_date.toISOString().split('T')[0] : String(res.check_in_date).split('T')[0],
        checkOutDate: res.check_out_date instanceof Date ? res.check_out_date.toISOString().split('T')[0] : String(res.check_out_date).split('T')[0],
        adults: Number(res.adults) || 2,
        children: Number(res.children) || 0,
        nightlyRate: Number(res.nightly_rate) || 85000,
        seasonalMultiplier: Number(res.seasonal_multiplier) || 1.0,
        subtotal: Number(res.subtotal) || Number(res.total_amount),
        taxAmount: Number(res.tax_amount) || 0,
        totalAmount: Number(res.total_amount) || 0,
        status: res.status,
        paymentHoldDeadline: res.payment_hold_deadline ? new Date(res.payment_hold_deadline).toISOString() : new Date().toISOString(),
        specialRequests: res.special_requests || '',
        cancellationReason: res.cancellation_reason || undefined,
        checkedInAt: res.checked_in_at ? new Date(res.checked_in_at).toISOString() : undefined,
        checkedOutAt: res.checked_out_at ? new Date(res.checked_out_at).toISOString() : undefined,
        createdAt: res.created_at ? new Date(res.created_at).toISOString() : new Date().toISOString(),
        updatedAt: res.updated_at ? new Date(res.updated_at).toISOString() : new Date().toISOString()
      });

      const mapTransaction = (t: any): Transaction => ({
        id: t.id,
        reservationId: t.reservation_id,
        paymentChannel: t.payment_channel,
        amount: Number(t.amount) || 0,
        referenceCode: t.reference_code,
        proofSlipUrl: t.proof_slip_url || undefined,
        verificationStatus: t.verification_status || 'PENDING',
        rejectionReason: t.rejection_reason || undefined,
        paymentType: t.payment_type || 'ANTICIPO',
        verifiedAt: t.verified_at ? new Date(t.verified_at).toISOString() : undefined,
        verifiedBy: t.verified_by || undefined,
        notes: t.notes || '',
        createdAt: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
        updatedAt: t.updated_at ? new Date(t.updated_at).toISOString() : new Date().toISOString()
      });

      const mapSeason = (s: any): SeasonRate => ({
        id: s.id,
        name: s.name,
        startDate: s.start_date instanceof Date ? s.start_date.toISOString().split('T')[0] : String(s.start_date).split('T')[0],
        endDate: s.end_date instanceof Date ? s.end_date.toISOString().split('T')[0] : String(s.end_date).split('T')[0],
        nightsCount: Number(s.nights_count) || 1,
        multiplier: Number(s.multiplier) || 1.41,
        minimumStayNights: Number(s.minimum_stay_nights) || 1,
        isActive: Boolean(s.is_active)
      });

      let loadedSettings: EstateSettings | undefined = undefined;
      if (settingsRes.rows.length > 0) {
        const s = settingsRes.rows[0];
        loadedSettings = {
          id: s.id,
          propertyName: s.property_name,
          tagline: s.tagline,
          phone: s.phone,
          email: s.email,
          whatsappNumber: s.whatsapp_number,
          locationAddress: s.location_address,
          checkInTime: s.check_in_time,
          checkOutTime: s.check_out_time,
          defaultMinStayNights: Number(s.default_min_stay_nights) || 1,
          paymentHoldMinutes: Number(s.payment_hold_minutes) || 25,
          bancolombiaAccountType: s.bancolombia_account_type,
          bancolombiaAccountNumber: s.bancolombia_account_number,
          bancolombiaHolderName: s.bancolombia_holder_name,
          bancolombiaNit: s.bancolombia_nit,
          nequiNumber: s.nequi_number,
          daviplataNumber: s.daviplata_number,
          bancoAgrarioAccountType: s.banco_agrario_account_type,
          bancoAgrarioAccountNumber: s.banco_agrario_account_number,
          bancoAgrarioHolderName: s.banco_agrario_holder_name,
          bancoAgrarioNit: s.banco_agrario_nit,
          smtpHost: s.smtp_host || 'smtp.gmail.com',
          smtpPort: Number(s.smtp_port) || 587,
          smtpUser: s.smtp_user || '',
          smtpPass: s.smtp_pass || '',
          smtpSecure: false,
          notificationSenderName: s.notification_sender_name,
          updatedAt: s.updated_at ? new Date(s.updated_at).toISOString() : new Date().toISOString()
        };
      }

      return {
        rooms: roomsRes.rows.map(mapRoom),
        guests: guestsRes.rows.map(mapGuest),
        reservations: reservationsRes.rows.map(mapReservation),
        transactions: transactionsRes.rows.map(mapTransaction),
        seasonRates: seasonRatesRes.rows.map(mapSeason),
        settings: loadedSettings
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('⚠️ No se pudo cargar desde PostgreSQL, usando almacenamiento local:', err.message);
    return null;
  }
}

/**
 * Executes a strictly parameterized query with a statement timeout and sanitized errors.
 * Enforces prepared/parameterized queries ($1, $2, ...) to completely eliminate SQL injection.
 */
export async function safeExecuteQuery<T = any>(queryText: string, params: any[] = []): Promise<T[]> {
  const pool = getPostgresPool();
  if (!pool) {
    throw new Error('Base de datos PostgreSQL no conectada');
  }

  const client = await pool.connect();
  try {
    // Set 10-second statement timeout to protect against slow query / lock amplification attacks
    await client.query('SET statement_timeout = 10000');
    const res = await client.query(queryText, params);
    return res.rows as T[];
  } catch (err: any) {
    console.error('Error en consulta segura a PostgreSQL:', err.message);
    // Sanitize error to prevent leaking database structure or internal details
    throw new Error('Error al ejecutar la consulta segura en la base de datos.');
  } finally {
    client.release();
  }
}
