import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { 
  rooms, 
  guests, 
  reservations, 
  transactions, 
  seasonRates, 
  settings, 
  chatDecisionTree,
  isRoomAvailable,
  calculateSeasonalMultiplier,
  validateStateTransition,
  saveDatabase,
  syncWithPostgres
} from './server/db';
import { checkPostgresHealth, migrateLocalDataToPostgres } from './server/postgres';
import { uploadToSupabaseStorage, checkStorageHealth } from './server/supabaseStorage';
import { generateAgrotourismAdvice } from './server/gemini';
import { 
  sendBookingConfirmationNotification, 
  sendPreArrivalReminderNotification, 
  checkAndSendPreArrivalReminders,
  sendTestEmailNotification,
  getTransporter
} from './server/notifications';
import { Reservation, Guest, Transaction, ReservationStatus, PaymentChannel, VerificationStatus, SeasonRate } from './server/types';
import { sqlInjectionProtection } from './server/security';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global SQL Injection Defense & Input Sanitization Firewall
app.use(sqlInjectionProtection);

// Directories for persistent image and payment voucher storage
const publicRoomsDir = path.join(process.cwd(), 'public', 'rooms');
const dataPhotosDir = path.join(process.cwd(), 'data', 'photos');
const publicVouchersDir = path.join(process.cwd(), 'public', 'vouchers');
const dataVouchersDir = path.join(process.cwd(), 'data', 'vouchers');
const localUploadsHabitacionesDir = path.join(process.cwd(), 'static', 'uploads', 'habitaciones');
const rootUploadsHabitacionesDir = '/static/uploads/habitaciones';

[publicRoomsDir, dataPhotosDir, publicVouchersDir, dataVouchersDir, localUploadsHabitacionesDir, rootUploadsHabitacionesDir].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    // Ignore permissions if root path fails
  }
});

// Photo serving middleware that checks public/rooms, data/photos and dist/rooms
app.get('/rooms/:filename', (req: Request, res: Response, next) => {
  const filename = path.basename(req.params.filename);
  const pathsToCheck = [
    path.join(publicRoomsDir, filename),
    path.join(dataPhotosDir, filename),
    path.join(process.cwd(), 'dist', 'rooms', filename)
  ];
  for (const p of pathsToCheck) {
    if (fs.existsSync(p)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(p);
    }
  }
  next();
});

app.use('/rooms', express.static(publicRoomsDir, {
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

// Payment voucher serving middleware that checks public/vouchers, data/vouchers and dist/vouchers
app.get('/vouchers/:filename', (req: Request, res: Response, next) => {
  const filename = path.basename(req.params.filename);
  const pathsToCheck = [
    path.join(publicVouchersDir, filename),
    path.join(dataVouchersDir, filename),
    path.join(process.cwd(), 'dist', 'vouchers', filename)
  ];
  for (const p of pathsToCheck) {
    if (fs.existsSync(p)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(p);
    }
  }
  next();
});

app.use('/vouchers', express.static(publicVouchersDir, {
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

// Permanent experience images serving that checks public/experiences, dist/experiences, and src/assets/images
const publicExperiencesDir = path.join(process.cwd(), 'public', 'experiences');
const distExperiencesDir = path.join(process.cwd(), 'dist', 'experiences');
const assetsImagesDir = path.join(process.cwd(), 'src', 'assets', 'images');

app.get('/experiences/:filename', (req: Request, res: Response, next) => {
  const filename = path.basename(req.params.filename);
  const pathsToCheck = [
    path.join(publicExperiencesDir, filename),
    path.join(distExperiencesDir, filename),
    path.join(assetsImagesDir, filename)
  ];
  for (const p of pathsToCheck) {
    if (fs.existsSync(p)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(p);
    }
  }
  next();
});

app.use('/experiences', express.static(publicExperiencesDir));

// Static files middleware for room uploads: /static/uploads/habitaciones
app.get('/static/uploads/habitaciones/:filename', (req: Request, res: Response, next) => {
  const filename = path.basename(req.params.filename);
  const pathsToCheck = [
    path.join(localUploadsHabitacionesDir, filename),
    path.join(rootUploadsHabitacionesDir, filename),
    path.join(process.cwd(), 'dist', 'static', 'uploads', 'habitaciones', filename)
  ];
  for (const p of pathsToCheck) {
    if (fs.existsSync(p)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(p);
    }
  }
  next();
});

app.use('/static', express.static(path.join(process.cwd(), 'static')));
if (fs.existsSync('/static')) {
  app.use('/static', express.static('/static'));
}

const ADMIN_TOKEN_SECRET = 'token-admin-donjuaco-session-2026';

/**
 * Middleware/helper to verify that the request is from an authenticated administrator
 */
function isAuthorizedAdmin(req: Request): boolean {
  const token = 
    req.headers['x-admin-token'] || 
    (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : null) ||
    req.body?.adminToken ||
    req.query?.adminToken;

  return token === ADMIN_TOKEN_SECRET;
}

app.get('/api/admin/verify-token', (req: Request, res: Response) => {
  if (isAuthorizedAdmin(req)) {
    return res.json({ valid: true, timestamp: Date.now() });
  }
  return res.status(401).json({ valid: false, error: 'Token no autorizado o expirado' });
});

// ========================================================
// 0. DATABASE & SUPABASE POSTGRESQL CONNECTIVITY ENDPOINTS
// ========================================================

/**
 * GET /api/database/status
 * Returns connection health, whether connected to Supabase/Postgres or local JSON fallback,
 * along with table row counts and configuration advice.
 */
app.get('/api/database/status', async (req: Request, res: Response) => {
  try {
    const health = await checkPostgresHealth();
    return res.json({
      success: true,
      health,
      localCounts: {
        rooms: rooms.length,
        guests: guests.length,
        reservations: reservations.length,
        transactions: transactions.length,
        seasonRates: seasonRates.length,
      },
      instructions: !health.isConfigured ? {
        message: 'Para conectar a Supabase directamente por PostgreSQL, agrega tu DATABASE_URL en el archivo .env',
        example: 'DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"'
      } : undefined
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error verificando estado de la base de datos' });
  }
});

/**
 * POST /api/database/migrate
 * Allows an authorized admin to force a full data sync from local storage to Supabase PostgreSQL.
 */
app.post('/api/database/migrate', async (req: Request, res: Response) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ error: 'Acceso no autorizado: Se requiere token de administrador.' });
    }

    const result = await migrateLocalDataToPostgres({
      rooms,
      guests,
      reservations,
      transactions,
      seasonRates,
      settings
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error ejecutando migración a PostgreSQL' });
  }
});

/**
 * POST /api/database/sync
 * Re-triggers connection attempt and live synchronization with Supabase PostgreSQL.
 */
app.post('/api/database/sync', async (req: Request, res: Response) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ error: 'Acceso no autorizado: Se requiere token de administrador.' });
    }

    const result = await syncWithPostgres();
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error sincronizando con PostgreSQL' });
  }
});

/**
 * GET /api/storage/status
 * Returns connection and bucket status for Supabase Storage (vouchers and rooms).
 */
app.get('/api/storage/status', async (req: Request, res: Response) => {
  try {
    const health = await checkStorageHealth();
    return res.json({
      success: true,
      storage: health,
      buckets: {
        vouchers: 'vouchers',
        rooms: 'rooms'
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error verificando Supabase Storage' });
  }
});

// ========================================================
// 1. AVAILABILITY & RATES ENDPOINTS
// ========================================================

/**
 * POST /api/availability
 * Checks room availability for date range and guest count;
 * Applies seasonal multipliers and minimum stay rules.
 */
app.post('/api/availability', (req: Request, res: Response) => {
  try {
    const { checkInDate, checkOutDate, guestCount = 2 } = req.body;

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({ error: 'checkInDate y checkOutDate son requeridos (YYYY-MM-DD).' });
    }

    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);
    const diffTime = outDate.getTime() - inDate.getTime();
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      return res.status(400).json({ error: 'La fecha de salida debe ser posterior a la fecha de llegada.' });
    }

    const { multiplier, appliedSeason } = calculateSeasonalMultiplier(checkInDate, checkOutDate);
    const minNightsRequired = appliedSeason?.minimumStayNights || settings.defaultMinStayNights || 1;

    const guestParam = req.body.guests || req.body.guestCount;
    const guestCountNum = guestParam ? Number(guestParam) : null;

    const availableRooms = rooms
      .filter(room => !room.outOfService)
      .filter(room => (guestCountNum !== null && guestCountNum > 0 ? room.capacity === guestCountNum : true))
      .filter(room => isRoomAvailable(room.id, checkInDate, checkOutDate))
      .map(room => {
        const nightlyRate = Math.round(room.basePrice * multiplier);
        const totalAmount = nightlyRate * nights;
        return {
          ...room,
          calculatedNightlyRate: nightlyRate,
          totalAmount,
          nights,
          multiplier,
          seasonalRuleApplied: appliedSeason ? appliedSeason.name : null,
          meetsMinStay: nights >= minNightsRequired,
          minStayRequired: minNightsRequired
        };
      });

    return res.json({
      checkInDate,
      checkOutDate,
      nights,
      guestCount: Number(guestCount),
      seasonalMultiplier: multiplier,
      appliedSeason: appliedSeason || null,
      availableCount: availableRooms.length,
      availableRooms,
      rooms: availableRooms
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error calculando disponibilidad' });
  }
});

app.get('/api/availability', (req: Request, res: Response) => {
  try {
    const checkInDate = (req.query.checkInDate as string) || '';
    const checkOutDate = (req.query.checkOutDate as string) || '';
    const guestParam = req.query.guests || req.query.guestCount;
    const guestCount = guestParam ? Number(guestParam) : null;

    if (!checkInDate || !checkOutDate) {
      return res.json({
        availableRooms: rooms.filter(r => !r.outOfService),
        seasonalMultiplier: 1.0,
        appliedSeason: null
      });
    }

    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);
    const diffTime = outDate.getTime() - inDate.getTime();
    const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const { multiplier, appliedSeason } = calculateSeasonalMultiplier(checkInDate, checkOutDate);
    const minNightsRequired = appliedSeason?.minimumStayNights || settings.defaultMinStayNights || 1;

    let filteredRooms = rooms.filter(room => !room.outOfService);

    // Exact capacity matching requirement
    if (guestCount !== null && guestCount > 0) {
      filteredRooms = filteredRooms.filter(room => room.capacity === guestCount);
    }

    // Availability in selected date range
    filteredRooms = filteredRooms.filter(room => isRoomAvailable(room.id, checkInDate, checkOutDate));

    const availableRooms = filteredRooms.map(room => {
      const nightlyRate = Math.round(room.basePrice * multiplier);
      const totalAmount = nightlyRate * nights;
      return {
        ...room,
        calculatedNightlyRate: nightlyRate,
        totalAmount,
        nights,
        multiplier,
        seasonalRuleApplied: appliedSeason ? appliedSeason.name : null,
        meetsMinStay: nights >= minNightsRequired,
        minStayRequired: minNightsRequired
      };
    });

    return res.json({
      checkInDate,
      checkOutDate,
      nights,
      guestCount,
      seasonalMultiplier: multiplier,
      activeSeason: appliedSeason || null,
      appliedSeason: appliedSeason || null,
      availableCount: availableRooms.length,
      availableRooms,
      rooms: availableRooms
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error en disponibilidad' });
  }
});

/**
 * GET /api/rooms/:id/availability
 * Live endpoint to check if a specific room is available for given dates.
 */
app.get('/api/rooms/:id/availability', (req: Request, res: Response) => {
  try {
    const roomId = req.params.id;
    const checkInDate = (req.query.checkInDate as string) || '';
    const checkOutDate = (req.query.checkOutDate as string) || '';

    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      return res.status(404).json({ error: 'Cabaña no encontrada.' });
    }

    if (room.outOfService) {
      return res.json({
        available: false,
        reason: room.outOfServiceReason || 'Esta cabaña se encuentra temporalmente fuera de servicio por mantenimiento.',
        room
      });
    }

    if (!checkInDate || !checkOutDate) {
      return res.json({
        available: true,
        room
      });
    }

    const available = isRoomAvailable(roomId, checkInDate, checkOutDate);
    return res.json({
      available,
      reason: available ? null : 'La cabaña ya se encuentra reservada u ocupada en las fechas solicitadas.',
      room,
      checkInDate,
      checkOutDate
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error verificando disponibilidad' });
  }
});

// ========================================================
// 2. RESERVATIONS ENDPOINTS (STATE MACHINE)
// ========================================================

/**
 * POST /api/reservations
 * Creates a new reservation in PENDING_PAYMENT state with 25-min hold.
 */
app.post('/api/reservations', async (req: Request, res: Response) => {
  try {
    const { 
      roomId, 
      checkInDate, 
      checkOutDate, 
      adults = 2, 
      children = 0, 
      guestData,
      specialRequests 
    } = req.body;

    if (!roomId || !checkInDate || !checkOutDate || !guestData) {
      return res.status(400).json({ error: 'Datos incompletos de reserva o huésped.' });
    }

    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      return res.status(404).json({ error: 'Cabaña no encontrada.' });
    }

    if (room.outOfService) {
      return res.status(400).json({ error: 'Esta cabaña está fuera de servicio por mantenimiento.' });
    }

    if (!isRoomAvailable(roomId, checkInDate, checkOutDate)) {
      return res.status(409).json({ error: 'La cabaña seleccionada ya no está disponible en las fechas solicitadas.' });
    }

    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);
    const nights = Math.max(1, Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));

    const { multiplier, appliedSeason } = calculateSeasonalMultiplier(checkInDate, checkOutDate);
    const minNightsRequired = appliedSeason?.minimumStayNights || settings.defaultMinStayNights || 1;
    if (nights < minNightsRequired) {
      return res.status(400).json({
        error: `Para las fechas seleccionadas (${appliedSeason ? appliedSeason.name : 'estancia regular'}), la reserva requiere un mínimo de ${minNightsRequired} ${minNightsRequired === 1 ? 'noche' : 'noches'} (has seleccionado ${nights}).`
      });
    }
    const nightlyRate = Math.round(room.basePrice * multiplier);
    const totalAmount = nightlyRate * nights;

    // Validate guestData
    if (!guestData) {
      return res.status(400).json({ error: 'Faltan los datos del huésped para la reserva.' });
    }

    const docType = guestData.documentType || 'CC';
    const cleanDocNum = String(guestData.documentNumber || '').trim().replace(/\D/g, '');
    const cleanFullName = (guestData.fullName || '').trim();
    const cleanEmail = (guestData.email || '').trim().toLowerCase();
    const cleanPhoneDigits = String(guestData.phone || '').trim().replace(/\D/g, '');

    // 1. Validate Document Number (strict 10 digits for CC/TI/CE)
    if (docType === 'CC' || docType === 'TI' || docType === 'CE') {
      if (cleanDocNum.length !== 10) {
        return res.status(400).json({ 
          error: `El número de documento (${docType}) debe contener exactamente 10 dígitos numéricos (has enviado ${cleanDocNum.length}).` 
        });
      }
    } else if (docType === 'PASSPORT') {
      const rawPassport = String(guestData.documentNumber || '').trim();
      if (rawPassport.length < 6 || rawPassport.length > 15) {
        return res.status(400).json({ error: 'El número de pasaporte debe tener entre 6 y 15 caracteres.' });
      }
    }

    // 2. Validate Full Name (letters and spaces, at least 2 words)
    const nameWords = cleanFullName.split(/\s+/).filter((w: string) => w.length > 0);
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]{3,}$/.test(cleanFullName) || nameWords.length < 2) {
      return res.status(400).json({ 
        error: 'El nombre completo debe incluir nombre y apellido (solo letras y espacios, sin números).' 
      });
    }

    // 3. Validate Email Format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'El correo electrónico ingresado no tiene un formato válido.' });
    }

    // 4. Validate Phone Number (10 digits)
    const phoneTenDigits = (cleanPhoneDigits.length === 12 && cleanPhoneDigits.startsWith('57'))
      ? cleanPhoneDigits.slice(2)
      : cleanPhoneDigits;

    if (phoneTenDigits.length !== 10) {
      return res.status(400).json({ 
        error: `El número celular debe contener exactamente 10 dígitos (has enviado ${phoneTenDigits.length}).` 
      });
    }

    const cleanPhone = String(guestData.phone || '').trim();
    const finalDocNum = docType === 'PASSPORT' ? String(guestData.documentNumber || '').trim() : cleanDocNum;

    // Find or create guest
    let guest = guests.find(g => 
      g.documentNumber === finalDocNum && 
      g.documentType === (guestData.documentType || 'CC')
    );

    if (!guest) {
      guest = {
        id: `guest-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        documentType: guestData.documentType || 'CC',
        documentNumber: finalDocNum,
        fullName: cleanFullName,
        email: cleanEmail,
        phone: cleanPhone,
        nationality: guestData.nationality || 'Colombiana',
        emergencyContact: guestData.emergencyContact || '',
        notes: guestData.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      guests.push(guest);
    } else {
      // Update guest details unconditionally with newest form input
      guest.fullName = cleanFullName || guest.fullName;
      guest.email = cleanEmail || guest.email;
      guest.phone = cleanPhone || guest.phone;
      guest.updatedAt = new Date().toISOString();
    }

    // Reservation code
    const codeSuffix = Math.floor(1000 + Math.random() * 9000);
    const reservationCode = `COL-${new Date().getFullYear()}-${codeSuffix}`;

    const holdMinutes = settings.paymentHoldMinutes || 25;
    const paymentHoldDeadline = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString();

    const newReservation: Reservation = {
      id: `res-${Date.now()}`,
      reservationCode,
      roomId,
      guestId: guest.id,
      checkInDate,
      checkOutDate,
      adults: Number(adults),
      children: Number(children),
      nightlyRate,
      seasonalMultiplier: multiplier,
      subtotal: totalAmount,
      taxAmount: 0,
      totalAmount,
      status: 'PENDING_PAYMENT',
      paymentHoldDeadline,
      specialRequests: specialRequests || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const initialAdvance = Math.round(totalAmount * 0.5);
    const initialTx: Transaction = {
      id: `tx-init-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      reservationId: newReservation.id,
      paymentChannel: 'BANCOLOMBIA_TRANSFER',
      amount: initialAdvance,
      referenceCode: `PEND-${reservationCode}`,
      verificationStatus: 'PENDING',
      paymentType: 'ANTICIPO',
      notes: 'Anticipo inicial sugerido del 50% para retención de cabaña',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    transactions.unshift(initialTx);
    reservations.unshift(newReservation);
    saveDatabase();

    // Trigger automated email and WhatsApp confirmation notification
    let notificationResult = { emailSent: false, whatsappUrl: '', whatsappMessage: '' };
    try {
      notificationResult = await sendBookingConfirmationNotification(newReservation, room, guest, settings);
    } catch (notifErr) {
      console.warn('Error enviando notificación automática:', notifErr);
    }

    return res.status(201).json({
      success: true,
      reservation: {
        ...newReservation,
        room,
        guest,
        transactions: [initialTx]
      },
      notification: notificationResult,
      bankDetails: {
        bancolombia: {
          accountType: settings.bancolombiaAccountType,
          accountNumber: settings.bancolombiaAccountNumber,
          holderName: settings.bancolombiaHolderName,
          nit: settings.bancolombiaNit
        },
        bancoAgrario: {
          accountType: settings.bancoAgrarioAccountType || 'Cuenta de Ahorros',
          accountNumber: settings.bancoAgrarioAccountNumber || '0491-300184-2',
          holderName: settings.bancoAgrarioHolderName || 'Finca Hotel La Colmena de Don Juaco',
          nit: settings.bancoAgrarioNit || '901.482.190-4'
        },
        nequi: settings.nequiNumber,
        daviplata: settings.daviplataNumber,
        holdMinutes
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error creando la reserva' });
  }
});

/**
 * GET /api/reservations
 * List reservations with filters (status, date range, search)
 */
app.get('/api/reservations', (req: Request, res: Response) => {
  try {
    const { status, search, from, to } = req.query;

    let result = reservations.map(resItem => {
      const room = rooms.find(r => r.id === resItem.roomId);
      const guest = guests.find(g => g.id === resItem.guestId);
      const txs = transactions.filter(t => t.reservationId === resItem.id);
      return {
        ...resItem,
        room,
        guest,
        transactions: txs
      };
    });

    if (status && status !== 'ALL') {
      result = result.filter(r => r.status === status);
    }

    if (search) {
      const term = String(search).toLowerCase();
      result = result.filter(r => 
        r.reservationCode.toLowerCase().includes(term) ||
        (r.guest && r.guest.fullName.toLowerCase().includes(term)) ||
        (r.guest && r.guest.documentNumber.toLowerCase().includes(term)) ||
        (r.room && r.room.name.toLowerCase().includes(term))
      );
    }

    if (from) {
      result = result.filter(r => r.checkInDate >= String(from));
    }
    if (to) {
      result = result.filter(r => r.checkOutDate <= String(to));
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error listando reservas' });
  }
});

/**
 * GET /api/reservations/:id
 * Retrieve reservation details
 */
app.get('/api/reservations/:id', (req: Request, res: Response) => {
  try {
    const reservation = reservations.find(r => r.id === req.params.id || r.reservationCode === req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    const room = rooms.find(r => r.id === reservation.roomId);
    const guest = guests.find(g => g.id === reservation.guestId);
    const txs = transactions.filter(t => t.reservationId === reservation.id);

    return res.json({
      ...reservation,
      room,
      guest,
      transactions: txs
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error obteniendo reserva' });
  }
});

/**
 * PATCH /api/reservations/:id/status
 * State machine transition: PENDING_PAYMENT -> CONFIRMED -> CHECKED_IN -> CHECKED_OUT / CANCELLED
 */
app.patch('/api/reservations/:id/status', (req: Request, res: Response) => {
  try {
    const targetStatus = (req.body.nextStatus || req.body.status) as ReservationStatus;
    const reason = req.body.reason;

    if (!targetStatus) {
      return res.status(400).json({ error: 'El parámetro nextStatus o status es requerido.' });
    }

    const reservation = reservations.find(r => r.id === req.params.id || r.reservationCode === req.params.id);

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    const validation = validateStateTransition(reservation.status, targetStatus);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.reason });
    }

    reservation.status = targetStatus;
    reservation.updatedAt = new Date().toISOString();

    if (targetStatus === 'CHECKED_IN') {
      reservation.checkedInAt = new Date().toISOString();
    } else if (targetStatus === 'CHECKED_OUT') {
      reservation.checkedOutAt = new Date().toISOString();
    } else if (targetStatus === 'CANCELLED') {
      reservation.cancellationReason = reason || 'Cancelada manualmente por administración o usuario.';
    }

    const room = rooms.find(r => r.id === reservation.roomId);
    const guest = guests.find(g => g.id === reservation.guestId);
    const txs = transactions.filter(t => t.reservationId === reservation.id);

    saveDatabase();

    return res.json({
      success: true,
      message: `Estado actualizado exitosamente a ${targetStatus}`,
      reservation: {
        ...reservation,
        room,
        guest,
        transactions: txs
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error actualizando estado' });
  }
});

// ========================================================
// 3. TRANSACTIONS & PAYMENT VERIFICATION
// ========================================================

/**
 * GET /api/transactions
 * Retrieve all transactions
 */
app.get('/api/transactions', (req: Request, res: Response) => {
  return res.json(transactions);
});

/**
 * POST /api/transactions
 * Guest or system uploads payment proof voucher.
 * Handles both base64 raw images and file paths.
 */
app.post('/api/transactions', async (req: Request, res: Response) => {
  try {
    const { 
      reservationId, 
      paymentChannel, 
      amount, 
      referenceCode, 
      proofSlipUrl, 
      base64Data, 
      fileName, 
      notes,
      paymentType 
    } = req.body;

    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    let finalProofSlipUrl = proofSlipUrl || '';
    let storedBase64 = '';

    // Check if client provided base64 data (preferred for real voucher persistence)
    const rawBase64 = base64Data || (proofSlipUrl && proofSlipUrl.startsWith('data:image/') ? proofSlipUrl : null);

    if (rawBase64 && typeof rawBase64 === 'string') {
      try {
        const cleanBase64 = rawBase64.replace(/^data:.*?;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const ext = fileName && typeof fileName === 'string' && fileName.includes('.') 
          ? path.extname(fileName).toLowerCase() 
          : '.jpg';
        const safeName = `voucher-${reservation.reservationCode || reservation.id}-${Date.now()}${ext}`;

        // 1. Local disk persistence as reliable fallback
        fs.writeFileSync(path.join(publicVouchersDir, safeName), buffer);
        try {
          fs.writeFileSync(path.join(dataVouchersDir, safeName), buffer);
        } catch {
          // ignore
        }
        try {
          const distVouchersDir = path.join(process.cwd(), 'dist', 'vouchers');
          if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
            if (!fs.existsSync(distVouchersDir)) fs.mkdirSync(distVouchersDir, { recursive: true });
            fs.writeFileSync(path.join(distVouchersDir, safeName), buffer);
          }
        } catch {
          // ignore
        }

        finalProofSlipUrl = `/vouchers/${safeName}?v=${Date.now()}`;
        storedBase64 = rawBase64.startsWith('data:') ? rawBase64 : `data:image/jpeg;base64,${cleanBase64}`;

        // 2. Upload to Supabase Storage 'vouchers' bucket for permanent cloud persistence
        try {
          const mimeType = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg');
          const cloudRes = await uploadToSupabaseStorage('vouchers', safeName, buffer, mimeType);
          if (cloudRes.success && cloudRes.publicUrl) {
            finalProofSlipUrl = cloudRes.publicUrl;
          }
        } catch (storageErr) {
          console.warn('Supabase Storage voucher fallback a local:', storageErr);
        }
      } catch (fileErr) {
        console.warn('Error escribiendo comprobante en disco:', fileErr);
        storedBase64 = rawBase64.startsWith('data:') ? rawBase64 : `data:image/jpeg;base64,${rawBase64}`;
        finalProofSlipUrl = storedBase64;
      }
    }

    // Fallback if no file uploaded: check if proofSlipUrl is a valid link or default voucher
    if (!finalProofSlipUrl || finalProofSlipUrl.startsWith('blob:')) {
      finalProofSlipUrl = storedBase64 || '/logo_don_juaco.jpg';
    }

    const resolvedPaymentType = paymentType || (Number(amount) < reservation.totalAmount ? 'ANTICIPO' : 'PAGO_TOTAL');

    // Check if there is already an automatically generated pending transaction for this reservation
    const autoPendingTx = transactions.find(t => 
      t.reservationId === reservationId && 
      t.verificationStatus === 'PENDING' &&
      t.referenceCode.startsWith('PEND-')
    );

    if (autoPendingTx) {
      autoPendingTx.paymentChannel = paymentChannel as PaymentChannel;
      autoPendingTx.amount = Number(amount) || autoPendingTx.amount;
      autoPendingTx.referenceCode = referenceCode || autoPendingTx.referenceCode;
      autoPendingTx.proofSlipUrl = finalProofSlipUrl;
      autoPendingTx.proofSlipBase64 = storedBase64 || undefined;
      autoPendingTx.paymentType = resolvedPaymentType;
      autoPendingTx.notes = notes || autoPendingTx.notes;
      autoPendingTx.updatedAt = new Date().toISOString();
      saveDatabase();

      return res.status(200).json({
        success: true,
        message: 'Comprobante recibido y asociado a la reserva.',
        transaction: autoPendingTx
      });
    }

    const newTx: any = {
      id: `tx-${Date.now()}`,
      reservationId,
      paymentChannel: paymentChannel as PaymentChannel,
      amount: Number(amount) || reservation.totalAmount,
      referenceCode: referenceCode || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      proofSlipUrl: finalProofSlipUrl,
      proofSlipBase64: storedBase64 || null,
      verificationStatus: 'PENDING',
      paymentType: resolvedPaymentType,
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    transactions.unshift(newTx);
    saveDatabase();

    return res.status(201).json({
      success: true,
      message: 'Comprobante recibido. Don Juaco y el equipo verificarán el ingreso.',
      transaction: newTx
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error registrando transacción' });
  }
});

/**
 * PATCH /api/transactions/:id/verify
 * Admin verifies or rejects a payment voucher.
 */
app.patch('/api/transactions/:id/verify', (req: Request, res: Response) => {
  try {
    const action = req.body.action || req.body.status;
    const reason = req.body.reason || req.body.rejectionReason;
    const verifiedBy = req.body.verifiedBy || 'Don Joaquín (Admin)';
    const tx = transactions.find(t => t.id === req.params.id);

    if (!tx) {
      return res.status(404).json({ error: 'Transacción no encontrada.' });
    }

    if (action === 'VERIFIED') {
      tx.verificationStatus = 'VERIFIED';
      tx.verifiedAt = new Date().toISOString();
      tx.verifiedBy = verifiedBy;
      tx.updatedAt = new Date().toISOString();

      // Automatically confirm reservation
      const reservation = reservations.find(r => r.id === tx.reservationId);
      if (reservation) {
        reservation.status = 'CONFIRMED';
        reservation.updatedAt = new Date().toISOString();
      }
    } else if (action === 'REJECTED') {
      tx.verificationStatus = 'REJECTED';
      tx.rejectionReason = reason || 'El comprobante no coincide con la cuenta o no es legible.';
      tx.verifiedAt = new Date().toISOString();
      tx.verifiedBy = verifiedBy;
      tx.updatedAt = new Date().toISOString();

      // Automatically cancel reservation to free up the room dates
      const reservation = reservations.find(r => r.id === tx.reservationId);
      if (reservation) {
        reservation.status = 'CANCELLED';
        reservation.cancellationReason = tx.rejectionReason;
        reservation.updatedAt = new Date().toISOString();
      }
    } else {
      return res.status(400).json({ error: 'Acción no válida. Use VERIFIED o REJECTED.' });
    }

    saveDatabase();

    return res.json({
      success: true,
      transaction: tx
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error verificando transacción' });
  }
});

// ========================================================
// 3.1. FINANCES, DAILY CLOSE & PAYMENT NOTIFICATIONS
// ========================================================

/**
 * GET /api/finances/daily-close
 * Calculates daily cash close for the given date (default today).
 * Classifies by Tarjeta, Nequi, Bancolombia, Banco Agrario.
 * Prevents duplicate transaction counting.
 */
app.get('/api/finances/daily-close', (req: Request, res: Response) => {
  try {
    const targetDate = (req.query.date as string) || new Date().toISOString().split('T')[0];

    // Filter transactions whose verifiedAt or createdAt matches targetDate
    const dayTransactions = transactions.filter(t => {
      const datePart = (t.verifiedAt || t.createdAt || '').split('T')[0];
      return datePart === targetDate;
    });

    // Deduplicate by transaction id to avoid double counting
    const uniqueTxMap = new Map<string, Transaction>();
    dayTransactions.forEach(t => uniqueTxMap.set(t.id, t));
    const uniqueDayTransactions = Array.from(uniqueTxMap.values());

    const verifiedTxs = uniqueDayTransactions.filter(t => t.verificationStatus === 'VERIFIED');
    const pendingTxs = uniqueDayTransactions.filter(t => t.verificationStatus === 'PENDING');

    const totalCollected = verifiedTxs.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Classification strictly by payment channel: Tarjeta, Nequi, Bancolombia, Banco Agrario
    const byChannel = {
      CREDIT_CARD: { count: 0, total: 0, label: 'Tarjeta de Crédito' },
      NEQUI: { count: 0, total: 0, label: 'Nequi' },
      BANCOLOMBIA_TRANSFER: { count: 0, total: 0, label: 'Bancolombia' },
      BANCO_AGRARIO: { count: 0, total: 0, label: 'Banco Agrario' },
      OTHER: { count: 0, total: 0, label: 'Otros / Daviplata / Efectivo' }
    };

    verifiedTxs.forEach(t => {
      const ch = t.paymentChannel;
      if (ch === 'CREDIT_CARD') {
        byChannel.CREDIT_CARD.count++;
        byChannel.CREDIT_CARD.total += t.amount;
      } else if (ch === 'NEQUI') {
        byChannel.NEQUI.count++;
        byChannel.NEQUI.total += t.amount;
      } else if (ch === 'BANCOLOMBIA_TRANSFER') {
        byChannel.BANCOLOMBIA_TRANSFER.count++;
        byChannel.BANCOLOMBIA_TRANSFER.total += t.amount;
      } else if (ch === 'BANCO_AGRARIO') {
        byChannel.BANCO_AGRARIO.count++;
        byChannel.BANCO_AGRARIO.total += t.amount;
      } else {
        byChannel.OTHER.count++;
        byChannel.OTHER.total += t.amount;
      }
    });

    // Classify advances vs remaining balances
    let totalAnticipos = 0;
    let totalSaldos = 0;
    let totalPagosCompletos = 0;

    verifiedTxs.forEach(t => {
      const res = reservations.find(r => r.id === t.reservationId);
      if (t.paymentType === 'ANTICIPO' || (res && t.amount < res.totalAmount)) {
        totalAnticipos += t.amount;
      } else if (t.paymentType === 'SALDO_RESTANTE' || t.paymentType === 'PAGO_PARCIAL') {
        totalSaldos += t.amount;
      } else {
        totalPagosCompletos += t.amount;
      }
    });

    // Reservations checking in or active today with pending balances
    const activeTodayRes = reservations.filter(r => 
      (r.checkInDate === targetDate || (r.checkInDate <= targetDate && r.checkOutDate >= targetDate)) &&
      r.status !== 'CANCELLED'
    );

    let totalPendingBalance = 0;
    activeTodayRes.forEach(r => {
      const paid = transactions
        .filter(t => t.reservationId === r.id && t.verificationStatus === 'VERIFIED')
        .reduce((sum, t) => sum + t.amount, 0);
      const balance = Math.max(0, r.totalAmount - paid);
      totalPendingBalance += balance;
    });

    return res.json({
      targetDate,
      totalCollected,
      totalAnticipos,
      totalSaldos,
      totalPagosCompletos,
      totalPendingBalance,
      transactionCount: uniqueDayTransactions.length,
      verifiedCount: verifiedTxs.length,
      pendingCount: pendingTxs.length,
      byChannel,
      transactions: uniqueDayTransactions
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error calculando cierre de caja' });
  }
});

/**
 * POST /api/finances/manual-payment
 * Register manual payment / advance / partial payment / remaining balance for a reservation
 */
app.post('/api/finances/manual-payment', (req: Request, res: Response) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ error: 'Acceso no autorizado: Solo administradores pueden registrar pagos.' });
    }

    const { 
      reservationId, 
      amount, 
      paymentChannel, 
      referenceCode, 
      paymentType, 
      notes, 
      markAsVerified = true,
      paymentDate
    } = req.body;

    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'El monto del pago debe ser mayor a 0 COP.' });
    }

    const nowIso = paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString();
    const newTx: Transaction = {
      id: `tx-fin-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      reservationId,
      paymentChannel: paymentChannel as PaymentChannel,
      amount: numAmount,
      referenceCode: referenceCode || `ABONO-${Math.floor(100000 + Math.random() * 900000)}`,
      verificationStatus: markAsVerified ? 'VERIFIED' : 'PENDING',
      paymentType: (paymentType as any) || 'PAGO_PARCIAL',
      notes: notes || 'Abono registrado manualmente desde el módulo de Finanzas',
      verifiedAt: markAsVerified ? nowIso : undefined,
      verifiedBy: markAsVerified ? 'Don Joaquín (Admin)' : undefined,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    transactions.unshift(newTx);

    // If marked as verified, check if reservation should transition from PENDING_PAYMENT to CONFIRMED
    if (markAsVerified && reservation.status === 'PENDING_PAYMENT') {
      reservation.status = 'CONFIRMED';
      reservation.updatedAt = new Date().toISOString();
    }

    saveDatabase();

    return res.status(201).json({
      success: true,
      message: 'Pago registrado exitosamente en el módulo de Finanzas.',
      transaction: newTx,
      reservation
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error al registrar pago' });
  }
});

/**
 * POST /api/finances/notifications/send
 * Dispatches payment verified confirmation to guest email and/or prepares direct WhatsApp link
 */
app.post('/api/finances/notifications/send', async (req: Request, res: Response) => {
  try {
    const { transactionId, channel } = req.body;
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) {
      return res.status(404).json({ error: 'Transacción no encontrada.' });
    }

    const reservation = reservations.find(r => r.id === tx.reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reserva asociada no encontrada.' });
    }

    const guest = guests.find(g => g.id === reservation.guestId);
    const room = rooms.find(r => r.id === reservation.roomId);

    // Check email SMTP configuration
    const { isRealSMTP, transporter, smtpUser } = getTransporter();

    let emailResult = {
      attempted: false,
      success: false,
      isConfigured: isRealSMTP,
      message: ''
    };

    if (channel === 'email' || channel === 'both') {
      emailResult.attempted = true;
      if (!isRealSMTP) {
        emailResult.isConfigured = false;
        emailResult.success = false;
        emailResult.message = 'El servicio de correo SMTP no está configurado. Ingrese a Ajustes de la Finca para configurar su correo de Gmail y contraseña de aplicación de 16 caracteres.';
      } else {
        try {
          const guestEmail = guest?.email;
          if (!guestEmail) {
            emailResult.message = 'El huésped no tiene una dirección de correo válida registrada.';
          } else {
            const totalPaid = transactions
              .filter(t => t.reservationId === reservation.id && t.verificationStatus === 'VERIFIED')
              .reduce((s, t) => s + t.amount, 0);
            const remainingBalance = Math.max(0, reservation.totalAmount - totalPaid);

            const emailHtml = `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #D7C7B2; border-radius: 16px; overflow: hidden; background: #FAF8F5;">
                <div style="background-color: #1B4332; color: white; padding: 24px; text-align: center;">
                  <h1 style="margin: 0; font-size: 22px;">TURIM . Juaco • Finca La Colmena</h1>
                  <p style="margin: 4px 0 0; font-size: 13px; color: #D1E7DD;">Comprobante Oficial de Pago Verificado</p>
                </div>
                <div style="padding: 24px; color: #2C1E16;">
                  <p>Estimado(a) <strong>${guest?.fullName || 'Huésped'}</strong>,</p>
                  <p>Te confirmamos que hemos <strong>verificado exitosamente tu pago</strong> para la estadía en <strong>${room?.name || 'Finca La Colmena'}</strong>.</p>
                  <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
                    <tr style="border-bottom: 1px solid #E5E7EB;">
                      <td style="padding: 8px 0; color: #6B7280;">Código de Reserva:</td>
                      <td style="padding: 8px 0; font-weight: bold; text-align: right;">${reservation.reservationCode}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #E5E7EB;">
                      <td style="padding: 8px 0; color: #6B7280;">Monto Abonado:</td>
                      <td style="padding: 8px 0; font-weight: bold; color: #1B4332; text-align: right;">$${tx.amount.toLocaleString('es-CO')} COP</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #E5E7EB;">
                      <td style="padding: 8px 0; color: #6B7280;">Medio de Pago:</td>
                      <td style="padding: 8px 0; font-weight: bold; text-align: right;">${tx.paymentChannel}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #E5E7EB;">
                      <td style="padding: 8px 0; color: #6B7280;">Referencia Bancaria:</td>
                      <td style="padding: 8px 0; font-family: monospace; text-align: right;">${tx.referenceCode}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #E5E7EB;">
                      <td style="padding: 8px 0; color: #6B7280;">Valor Total Reserva:</td>
                      <td style="padding: 8px 0; font-weight: bold; text-align: right;">$${reservation.totalAmount.toLocaleString('es-CO')} COP</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #E5E7EB;">
                      <td style="padding: 8px 0; color: #6B7280;">Saldo Restante al Llegar:</td>
                      <td style="padding: 8px 0; font-weight: bold; color: #B45309; text-align: right;">$${remainingBalance.toLocaleString('es-CO')} COP</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6B7280;">Fechas de Estadía:</td>
                      <td style="padding: 8px 0; font-weight: bold; text-align: right;">${reservation.checkInDate} al ${reservation.checkOutDate}</td>
                    </tr>
                  </table>
                  <p style="font-size: 13px; color: #4B5563;">¡Te esperamos con los brazos abiertos en el Paisaje Cultural Cafetero! ☕🐝</p>
                </div>
              </div>
            `;

            await transporter.sendMail({
              from: `"${settings.notificationSenderName || 'TURIM . Juaco'}" <${smtpUser}>`,
              to: guestEmail,
              subject: `Recibo de Pago Verificado [${reservation.reservationCode}] - TURIM . Juaco`,
              html: emailHtml
            });

            emailResult.success = true;
            emailResult.message = `Recibo enviado exitosamente a ${guestEmail}`;
            tx.notificationSent = true;
            tx.notificationSentAt = new Date().toISOString();
            saveDatabase();
          }
        } catch (err: any) {
          emailResult.success = false;
          emailResult.message = `Fallo al enviar correo: ${err.message}`;
        }
      }
    }

    // Build WhatsApp direct URL (official Click-to-Chat)
    const guestPhone = (guest?.phone || '').replace(/\D/g, '');
    const cleanPhone = guestPhone.startsWith('57') ? guestPhone : `57${guestPhone}`;
    const totalPaidNow = transactions
      .filter(t => t.reservationId === reservation.id && t.verificationStatus === 'VERIFIED')
      .reduce((s, t) => s + t.amount, 0);
    const balanceNow = Math.max(0, reservation.totalAmount - totalPaidNow);

    const waText = `¡Hola, ${guest?.fullName || 'Huésped'}! 🐝\n\nConfirmamos que tu pago en *TURIM . Juaco • Finca La Colmena* ha sido VERIFICADO con éxito.\n\n📋 *Detalles del Recibo:*\n• Código Reserva: *${reservation.reservationCode}*\n• Cabaña: *${room?.name || 'Habitación'}*\n• Monto Abonado: *$${tx.amount.toLocaleString('es-CO')} COP*\n• Medio de Pago: *${tx.paymentChannel}*\n• Referencia: *${tx.referenceCode}*\n• Saldo Pendiente: *$${balanceNow.toLocaleString('es-CO')} COP*\n• Fechas: *${reservation.checkInDate} al ${reservation.checkOutDate}*\n\n📍 Ubicación GPS: https://maps.google.com/?cid=3521013696986298488&entry=gps\n\n¡Don Juaco y el equipo te esperan con delicioso café y desayuno campesino!`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;

    return res.json({
      success: true,
      email: emailResult,
      whatsapp: {
        isConfigured: false,
        message: 'Enlace oficial directo de WhatsApp generado con el recibo listo para enviar.',
        url: whatsappUrl,
        phone: cleanPhone
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error despachando notificación' });
  }
});

// ========================================================
// 4. ROOMS & INVENTORY ENDPOINTS
// ========================================================

app.get('/api/rooms', (req: Request, res: Response) => {
  return res.json(rooms);
});

app.patch('/api/rooms/:id', (req: Request, res: Response) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ error: 'Acceso no autorizado: Solo el administrador puede modificar habitaciones.' });
    }

    const room = rooms.find(r => r.id === req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Cabaña no encontrada.' });
    }

    const { outOfService, outOfServiceReason, basePrice, capacity, name, description, amenities, images, bedType, viewType, squareMeters } = req.body;

    if (outOfService !== undefined) {
      room.outOfService = Boolean(outOfService);
      room.outOfServiceReason = outOfServiceReason || '';
    }
    if (basePrice !== undefined) room.basePrice = Number(basePrice);
    if (capacity !== undefined) room.capacity = Number(capacity);
    if (name) room.name = name;
    if (description) room.description = description;
    if (bedType) room.bedType = bedType;
    if (viewType) room.viewType = viewType;
    if (squareMeters !== undefined) room.squareMeters = Number(squareMeters);
    if (amenities && Array.isArray(amenities)) room.amenities = amenities;
    if (images && Array.isArray(images)) room.images = images;

    room.updatedAt = new Date().toISOString();
    saveDatabase();

    return res.json({ success: true, room });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error actualizando cabaña' });
  }
});

/**
 * Configuration and Multer instance for multipart/form-data uploads
 */
const uploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 } // 30 MB
});

const ALLOWED_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp']);

/**
 * Endpoint para subir imágenes de habitaciones con multipart/form-data
 * Requisitos:
 * - Recibir imagen en multipart/form-data ('file' o 'image')
 * - Validar extensión segura (jpg, jpeg, png, webp)
 * - Renombrar con UUID
 * - Guardar físicamente en /static/uploads/habitaciones/
 * - Retornar JSON 200 con ruta relativa para MySQL
 * - Manejo de error 400 si archivo no se envía o es inválido
 */
const handleUploadRoomImageEndpoint = async (req: Request, res: Response) => {
  // Extract file from either req.file or req.files array
  const filesList = req.files as Express.Multer.File[] | undefined;
  const file = req.file || (filesList && filesList.length > 0 ? filesList[0] : undefined);

  // 1. Error 400 si no se envía archivo
  if (!file) {
    return res.status(400).json({
      status: 'error',
      code: 400,
      message: 'No se ha enviado ningún archivo de imagen. Por favor adjunta un archivo mediante multipart/form-data (ej: campo "file" o "image").'
    });
  }

  // 2. Validar que tenga extensión
  const originalName = (file.originalname || '').trim();
  if (!originalName || !originalName.includes('.')) {
    return res.status(400).json({
      status: 'error',
      code: 400,
      message: 'El archivo enviado no posee una extensión de archivo válida.'
    });
  }

  // 3. Validar extensión segura estrictamente (jpg, jpeg, png, webp)
  const ext = originalName.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_IMAGE_EXTS.has(ext)) {
    return res.status(400).json({
      status: 'error',
      code: 400,
      message: `Extensión .${ext} no permitida. Formatos seguros requeridos: ${Array.from(ALLOWED_IMAGE_EXTS).join(', ')}.`
    });
  }

  // Validar que no sea un archivo vacío (0 bytes)
  if (!file.buffer || file.buffer.length === 0) {
    return res.status(400).json({
      status: 'error',
      code: 400,
      message: 'El archivo enviado está vacío (0 bytes).'
    });
  }

  // 4. Renombrar automáticamente con UUID
  const uniqueFilename = `${crypto.randomUUID()}.${ext}`;
  const relativePath = `/static/uploads/habitaciones/${uniqueFilename}`;

  // 5. Guardar físicamente en el directorio local del servidor: /static/uploads/habitaciones/
  try {
    if (!fs.existsSync(localUploadsHabitacionesDir)) {
      fs.mkdirSync(localUploadsHabitacionesDir, { recursive: true });
    }
    fs.writeFileSync(path.join(localUploadsHabitacionesDir, uniqueFilename), file.buffer);

    try {
      if (fs.existsSync(rootUploadsHabitacionesDir)) {
        fs.writeFileSync(path.join(rootUploadsHabitacionesDir, uniqueFilename), file.buffer);
      }
    } catch {
      // Non-fatal if root-level /static requires elevated permissions
    }
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: `Error al guardar físicamente la imagen en el servidor: ${err.message}`
    });
  }

  let targetPath = relativePath;

  // 6. Subir a Supabase Storage bucket 'rooms' para almacenamiento permanente en la nube
  try {
    const mimeType = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg');
    const cloudRes = await uploadToSupabaseStorage('rooms', uniqueFilename, file.buffer, mimeType);
    if (cloudRes.success && cloudRes.publicUrl) {
      targetPath = cloudRes.publicUrl;
    }
  } catch (storageErr) {
    console.warn('Supabase Storage fallback para multipart:', storageErr);
  }

  // Si se envió roomId opcional, asociar a la habitación
  const roomId = req.body?.roomId || req.query?.roomId;
  if (roomId) {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      room.images = [targetPath];
      room.updatedAt = new Date().toISOString();
      saveDatabase();
    }
  }

  // 6. Retornar JSON con código 200 y ruta
  return res.status(200).json({
    status: 'success',
    code: 200,
    message: 'Imagen subida exitosamente.',
    image_path: targetPath,
    ruta: targetPath,
    relative_path: targetPath,
    filename: uniqueFilename
  });
};

const uploadMiddleware = (req: Request, res: Response) => {
  uploadMulter.any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: 'error', code: 400, message: err.message });
    }
    handleUploadRoomImageEndpoint(req, res);
  });
};

app.post('/upload/habitaciones', uploadMiddleware);
app.post('/api/upload/habitaciones', uploadMiddleware);
app.post('/api/rooms/upload-image', uploadMiddleware);
app.post('/api/rooms/upload', uploadMiddleware);

/**
 * POST /api/rooms/:id/photo
 * Direct upload of room photo (any format: JPG, PNG, WEBP, HEIC, AVIF, SVG, etc.)
 * Strictly restricted to authenticated administrator.
 */
app.post('/api/rooms/:id/photo', async (req: Request, res: Response) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ error: 'Acceso no autorizado: Solo el administrador puede modificar o actualizar las imágenes.' });
    }

    const room = rooms.find(r => r.id === req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Habitación no encontrada.' });
    }

    const { base64Data, fileName } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'base64Data es requerido.' });
    }

    // Strip any data-uri prefix regardless of format / mime type
    const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Extract format / extension
    let ext = '.jpg';
    if (fileName && typeof fileName === 'string' && fileName.includes('.')) {
      ext = path.extname(fileName).toLowerCase();
    } else if (base64Data.startsWith('data:image/')) {
      const match = base64Data.match(/^data:image\/([a-zA-Z0-9+.-]+);/);
      if (match) {
        const sub = match[1].toLowerCase();
        if (sub === 'jpeg') ext = '.jpg';
        else if (sub === 'svg+xml') ext = '.svg';
        else ext = `.${sub}`;
      }
    }

    const safeName = `${room.slug || room.id}-foto-${Date.now()}${ext}`;

    // 1. Write to local directories for offline redundancy
    const publicFilePath = path.join(publicRoomsDir, safeName);
    fs.writeFileSync(publicFilePath, buffer);

    try {
      const dataFilePath = path.join(dataPhotosDir, safeName);
      fs.writeFileSync(dataFilePath, buffer);
    } catch (err) {
      console.warn('Advertencia guardando en data/photos:', err);
    }

    const distRoomsDir = path.join(process.cwd(), 'dist', 'rooms');
    if (fs.existsSync(distRoomsDir)) {
      try {
        fs.writeFileSync(path.join(distRoomsDir, safeName), buffer);
      } catch (err) {
        console.warn('Advertencia guardando en dist/rooms:', err);
      }
    }

    let photoUrl = `/rooms/${safeName}?v=${Date.now()}`;

    // 2. Upload to Supabase Storage 'rooms' bucket for permanent cloud hosting
    try {
      const mimeType = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg');
      const cloudRes = await uploadToSupabaseStorage('rooms', safeName, buffer, mimeType);
      if (cloudRes.success && cloudRes.publicUrl) {
        photoUrl = cloudRes.publicUrl;
      }
    } catch (storageErr) {
      console.warn('Supabase Storage room photo fallback a local:', storageErr);
    }

    room.images = [photoUrl];
    room.updatedAt = new Date().toISOString();

    // Persist to database file and Supabase PostgreSQL
    saveDatabase();

    return res.json({ success: true, photoUrl, room });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error al guardar la fotografía' });
  }
});

/**
 * POST /api/rooms/:id/reset-photo
 * Reverts room photo to default initial state (Admin only)
 */
app.post('/api/rooms/:id/reset-photo', (req: Request, res: Response) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ error: 'Acceso no autorizado: Solo el administrador puede restaurar imágenes.' });
    }

    const room = rooms.find(r => r.id === req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Habitación no encontrada.' });
    }

    const defaultImagesMap: Record<string, string[]> = {
      'room-1': ['/rooms/habitacion-doble.jpg'],
      'room-2': ['/rooms/habitacion-triple-madera.jpg'],
      'room-3': ['/rooms/habitacion-triple-tallada.jpg'],
      'room-4': ['/rooms/habitacion-cuadruple-familiar.jpg'],
      'room-5': ['/rooms/habitacion-triple-campestre.jpg'],
      'room-6': ['/rooms/habitacion-cuadruple-ladrillo.jpg'],
      'room-7': ['/rooms/habitacion-cuadruple-familiar.jpg', '/rooms/habitacion-cuadruple-ladrillo.jpg']
    };

    const defs = defaultImagesMap[room.id] || ['/logo_don_juaco.jpg'];
    room.images = defs.map(url => `${url}?v=${Date.now()}`);
    room.updatedAt = new Date().toISOString();

    saveDatabase();

    return res.json({ success: true, room });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error restaurando imagen por defecto' });
  }
});

/**
 * POST /api/rooms/upload-all-photos
 * Bulk upload of multiple room photos (Admin only)
 */
app.post('/api/rooms/upload-all-photos', (req: Request, res: Response) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ error: 'Acceso no autorizado: Solo el administrador puede modificar las fotos.' });
    }

    const { uploads } = req.body;
    if (!Array.isArray(uploads)) {
      return res.status(400).json({ error: 'uploads debe ser un arreglo.' });
    }

    const updatedRooms: any[] = [];
    for (const item of uploads) {
      const room = rooms.find(r => r.id === item.roomId);
      if (room && item.base64Data) {
        const cleanBase64 = item.base64Data.replace(/^data:.*?;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const ext = item.fileName && item.fileName.includes('.') ? path.extname(item.fileName).toLowerCase() : '.jpg';
        const safeName = `${room.slug || room.id}-${Date.now()}${ext}`;
        
        const filePath = path.join(publicRoomsDir, safeName);
        fs.writeFileSync(filePath, buffer);

        try {
          fs.writeFileSync(path.join(dataPhotosDir, safeName), buffer);
        } catch (e) {
          // ignore
        }

        const photoUrl = `/rooms/${safeName}?v=${Date.now()}`;
        room.images = [photoUrl];
        room.updatedAt = new Date().toISOString();
        updatedRooms.push(room);
      }
    }

    saveDatabase();

    return res.json({ success: true, updatedRooms, count: updatedRooms.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error procesando fotos originales' });
  }
});

/**
 * POST /api/experiences/:id/photo
 * Direct upload of experience photo (Mascotas, Niños, Piscina, Bar)
 * Saves to public/experiences, dist/experiences, and data/photos for permanence.
 */
// In-memory store for experience photo URLs (persists Supabase CDN URLs)
const experiencePhotoUrls: Record<string, string> = {
  mascotas: `https://wxjafauyokuudalwauzg.supabase.co/storage/v1/object/public/experiences/zona-mascotas.jpg`,
  ninos: `https://wxjafauyokuudalwauzg.supabase.co/storage/v1/object/public/experiences/zona-ninos.jpg`,
  piscina: `https://wxjafauyokuudalwauzg.supabase.co/storage/v1/object/public/experiences/piscina.jpg`
};

/**
 * POST /api/experiences/:id/photo
 * Direct upload of experience photo (Mascotas, Niños, Piscina)
 * Uploads to Supabase Storage 'experiences' bucket with local fallback.
 */
app.post('/api/experiences/:id/photo', async (req: Request, res: Response) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ error: 'Acceso no autorizado: Solo el administrador puede modificar las fotos de experiencias.' });
    }

    const { base64Data, fileName } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'No se enviaron datos de imagen en base64.' });
    }

    const expId = req.params.id;
    const nameMap: Record<string, string> = {
      'mascotas': 'zona-mascotas',
      'ninos': 'zona-ninos',
      'piscina': 'piscina'
    };

    const targetBaseName = nameMap[expId] || expId;
    const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const ext = fileName && fileName.includes('.') ? path.extname(fileName).toLowerCase() : '.jpg';
    const mainFileName = `${targetBaseName}.jpg`;
    const timestampedName = `${targetBaseName}-${Date.now()}${ext}`;
    const mimeType = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg');

    // 1. Overwrite public/experiences/targetBaseName.jpg
    fs.writeFileSync(path.join(publicExperiencesDir, mainFileName), buffer);

    // 2. Also write to dist/experiences if dist exists
    if (fs.existsSync(distExperiencesDir)) {
      try {
        fs.writeFileSync(path.join(distExperiencesDir, mainFileName), buffer);
      } catch (err) {}
    }

    // 3. Also write to data/photos for permanent retention
    try {
      fs.writeFileSync(path.join(dataPhotosDir, timestampedName), buffer);
    } catch (err) {}

    // 4. Upload to Supabase Storage 'experiences' bucket
    let photoUrl = `/experiences/${mainFileName}?v=${Date.now()}`;
    try {
      const cloudRes = await uploadToSupabaseStorage('experiences', mainFileName, buffer, mimeType);
      if (cloudRes.success && cloudRes.publicUrl) {
        photoUrl = `${cloudRes.publicUrl}?v=${Date.now()}`;
        console.log(`✅ Foto de experiencia [${expId}] subida exitosamente a Supabase Storage bucket 'experiences': ${photoUrl}`);
      }
    } catch (sErr: any) {
      console.warn(`⚠️ Supabase Storage upload for experience fallback to local: ${sErr.message}`);
    }

    experiencePhotoUrls[expId] = photoUrl;
    return res.json({ success: true, photoUrl });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error guardando fotografía de experiencia' });
  }
});

/**
 * GET /api/experiences/photos
 * Returns current photos available for all experiences
 */
app.get('/api/experiences/photos', (req: Request, res: Response) => {
  try {
    const list = [
      { id: 'mascotas', title: 'Amplia Zona Verde para Mascotas', file: 'zona-mascotas.jpg', url: experiencePhotoUrls['mascotas'] || `/experiences/zona-mascotas.jpg?v=${Date.now()}` },
      { id: 'ninos', title: 'Zona Recreativa con Columpios para Niños', file: 'zona-ninos.jpg', url: experiencePhotoUrls['ninos'] || `/experiences/zona-ninos.jpg?v=${Date.now()}` },
      { id: 'piscina', title: 'Piscina Campestre & Solárium', file: 'piscina.jpg', url: experiencePhotoUrls['piscina'] || `/experiences/piscina.jpg?v=${Date.now()}` }
    ];
    return res.json({ success: true, experiences: list });
  } catch (error: any) {
    return res.status(500).json({ error: 'Error obteniendo fotos de experiencias' });
  }
});

/**
 * POST /api/experiences/:id/reset-photo
 * Resets experience photo to default
 */
app.post('/api/experiences/:id/reset-photo', (req: Request, res: Response) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ error: 'Acceso no autorizado' });
    }
    const expId = req.params.id;
    const nameMap: Record<string, string> = {
      'mascotas': 'zona-mascotas',
      'ninos': 'zona-ninos',
      'piscina': 'piscina'
    };
    const targetBaseName = nameMap[expId] || expId;
    experiencePhotoUrls[expId] = `https://wxjafauyokuudalwauzg.supabase.co/storage/v1/object/public/experiences/${targetBaseName}.jpg`;
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: 'Error al restaurar foto de experiencia' });
  }
});

// ========================================================
// 5. SETTINGS & SEASONS ENDPOINTS & ADMIN AUTH
// ========================================================

/**
 * POST /api/admin/login
 * Validates admin credentials (username: admin, password: admin123)
 */
app.post('/api/admin/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
      return res.json({
        success: true,
        token: 'token-admin-donjuaco-session-2026',
        user: {
          username: 'admin',
          fullName: 'Administrador Finca La Colmena',
          role: 'ADMIN'
        }
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Credenciales inválidas'
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error en autenticación' });
  }
});

app.get('/api/settings', (req: Request, res: Response) => {
  return res.json({
    settings,
    seasonRates
  });
});

app.put('/api/settings', (req: Request, res: Response) => {
  try {
    Object.assign(settings, req.body, { updatedAt: new Date().toISOString() });
    saveDatabase();
    return res.json({ success: true, settings });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error guardando ajustes' });
  }
});

app.get('/api/seasons', (req: Request, res: Response) => {
  const enriched = seasonRates.map(s => {
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    const calcNights = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return {
      ...s,
      nightsCount: calcNights
    };
  });
  return res.json(enriched);
});

app.post('/api/seasons', (req: Request, res: Response) => {
  try {
    const { name, startDate, endDate, multiplier, minimumStayNights } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'El nombre de la temporada es obligatorio.' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Debes seleccionar la fecha de inicio y la fecha de fin.' });
    }

    const sStart = new Date(startDate);
    const sEnd = new Date(endDate);
    if (isNaN(sStart.getTime()) || isNaN(sEnd.getTime())) {
      return res.status(400).json({ error: 'Las fechas ingresadas no son válidas.' });
    }

    if (sEnd <= sStart) {
      return res.status(400).json({ error: 'La fecha de fin debe ser posterior a la fecha de inicio (mínimo 1 noche de duración).' });
    }

    const nightsCount = Math.round((sEnd.getTime() - sStart.getTime()) / (1000 * 60 * 60 * 24));
    const parsedMinNights = Number(minimumStayNights);
    const parsedMultiplier = Number(multiplier);

    if (isNaN(parsedMinNights) || !Number.isInteger(parsedMinNights) || parsedMinNights <= 0) {
      return res.status(400).json({ error: 'Las noches mínimas deben ser un número entero válido mayor a 0.' });
    }

    if (parsedMinNights > nightsCount) {
      return res.status(400).json({ error: `Las noches mínimas (${parsedMinNights}) no pueden superar la duración total de la temporada (${nightsCount} noches).` });
    }

    if (isNaN(parsedMultiplier) || parsedMultiplier <= 0) {
      return res.status(400).json({ error: 'El multiplicador tarifario debe ser un valor numérico válido mayor a 0.' });
    }

    // Check for overlapping / conflicting seasons
    const conflictingSeason = seasonRates.find(existing => {
      if (!existing.isActive) return false;
      const exStart = new Date(existing.startDate);
      const exEnd = new Date(existing.endDate);
      // Overlap condition: newStart < exEnd AND newEnd > exStart
      return sStart < exEnd && sEnd > exStart;
    });

    if (conflictingSeason) {
      return res.status(409).json({
        error: `Conflicto de fechas: El período seleccionado se cruza con la temporada activa "${conflictingSeason.name}" (${conflictingSeason.startDate} al ${conflictingSeason.endDate}).`
      });
    }

    const newSeason: SeasonRate = {
      id: `season-${Date.now()}`,
      name: String(name).trim(),
      startDate,
      endDate,
      nightsCount,
      multiplier: Number(parsedMultiplier.toFixed(2)),
      minimumStayNights: parsedMinNights,
      isActive: true
    };
    seasonRates.push(newSeason);
    saveDatabase();
    return res.status(201).json({ success: true, season: newSeason });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error creando temporada' });
  }
});

app.patch('/api/seasons/:id', (req: Request, res: Response) => {
  try {
    const season = seasonRates.find(s => s.id === req.params.id);
    if (!season) {
      return res.status(404).json({ error: 'Temporada no encontrada.' });
    }

    const name = req.body.name !== undefined ? String(req.body.name).trim() : season.name;
    const startDate = req.body.startDate !== undefined ? req.body.startDate : season.startDate;
    const endDate = req.body.endDate !== undefined ? req.body.endDate : season.endDate;
    const multiplier = req.body.multiplier !== undefined ? Number(req.body.multiplier) : season.multiplier;
    const minimumStayNights = req.body.minimumStayNights !== undefined ? Number(req.body.minimumStayNights) : season.minimumStayNights;
    const isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : season.isActive;

    if (!name) {
      return res.status(400).json({ error: 'El nombre de la temporada es obligatorio.' });
    }

    const sStart = new Date(startDate);
    const sEnd = new Date(endDate);
    if (isNaN(sStart.getTime()) || isNaN(sEnd.getTime()) || sEnd <= sStart) {
      return res.status(400).json({ error: 'La fecha de fin debe ser posterior a la fecha de inicio.' });
    }

    const nightsCount = Math.round((sEnd.getTime() - sStart.getTime()) / (1000 * 60 * 60 * 24));

    if (isNaN(minimumStayNights) || !Number.isInteger(minimumStayNights) || minimumStayNights <= 0) {
      return res.status(400).json({ error: 'Las noches mínimas deben ser un número entero válido mayor a 0.' });
    }

    if (minimumStayNights > nightsCount) {
      return res.status(400).json({ error: `Las noches mínimas (${minimumStayNights}) no pueden superar la duración total de la temporada (${nightsCount} noches).` });
    }

    if (isNaN(multiplier) || multiplier <= 0) {
      return res.status(400).json({ error: 'El multiplicador tarifario debe ser un valor numérico válido mayor a 0.' });
    }

    // Check for overlapping / conflicting seasons excluding self
    if (isActive) {
      const conflictingSeason = seasonRates.find(existing => {
        if (existing.id === season.id || !existing.isActive) return false;
        const exStart = new Date(existing.startDate);
        const exEnd = new Date(existing.endDate);
        return sStart < exEnd && sEnd > exStart;
      });

      if (conflictingSeason) {
        return res.status(409).json({
          error: `Conflicto de fechas: El período seleccionado se cruza con la temporada "${conflictingSeason.name}" (${conflictingSeason.startDate} al ${conflictingSeason.endDate}).`
        });
      }
    }

    season.name = name;
    season.startDate = startDate;
    season.endDate = endDate;
    season.nightsCount = nightsCount;
    season.multiplier = Number(multiplier.toFixed(2));
    season.minimumStayNights = minimumStayNights;
    season.isActive = isActive;

    saveDatabase();
    return res.json({ success: true, season });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error actualizando temporada' });
  }
});

app.delete('/api/seasons/:id', (req: Request, res: Response) => {
  try {
    const index = seasonRates.findIndex(s => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Temporada no encontrada' });
    seasonRates.splice(index, 1);
    saveDatabase();
    return res.json({ success: true, message: 'Temporada eliminada' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error eliminando temporada' });
  }
});

// ========================================================
// 6. CHATBOT DECISION TREE & GEMINI CONCIERGE
// ========================================================

app.get('/api/chat/faq', (req: Request, res: Response) => {
  return res.json(chatDecisionTree);
});

app.post('/api/chat/decision-tree', (req: Request, res: Response) => {
  try {
    const { nodeId = 'root', userSelection } = req.body;
    let node = chatDecisionTree.find(n => n.id === nodeId);
    if (!node) {
      node = chatDecisionTree[0];
    }

    return res.json({
      node,
      whatsappNumber: settings.whatsappNumber,
      whatsappUrl: `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent('Hola Don Juaco, tengo una duda sobre la Finca La Colmena: ' + (userSelection || node.userQuestion))}`
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error en árbol de decisiones' });
  }
});

/**
 * POST /api/ai/concierge
 * Conversational AI Concierge powered by gemini-3.8-flash
 */
app.post('/api/ai/concierge', async (req: Request, res: Response) => {
  try {
    const { query, history, context } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'La consulta es requerida.' });
    }

    const advice = await generateAgrotourismAdvice(query, history, context);
    return res.json({
      answer: advice.text,
      thoughtProcess: advice.thoughtProcess || null
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error procesando consulta de IA' });
  }
});

// ========================================================
// 6. AUTOMATED NOTIFICATIONS & 2-DAY REMINDERS API
// ========================================================

/**
 * POST /api/notifications/send-confirmation
 * Manually trigger or resend reservation confirmation notification
 */
app.post('/api/notifications/send-confirmation', async (req: Request, res: Response) => {
  try {
    const { reservationId } = req.body;
    const reservation = reservations.find(r => r.id === reservationId || r.reservationCode === reservationId);

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    const room = rooms.find(r => r.id === reservation.roomId);
    const guest = guests.find(g => g.id === reservation.guestId);

    if (!room || !guest) {
      return res.status(400).json({ error: 'Información incompleta de cabaña o huésped.' });
    }

    const result = await sendBookingConfirmationNotification(reservation, room, guest, settings);
    return res.json({
      success: true,
      message: 'Notificación de confirmación enviada con éxito',
      ...result
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error enviando confirmación' });
  }
});

/**
 * POST /api/notifications/send-reminder
 * Manually trigger 2-day pre-arrival reminder notification
 */
app.post('/api/notifications/send-reminder', async (req: Request, res: Response) => {
  try {
    const { reservationId } = req.body;
    const reservation = reservations.find(r => r.id === reservationId || r.reservationCode === reservationId);

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    const room = rooms.find(r => r.id === reservation.roomId);
    const guest = guests.find(g => g.id === reservation.guestId);

    if (!room || !guest) {
      return res.status(400).json({ error: 'Información incompleta de cabaña o huésped.' });
    }

    const result = await sendPreArrivalReminderNotification(reservation, room, guest, settings);
    return res.json({
      success: true,
      message: 'Recordatorio automático de 2 días antes enviado con éxito',
      ...result
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error enviando recordatorio' });
  }
});

/**
 * POST /api/notifications/run-reminders
 * Executes the automated 2-day pre-arrival reminder check
 */
app.post('/api/notifications/run-reminders', async (req: Request, res: Response) => {
  try {
    const summary = await checkAndSendPreArrivalReminders(reservations, rooms, guests, settings);
    return res.json({
      success: true,
      message: 'Verificación de recordatorios de 2 días ejecutada con éxito',
      ...summary
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error ejecutando servicio de recordatorios' });
  }
});

/**
 * POST /api/notifications/test-email
 * Sends a test confirmation email to verify SMTP connectivity
 */
app.post('/api/notifications/test-email', async (req: Request, res: Response) => {
  try {
    const { email, smtpUser, smtpPass, smtpHost, smtpPort } = req.body;
    const target = email || smtpUser || settings.smtpUser || process.env.SMTP_USER || process.env.EMAIL_USER || 'restreporojassantiago940@gmail.com';
    
    const effective = {
      ...settings,
      ...(smtpUser ? { smtpUser: String(smtpUser).trim() } : {}),
      ...(smtpPass ? { smtpPass: String(smtpPass).trim().replace(/\s+/g, '') } : {}),
      ...(smtpHost ? { smtpHost: String(smtpHost).trim() } : {}),
      ...(smtpPort ? { smtpPort: Number(smtpPort) } : {})
    };

    const result = await sendTestEmailNotification(target, effective);
    return res.json({
      targetEmail: target,
      ...result
    });
  } catch (error: any) {
    return res.status(500).json({ 
      error: `Error al despachar correo de prueba SMTP: ${error.message || error}` 
    });
  }
});

// Guard against undefined /api routes falling through to HTML SPA
app.all('/api/*', (req: Request, res: Response) => {
  return res.status(404).json({ error: `Ruta API no encontrada: ${req.method} ${req.path}` });
});

// ========================================================
// 7. VITE / STATIC SERVING & BACKGROUND CRON
// ========================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start background cron task for 2-day pre-arrival reminders (runs every 30 minutes)
  const THIRTY_MINUTES = 30 * 60 * 1000;
  setInterval(async () => {
    try {
      await checkAndSendPreArrivalReminders(reservations, rooms, guests, settings);
    } catch (err) {
      console.error('[CRON RECORDATORIOS 2 DÍAS] Error:', err);
    }
  }, THIRTY_MINUTES);

  // Run initial check on server startup
  setTimeout(async () => {
    try {
      const summary = await checkAndSendPreArrivalReminders(reservations, rooms, guests, settings);
      if (summary.remindersSent > 0) {
        console.log(`[CRON INICIAL] ${summary.remindersSent} recordatorios de 2 días enviados automáticamente.`);
      }
    } catch (err) {
      console.error('[CRON INICIAL RECORDATORIOS] Error:', err);
    }
  }, 5000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🐝 TURIM . Juaco • Finca La Colmena server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
