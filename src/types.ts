export type DocumentType = 'CC' | 'CE' | 'PASSPORT' | 'NIT' | 'OTHER';

export type ReservationStatus = 
  | 'PENDING_PAYMENT' 
  | 'CONFIRMED' 
  | 'CHECKED_IN' 
  | 'CHECKED_OUT' 
  | 'CANCELLED';

export type PaymentChannel = 
  | 'NEQUI' 
  | 'DAVIPLATA' 
  | 'BANCOLOMBIA_TRANSFER' 
  | 'BANCO_AGRARIO'
  | 'CREDIT_CARD' 
  | 'CASH_ON_SITE';

export type PaymentType = 'ANTICIPO' | 'PAGO_TOTAL' | 'SALDO_RESTANTE' | 'PAGO_PARCIAL';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface Room {
  id: string;
  roomNumber: string;
  name: string;
  slug: string;
  description: string;
  capacity: number;
  basePrice: number;
  outOfService: boolean;
  outOfServiceReason?: string;
  bedType: string;
  viewType: string;
  squareMeters: number;
  amenities: string[];
  images: string[];
  sortOrder: number;
  calculatedNightlyRate?: number;
  totalAmount?: number;
  nights?: number;
  multiplier?: number;
  seasonalRuleApplied?: string | null;
  meetsMinStay?: boolean;
  minStayRequired?: number;
}

export interface Guest {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  emergencyContact?: string;
  notes?: string;
}

export interface Reservation {
  id: string;
  reservationCode: string;
  roomId: string;
  room?: Room;
  guestId: string;
  guest?: Guest;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  nightlyRate: number;
  seasonalMultiplier: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: ReservationStatus;
  paymentHoldDeadline?: string;
  specialRequests?: string;
  cancellationReason?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  confirmationSent?: boolean;
  confirmationSentAt?: string;
  reminderSent?: boolean;
  reminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
  transactions?: Transaction[];
}

export interface Transaction {
  id: string;
  reservationId: string;
  paymentChannel: PaymentChannel;
  amount: number;
  referenceCode: string;
  proofSlipUrl?: string;
  proofSlipBase64?: string;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
  paymentType?: PaymentType;
  notificationSent?: boolean;
  notificationSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeasonRate {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  nightsCount?: number;
  multiplier: number;
  minimumStayNights: number;
  isActive: boolean;
}

export interface SeasonalPhoto {
  id: string;
  seasonName: string;
  badge: string;
  defaultPath: string;
  photoUrl: string;
  description: string;
  recommendation?: string;
  updatedAt?: string;
}

export interface EstateSettings {
  id: string;
  propertyName: string;
  tagline: string;
  phone: string;
  email: string;
  whatsappNumber: string;
  locationAddress: string;
  checkInTime: string;
  checkOutTime: string;
  defaultMinStayNights: number;
  paymentHoldMinutes: number;
  bancolombiaAccountType: string;
  bancolombiaAccountNumber: string;
  bancolombiaHolderName: string;
  bancolombiaNit: string;
  nequiNumber: string;
  daviplataNumber: string;
  bancoAgrarioAccountType?: string;
  bancoAgrarioAccountNumber?: string;
  bancoAgrarioHolderName?: string;
  bancoAgrarioNit?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  notificationSenderName?: string;
  updatedAt: string;
}

export interface ChatNode {
  id: string;
  category: string;
  userQuestion: string;
  botAnswer: string;
  quickReplies: { label: string; nextNodeId?: string; action?: 'whatsapp' | 'book' | 'node' }[];
  requiresWhatsAppEscalation?: boolean;
}

export type AppModule = 
  | 'inicio' 
  | 'quienes-somos' 
  | 'nuestra-historia' 
  | 'experiencias' 
  | 'donde-nos-ubicamos' 
  | 'admin';

