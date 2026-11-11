import fs from 'fs';
import path from 'path';
import { 
  Room, 
  Guest, 
  Reservation, 
  Transaction, 
  SeasonRate, 
  EstateSettings, 
  ChatNode, 
  ReservationStatus,
  PaymentChannel,
  SeasonalPhoto
} from './types';
import { 
  getPostgresPool, 
  initializePostgresSchema, 
  loadDataFromPostgres, 
  migrateLocalDataToPostgres,
  checkPostgresHealth 
} from './postgres';

// ==========================================
// Seed Data: Finca La Colmena de Don Juaco
// 7 habitaciones configuradas según especificaciones (#1, #2, #3, #4, #5, #6, #7):
// Servicios para todas: TV, Ventilador, Toallas, Agua caliente, Wi-Fi
// Temporada baja: $85.000 COP / noche (desayuno incluido)
// Temporada alta (20 Dic - 20 Ene): $120.000 COP / noche (desayuno incluido)
// ==========================================

export let rooms: Room[] = [
  {
    id: 'room-1',
    roomNumber: 'Habitación #1',
    name: 'Habitación #1 — Doble Matrimonial',
    slug: 'habitacion-1',
    description: 'Habitación con 1 cama doble y 1 cama sencilla. Equipada con TV, ventilador, toallas, agua caliente y Wi-Fi.',
    capacity: 3,
    basePrice: 85000,
    outOfService: false,
    bedType: '1 cama doble + 1 cama sencilla',
    viewType: 'Capacidad: 3 huéspedes (2 camas)',
    squareMeters: 28,
    amenities: [
      '1 cama doble',
      '1 cama sencilla',
      'TV',
      'Ventilador',
      'Toallas',
      'Agua caliente',
      'Wi-Fi'
    ],
    images: [
      '/rooms/habitacion-doble.jpg'
    ],
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'room-2',
    roomNumber: 'Habitación #2',
    name: 'Habitación #2 — Triple Madera Cálida',
    slug: 'habitacion-2',
    description: 'Habitación con 1 cama doble y 1 cama sencilla. Equipada con TV, ventilador, toallas, agua caliente y Wi-Fi.',
    capacity: 3,
    basePrice: 85000,
    outOfService: false,
    bedType: '1 cama doble + 1 cama sencilla',
    viewType: 'Capacidad: 3 huéspedes (2 camas)',
    squareMeters: 28,
    amenities: [
      '1 cama doble',
      '1 cama sencilla',
      'TV',
      'Ventilador',
      'Toallas',
      'Agua caliente',
      'Wi-Fi'
    ],
    images: [
      '/rooms/habitacion-triple-madera.jpg'
    ],
    sortOrder: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'room-3',
    roomNumber: 'Habitación #3',
    name: 'Habitación #3 — Tradición Tallada',
    slug: 'habitacion-3',
    description: 'Habitación con 1 cama doble, 1 cama sencilla y 1 nicho (contabilizado como 1 cama adicional). Equipada con TV, ventilador, toallas, agua caliente y Wi-Fi.',
    capacity: 4,
    basePrice: 85000,
    outOfService: false,
    bedType: '1 cama doble + 1 cama sencilla + 1 nicho',
    viewType: 'Capacidad: 4 huéspedes (2 camas + 1 nicho)',
    squareMeters: 30,
    amenities: [
      '1 cama doble',
      '1 cama sencilla',
      '1 nicho (1 cama adicional)',
      'TV',
      'Ventilador',
      'Toallas',
      'Agua caliente',
      'Wi-Fi'
    ],
    images: [
      '/rooms/habitacion-triple-tallada.jpg'
    ],
    sortOrder: 3,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'room-4',
    roomNumber: 'Habitación #4',
    name: 'Habitación #4 — Suite Colonial',
    slug: 'habitacion-4',
    description: 'Habitación campestre y confortable. Equipada con todos los servicios esenciales. Configuración de camas y capacidad personalizable desde el panel de administración.',
    capacity: 2,
    basePrice: 85000,
    outOfService: false,
    bedType: 'Camas configurables',
    viewType: 'Capacidad y camas configurables',
    squareMeters: 28,
    amenities: [
      'TV',
      'Ventilador',
      'Toallas',
      'Agua caliente',
      'Wi-Fi'
    ],
    images: [
      '/rooms/habitacion-triple-colonial.jpg'
    ],
    sortOrder: 4,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'room-5',
    roomNumber: 'Habitación #5',
    name: 'Habitación #5 — Familiar Campestre',
    slug: 'habitacion-5',
    description: 'Habitación amplia con 2 camas dobles y 1 cama sencilla. Equipada con TV, ventilador, toallas, agua caliente y Wi-Fi.',
    capacity: 5,
    basePrice: 85000,
    outOfService: false,
    bedType: '2 camas dobles + 1 cama sencilla',
    viewType: 'Capacidad: 5 huéspedes (3 camas)',
    squareMeters: 34,
    amenities: [
      '2 camas dobles',
      '1 cama sencilla',
      'TV',
      'Ventilador',
      'Toallas',
      'Agua caliente',
      'Wi-Fi'
    ],
    images: [
      '/rooms/habitacion-triple-campestre.jpg'
    ],
    sortOrder: 5,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'room-6',
    roomNumber: 'Habitación #6',
    name: 'Habitación #6 — Cabaña de Ladrillo',
    slug: 'habitacion-6',
    description: 'Habitación con 1 cama doble y 1 cama sencilla. Equipada con TV, ventilador, toallas, agua caliente y Wi-Fi.',
    capacity: 3,
    basePrice: 85000,
    outOfService: false,
    bedType: '1 cama doble + 1 cama sencilla',
    viewType: 'Capacidad: 3 huéspedes (2 camas)',
    squareMeters: 28,
    amenities: [
      '1 cama doble',
      '1 cama sencilla',
      'TV',
      'Ventilador',
      'Toallas',
      'Agua caliente',
      'Wi-Fi'
    ],
    images: [
      '/rooms/habitacion-cuadruple-ladrillo.jpg'
    ],
    sortOrder: 6,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'room-7',
    roomNumber: 'Habitación #7',
    name: 'Habitación #7',
    slug: 'habitacion-7',
    description: 'Habitación amplia con 2 camas dobles y 1 nicho (contabilizado como 1 cama adicional). Equipada con TV, ventilador, toallas, agua caliente y Wi-Fi.',
    capacity: 5,
    basePrice: 85000,
    outOfService: false,
    bedType: '2 camas dobles + 1 nicho',
    viewType: 'Capacidad: 5 huéspedes (2 camas dobles + 1 nicho)',
    squareMeters: 36,
    amenities: [
      '2 camas dobles',
      '1 nicho (1 cama adicional)',
      'TV',
      'Ventilador',
      'Toallas',
      'Agua caliente',
      'Wi-Fi'
    ],
    images: [
      '/rooms/habitacion-cuadruple-ladrillo.jpg',
      '/rooms/habitacion-triple-madera.jpg'
    ],
    sortOrder: 7,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }
];

export let guests: Guest[] = [
  {
    id: 'guest-1',
    documentType: 'CC',
    documentNumber: '1094928174',
    fullName: 'Carolina Herrera Pardo',
    email: 'carolina.herrera@gmail.com',
    phone: '+57 310 445 8921',
    nationality: 'Colombiana',
    emergencyContact: 'Carlos Herrera (+57 312 889 1234)',
    notes: 'Huésped habitual. Desayuno campesino con café sin azúcar.',
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-09-10T10:00:00Z'
  },
  {
    id: 'guest-2',
    documentType: 'PASSPORT',
    documentNumber: 'A28491029',
    fullName: 'Lucas Weber',
    email: 'lucas.weber.berlin@outlook.de',
    phone: '+49 176 9982 1204',
    nationality: 'Alemana',
    emergencyContact: 'Greta Weber (+49 176 5543 2190)',
    notes: 'Interesado en ornitología y proceso del café.',
    createdAt: '2026-09-12T14:30:00Z',
    updatedAt: '2026-09-12T14:30:00Z'
  },
  {
    id: 'guest-3',
    documentType: 'CC',
    documentNumber: '52894102',
    fullName: 'Andrés Felipe Morales',
    email: 'af.morales@bancolombia.com.co',
    phone: '+57 316 772 3109',
    nationality: 'Colombiana',
    emergencyContact: 'Silvia Morales (+57 315 220 9811)',
    notes: 'Llegada tarde estimada 19:30.',
    createdAt: '2026-09-15T09:15:00Z',
    updatedAt: '2026-09-15T09:15:00Z'
  }
];

// Temporada Alta oficial: 20 de Diciembre al 20 de Enero
// Valor: 120.000 COP / noche (Valor base fuera de fechas: 85.000 COP / noche)
export let seasonRates: SeasonRate[] = [
  {
    id: 'season-alta-dic-ene',
    name: 'Temporada Alta (20 Dic - 20 Ene)',
    startDate: '2026-12-20',
    endDate: '2027-01-20',
    nightsCount: 31,
    multiplier: Number((120000 / 85000).toFixed(2)), // Multiplicador para $120.000 COP
    minimumStayNights: 1,
    isActive: true
  }
];

export let seasonalPhotos: SeasonalPhoto[] = [
  {
    id: 'alta-temporada',
    seasonName: 'Alta Temporada & Verano Campestre',
    badge: '20 Dic - 20 Ene',
    defaultPath: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    photoUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
    description: 'Fotografía para la alta temporada de verano con piscina soleada y vista a la cordillera.',
    recommendation: 'Recomendado: Formato horizontal 16:9, mostrando el solárium y la piscina al aire libre.'
  },
  {
    id: 'navidad-ano-nuevo',
    seasonName: 'Navidad & Fin de Año en La Colmena',
    badge: 'Fiestas de Fin de Año',
    defaultPath: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1200&q=80',
    photoUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1200&q=80',
    description: 'Fotografía festiva de noche con iluminación cálida sobre las cabañas coloniales.',
    recommendation: 'Recomendado: Fotografía nocturna con luces cálidas y arquitectura rústica de la finca.'
  },
  {
    id: 'cosecha-cafe',
    seasonName: 'Época de Cosecha & Floración del Café',
    badge: 'Tradición Cafetera',
    defaultPath: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
    photoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
    description: 'Paisaje de cafetales florecidos y granos maduros en la ladera del Quindío.',
    recommendation: 'Recomendado: Primer plano de granos de café rojos o cultivo iluminado por el sol.'
  },
  {
    id: 'puentes-festivos',
    seasonName: 'Puentes Festivos & Escapadas de Fin de Semana',
    badge: 'Puentes & Fines de Semana',
    defaultPath: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=80',
    photoUrl: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=80',
    description: 'Noche de fogata campestre, hamacas y descanso en familia.',
    recommendation: 'Recomendado: Ambiente de fogata nocturna o descanso en hamacas bajo las estrellas.'
  },
  {
    id: 'temporada-lluvias',
    seasonName: 'Época de Montaña & Niebla Verde',
    badge: 'Paisaje Verde & Fresco',
    defaultPath: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    photoUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    description: 'Montañas verdes envueltas en niebla matutina y clima fresco de la zona cafetera.',
    recommendation: 'Recomendado: Vista panorámica con niebla sobre las colinas verdes del Quindío.'
  }
];

export let settings: EstateSettings = {
  id: 'colmena_settings',
  propertyName: 'Finca La Colmena de Don Juaco',
  tagline: 'Alojamiento Campestre & Agroturismo Tradicional',
  phone: '+57 301 567 7776',
  email: 'restreporojassantiago940@gmail.com',
  whatsappNumber: '573015677776',
  locationAddress: 'Finca La Colmena, Montenegro, Quindío, Colombia (Ubicación Google Maps: https://maps.app.goo.gl/md6fqEjjRVBKxoP68)',
  checkInTime: '15:00',
  checkOutTime: '11:00',
  defaultMinStayNights: 1,
  paymentHoldMinutes: 25,
  bancolombiaAccountType: 'Cuenta de Ahorros',
  bancolombiaAccountNumber: '482-901842-19',
  bancolombiaHolderName: 'Joaquín Emilio Restrepo / Finca La Colmena',
  bancolombiaNit: '901.482.190-4',
  nequiNumber: '3015677776',
  daviplataNumber: '3015677776',
  bancoAgrarioAccountType: 'Cuenta de Ahorros',
  bancoAgrarioAccountNumber: '0491-300184-2',
  bancoAgrarioHolderName: 'Finca Hotel La Colmena de Don Juaco',
  bancoAgrarioNit: '901.482.190-4',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || process.env.EMAIL_USER || 'restreporojassantiago940@gmail.com',
  smtpPass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || '',
  smtpSecure: false,
  notificationSenderName: 'TURIM . Juaco • Finca La Colmena',
  updatedAt: new Date().toISOString()
};

export let reservations: Reservation[] = [
  // Enero 2026 (12 reservas)
  { id: 'res-ene-1', reservationCode: 'COL-2026-1001', roomId: 'room-1', guestId: 'guest-1', checkInDate: '2026-01-03', checkOutDate: '2026-01-05', adults: 2, children: 0, nightlyRate: 120000, seasonalMultiplier: 1.41, subtotal: 240000, taxAmount: 0, totalAmount: 240000, status: 'CHECKED_OUT', createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-05T11:00:00Z' },
  { id: 'res-ene-2', reservationCode: 'COL-2026-1002', roomId: 'room-2', guestId: 'guest-2', checkInDate: '2026-01-04', checkOutDate: '2026-01-07', adults: 3, children: 0, nightlyRate: 120000, seasonalMultiplier: 1.41, subtotal: 360000, taxAmount: 0, totalAmount: 360000, status: 'CHECKED_OUT', createdAt: '2026-01-02T10:00:00Z', updatedAt: '2026-01-07T11:00:00Z' },
  { id: 'res-ene-3', reservationCode: 'COL-2026-1003', roomId: 'room-6', guestId: 'guest-3', checkInDate: '2026-01-06', checkOutDate: '2026-01-09', adults: 4, children: 0, nightlyRate: 120000, seasonalMultiplier: 1.41, subtotal: 360000, taxAmount: 0, totalAmount: 360000, status: 'CHECKED_OUT', createdAt: '2026-01-03T10:00:00Z', updatedAt: '2026-01-09T11:00:00Z' },
  { id: 'res-ene-4', reservationCode: 'COL-2026-1004', roomId: 'room-1', guestId: 'guest-1', checkInDate: '2026-01-08', checkOutDate: '2026-01-10', adults: 2, children: 0, nightlyRate: 120000, seasonalMultiplier: 1.41, subtotal: 240000, taxAmount: 0, totalAmount: 240000, status: 'CHECKED_OUT', createdAt: '2026-01-05T10:00:00Z', updatedAt: '2026-01-10T11:00:00Z' },
  { id: 'res-ene-5', reservationCode: 'COL-2026-1005', roomId: 'room-3', guestId: 'guest-2', checkInDate: '2026-01-10', checkOutDate: '2026-01-12', adults: 3, children: 0, nightlyRate: 120000, seasonalMultiplier: 1.41, subtotal: 240000, taxAmount: 0, totalAmount: 240000, status: 'CHECKED_OUT', createdAt: '2026-01-06T10:00:00Z', updatedAt: '2026-01-12T11:00:00Z' },
  { id: 'res-ene-6', reservationCode: 'COL-2026-1006', roomId: 'room-7', guestId: 'guest-3', checkInDate: '2026-01-12', checkOutDate: '2026-01-15', adults: 4, children: 0, nightlyRate: 120000, seasonalMultiplier: 1.41, subtotal: 360000, taxAmount: 0, totalAmount: 360000, status: 'CHECKED_OUT', createdAt: '2026-01-08T10:00:00Z', updatedAt: '2026-01-15T11:00:00Z' },
  { id: 'res-ene-7', reservationCode: 'COL-2026-1007', roomId: 'room-1', guestId: 'guest-1', checkInDate: '2026-01-15', checkOutDate: '2026-01-17', adults: 2, children: 0, nightlyRate: 120000, seasonalMultiplier: 1.41, subtotal: 240000, taxAmount: 0, totalAmount: 240000, status: 'CHECKED_OUT', createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-17T11:00:00Z' },
  { id: 'res-ene-8', reservationCode: 'COL-2026-1008', roomId: 'room-4', guestId: 'guest-2', checkInDate: '2026-01-18', checkOutDate: '2026-01-20', adults: 3, children: 0, nightlyRate: 120000, seasonalMultiplier: 1.41, subtotal: 240000, taxAmount: 0, totalAmount: 240000, status: 'CHECKED_OUT', createdAt: '2026-01-14T10:00:00Z', updatedAt: '2026-01-20T11:00:00Z' },
  { id: 'res-ene-9', reservationCode: 'COL-2026-1009', roomId: 'room-1', guestId: 'guest-1', checkInDate: '2026-01-22', checkOutDate: '2026-01-24', adults: 2, children: 0, nightlyRate: 85000, seasonalMultiplier: 1.0, subtotal: 170000, taxAmount: 0, totalAmount: 170000, status: 'CHECKED_OUT', createdAt: '2026-01-18T10:00:00Z', updatedAt: '2026-01-24T11:00:00Z' },
  { id: 'res-ene-10', reservationCode: 'COL-2026-1010', roomId: 'room-5', guestId: 'guest-2', checkInDate: '2026-01-24', checkOutDate: '2026-01-26', adults: 3, children: 0, nightlyRate: 85000, seasonalMultiplier: 1.0, subtotal: 170000, taxAmount: 0, totalAmount: 170000, status: 'CHECKED_OUT', createdAt: '2026-01-20T10:00:00Z', updatedAt: '2026-01-26T11:00:00Z' },
  { id: 'res-ene-11', reservationCode: 'COL-2026-1011', roomId: 'room-6', guestId: 'guest-3', checkInDate: '2026-01-27', checkOutDate: '2026-01-29', adults: 4, children: 0, nightlyRate: 85000, seasonalMultiplier: 1.0, subtotal: 170000, taxAmount: 0, totalAmount: 170000, status: 'CHECKED_OUT', createdAt: '2026-01-22T10:00:00Z', updatedAt: '2026-01-29T11:00:00Z' },
  { id: 'res-ene-12', reservationCode: 'COL-2026-1012', roomId: 'room-1', guestId: 'guest-1', checkInDate: '2026-01-29', checkOutDate: '2026-01-31', adults: 2, children: 0, nightlyRate: 85000, seasonalMultiplier: 1.0, subtotal: 170000, taxAmount: 0, totalAmount: 170000, status: 'CHECKED_OUT', createdAt: '2026-01-25T10:00:00Z', updatedAt: '2026-01-31T11:00:00Z' },

  // Febrero 2026 (18 reservas)
  ...Array.from({ length: 18 }).map((_, i) => ({
    id: `res-feb-${i + 1}`,
    reservationCode: `COL-2026-20${String(i + 1).padStart(2, '0')}`,
    roomId: i % 3 === 0 ? 'room-1' : (i % 3 === 1 ? `room-${(i % 4) + 2}` : (i % 2 === 0 ? 'room-6' : 'room-7')),
    guestId: 'guest-1',
    checkInDate: `2026-02-${String((i % 26) + 1).padStart(2, '0')}`,
    checkOutDate: `2026-02-${String(Math.min(28, (i % 26) + 3)).padStart(2, '0')}`,
    adults: 2,
    children: 0,
    nightlyRate: 85000,
    seasonalMultiplier: 1.0,
    subtotal: 170000,
    taxAmount: 0,
    totalAmount: 170000,
    status: 'CHECKED_OUT' as const,
    createdAt: `2026-02-01T10:00:00Z`,
    updatedAt: `2026-02-03T10:00:00Z`
  })),

  // Marzo 2026 (15 reservas)
  ...Array.from({ length: 15 }).map((_, i) => ({
    id: `res-mar-${i + 1}`,
    reservationCode: `COL-2026-30${String(i + 1).padStart(2, '0')}`,
    roomId: i % 3 === 0 ? 'room-1' : (i % 3 === 1 ? `room-${(i % 4) + 2}` : 'room-6'),
    guestId: 'guest-2',
    checkInDate: `2026-03-${String((i * 2 % 28) + 1).padStart(2, '0')}`,
    checkOutDate: `2026-03-${String((i * 2 % 28) + 3).padStart(2, '0')}`,
    adults: 2,
    children: 0,
    nightlyRate: 85000,
    seasonalMultiplier: 1.0,
    subtotal: 170000,
    taxAmount: 0,
    totalAmount: 170000,
    status: 'CHECKED_OUT' as const,
    createdAt: `2026-03-01T10:00:00Z`,
    updatedAt: `2026-03-05T10:00:00Z`
  })),

  // Abril 2026 (23 reservas)
  ...Array.from({ length: 23 }).map((_, i) => ({
    id: `res-abr-${i + 1}`,
    reservationCode: `COL-2026-40${String(i + 1).padStart(2, '0')}`,
    roomId: i % 3 === 0 ? 'room-1' : (i % 3 === 1 ? `room-${(i % 4) + 2}` : 'room-7'),
    guestId: 'guest-3',
    checkInDate: `2026-04-${String((i % 27) + 1).padStart(2, '0')}`,
    checkOutDate: `2026-04-${String((i % 27) + 3).padStart(2, '0')}`,
    adults: 2,
    children: 0,
    nightlyRate: 85000,
    seasonalMultiplier: 1.0,
    subtotal: 170000,
    taxAmount: 0,
    totalAmount: 170000,
    status: 'CHECKED_OUT' as const,
    createdAt: `2026-04-01T10:00:00Z`,
    updatedAt: `2026-04-05T10:00:00Z`
  })),

  // Mayo 2026 (20 reservas)
  ...Array.from({ length: 20 }).map((_, i) => ({
    id: `res-may-${i + 1}`,
    reservationCode: `COL-2026-50${String(i + 1).padStart(2, '0')}`,
    roomId: i % 3 === 0 ? 'room-1' : (i % 3 === 1 ? `room-${(i % 4) + 2}` : 'room-6'),
    guestId: 'guest-1',
    checkInDate: `2026-05-${String((i % 28) + 1).padStart(2, '0')}`,
    checkOutDate: `2026-05-${String((i % 28) + 3).padStart(2, '0')}`,
    adults: 2,
    children: 0,
    nightlyRate: 85000,
    seasonalMultiplier: 1.0,
    subtotal: 170000,
    taxAmount: 0,
    totalAmount: 170000,
    status: 'CHECKED_OUT' as const,
    createdAt: `2026-05-01T10:00:00Z`,
    updatedAt: `2026-05-05T10:00:00Z`
  })),

  // Junio 2026 (28 reservas: 14 Dobles, 9 Triples, 5 Cuádruples)
  ...Array.from({ length: 28 }).map((_, i) => {
    let targetRoom = 'room-1'; // Doble
    if (i >= 14 && i < 23) {
      targetRoom = `room-${(i % 4) + 2}`; // Triple (rooms 2..5)
    } else if (i >= 23) {
      targetRoom = i % 2 === 0 ? 'room-6' : 'room-7'; // Cuádruple (rooms 6..7)
    }
    return {
      id: `res-jun-${i + 1}`,
      reservationCode: `COL-2026-60${String(i + 1).padStart(2, '0')}`,
      roomId: targetRoom,
      guestId: 'guest-2',
      checkInDate: `2026-06-${String((i % 27) + 1).padStart(2, '0')}`,
      checkOutDate: `2026-06-${String((i % 27) + 3).padStart(2, '0')}`,
      adults: 2,
      children: 0,
      nightlyRate: 85000,
      seasonalMultiplier: 1.0,
      subtotal: 170000,
      taxAmount: 0,
      totalAmount: 170000,
      status: 'CHECKED_OUT' as const,
      createdAt: `2026-06-01T10:00:00Z`,
      updatedAt: `2026-06-05T10:00:00Z`
    };
  }),

  // Julio 2026 (25 reservas)
  ...Array.from({ length: 25 }).map((_, i) => ({
    id: `res-jul-${i + 1}`,
    reservationCode: `COL-2026-70${String(i + 1).padStart(2, '0')}`,
    roomId: i % 3 === 0 ? 'room-1' : (i % 3 === 1 ? `room-${(i % 4) + 2}` : 'room-6'),
    guestId: 'guest-3',
    checkInDate: `2026-07-${String((i % 28) + 1).padStart(2, '0')}`,
    checkOutDate: `2026-07-${String((i % 28) + 3).padStart(2, '0')}`,
    adults: 2,
    children: 0,
    nightlyRate: 85000,
    seasonalMultiplier: 1.0,
    subtotal: 170000,
    taxAmount: 0,
    totalAmount: 170000,
    status: 'CHECKED_OUT' as const,
    createdAt: `2026-07-01T10:00:00Z`,
    updatedAt: `2026-07-05T10:00:00Z`
  })),

  // Agosto 2026 (22 reservas)
  ...Array.from({ length: 22 }).map((_, i) => ({
    id: `res-ago-${i + 1}`,
    reservationCode: `COL-2026-80${String(i + 1).padStart(2, '0')}`,
    roomId: i % 3 === 0 ? 'room-1' : (i % 3 === 1 ? `room-${(i % 4) + 2}` : 'room-7'),
    guestId: 'guest-1',
    checkInDate: `2026-08-${String((i % 28) + 1).padStart(2, '0')}`,
    checkOutDate: `2026-08-${String((i % 28) + 3).padStart(2, '0')}`,
    adults: 2,
    children: 0,
    nightlyRate: 85000,
    seasonalMultiplier: 1.0,
    subtotal: 170000,
    taxAmount: 0,
    totalAmount: 170000,
    status: 'CHECKED_OUT' as const,
    createdAt: `2026-08-01T10:00:00Z`,
    updatedAt: `2026-08-05T10:00:00Z`
  })),

  // Septiembre 2026 (Mes Actual: 32 reservas distribuidas: 15 Doble, 10 Triple, 7 Cuádruple)
  // Incluye las dos reservas base COL-2026-9012 y COL-2026-9108
  {
    id: 'res-101',
    reservationCode: 'COL-2026-9012',
    roomId: 'room-1',
    guestId: 'guest-1',
    checkInDate: '2026-09-20',
    checkOutDate: '2026-09-23',
    adults: 2,
    children: 0,
    nightlyRate: 85000,
    seasonalMultiplier: 1.0,
    subtotal: 255000,
    taxAmount: 0,
    totalAmount: 255000,
    status: 'CHECKED_IN',
    paymentHoldDeadline: '2026-09-10T11:00:00Z',
    specialRequests: 'Flores silvestres en la habitación por aniversario.',
    checkedInAt: '2026-09-20T15:10:00Z',
    createdAt: '2026-09-10T10:15:00Z',
    updatedAt: '2026-09-20T15:10:00Z'
  },
  {
    id: 'res-102',
    reservationCode: 'COL-2026-9108',
    roomId: 'room-3',
    guestId: 'guest-2',
    checkInDate: '2026-09-25',
    checkOutDate: '2026-09-28',
    adults: 3,
    children: 0,
    nightlyRate: 85000,
    seasonalMultiplier: 1.0,
    subtotal: 255000,
    taxAmount: 0,
    totalAmount: 255000,
    status: 'CONFIRMED',
    paymentHoldDeadline: '2026-09-12T16:00:00Z',
    specialRequests: 'Tour apícola en inglés si es posible.',
    createdAt: '2026-09-12T14:45:00Z',
    updatedAt: '2026-09-12T15:10:00Z'
  },
  // 14 adicionales para Doble (total 15 Dobles)
  ...Array.from({ length: 14 }).map((_, i) => ({
    id: `res-sep-doble-${i + 1}`,
    reservationCode: `COL-2026-92${String(i + 1).padStart(2, '0')}`,
    roomId: 'room-1', // Habitación Doble
    guestId: 'guest-1',
    checkInDate: `2026-09-${String((i % 27) + 1).padStart(2, '0')}`,
    checkOutDate: `2026-09-${String((i % 27) + 2).padStart(2, '0')}`,
    adults: 2,
    children: 0,
    nightlyRate: 85000,
    seasonalMultiplier: 1.0,
    subtotal: 85000,
    taxAmount: 0,
    totalAmount: 85000,
    status: (i < 9 ? 'CHECKED_OUT' : (i < 12 ? 'CONFIRMED' : 'CHECKED_IN')) as ReservationStatus,
    createdAt: `2026-09-01T10:00:00Z`,
    updatedAt: `2026-09-02T10:00:00Z`
  })),
  // 9 adicionales para Triple (total 10 Triples con res-102)
  ...Array.from({ length: 9 }).map((_, i) => ({
    id: `res-sep-triple-${i + 1}`,
    reservationCode: `COL-2026-93${String(i + 1).padStart(2, '0')}`,
    roomId: `room-${(i % 4) + 2}`, // Habitación Triple
    guestId: 'guest-2',
    checkInDate: `2026-09-${String(((i * 3) % 27) + 1).padStart(2, '0')}`,
    checkOutDate: `2026-09-${String(((i * 3) % 27) + 3).padStart(2, '0')}`,
    adults: 3,
    children: 0,
    nightlyRate: 85000,
    seasonalMultiplier: 1.0,
    subtotal: 170000,
    taxAmount: 0,
    totalAmount: 170000,
    status: (i < 5 ? 'CHECKED_OUT' : 'CONFIRMED') as ReservationStatus,
    createdAt: `2026-09-02T10:00:00Z`,
    updatedAt: `2026-09-03T10:00:00Z`
  })),
  // 7 para Cuádruple (total 7 Cuádruples)
  ...Array.from({ length: 7 }).map((_, i) => ({
    id: `res-sep-cuad-${i + 1}`,
    reservationCode: `COL-2026-94${String(i + 1).padStart(2, '0')}`,
    roomId: i % 2 === 0 ? 'room-6' : 'room-7', // Habitación Cuádruple
    guestId: 'guest-3',
    checkInDate: `2026-09-${String(((i * 4) % 26) + 1).padStart(2, '0')}`,
    checkOutDate: `2026-09-${String(((i * 4) % 26) + 3).padStart(2, '0')}`,
    adults: 4,
    children: 0,
    nightlyRate: 85000,
    seasonalMultiplier: 1.0,
    subtotal: 170000,
    taxAmount: 0,
    totalAmount: 170000,
    status: (i < 4 ? 'CHECKED_OUT' : 'CONFIRMED') as ReservationStatus,
    createdAt: `2026-09-03T10:00:00Z`,
    updatedAt: `2026-09-04T10:00:00Z`
  })),

  // Octubre 2026 (16 reservas)
  ...Array.from({ length: 16 }).map((_, i) => ({
    id: `res-oct-${i + 1}`,
    reservationCode: `COL-2026-10${String(i + 1).padStart(2, '0')}`,
    roomId: i % 3 === 0 ? 'room-1' : (i % 3 === 1 ? `room-${(i % 4) + 2}` : 'room-6'),
    guestId: 'guest-1',
    checkInDate: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`,
    checkOutDate: `2026-10-${String((i % 28) + 3).padStart(2, '0')}`,
    adults: 2,
    children: 0,
    nightlyRate: 85000,
    seasonalMultiplier: 1.0,
    subtotal: 170000,
    taxAmount: 0,
    totalAmount: 170000,
    status: 'CONFIRMED' as const,
    createdAt: `2026-09-15T10:00:00Z`,
    updatedAt: `2026-09-15T10:00:00Z`
  })),

  // Noviembre 2026 (19 reservas)
  ...Array.from({ length: 19 }).map((_, i) => ({
    id: `res-nov-${i + 1}`,
    reservationCode: `COL-2026-11${String(i + 1).padStart(2, '0')}`,
    roomId: i % 3 === 0 ? 'room-1' : (i % 3 === 1 ? `room-${(i % 4) + 2}` : 'room-7'),
    guestId: 'guest-2',
    checkInDate: `2026-11-${String((i % 27) + 1).padStart(2, '0')}`,
    checkOutDate: `2026-11-${String((i % 27) + 3).padStart(2, '0')}`,
    adults: 2,
    children: 0,
    nightlyRate: 85000,
    seasonalMultiplier: 1.0,
    subtotal: 170000,
    taxAmount: 0,
    totalAmount: 170000,
    status: 'CONFIRMED' as const,
    createdAt: `2026-09-16T10:00:00Z`,
    updatedAt: `2026-09-16T10:00:00Z`
  })),

  // Diciembre 2026 (26 reservas)
  ...Array.from({ length: 26 }).map((_, i) => ({
    id: `res-dic-${i + 1}`,
    reservationCode: `COL-2026-12${String(i + 1).padStart(2, '0')}`,
    roomId: i % 3 === 0 ? 'room-1' : (i % 3 === 1 ? `room-${(i % 4) + 2}` : (i % 2 === 0 ? 'room-6' : 'room-7')),
    guestId: 'guest-3',
    checkInDate: `2026-12-${String((i % 28) + 1).padStart(2, '0')}`,
    checkOutDate: `2026-12-${String((i % 28) + 3).padStart(2, '0')}`,
    adults: 2,
    children: 0,
    nightlyRate: i >= 18 ? 120000 : 85000,
    seasonalMultiplier: i >= 18 ? 1.41 : 1.0,
    subtotal: 170000,
    taxAmount: 0,
    totalAmount: 170000,
    status: 'CONFIRMED' as const,
    createdAt: `2026-09-18T10:00:00Z`,
    updatedAt: `2026-09-18T10:00:00Z`
  }))
];

export let transactions: Transaction[] = [
  {
    id: 'tx-1',
    reservationId: 'res-101',
    paymentChannel: 'BANCOLOMBIA_TRANSFER',
    amount: 255000,
    referenceCode: 'BCOL-89240192',
    proofSlipUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    verificationStatus: 'VERIFIED',
    verifiedAt: '2026-09-10T10:40:00Z',
    verifiedBy: 'Don Joaquín (Admin)',
    notes: 'Transferencia comprobada en app Bancolombia.',
    createdAt: '2026-09-10T10:25:00Z',
    updatedAt: '2026-09-10T10:40:00Z'
  },
  {
    id: 'tx-2',
    reservationId: 'res-102',
    paymentChannel: 'NEQUI',
    amount: 255000,
    referenceCode: 'NEQ-M9841245',
    proofSlipUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=600&q=80',
    verificationStatus: 'VERIFIED',
    verifiedAt: '2026-09-12T15:10:00Z',
    verifiedBy: 'Don Joaquín (Admin)',
    notes: 'Comprobante Nequi verificado.',
    createdAt: '2026-09-12T15:00:00Z',
    updatedAt: '2026-09-12T15:10:00Z'
  }
];

export const chatDecisionTree: ChatNode[] = [
  {
    id: 'root',
    category: 'inicio',
    userQuestion: 'Bienvenido a Finca La Colmena de Don Juaco',
    botAnswer: '¡Hola! Bienvenido a Finca La Colmena de Don Juaco 🐝. Contamos con 7 confortables habitaciones con TV, ventilador, toallas, agua caliente, wifi y delicioso desayuno campesino incluido. ¿En qué te podemos colaborar hoy?',
    quickReplies: [
      { label: '🏡 Habitaciones y Tarifas ($85.000 / $120.000)', nextNodeId: 'tarifas_habitaciones' },
      { label: '📍 ¿Dónde nos ubicamos? (Google Maps)', nextNodeId: 'como_llegar' },
      { label: '🍯 Experiencias de la Finca', nextNodeId: 'experiencias' },
      { label: '☕ ¿Qué incluye el desayuno?', nextNodeId: 'desayuno' },
      { label: '💬 Hablar con Don Juaco en WhatsApp', action: 'whatsapp' }
    ]
  },
  {
    id: 'tarifas_habitaciones',
    category: 'tarifas',
    userQuestion: '¿Cuáles son las tarifas y cómo son las 7 habitaciones?',
    botAnswer: 'En Finca La Colmena organizamos nuestras habitaciones según su capacidad para que disfrutes con total comodidad:\n\n• Temporada Baja: $85.000 COP por noche (¡Desayuno campesino incluido!).\n• Temporada Alta (del 20 de diciembre al 20 de enero): $120.000 COP por noche (¡Desayuno campesino incluido!).\n\nDistribución según capacidad:\n• Habitación Doble (2 personas): 1 cama doble matrimonial.\n• Habitaciones Triples (3 personas): 1 cama doble + 1 cama sencilla.\n• Habitaciones Cuádruples (4 personas): Camas dobles y sencillas.\nTodas incluyen TV, ventilador, toallas, agua caliente y wifi.',
    quickReplies: [
      { label: '🗓️ Reservar Habitación', action: 'book' },
      { label: '📍 Ver Ubicación en Maps', nextNodeId: 'como_llegar' },
      { label: '🔙 Menú Principal', nextNodeId: 'root' }
    ]
  },
  {
    id: 'desayuno',
    category: 'alimentacion',
    userQuestion: '¿Qué incluye el desayuno campesino?',
    botAnswer: '¡Tanto en temporada baja ($85.000) como en temporada alta ($120.000), el desayuno campesino tradicional está 100% incluido! Servimos huevos frescos al gusto, arepa tradicional de choclo o maíz con queso campesino, miel pura de la finca, fruta fresca y chocolate o café especial recién colado.',
    quickReplies: [
      { label: '🗓️ Ver Disponibilidad', action: 'book' },
      { label: '🔙 Menú Principal', nextNodeId: 'root' },
      { label: '💬 Consultar por WhatsApp', action: 'whatsapp' }
    ]
  },
  {
    id: 'como_llegar',
    category: 'ubicacion',
    userQuestion: '¿Dónde están ubicados y cómo llegar?',
    botAnswer: 'Estamos ubicados en el corazón del Quindío, a pocos minutos de Panaca y el Parque del Café. Puedes abrir nuestra ubicación exacta directamente en Google Maps aquí:\nhttps://maps.app.goo.gl/md6fqEjjRVBKxoP68\nAcceso fácil por carretera pavimentada.',
    quickReplies: [
      { label: '🗺️ Abrir Google Maps', nextNodeId: 'como_llegar' },
      { label: '🏡 Ver Habitaciones', action: 'book' },
      { label: '🔙 Menú Principal', nextNodeId: 'root' }
    ]
  },
  {
    id: 'experiencias',
    category: 'experiencias',
    userQuestion: '¿Qué experiencias se pueden vivir en la finca?',
    botAnswer: 'Podrás recorrer los cafetales tradicionales, conocer el fascinante mundo de la apicultura, observar el meliponario de abejas nativas sin aguijón, saborear mieles puras y descansar en un entorno natural con total tranquilidad.',
    quickReplies: [
      { label: '🗓️ Reservar Ahora', action: 'book' },
      { label: '🔙 Menú Principal', nextNodeId: 'root' }
    ]
  }
];

// ==========================================
// Helper calculation functions
// ==========================================

/**
 * Checks if a given date string or Date falls in the High Season window:
 * From December 20 to January 20 (every year cycle).
 */
export function isDateInHighSeason(dateInput: string | Date): boolean {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const month = d.getUTCMonth(); // 0 = Jan, 11 = Dec
  const day = d.getUTCDate();

  // Dec 20 to Dec 31
  if (month === 11 && day >= 20) return true;
  // Jan 1 to Jan 20
  if (month === 0 && day <= 20) return true;

  return false;
}

export function calculateSeasonalMultiplier(checkInDate: string, checkOutDate: string): { multiplier: number; appliedSeason?: SeasonRate; isHighSeason: boolean } {
  const inDate = new Date(checkInDate);
  const outDate = new Date(checkOutDate);

  // Check database season rates configured by admin:
  // A stay [checkInDate, checkOutDate) overlaps a season [startDate, endDate] if inDate < sEnd and outDate > sStart
  for (const season of seasonRates) {
    if (!season.isActive) continue;
    const sStart = new Date(season.startDate);
    const sEnd = new Date(season.endDate);

    if (inDate < sEnd && outDate > sStart) {
      return { 
        multiplier: season.multiplier, 
        appliedSeason: season,
        isHighSeason: season.multiplier > 1.0
      };
    }
  }

  return { multiplier: 1.0, isHighSeason: false };
}

export function isRoomAvailable(roomId: string, checkInDate: string, checkOutDate: string, excludeReservationId?: string): boolean {
  const room = rooms.find(r => r.id === roomId);
  if (!room || room.outOfService) return false;

  const reqCheckIn = new Date(checkInDate);
  const reqCheckOut = new Date(checkOutDate);

  const activeReservations = reservations.filter(res => {
    if (excludeReservationId && res.id === excludeReservationId) return false;
    if (res.roomId !== roomId) return false;
    if (res.status === 'CANCELLED' || res.status === 'CHECKED_OUT') return false;

    // Check if pending payment expired
    if (res.status === 'PENDING_PAYMENT') {
      const deadline = new Date(res.paymentHoldDeadline || 0);
      if (Date.now() > deadline.getTime()) {
        res.status = 'CANCELLED';
        res.cancellationReason = 'Expiró el tiempo de espera de pago (25 minutos).';
        return false;
      }
    }

    const resIn = new Date(res.checkInDate);
    const resOut = new Date(res.checkOutDate);

    // Date overlap: (reqCheckIn < resOut) && (reqCheckOut > resIn)
    return (reqCheckIn < resOut && reqCheckOut > resIn);
  });

  return activeReservations.length === 0;
}

export function validateStateTransition(currentStatus: ReservationStatus, nextStatus: ReservationStatus): { valid: boolean; reason?: string } {
  if (currentStatus === nextStatus) return { valid: true };

  const validTransitions: Record<ReservationStatus, ReservationStatus[]> = {
    PENDING_PAYMENT: ['CONFIRMED', 'CHECKED_IN', 'CANCELLED'],
    CONFIRMED: ['CHECKED_IN', 'CANCELLED'],
    CHECKED_IN: ['CHECKED_OUT', 'CANCELLED'],
    CHECKED_OUT: ['CHECKED_IN'],
    CANCELLED: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN']
  };

  const allowed = validTransitions[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    return { 
      valid: false, 
      reason: `No se permite la transición de estado desde "${currentStatus}" hacia "${nextStatus}".` 
    };
  }

  return { valid: true };
}

// ==========================================
// PERSISTENCE ENGINE (JSON Store)
// Ensures all room edits, photos, reservations,
// and settings survive server restarts and reloads.
// ==========================================
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db_store.json');

let isPostgresSyncing = false;

export function saveDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const payload = {
      rooms,
      guests,
      reservations,
      transactions,
      seasonRates,
      seasonalPhotos,
      settings
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');

    // Asynchronously push to PostgreSQL / Supabase if configured
    const pool = getPostgresPool();
    if (pool && !isPostgresSyncing) {
      isPostgresSyncing = true;
      migrateLocalDataToPostgres({
        rooms,
        guests,
        reservations,
        transactions,
        seasonRates,
        settings
      })
        .then(() => {
          isPostgresSyncing = false;
        })
        .catch((err) => {
          isPostgresSyncing = false;
          console.warn('⚠️ Sincronización asíncrona con PostgreSQL falló (los datos permanecen seguros localmente):', err.message);
        });
    }
  } catch (err) {
    console.error('Error guardando base de datos persistente:', err);
  }
}

export function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.rooms) && data.rooms.length > 0) {
        // Preserve custom uploaded photos, basePrice, capacity, bedType, description, and outOfService status while enforcing the official room definitions
        rooms.forEach((defaultRoom) => {
          const stored = data.rooms.find((r: Room) => r.id === defaultRoom.id);
          if (stored) {
            if (Array.isArray(stored.images) && stored.images.length > 0) {
              defaultRoom.images = stored.images;
            }
            if (typeof stored.basePrice === 'number' && stored.basePrice > 0) {
              defaultRoom.basePrice = stored.basePrice;
            }
            if (typeof stored.capacity === 'number' && stored.capacity > 0) {
              defaultRoom.capacity = stored.capacity;
            }
            if (stored.bedType && typeof stored.bedType === 'string' && stored.bedType.trim()) {
              defaultRoom.bedType = stored.bedType;
            }
            if (stored.description && typeof stored.description === 'string' && stored.description.trim()) {
              defaultRoom.description = stored.description;
            }
            if (typeof stored.outOfService === 'boolean') {
              defaultRoom.outOfService = stored.outOfService;
              defaultRoom.outOfServiceReason = stored.outOfServiceReason || '';
            }
          }
        });
      }
      if (Array.isArray(data.guests) && data.guests.length > 0) {
        guests.length = 0;
        guests.push(...data.guests);
      }
      if (Array.isArray(data.reservations) && data.reservations.length > 0) {
        reservations.length = 0;
        reservations.push(...data.reservations);
      }
      if (Array.isArray(data.transactions) && data.transactions.length > 0) {
        transactions.length = 0;
        transactions.push(...data.transactions);
      }
      if (Array.isArray(data.seasonRates) && data.seasonRates.length > 0) {
        seasonRates.length = 0;
        seasonRates.push(...data.seasonRates);
      }
      if (Array.isArray(data.seasonalPhotos) && data.seasonalPhotos.length > 0) {
        data.seasonalPhotos.forEach((stored: SeasonalPhoto) => {
          const found = seasonalPhotos.find(sp => sp.id === stored.id);
          if (found && stored.photoUrl) {
            found.photoUrl = stored.photoUrl;
            if (stored.updatedAt) found.updatedAt = stored.updatedAt;
          }
        });
      }
      if (data.settings && typeof data.settings === 'object') {
        Object.assign(settings, data.settings);
      }

      // Ensure transactions exist for reservations to maintain financial consistency and integrity
      const channelsList: PaymentChannel[] = ['BANCOLOMBIA_TRANSFER', 'NEQUI', 'BANCO_AGRARIO', 'CREDIT_CARD'];
      const existingTxResIds = new Set(transactions.map(t => t.reservationId));

      reservations.forEach((res, index) => {
        if (!existingTxResIds.has(res.id)) {
          const channel = channelsList[index % channelsList.length];
          const isFull = (index % 3 === 0);
          const advance = isFull ? res.totalAmount : Math.round(res.totalAmount * 0.5);
          const isPending = res.status === 'PENDING_PAYMENT';
          const isCancelled = res.status === 'CANCELLED';

          const createdDate = res.createdAt || `${res.checkInDate}T10:00:00Z`;
          transactions.push({
            id: `tx-res-${res.id}-1`,
            reservationId: res.id,
            paymentChannel: channel,
            amount: advance,
            referenceCode: `${channel.slice(0, 4)}-${res.reservationCode.replace(/\D/g, '') || Math.floor(100000 + Math.random() * 900000)}`,
            verificationStatus: isPending ? 'PENDING' : (isCancelled ? 'REJECTED' : 'VERIFIED'),
            rejectionReason: isCancelled ? (res.cancellationReason || 'Comprobante no coincide con la cuenta o no es legible.') : undefined,
            verifiedAt: (!isPending && !isCancelled) ? createdDate : undefined,
            verifiedBy: (!isPending && !isCancelled) ? 'Don Joaquín (Admin)' : undefined,
            paymentType: isFull ? 'PAGO_TOTAL' : 'ANTICIPO',
            notes: isFull ? 'Pago total anticipado del 100%' : 'Anticipo del 50% para garantía de reserva',
            createdAt: createdDate,
            updatedAt: createdDate
          });

          // If checked in or checked out and was not full payment, record the remaining balance payment
          if (!isFull && (res.status === 'CHECKED_IN' || res.status === 'CHECKED_OUT')) {
            const balanceAmount = res.totalAmount - advance;
            const checkInDateTime = res.checkedInAt || `${res.checkInDate}T15:00:00Z`;
            const balanceChannel = channelsList[(index + 1) % channelsList.length];
            transactions.push({
              id: `tx-res-${res.id}-2`,
              reservationId: res.id,
              paymentChannel: balanceChannel,
              amount: balanceAmount,
              referenceCode: `${balanceChannel.slice(0, 4)}-BAL-${res.reservationCode.replace(/\D/g, '')}`,
              verificationStatus: 'VERIFIED',
              verifiedAt: checkInDateTime,
              verifiedBy: 'Don Joaquín (Admin)',
              paymentType: 'SALDO_RESTANTE',
              notes: 'Liquidación de saldo pendiente al realizar el check-in',
              createdAt: checkInDateTime,
              updatedAt: checkInDateTime
            });
          }
        }
      });

      // Ensure today's date (2026-10-21) has active transactions across all 4 channels for the daily cash close
      const todayStr = '2026-10-21';
      const hasTodayTx = transactions.some(t => (t.verifiedAt || t.createdAt || '').startsWith(todayStr));
      if (!hasTodayTx && reservations.length > 0) {
        const octReservations = reservations.filter(r => r.checkInDate.startsWith('2026-10') && r.status !== 'CANCELLED');
        const targetRes = octReservations.slice(0, 4);
        
        targetRes.forEach((res, i) => {
          const ch = channelsList[i % channelsList.length];
          const txId = `tx-today-${i + 1}`;
          if (!transactions.some(t => t.id === txId)) {
            transactions.unshift({
              id: txId,
              reservationId: res.id,
              paymentChannel: ch,
              amount: i % 2 === 0 ? Math.round(res.totalAmount * 0.5) : res.totalAmount,
              referenceCode: `${ch.slice(0, 4)}-${todayStr.replace(/-/g, '')}-${i + 1}`,
              verificationStatus: 'VERIFIED',
              verifiedAt: `${todayStr}T0${9 + i}:30:00.000Z`,
              verifiedBy: 'Don Joaquín (Admin)',
              paymentType: i % 2 === 0 ? 'ANTICIPO' : 'PAGO_TOTAL',
              notes: `Recaudo registrado el día ${todayStr} vía ${ch}`,
              createdAt: `${todayStr}T0${9 + i}:15:00.000Z`,
              updatedAt: `${todayStr}T0${9 + i}:30:00.000Z`
            });
          }
        });
      }

      saveDatabase();
      console.log('✅ Base de datos persistente cargada con éxito y sincronizada con Finanzas');
    } else {
      saveDatabase();
    }
  } catch (err) {
    console.error('Error cargando base de datos persistente:', err);
  }
}

/**
 * Connects to PostgreSQL / Supabase if DATABASE_URL is configured.
 * Initializes schema and either populates empty tables or pulls live data.
 */
export async function syncWithPostgres(): Promise<{ connected: boolean; message: string }> {
  try {
    const pool = getPostgresPool();
    if (!pool) {
      return { connected: false, message: 'DATABASE_URL no configurada. Operando en almacenamiento local.' };
    }

    console.log('🔄 Verificando esquema en PostgreSQL / Supabase...');
    const schemaOk = await initializePostgresSchema();
    if (!schemaOk) {
      return { connected: false, message: 'Fallo al verificar o crear esquema en PostgreSQL.' };
    }

    const health = await checkPostgresHealth();
    if (health.isConnected && health.tableCounts) {
      if (health.tableCounts.rooms === 0) {
        console.log('🚀 Tablas de PostgreSQL vacías detectadas. Sembrando datos iniciales de Finca La Colmena...');
        const migration = await migrateLocalDataToPostgres({
          rooms,
          guests,
          reservations,
          transactions,
          seasonRates,
          settings
        });
        console.log(`✅ Siembra en PostgreSQL finalizada:`, migration.insertedCounts);
        return { connected: true, message: 'Tablas creadas y datos migrados con éxito a PostgreSQL.' };
      } else {
        console.log('📥 Cargando registros vivos desde PostgreSQL / Supabase...');
        const remoteData = await loadDataFromPostgres();
        if (remoteData) {
          if (remoteData.rooms.length > 0) {
            rooms.length = 0;
            rooms.push(...remoteData.rooms);
          }
          if (remoteData.guests.length > 0) {
            guests.length = 0;
            guests.push(...remoteData.guests);
          }
          if (remoteData.reservations.length > 0) {
            reservations.length = 0;
            reservations.push(...remoteData.reservations);
          }
          if (remoteData.transactions.length > 0) {
            transactions.length = 0;
            transactions.push(...remoteData.transactions);
          }
          if (remoteData.seasonRates.length > 0) {
            seasonRates.length = 0;
            seasonRates.push(...remoteData.seasonRates);
          }
          if (remoteData.settings) {
            Object.assign(settings, remoteData.settings);
          }
          console.log(`✅ Datos sincronizados desde PostgreSQL: ${rooms.length} habitaciones, ${reservations.length} reservas.`);
          return { connected: true, message: `Conectado y sincronizado con PostgreSQL (${rooms.length} habitaciones cargadas).` };
        }
      }
    }
    return { connected: false, message: health.error || 'No se pudo conectar a PostgreSQL' };
  } catch (err: any) {
    console.warn('⚠️ Error en sincronización inicial con PostgreSQL:', err.message);
    return { connected: false, message: err.message };
  }
}

// Automatically load persisted state on initial boot
loadDatabase();
syncWithPostgres().catch(err => console.warn('Sync postgres background error:', err.message));

