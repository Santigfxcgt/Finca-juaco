import { ReservationStatus, PaymentChannel, VerificationStatus } from '../types';

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDateEs(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function formatShortDate(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length < 3) return dateString;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${parseInt(parts[2], 10)} ${months[monthIdx] || ''}`;
}

export function getStatusBadge(status: ReservationStatus): { label: string; bg: string; text: string; border: string } {
  switch (status) {
    case 'PENDING_PAYMENT':
      return {
        label: 'Pendiente de Pago',
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-300'
      };
    case 'CONFIRMED':
      return {
        label: 'Confirmada',
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-300'
      };
    case 'CHECKED_IN':
      return {
        label: 'En Hospedaje (Check-in)',
        bg: 'bg-indigo-50',
        text: 'text-indigo-800',
        border: 'border-indigo-300'
      };
    case 'CHECKED_OUT':
      return {
        label: 'Finalizada (Check-out)',
        bg: 'bg-stone-100',
        text: 'text-stone-700',
        border: 'border-stone-300'
      };
    case 'CANCELLED':
      return {
        label: 'Cancelada',
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-300'
      };
    default:
      return {
        label: status,
        bg: 'bg-stone-50',
        text: 'text-stone-700',
        border: 'border-stone-200'
      };
  }
}

export function getPaymentChannelLabel(channel: PaymentChannel): string {
  switch (channel) {
    case 'BANCOLOMBIA_TRANSFER':
      return 'Bancolombia';
    case 'NEQUI':
      return 'Nequi';
    case 'BANCO_AGRARIO':
      return 'Banco Agrario';
    case 'CREDIT_CARD':
      return 'Tarjeta de Crédito';
    case 'DAVIPLATA':
      return 'Daviplata';
    case 'CASH_ON_SITE':
      return 'Efectivo en Finca';
    default:
      return channel;
  }
}

export function getVerificationStatusBadge(status: VerificationStatus): { label: string; color: string } {
  switch (status) {
    case 'PENDING':
      return { label: 'Por Validar', color: 'bg-amber-100 text-amber-800' };
    case 'VERIFIED':
      return { label: 'Aprobado', color: 'bg-emerald-100 text-emerald-800' };
    case 'REJECTED':
      return { label: 'Rechazado', color: 'bg-rose-100 text-rose-800' };
  }
}

export function getPaymentTypeLabel(type?: string): string {
  switch (type) {
    case 'ANTICIPO':
      return 'Anticipo (50%)';
    case 'PAGO_TOTAL':
      return 'Pago Total (100%)';
    case 'SALDO_RESTANTE':
      return 'Saldo Restante';
    case 'PAGO_PARCIAL':
      return 'Abono Parcial';
    default:
      return 'Abono';
  }
}

export function formatTimeEs(dateString?: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  } catch {
    return '';
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTomorrowDateString(fromDateString?: string): string {
  const base = fromDateString ? new Date(`${fromDateString}T12:00:00`) : new Date();
  base.setDate(base.getDate() + 1);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
