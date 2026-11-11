import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Eye, 
  RefreshCw, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Filter, 
  Search, 
  RotateCcw, 
  Send, 
  MessageCircle, 
  Mail, 
  PlusCircle, 
  TrendingUp, 
  Wallet, 
  ShieldCheck, 
  Clock, 
  ExternalLink, 
  Image as ImageIcon, 
  ZoomIn, 
  X, 
  AlertTriangle,
  Receipt,
  User,
  Home,
  Check,
  Copy,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { VoucherModal } from './VoucherModal';
import { 
  Reservation, 
  Transaction, 
  Room, 
  EstateSettings, 
  PaymentChannel, 
  VerificationStatus,
  PaymentType,
  ReservationStatus 
} from '../../types';
import { 
  formatCOP, 
  formatDateEs, 
  formatShortDate, 
  getPaymentChannelLabel, 
  getVerificationStatusBadge, 
  getPaymentTypeLabel,
  getStatusBadge,
  formatTimeEs 
} from '../../utils/formatters';

interface FinancesManagerProps {
  reservations: Reservation[];
  transactions: Transaction[];
  rooms: Room[];
  settings: EstateSettings | null;
  onRefreshData: () => Promise<void>;
  onVerifyTransaction: (id: string, status: VerificationStatus, reason?: string) => Promise<void>;
  onStatusChange?: (id: string, nextStatus: ReservationStatus, reason?: string) => Promise<void>;
}

export const FinancesManager: React.FC<FinancesManagerProps> = ({
  reservations,
  transactions,
  rooms,
  settings,
  onRefreshData,
  onVerifyTransaction,
  onStatusChange
}) => {
  // Navigation Sub-Tabs within Finances Module
  const [subTab, setSubTab] = useState<'payments' | 'verification' | 'dailyClose' | 'reports'>('payments');

  // Global Toast & Feedback Messages
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string; actionUrl?: string; actionLabel?: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const showToast = (type: 'success' | 'error' | 'info', text: string, actionUrl?: string, actionLabel?: string) => {
    setToast({ type, text, actionUrl, actionLabel });
    setTimeout(() => {
      setToast(null);
    }, 7000);
  };

  // Helper map: Reservations keyed by ID
  const reservationsMap = useMemo(() => {
    const map = new Map<string, Reservation>();
    reservations.forEach(r => map.set(r.id, r));
    return map;
  }, [reservations]);

  // Helper map: Rooms keyed by ID
  const roomsMap = useMemo(() => {
    const map = new Map<string, Room>();
    rooms.forEach(r => map.set(r.id, r));
    return map;
  }, [rooms]);

  // Helper: Get verified payments sum for a reservation
  const getPaidAmountForReservation = (resId: string): number => {
    return transactions
      .filter(t => t.reservationId === resId && t.verificationStatus === 'VERIFIED')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Helper: Get remaining balance for a reservation
  const getBalanceForReservation = (res: Reservation): number => {
    const paid = getPaidAmountForReservation(res.id);
    return Math.max(0, res.totalAmount - paid);
  };

  // Helper: Get all transactions for a reservation
  const getTransactionsForReservation = (resId: string): Transaction[] => {
    return transactions.filter(t => t.reservationId === resId);
  };

  // ========================================================
  // SUB-TAB 1: GESTIÓN DE PAGOS & SALDOS
  // ========================================================
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [balanceStatusFilter, setBalanceStatusFilter] = useState<'ALL' | 'PENDING_BALANCE' | 'PAID_FULL'>('ALL');

  // Modal: Register Manual Payment / Advance
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedResForPayment, setSelectedResForPayment] = useState<Reservation | null>(null);
  const [manualForm, setManualForm] = useState({
    reservationId: '',
    amount: '',
    paymentChannel: 'BANCOLOMBIA_TRANSFER' as PaymentChannel,
    paymentType: 'ANTICIPO' as PaymentType,
    referenceCode: '',
    notes: '',
    markAsVerified: true,
    paymentDate: new Date().toISOString().split('T')[0]
  });

  const openPaymentModal = (res?: Reservation) => {
    const target = res || reservations[0] || null;
    setSelectedResForPayment(target);
    const balance = target ? getBalanceForReservation(target) : 0;
    const defaultAmount = balance > 0 ? balance : (target ? Math.round(target.totalAmount * 0.5) : 0);
    
    setManualForm({
      reservationId: target ? target.id : '',
      amount: defaultAmount > 0 ? String(defaultAmount) : '',
      paymentChannel: 'BANCOLOMBIA_TRANSFER',
      paymentType: balance === 0 ? 'ANTICIPO' : (balance < (target?.totalAmount || 0) ? 'SALDO_RESTANTE' : 'PAGO_TOTAL'),
      referenceCode: `MAN-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: target ? `Abono registrado para reserva ${target.reservationCode}` : '',
      markAsVerified: true,
      paymentDate: new Date().toISOString().split('T')[0]
    });
    setIsPaymentModalOpen(true);
  };

  const handleSelectReservationInModal = (resId: string) => {
    const target = reservationsMap.get(resId) || null;
    setSelectedResForPayment(target);
    const balance = target ? getBalanceForReservation(target) : 0;
    const defaultAmount = balance > 0 ? balance : (target ? Math.round(target.totalAmount * 0.5) : 0);
    
    setManualForm(prev => ({
      ...prev,
      reservationId: resId,
      amount: String(defaultAmount),
      paymentType: balance === 0 ? 'ANTICIPO' : (balance < (target?.totalAmount || 0) ? 'SALDO_RESTANTE' : 'PAGO_TOTAL'),
      notes: target ? `Abono registrado para reserva ${target.reservationCode}` : ''
    }));
  };

  const handleSaveManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.reservationId) {
      showToast('error', 'Por favor selecciona una reserva para asociar el pago.');
      return;
    }
    const numAmount = Number(manualForm.amount);
    if (!numAmount || numAmount <= 0) {
      showToast('error', 'El monto a registrar debe ser superior a $0 COP.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/finances/manual-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'token-admin-donjuaco-session-2026'
        },
        body: JSON.stringify(manualForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `¡Pago de ${formatCOP(numAmount)} registrado exitosamente!`);
        setIsPaymentModalOpen(false);
        await onRefreshData();
      } else {
        showToast('error', data.error || 'No se pudo guardar el pago.');
      }
    } catch {
      showToast('error', 'Error de conexión al guardar el registro financiero.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered reservations list for Payments table
  const filteredReservationsList = useMemo(() => {
    return reservations.filter(res => {
      // Exclude cancelled unless searched
      if (res.status === 'CANCELLED' && !searchQuery.trim()) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = res.reservationCode.toLowerCase().includes(q);
        const guestNameMatch = (res.guest?.fullName || '').toLowerCase().includes(q);
        const docMatch = (res.guest?.documentNumber || '').toLowerCase().includes(q);
        const phoneMatch = (res.guest?.phone || '').includes(q);
        if (!codeMatch && !guestNameMatch && !docMatch && !phoneMatch) return false;
      }

      // Balance filter
      const balance = getBalanceForReservation(res);
      if (balanceStatusFilter === 'PENDING_BALANCE' && balance <= 0) return false;
      if (balanceStatusFilter === 'PAID_FULL' && balance > 0) return false;

      // Channel filter
      if (channelFilter !== 'ALL') {
        const resTxs = getTransactionsForReservation(res.id);
        const hasChannel = resTxs.some(t => t.paymentChannel === channelFilter);
        if (!hasChannel) return false;
      }

      return true;
    });
  }, [reservations, searchQuery, channelFilter, balanceStatusFilter, transactions]);

  // Overall Financial KPIs
  const financialKPIs = useMemo(() => {
    // Total invoiced from active non-cancelled reservations
    const totalInvoiced = reservations
      .filter(r => r.status !== 'CANCELLED')
      .reduce((sum, r) => sum + r.totalAmount, 0);

    // Total verified collected money
    const totalCollected = transactions
      .filter(t => t.verificationStatus === 'VERIFIED')
      .reduce((sum, t) => sum + t.amount, 0);

    // Total advances received (transactions marked ANTICIPO or partial)
    const totalAdvances = transactions
      .filter(t => t.verificationStatus === 'VERIFIED' && (t.paymentType === 'ANTICIPO' || t.amount < (reservationsMap.get(t.reservationId)?.totalAmount || t.amount + 1)))
      .reduce((sum, t) => sum + t.amount, 0);

    // Total pending balance to collect from active reservations (CONFIRMED, CHECKED_IN, PENDING_PAYMENT)
    const totalPendingBalance = reservations
      .filter(r => r.status !== 'CANCELLED' && r.status !== 'CHECKED_OUT')
      .reduce((sum, r) => {
        const paid = transactions
          .filter(t => t.reservationId === r.id && t.verificationStatus === 'VERIFIED')
          .reduce((s, t) => s + t.amount, 0);
        return sum + Math.max(0, r.totalAmount - paid);
      }, 0);

    // Count and amount of pending verification vouchers
    const pendingTxs = transactions.filter(t => t.verificationStatus === 'PENDING');
    const pendingVerificationCount = pendingTxs.length;
    const pendingVerificationAmount = pendingTxs.reduce((sum, t) => sum + t.amount, 0);

    return {
      totalInvoiced,
      totalCollected,
      totalAdvances,
      totalPendingBalance,
      pendingVerificationCount,
      pendingVerificationAmount
    };
  }, [reservations, transactions, reservationsMap]);

  // ========================================================
  // SUB-TAB 2: VERIFICACIÓN DE TRANSFERENCIAS
  // ========================================================
  const [verificationFilter, setVerificationFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');
  const [inspectingSlipTx, setInspectingSlipTx] = useState<Transaction | null>(null);
  const [fullVoucherTx, setFullVoucherTx] = useState<Transaction | null>(null);
  const [rejectModalTx, setRejectModalTx] = useState<Transaction | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState('El comprobante no coincide con la cuenta o no es legible en extracto bancario.');
  const [notifyingTxId, setNotifyingTxId] = useState<string | null>(null);

  const filteredTransfers = useMemo(() => {
    return transactions.filter(tx => {
      if (verificationFilter === 'ALL') return true;
      return tx.verificationStatus === verificationFilter;
    });
  }, [transactions, verificationFilter]);

  const handleApproveTransfer = async (txId: string) => {
    setIsProcessing(true);
    try {
      await onVerifyTransaction(txId, 'VERIFIED');
      showToast('success', '¡Pago aprobado con éxito! La reserva ha sido confirmada en el sistema.');
      setInspectingSlipTx(null);
    } catch {
      showToast('error', 'Error al verificar el pago con el servidor.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalTx) return;
    setIsProcessing(true);
    try {
      await onVerifyTransaction(rejectModalTx.id, 'REJECTED', rejectReasonText);
      showToast('info', 'Comprobante rechazado. La reserva ha sido cancelada para liberar disponibilidad.');
      setRejectModalTx(null);
      setInspectingSlipTx(null);
    } catch {
      showToast('error', 'Error al rechazar el comprobante.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendNotification = async (txId: string, channel: 'email' | 'whatsapp') => {
    setNotifyingTxId(txId);
    try {
      const res = await fetch('/api/finances/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId, channel })
      });
      const data = await res.json();
      if (channel === 'email') {
        if (data.email?.success) {
          showToast('success', `¡Recibo oficial despachado correctamente a ${data.email?.message || 'huésped'}!`);
          await onRefreshData();
        } else {
          showToast('error', data.email?.message || 'El servicio SMTP de correo no está configurado en Ajustes.');
        }
      } else if (channel === 'whatsapp') {
        if (data.whatsapp?.url) {
          // Open WhatsApp Click-to-chat directly
          window.open(data.whatsapp.url, '_blank');
          showToast('success', 'Ventana oficial de WhatsApp generada con el recibo y comprobante listo para enviar.', data.whatsapp.url, 'Reabrir WhatsApp');
        } else {
          showToast('error', 'No se pudo generar el enlace de WhatsApp para este huésped.');
        }
      }
    } catch {
      showToast('error', 'Error despachando notificación.');
    } finally {
      setNotifyingTxId(null);
    }
  };

  // ========================================================
  // SUB-TAB 3: CIERRE DE CAJA DIARIO (ARQUEO)
  // ========================================================
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedCloseDate, setSelectedCloseDate] = useState<string>(todayDateStr);
  const [dailyCloseData, setDailyCloseData] = useState<any>(null);
  const [isLoadingClose, setIsLoadingClose] = useState<boolean>(false);

  const fetchDailyClose = async (dateStr: string) => {
    setIsLoadingClose(true);
    try {
      const res = await fetch(`/api/finances/daily-close?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setDailyCloseData(data);
      }
    } catch (err) {
      console.error('Error cargando cierre de caja:', err);
    } finally {
      setIsLoadingClose(false);
    }
  };

  useEffect(() => {
    if (subTab === 'dailyClose') {
      fetchDailyClose(selectedCloseDate);
    }
  }, [subTab, selectedCloseDate]);

  // Export Daily Close in PDF
  const handleExportDailyClosePDF = () => {
    if (!dailyCloseData) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Brand Header
      doc.setFillColor(27, 67, 50); // #1B4332
      doc.rect(0, 0, 210, 28, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('TURIM . JUACO • FINCA LA COLMENA', 14, 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(209, 231, 221);
      doc.text(`ACTA OFICIAL DE CIERRE DE CAJA DIARIO - FECHA: ${formatDateEs(dailyCloseData.targetDate)}`, 14, 20);

      // Summary Box
      doc.setFillColor(250, 248, 245);
      doc.rect(14, 34, 182, 38, 'F');
      doc.setDrawColor(215, 199, 178);
      doc.rect(14, 34, 182, 38, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(27, 67, 50);
      doc.text('RESUMEN DEL DÍA', 18, 42);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(44, 30, 22);
      doc.text(`Total Recaudado (Verificado):`, 18, 50);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCOP(dailyCloseData.totalCollected), 85, 50);

      doc.setFont('helvetica', 'normal');
      doc.text(`Anticipos Recibidos:`, 18, 56);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCOP(dailyCloseData.totalAnticipos), 85, 56);

      doc.setFont('helvetica', 'normal');
      doc.text(`Liquidación de Saldos:`, 18, 62);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCOP(dailyCloseData.totalSaldos), 85, 62);

      doc.setFont('helvetica', 'normal');
      doc.text(`Transacciones Registradas:`, 115, 50);
      doc.setFont('helvetica', 'bold');
      doc.text(`${dailyCloseData.transactionCount} operaciones`, 165, 50);

      doc.setFont('helvetica', 'normal');
      doc.text(`Saldos Pendientes del Día:`, 115, 56);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text(formatCOP(dailyCloseData.totalPendingBalance), 165, 56);

      // Classification by Channel Table
      const channelRows = [
        ['Tarjeta de Crédito', dailyCloseData.byChannel?.CREDIT_CARD?.count || 0, formatCOP(dailyCloseData.byChannel?.CREDIT_CARD?.total || 0)],
        ['Nequi', dailyCloseData.byChannel?.NEQUI?.count || 0, formatCOP(dailyCloseData.byChannel?.NEQUI?.total || 0)],
        ['Bancolombia', dailyCloseData.byChannel?.BANCOLOMBIA_TRANSFER?.count || 0, formatCOP(dailyCloseData.byChannel?.BANCOLOMBIA_TRANSFER?.total || 0)],
        ['Banco Agrario', dailyCloseData.byChannel?.BANCO_AGRARIO?.count || 0, formatCOP(dailyCloseData.byChannel?.BANCO_AGRARIO?.total || 0)],
        ['Otros / Daviplata / Efectivo', dailyCloseData.byChannel?.OTHER?.count || 0, formatCOP(dailyCloseData.byChannel?.OTHER?.total || 0)],
        ['TOTAL CONSOLIDADO', dailyCloseData.verifiedCount || 0, formatCOP(dailyCloseData.totalCollected || 0)]
      ];

      autoTable(doc, {
        startY: 78,
        head: [['Medio de Pago', 'N° Operaciones', 'Monto Recaudado']],
        body: channelRows,
        theme: 'striped',
        headStyles: {
          fillColor: [27, 67, 50],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: [44, 30, 22]
        },
        alternateRowStyles: {
          fillColor: [245, 243, 238]
        },
        margin: { left: 14, right: 14 }
      });

      // Detailed Transactions List
      const lastTableY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(27, 67, 50);
      doc.text('DETALLE DE MOVIMIENTOS REGISTRADOS', 14, lastTableY);

      const txTableRows = (dailyCloseData.transactions || []).map((t: Transaction) => {
        const res = reservationsMap.get(t.reservationId);
        return [
          t.verifiedAt ? formatTimeEs(t.verifiedAt) : formatTimeEs(t.createdAt),
          res?.reservationCode || t.reservationId,
          res?.guest?.fullName || 'Huésped',
          getPaymentChannelLabel(t.paymentChannel),
          getPaymentTypeLabel(t.paymentType),
          t.referenceCode,
          formatCOP(t.amount),
          t.verificationStatus === 'VERIFIED' ? 'Aprobado' : 'Pendiente'
        ];
      });

      autoTable(doc, {
        startY: lastTableY + 4,
        head: [['Hora', 'Reserva', 'Huésped', 'Medio', 'Tipo', 'Referencia', 'Monto', 'Estado']],
        body: txTableRows.length > 0 ? txTableRows : [['-', 'Sin movimientos para la fecha seleccionada', '-', '-', '-', '-', '-', '-']],
        theme: 'plain',
        headStyles: {
          fillColor: [230, 224, 215],
          textColor: [44, 30, 22],
          fontStyle: 'bold',
          fontSize: 8
        },
        bodyStyles: {
          fontSize: 7.5
        },
        margin: { left: 14, right: 14 }
      });

      // Signature footer
      const finalY = (doc as any).lastAutoTable.finalY + 25;
      if (finalY < 265) {
        doc.line(20, finalY, 80, finalY);
        doc.text('Firma Responsable de Caja', 20, finalY + 5);
        doc.line(130, finalY, 190, finalY);
        doc.text('Don Joaquín Restrepo (Admin)', 130, finalY + 5);
      }

      doc.save(`Cierre_Caja_${dailyCloseData.targetDate}.pdf`);
      showToast('success', 'Acta de Cierre de Caja descargada exitosamente en PDF.');
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al generar el acta de cierre en PDF.');
    }
  };

  // ========================================================
  // SUB-TAB 4: REPORTES FINANCIEROS & EXPORTACIONES
  // ========================================================
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportChannelFilter, setReportChannelFilter] = useState('ALL');
  const [reportStatusFilter, setReportStatusFilter] = useState('ALL');
  const [isExportingReport, setIsExportingReport] = useState(false);

  // Filtered dataset for Financial Report
  const filteredReportMovements = useMemo(() => {
    return transactions.filter(tx => {
      // Date filter
      const txDate = (tx.verifiedAt || tx.createdAt || '').split('T')[0];
      if (reportStartDate && txDate < reportStartDate) return false;
      if (reportEndDate && txDate > reportEndDate) return false;

      // Channel filter
      if (reportChannelFilter !== 'ALL' && tx.paymentChannel !== reportChannelFilter) return false;

      // Verification status filter
      if (reportStatusFilter !== 'ALL' && tx.verificationStatus !== reportStatusFilter) return false;

      return true;
    });
  }, [transactions, reportStartDate, reportEndDate, reportChannelFilter, reportStatusFilter]);

  // Periodic Revenue Summaries: Daily, Weekly, Monthly
  const periodicSummaries = useMemo(() => {
    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];

    // Last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Current Month (YYYY-MM)
    const currentMonthPrefix = todayIso.slice(0, 7);

    let todayTotal = 0;
    let weeklyTotal = 0;
    let monthlyTotal = 0;

    transactions.forEach(t => {
      if (t.verificationStatus !== 'VERIFIED') return;
      const d = (t.verifiedAt || t.createdAt || '').split('T')[0];
      if (d === todayIso) {
        todayTotal += t.amount;
      }
      if (d >= sevenDaysAgo && d <= todayIso) {
        weeklyTotal += t.amount;
      }
      if (d.startsWith(currentMonthPrefix)) {
        monthlyTotal += t.amount;
      }
    });

    return {
      todayTotal,
      weeklyTotal,
      monthlyTotal
    };
  }, [transactions]);

  // Export Financial Report to Excel (.xlsx)
  const handleExportReportExcel = () => {
    try {
      setIsExportingReport(true);
      const rows = filteredReportMovements.map(t => {
        const res = reservationsMap.get(t.reservationId);
        const guest = res?.guest;
        const totalAmount = res?.totalAmount || 0;
        const paidSoFar = res ? getPaidAmountForReservation(res.id) : t.amount;
        const balance = Math.max(0, totalAmount - paidSoFar);

        return {
          'Fecha Pago': (t.verifiedAt || t.createdAt || '').split('T')[0],
          'Hora': formatTimeEs(t.verifiedAt || t.createdAt),
          'Código Reserva': res?.reservationCode || t.reservationId,
          'Huésped': guest?.fullName || 'N/A',
          'Documento': `${guest?.documentType || 'CC'} ${guest?.documentNumber || 'N/A'}`,
          'Cabaña / Habitación': res?.room?.name || `Habitación ${res?.roomId || ''}`,
          'Medio de Pago': getPaymentChannelLabel(t.paymentChannel),
          'Tipo de Abono': getPaymentTypeLabel(t.paymentType),
          'Valor Pagado (COP)': t.amount,
          'Valor Total Reserva (COP)': totalAmount,
          'Saldo Pendiente (COP)': balance,
          'Estado Verificación': t.verificationStatus === 'VERIFIED' ? 'Aprobado' : (t.verificationStatus === 'REJECTED' ? 'Rechazado' : 'Por Validar'),
          'Referencia Bancaria': t.referenceCode,
          'Verificado Por': t.verifiedBy || 'Sistema',
          'Notas': t.notes || ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 14 }, // Fecha
        { wch: 10 }, // Hora
        { wch: 16 }, // Código
        { wch: 24 }, // Huésped
        { wch: 16 }, // Doc
        { wch: 20 }, // Cabaña
        { wch: 20 }, // Medio
        { wch: 18 }, // Tipo
        { wch: 18 }, // Pagado
        { wch: 18 }, // Total
        { wch: 18 }, // Saldo
        { wch: 16 }, // Estado
        { wch: 20 }, // Ref
        { wch: 20 }, // Verificado Por
        { wch: 30 }  // Notas
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte Financiero');

      const dateSuffix = reportStartDate && reportEndDate 
        ? `${reportStartDate}_al_${reportEndDate}` 
        : new Date().toISOString().split('T')[0];

      XLSX.writeFile(wb, `Reporte_Finanzas_DonJuaco_${dateSuffix}.xlsx`);
      showToast('success', 'Reporte financiero descargado exitosamente en formato Excel (.xlsx).');
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al exportar reporte Excel.');
    } finally {
      setIsExportingReport(false);
    }
  };

  // Export Financial Report to PDF (.pdf)
  const handleExportReportPDF = () => {
    try {
      setIsExportingReport(true);
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Brand Header
      doc.setFillColor(27, 67, 50); // #1B4332
      doc.rect(0, 0, 297, 24, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('TURIM . JUACO • FINCA LA COLMENA - REPORTE GENERAL DE FINANZAS', 14, 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(209, 231, 221);
      const rangeText = (reportStartDate || reportEndDate) 
        ? `Período: ${reportStartDate || 'Inicio'} hasta ${reportEndDate || 'Hoy'}` 
        : 'Período: Consolidado Histórico Completo';
      doc.text(`${rangeText} | Generado el: ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}`, 14, 18);

      // Table mapping
      const tableRows = filteredReportMovements.map(t => {
        const res = reservationsMap.get(t.reservationId);
        const guest = res?.guest;
        const totalAmount = res?.totalAmount || 0;
        const paidSoFar = res ? getPaidAmountForReservation(res.id) : t.amount;
        const balance = Math.max(0, totalAmount - paidSoFar);

        return [
          (t.verifiedAt || t.createdAt || '').split('T')[0],
          res?.reservationCode || t.reservationId,
          guest?.fullName || 'N/A',
          res?.room?.name || 'Habitación',
          getPaymentChannelLabel(t.paymentChannel),
          formatCOP(t.amount),
          formatCOP(balance),
          t.verificationStatus === 'VERIFIED' ? 'Aprobado' : (t.verificationStatus === 'REJECTED' ? 'Rechazado' : 'Por Validar'),
          t.referenceCode
        ];
      });

      const totalRecaudadoEnReporte = filteredReportMovements
        .filter(t => t.verificationStatus === 'VERIFIED')
        .reduce((sum, t) => sum + t.amount, 0);

      autoTable(doc, {
        startY: 30,
        head: [['Fecha', 'Reserva', 'Huésped', 'Cabaña', 'Medio de Pago', 'Valor Pagado', 'Saldo Pend.', 'Estado', 'Referencia']],
        body: tableRows.length > 0 ? tableRows : [['-', '-', 'No se encontraron movimientos con los filtros aplicados', '-', '-', '-', '-', '-', '-']],
        theme: 'striped',
        headStyles: {
          fillColor: [27, 67, 50],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [44, 30, 22]
        },
        alternateRowStyles: {
          fillColor: [248, 246, 242]
        },
        margin: { left: 14, right: 14 }
      });

      // Total summary at end
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(27, 67, 50);
      doc.text(`TOTAL RECAUDADO VERIFICADO EN ESTE REPORTE: ${formatCOP(totalRecaudadoEnReporte)} (${filteredReportMovements.length} movimientos)`, 14, finalY);

      doc.save(`Reporte_Financiero_DonJuaco_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('success', 'Reporte financiero descargado exitosamente en PDF.');
    } catch (err) {
      console.error(err);
      showToast('error', 'Error al exportar reporte PDF.');
    } finally {
      setIsExportingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification Alert */}
      {toast && (
        <div className={`p-4 rounded-2xl border shadow-md flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' :
          toast.type === 'error' ? 'bg-rose-50 border-rose-300 text-rose-950' :
          'bg-amber-50 border-amber-300 text-amber-950'
        }`}>
          <div className="flex items-center gap-3">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
            {toast.type === 'info' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
            <span>{toast.text}</span>
            {toast.actionUrl && (
              <a
                href={toast.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline ml-2 text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 font-bold"
              >
                <span>{toast.actionLabel || 'Ver Enlace'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <button onClick={() => setToast(null)} className="text-stone-400 hover:text-stone-700 ml-3">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card with Quick KPIs */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#1B4332] text-white flex items-center justify-center font-bold shadow-xs">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900 leading-tight">
                  Módulo de Finanzas & Contabilidad
                </h2>
                <p className="text-xs text-stone-500">
                  Gestión integral de ingresos, verificación de transferencias, arqueo de caja diario y reportes financieros
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openPaymentModal()}
              className="px-4 py-2.5 bg-[#1B4332] hover:bg-[#143225] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar Pago / Abono</span>
            </button>
            <button
              onClick={onRefreshData}
              className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title="Refrescar datos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Financial Highlight Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5">
          {/* 1. Total Recaudado */}
          <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200/80">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Total Recaudado (Aprobado)
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-[#1B4332] font-serif mt-1">
              {formatCOP(financialKPIs.totalCollected)}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Ingresos reales verificados
            </span>
          </div>

          {/* 2. Total en Anticipos */}
          <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200/80">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Anticipos Recibidos (50%)
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-amber-900 font-serif mt-1">
              {formatCOP(financialKPIs.totalAdvances)}
            </div>
            <span className="text-[11px] text-stone-600 font-semibold block mt-1">
              Garantías de reserva retenidas
            </span>
          </div>

          {/* 3. Saldos Pendientes */}
          <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200/80">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Saldos Pendientes por Cobrar
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-amber-700 font-serif mt-1">
              {formatCOP(financialKPIs.totalPendingBalance)}
            </div>
            <span className="text-[11px] text-amber-800 font-semibold block mt-1">
              A liquidar en check-in del huésped
            </span>
          </div>

          {/* 4. Comprobantes por Validar */}
          <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200/80">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Transferencias por Auditar
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-stone-900 font-serif mt-1 flex items-center justify-between">
              <span>{financialKPIs.pendingVerificationCount} comprobantes</span>
              {financialKPIs.pendingVerificationCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
            <span className="text-[11px] text-stone-600 font-semibold block mt-1">
              {formatCOP(financialKPIs.pendingVerificationAmount)} en revisión
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="flex border-b border-stone-200 bg-white rounded-2xl p-1.5 shadow-2xs gap-1 overflow-x-auto">
        <button
          onClick={() => setSubTab('payments')}
          className={`flex-1 min-w-[170px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'payments'
              ? 'bg-[#1B4332] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Gestión de Pagos & Saldos</span>
        </button>

        <button
          onClick={() => setSubTab('verification')}
          className={`flex-1 min-w-[190px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
            subTab === 'verification'
              ? 'bg-[#1B4332] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Verificación de Transferencias</span>
          {financialKPIs.pendingVerificationCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold">
              {financialKPIs.pendingVerificationCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('dailyClose')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'dailyClose'
              ? 'bg-[#1B4332] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Cierre de Caja Diario</span>
        </button>

        <button
          onClick={() => setSubTab('reports')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'reports'
              ? 'bg-[#1B4332] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Reportes Financieros</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. GESTIÓN DE PAGOS & SALDOS VIEW                        */}
      {/* ======================================================== */}
      {subTab === 'payments' && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs space-y-4">
          
          {/* Table Filters Header */}
          <div className="p-4 sm:p-5 border-b border-stone-200 bg-[#FAF8F5]">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar por código de reserva, huésped o documento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-[#1B4332] focus:outline-hidden"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Channel Filter */}
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="px-3 py-2 bg-white rounded-xl border border-stone-300 text-xs font-semibold text-stone-700"
                >
                  <option value="ALL">Todos los medios</option>
                  <option value="BANCOLOMBIA_TRANSFER">Bancolombia</option>
                  <option value="NEQUI">Nequi</option>
                  <option value="BANCO_AGRARIO">Banco Agrario</option>
                  <option value="CREDIT_CARD">Tarjeta</option>
                  <option value="DAVIPLATA">Daviplata</option>
                </select>

                {/* Balance Status Filter */}
                <select
                  value={balanceStatusFilter}
                  onChange={(e) => setBalanceStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-white rounded-xl border border-stone-300 text-xs font-semibold text-stone-700"
                >
                  <option value="ALL">Todos los saldos</option>
                  <option value="PENDING_BALANCE">Con Saldo Pendiente</option>
                  <option value="PAID_FULL">Totalmente Saldadas</option>
                </select>

                <button
                  onClick={() => {
                    setSearchQuery('');
                    setChannelFilter('ALL');
                    setBalanceStatusFilter('ALL');
                  }}
                  className="p-2 bg-white rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs cursor-pointer"
                  title="Limpiar filtros"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 text-stone-600 border-b border-stone-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Reserva & Cabaña</th>
                  <th className="py-3 px-4">Huésped</th>
                  <th className="py-3 px-4">Total Reserva</th>
                  <th className="py-3 px-4">Anticipos / Pagado</th>
                  <th className="py-3 px-4">Saldo Restante</th>
                  <th className="py-3 px-4">Medios Utilizados</th>
                  <th className="py-3 px-4">Fechas de Pago</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredReservationsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      No se encontraron reservas con los criterios de búsqueda seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredReservationsList.map((res) => {
                    const room = roomsMap.get(res.roomId) || res.room;
                    const paidAmount = getPaidAmountForReservation(res.id);
                    const remainingBalance = Math.max(0, res.totalAmount - paidAmount);
                    const resTxs = getTransactionsForReservation(res.id);
                    const verifiedTxs = resTxs.filter(t => t.verificationStatus === 'VERIFIED');
                    const pendingTxs = resTxs.filter(t => t.verificationStatus === 'PENDING');
                    const badge = getStatusBadge(res.status);

                    return (
                      <tr key={res.id} className="hover:bg-stone-50/80 transition-colors">
                        {/* 1. Reserva & Cabaña */}
                        <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                          <div className="flex flex-col">
                            <span className="text-[#1B4332] font-extrabold text-xs">
                              {res.reservationCode}
                            </span>
                            <span className="text-stone-600 font-sans font-medium text-[11px] mt-0.5">
                              {room?.name || `Habitación ${res.roomId}`}
                            </span>
                            <span className={`inline-block w-fit mt-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                              {badge.label}
                            </span>
                          </div>
                        </td>

                        {/* 2. Huésped */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-stone-900">
                              {res.guest?.fullName || 'Huésped Registrado'}
                            </span>
                            <span className="text-stone-500 text-[11px]">
                              {res.guest?.documentType} {res.guest?.documentNumber}
                            </span>
                            <span className="text-stone-400 text-[10px]">
                              {res.guest?.phone}
                            </span>
                          </div>
                        </td>

                        {/* 3. Total Reserva */}
                        <td className="py-3.5 px-4 font-bold text-stone-900 font-serif text-sm">
                          {formatCOP(res.totalAmount)}
                        </td>

                        {/* 4. Anticipo / Pagado */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-emerald-800 font-serif text-sm">
                              {formatCOP(paidAmount)}
                            </span>
                            {pendingTxs.length > 0 && (
                              <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-amber-600" />
                                {formatCOP(pendingTxs.reduce((s, t) => s + t.amount, 0))} por verificar
                              </span>
                            )}
                            <span className="text-[10px] text-stone-500">
                              {verifiedTxs.length} abonos aprobados
                            </span>
                          </div>
                        </td>

                        {/* 5. Saldo Restante */}
                        <td className="py-3.5 px-4">
                          {remainingBalance <= 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Saldada ($0)
                            </span>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-extrabold text-amber-800 font-serif text-sm">
                                {formatCOP(remainingBalance)}
                              </span>
                              <span className="text-[10px] text-amber-900 font-semibold mt-0.5">
                                Pendiente por cobrar
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 6. Medios Utilizados */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {resTxs.length === 0 ? (
                              <span className="text-stone-400 text-[11px]">Sin pagos registrados</span>
                            ) : (
                              Array.from(new Set(resTxs.map(t => t.paymentChannel))).map(ch => (
                                <span 
                                  key={ch}
                                  className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-semibold text-[10px] border border-stone-200"
                                >
                                  {getPaymentChannelLabel(ch)}
                                </span>
                              ))
                            )}
                          </div>
                        </td>

                        {/* 7. Fechas de Pago */}
                        <td className="py-3.5 px-4 text-stone-600 text-[11px]">
                          {resTxs.length === 0 ? (
                            <span className="text-stone-400">-</span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              {resTxs.slice(0, 2).map((t, idx) => (
                                <span key={idx} className="font-mono text-[10px]">
                                  {(t.verifiedAt || t.createdAt || '').split('T')[0]} ({formatCOP(t.amount)})
                                </span>
                              ))}
                              {resTxs.length > 2 && (
                                <span className="text-[10px] text-stone-400">+{resTxs.length - 2} más</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 8. Acciones */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openPaymentModal(res)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Registrar abono o saldo para esta reserva"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>+ Abono</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 2. VERIFICACIÓN DE TRANSFERENCIAS VIEW                   */}
      {/* ======================================================== */}
      {subTab === 'verification' && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs space-y-4">
          
          {/* Header & Filter pills */}
          <div className="p-4 sm:p-5 border-b border-stone-200 bg-[#FAF8F5]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#1B4332]" />
                  <span>Auditoría de Comprobantes & Transferencias</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Inspecciona comprobantes bancarios, aprueba o rechaza transferencias y despacha recibos oficiales al huésped
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1.5 bg-stone-200/60 p-1 rounded-xl">
                {(['PENDING', 'VERIFIED', 'REJECTED', 'ALL'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setVerificationFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      verificationFilter === f
                        ? 'bg-white text-stone-900 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {f === 'PENDING' ? `Por Validar (${transactions.filter(t => t.verificationStatus === 'PENDING').length})` :
                     f === 'VERIFIED' ? 'Aprobados' :
                     f === 'REJECTED' ? 'Rechazados' : 'Todos'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transfers list */}
          <div className="p-4 sm:p-5">
            {filteredTransfers.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No hay transferencias ni comprobantes para este filtro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTransfers.map((tx) => {
                  const res = reservationsMap.get(tx.reservationId);
                  const guest = res?.guest;
                  const room = roomsMap.get(res?.roomId || '') || res?.room;
                  const statusBadge = getVerificationStatusBadge(tx.verificationStatus);

                  return (
                    <div 
                      key={tx.id}
                      className="bg-[#FAF8F5] rounded-2xl border border-stone-200 p-4 space-y-3 relative flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Top: Status & Amount */}
                        <div className="flex items-start justify-between gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                          <span className="font-serif text-lg font-bold text-stone-900">
                            {formatCOP(tx.amount)}
                          </span>
                        </div>

                        {/* Associated Reservation & Guest */}
                        <div className="bg-white p-3 rounded-xl border border-stone-200/80 text-xs space-y-1">
                          <div className="flex justify-between items-center text-stone-500 text-2xs">
                            <span>Reserva:</span>
                            <strong className="font-mono text-[#1B4332] text-xs">
                              {res?.reservationCode || tx.reservationId}
                            </strong>
                          </div>
                          <div className="flex justify-between items-center text-stone-500 text-2xs">
                            <span>Cabaña:</span>
                            <strong className="text-stone-800">{room?.name || 'Habitación'}</strong>
                          </div>
                          <div className="flex justify-between items-center text-stone-500 text-2xs">
                            <span>Huésped:</span>
                            <strong className="text-stone-800">{guest?.fullName || 'Huésped'}</strong>
                          </div>
                          <div className="flex justify-between items-center text-stone-500 text-2xs">
                            <span>Celular / WhatsApp:</span>
                            <span className="font-mono text-stone-700">{guest?.phone || 'Sin número'}</span>
                          </div>
                        </div>

                        {/* Payment Channel & Reference */}
                        <div className="text-xs text-stone-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Canal de Pago:</span>
                            <strong className="text-stone-900">{getPaymentChannelLabel(tx.paymentChannel)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Referencia:</span>
                            <strong className="font-mono text-stone-900">{tx.referenceCode}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Concepto:</span>
                            <span className="font-semibold text-stone-800">{getPaymentTypeLabel(tx.paymentType)}</span>
                          </div>
                          <div className="flex justify-between text-stone-400 text-[10px]">
                            <span>Fecha recibido:</span>
                            <span>{formatDateEs(tx.createdAt.split('T')[0])} {formatTimeEs(tx.createdAt)}</span>
                          </div>
                        </div>

                        {/* Verification details if already verified/rejected */}
                        {tx.verificationStatus === 'VERIFIED' && (
                          <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-[11px] space-y-0.5">
                            <span className="font-bold flex items-center gap-1 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Verificado por {tx.verifiedBy || 'Don Joaquín (Admin)'}
                            </span>
                            <span className="text-[10px] text-emerald-700 block">
                              Fecha: {tx.verifiedAt ? formatDateEs(tx.verifiedAt.split('T')[0]) : 'Registrado'} {formatTimeEs(tx.verifiedAt)}
                            </span>
                          </div>
                        )}

                        {tx.verificationStatus === 'REJECTED' && (
                          <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-950 text-[11px] space-y-1">
                            <span className="font-bold flex items-center gap-1 text-rose-800">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              Comprobante Rechazado
                            </span>
                            <p className="text-[11px] text-rose-900">
                              <strong>Motivo:</strong> {tx.rejectionReason || 'No coincide con la cuenta o no es legible.'}
                            </p>
                          </div>
                        )}

                        {/* Voucher preview thumbnail */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setFullVoucherTx(tx)}
                            className="w-full py-2 px-3 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
                            <span>Inspeccionar Comprobante</span>
                            <ZoomIn className="w-3.5 h-3.5 ml-1 text-stone-400" />
                          </button>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-stone-200/80 space-y-2">
                        {tx.verificationStatus === 'PENDING' && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleApproveTransfer(tx.id)}
                              disabled={isProcessing}
                              className="py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Aprobar Pago</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectModalTx(tx)}
                              disabled={isProcessing}
                              className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Rechazar</span>
                            </button>
                          </div>
                        )}

                        {/* Notification buttons for verified payments */}
                        {tx.verificationStatus === 'VERIFIED' && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleSendNotification(tx.id, 'whatsapp')}
                              disabled={notifyingTxId === tx.id}
                              className="py-1.5 px-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#075E54] border border-[#25D366]/30 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              title="Enviar recibo oficial al WhatsApp del huésped"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                              <span>WhatsApp</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendNotification(tx.id, 'email')}
                              disabled={notifyingTxId === tx.id}
                              className="py-1.5 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              title="Enviar recibo por correo electrónico al huésped"
                            >
                              <Mail className="w-3.5 h-3.5 text-stone-600" />
                              <span>{notifyingTxId === tx.id ? 'Enviando...' : 'Email'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 3. CIERRE DE CAJA DIARIO (ARQUEO) VIEW                    */}
      {/* ======================================================== */}
      {subTab === 'dailyClose' && (
        <div className="space-y-4">
          
          {/* Date Selector & Action Card */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#1B4332]" />
                  <span>Arqueo y Cierre de Caja Diario</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Calcula automáticamente los ingresos consolidados por medio de pago sin duplicidad
                </p>
              </div>

              {/* Date controller & presets */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCloseDate(todayDateStr)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCloseDate === todayDateStr
                      ? 'bg-[#1B4332] text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  Hoy
                </button>
                <input
                  type="date"
                  value={selectedCloseDate}
                  onChange={(e) => setSelectedCloseDate(e.target.value)}
                  className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-900"
                />
                <button
                  type="button"
                  onClick={handleExportDailyClosePDF}
                  disabled={!dailyCloseData}
                  className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Acta PDF</span>
                </button>
              </div>
            </div>

            {/* Daily Close Summary Boxes */}
            {isLoadingClose ? (
              <div className="py-12 text-center text-stone-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1B4332]" />
                <p className="text-xs">Consolidando movimientos de caja...</p>
              </div>
            ) : dailyCloseData && (
              <div className="mt-5 space-y-6">
                
                {/* 4 Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Total Recaudado en el Día
                    </span>
                    <div className="text-xl font-extrabold text-[#1B4332] font-serif mt-1">
                      {formatCOP(dailyCloseData.totalCollected)}
                    </div>
                    <span className="text-[11px] text-stone-500 block mt-1">
                      {dailyCloseData.verifiedCount} pagos aprobados
                    </span>
                  </div>

                  <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Anticipos Recibidos (50%)
                    </span>
                    <div className="text-xl font-extrabold text-amber-900 font-serif mt-1">
                      {formatCOP(dailyCloseData.totalAnticipos)}
                    </div>
                    <span className="text-[11px] text-stone-500 block mt-1">
                      Garantía de nuevas reservas
                    </span>
                  </div>

                  <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Saldos Liquidados al Check-in
                    </span>
                    <div className="text-xl font-extrabold text-emerald-900 font-serif mt-1">
                      {formatCOP(dailyCloseData.totalSaldos || dailyCloseData.totalPagosCompletos)}
                    </div>
                    <span className="text-[11px] text-stone-500 block mt-1">
                      Pagos totales o remanentes
                    </span>
                  </div>

                  <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Saldos Pendientes del Día
                    </span>
                    <div className="text-xl font-extrabold text-amber-700 font-serif mt-1">
                      {formatCOP(dailyCloseData.totalPendingBalance)}
                    </div>
                    <span className="text-[11px] text-stone-500 block mt-1">
                      Por cobrar a huéspedes de hoy
                    </span>
                  </div>
                </div>

                {/* Classification by Payment Channel Grid */}
                <div>
                  <h4 className="font-serif font-bold text-sm text-stone-900 mb-3">
                    Clasificación de Ingresos por Medio de Pago (Día {formatDateEs(dailyCloseData.targetDate)})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* 1. Tarjeta */}
                    <div className="p-3.5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                        <span className="font-semibold">Tarjeta</span>
                        <CreditCard className="w-4 h-4 text-amber-700" />
                      </div>
                      <div className="text-base font-extrabold text-stone-900 font-serif">
                        {formatCOP(dailyCloseData.byChannel?.CREDIT_CARD?.total || 0)}
                      </div>
                      <span className="text-[10px] text-stone-500">
                        {dailyCloseData.byChannel?.CREDIT_CARD?.count || 0} operaciones
                      </span>
                    </div>

                    {/* 2. Nequi */}
                    <div className="p-3.5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                        <span className="font-semibold">Nequi</span>
                        <Wallet className="w-4 h-4 text-purple-700" />
                      </div>
                      <div className="text-base font-extrabold text-stone-900 font-serif">
                        {formatCOP(dailyCloseData.byChannel?.NEQUI?.total || 0)}
                      </div>
                      <span className="text-[10px] text-stone-500">
                        {dailyCloseData.byChannel?.NEQUI?.count || 0} operaciones
                      </span>
                    </div>

                    {/* 3. Bancolombia */}
                    <div className="p-3.5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                        <span className="font-semibold">Bancolombia</span>
                        <DollarSign className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div className="text-base font-extrabold text-stone-900 font-serif">
                        {formatCOP(dailyCloseData.byChannel?.BANCOLOMBIA_TRANSFER?.total || 0)}
                      </div>
                      <span className="text-[10px] text-stone-500">
                        {dailyCloseData.byChannel?.BANCOLOMBIA_TRANSFER?.count || 0} operaciones
                      </span>
                    </div>

                    {/* 4. Banco Agrario */}
                    <div className="p-3.5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                        <span className="font-semibold">Banco Agrario</span>
                        <Home className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div className="text-base font-extrabold text-stone-900 font-serif">
                        {formatCOP(dailyCloseData.byChannel?.BANCO_AGRARIO?.total || 0)}
                      </div>
                      <span className="text-[10px] text-stone-500">
                        {dailyCloseData.byChannel?.BANCO_AGRARIO?.count || 0} operaciones
                      </span>
                    </div>
                  </div>
                </div>

                {/* Daily Detailed Table */}
                <div className="border border-stone-200 rounded-2xl overflow-hidden">
                  <div className="bg-[#FAF8F5] px-4 py-3 border-b border-stone-200">
                    <span className="font-bold text-xs text-stone-900">
                      Movimientos Contabilizados del Día ({dailyCloseData.transactions?.length || 0})
                    </span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 border-b border-stone-200 text-[11px] font-bold">
                        <th className="py-2.5 px-4">Hora</th>
                        <th className="py-2.5 px-4">Reserva</th>
                        <th className="py-2.5 px-4">Huésped</th>
                        <th className="py-2.5 px-4">Medio de Pago</th>
                        <th className="py-2.5 px-4">Concepto</th>
                        <th className="py-2.5 px-4">Monto</th>
                        <th className="py-2.5 px-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {!dailyCloseData.transactions || dailyCloseData.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-stone-400 text-xs">
                            No se registraron movimientos en la fecha seleccionada.
                          </td>
                        </tr>
                      ) : (
                        dailyCloseData.transactions.map((tx: Transaction) => {
                          const res = reservationsMap.get(tx.reservationId);
                          return (
                            <tr key={tx.id} className="hover:bg-stone-50">
                              <td className="py-2.5 px-4 font-mono text-[11px] text-stone-500">
                                {formatTimeEs(tx.verifiedAt || tx.createdAt)}
                              </td>
                              <td className="py-2.5 px-4 font-bold text-stone-900 font-mono">
                                {res?.reservationCode || tx.reservationId}
                              </td>
                              <td className="py-2.5 px-4 text-stone-800">
                                {res?.guest?.fullName || 'Huésped'}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="font-semibold text-stone-700">
                                  {getPaymentChannelLabel(tx.paymentChannel)}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-stone-600">
                                {getPaymentTypeLabel(tx.paymentType)}
                              </td>
                              <td className="py-2.5 px-4 font-bold font-serif text-emerald-900">
                                {formatCOP(tx.amount)}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  tx.verificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {tx.verificationStatus === 'VERIFIED' ? 'Aprobado' : 'Pendiente'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 4. REPORTES FINANCIEROS VIEW                             */}
      {/* ======================================================== */}
      {subTab === 'reports' && (
        <div className="space-y-4">
          
          {/* Revenue Summaries Card: Daily, Weekly, Monthly */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs">
            <h3 className="font-serif text-base font-bold text-stone-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#1B4332]" />
              <span>Resumen Periódico de Ingresos</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  Ingresos del Día (Hoy)
                </span>
                <div className="text-xl font-extrabold text-[#1B4332] font-serif mt-1">
                  {formatCOP(periodicSummaries.todayTotal)}
                </div>
                <span className="text-[11px] text-stone-500 block mt-1">
                  Recaudos liquidados hoy
                </span>
              </div>

              <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  Ingresos Semanales (Últimos 7 días)
                </span>
                <div className="text-xl font-extrabold text-[#1B4332] font-serif mt-1">
                  {formatCOP(periodicSummaries.weeklyTotal)}
                </div>
                <span className="text-[11px] text-stone-500 block mt-1">
                  Ritmo semanal de facturación
                </span>
              </div>

              <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  Ingresos Mensuales (Mes en curso)
                </span>
                <div className="text-xl font-extrabold text-[#1B4332] font-serif mt-1">
                  {formatCOP(periodicSummaries.monthlyTotal)}
                </div>
                <span className="text-[11px] text-stone-500 block mt-1">
                  Acumulado del mes actual
                </span>
              </div>
            </div>
          </div>

          {/* Filter Panel for Report & Export buttons */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h4 className="font-serif font-bold text-sm text-stone-900">
                  Filtros de Reporte Financiero Personalizado
                </h4>
                <p className="text-xs text-stone-500">
                  Filtra por fechas, método de pago y estado de verificación para exportar en PDF o Excel
                </p>
              </div>

              {/* Download Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportReportPDF}
                  disabled={isExportingReport}
                  className="px-4 py-2 bg-[#1B4332] hover:bg-[#143225] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Descargar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportReportExcel}
                  disabled={isExportingReport}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Descargar Excel</span>
                </button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-stone-100 text-xs">
              <div>
                <label className="block text-stone-600 font-semibold mb-1">Fecha Inicial:</label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-semibold mb-1">Fecha Final:</label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-semibold mb-1">Medio de Pago:</label>
                <select
                  value={reportChannelFilter}
                  onChange={(e) => setReportChannelFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-medium"
                >
                  <option value="ALL">Todos los medios</option>
                  <option value="BANCOLOMBIA_TRANSFER">Bancolombia</option>
                  <option value="NEQUI">Nequi</option>
                  <option value="BANCO_AGRARIO">Banco Agrario</option>
                  <option value="CREDIT_CARD">Tarjeta</option>
                  <option value="DAVIPLATA">Daviplata</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 font-semibold mb-1">Estado de Verificación:</label>
                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-medium"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="VERIFIED">Aprobados / Verificados</option>
                  <option value="PENDING">Por Validar (Pendientes)</option>
                  <option value="REJECTED">Rechazados</option>
                </select>
              </div>
            </div>

            {/* Results Table */}
            <div className="border border-stone-200 rounded-2xl overflow-hidden mt-4">
              <div className="bg-[#FAF8F5] px-4 py-2.5 border-b border-stone-200 flex items-center justify-between text-xs">
                <span className="font-bold text-stone-900">
                  Registros del Reporte ({filteredReportMovements.length})
                </span>
                <span className="font-serif font-bold text-emerald-900">
                  Total Filtrado: {formatCOP(filteredReportMovements.filter(t => t.verificationStatus === 'VERIFIED').reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-stone-50 text-stone-500 border-b border-stone-200 text-[11px] font-bold">
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Reserva</th>
                      <th className="py-2.5 px-3">Huésped</th>
                      <th className="py-2.5 px-3">Cabaña</th>
                      <th className="py-2.5 px-3">Medio</th>
                      <th className="py-2.5 px-3">Valor Pagado</th>
                      <th className="py-2.5 px-3">Saldo Pend.</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3">Referencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredReportMovements.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-stone-400">
                          No se encontraron transacciones para este rango.
                        </td>
                      </tr>
                    ) : (
                      filteredReportMovements.map((tx) => {
                        const res = reservationsMap.get(tx.reservationId);
                        const balance = res ? getBalanceForReservation(res) : 0;
                        const statusBadge = getVerificationStatusBadge(tx.verificationStatus);

                        return (
                          <tr key={tx.id} className="hover:bg-stone-50">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-stone-600">
                              {(tx.verifiedAt || tx.createdAt || '').split('T')[0]}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#1B4332]">
                              {res?.reservationCode || tx.reservationId}
                            </td>
                            <td className="py-2.5 px-3 text-stone-800">
                              {res?.guest?.fullName || 'Huésped'}
                            </td>
                            <td className="py-2.5 px-3 text-stone-600">
                              {res?.room?.name || 'Habitación'}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-stone-800">
                              {getPaymentChannelLabel(tx.paymentChannel)}
                            </td>
                            <td className="py-2.5 px-3 font-bold font-serif text-emerald-950">
                              {formatCOP(tx.amount)}
                            </td>
                            <td className="py-2.5 px-3 font-serif font-semibold text-amber-800">
                              {formatCOP(balance)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.color}`}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-stone-500 text-[11px]">
                              {tx.referenceCode}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTRAR PAGO / ABONO MANUAL                    */}
      {/* ======================================================== */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#1B4332]" />
                <h4 className="font-serif font-bold text-stone-900 text-base">
                  Registrar Pago o Anticipo de Reserva
                </h4>
              </div>
              <button 
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualPayment} className="space-y-3.5 text-xs">
              
              {/* Select Reservation */}
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Reserva Asociada *
                </label>
                <select
                  value={manualForm.reservationId}
                  onChange={(e) => handleSelectReservationInModal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold text-stone-900"
                  required
                >
                  <option value="">-- Selecciona una reserva --</option>
                  {reservations
                    .filter(r => r.status !== 'CANCELLED')
                    .map(r => {
                      const bal = getBalanceForReservation(r);
                      return (
                        <option key={r.id} value={r.id}>
                          {r.reservationCode} • {r.guest?.fullName || 'Huésped'} ({r.room?.name || 'Habitación'}) - Saldo: {formatCOP(bal)}
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Reservation summary if selected */}
              {selectedResForPayment && (
                <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-stone-200 text-stone-700 space-y-1">
                  <div className="flex justify-between text-2xs">
                    <span>Huésped:</span>
                    <strong className="text-stone-900">{selectedResForPayment.guest?.fullName}</strong>
                  </div>
                  <div className="flex justify-between text-2xs">
                    <span>Valor Total Reserva:</span>
                    <strong className="text-stone-900">{formatCOP(selectedResForPayment.totalAmount)}</strong>
                  </div>
                  <div className="flex justify-between text-2xs">
                    <span>Abonado hasta ahora:</span>
                    <strong className="text-emerald-800">{formatCOP(getPaidAmountForReservation(selectedResForPayment.id))}</strong>
                  </div>
                  <div className="flex justify-between text-2xs pt-1 border-t border-stone-200">
                    <span className="font-bold text-amber-900">Saldo Restante:</span>
                    <strong className="font-bold text-amber-900 font-serif">{formatCOP(getBalanceForReservation(selectedResForPayment))}</strong>
                  </div>
                </div>
              )}

              {/* Amount and Payment Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Monto a Registrar (COP) *
                  </label>
                  <input
                    type="number"
                    value={manualForm.amount}
                    onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-bold text-stone-900 text-sm font-serif"
                    placeholder="Ej. 85000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Concepto de Pago *
                  </label>
                  <select
                    value={manualForm.paymentType}
                    onChange={(e) => setManualForm({ ...manualForm, paymentType: e.target.value as PaymentType })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                  >
                    <option value="ANTICIPO">Anticipo (50%)</option>
                    <option value="SALDO_RESTANTE">Saldo Restante al Check-in</option>
                    <option value="PAGO_TOTAL">Pago Total (100%)</option>
                    <option value="PAGO_PARCIAL">Abono Parcial</option>
                  </select>
                </div>
              </div>

              {/* Channel and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Medio de Pago *
                  </label>
                  <select
                    value={manualForm.paymentChannel}
                    onChange={(e) => setManualForm({ ...manualForm, paymentChannel: e.target.value as PaymentChannel })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-medium"
                  >
                    <option value="BANCOLOMBIA_TRANSFER">Bancolombia</option>
                    <option value="NEQUI">Nequi</option>
                    <option value="BANCO_AGRARIO">Banco Agrario</option>
                    <option value="CREDIT_CARD">Tarjeta</option>
                    <option value="DAVIPLATA">Daviplata</option>
                    <option value="CASH_ON_SITE">Efectivo en Finca</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Fecha del Pago *
                  </label>
                  <input
                    type="date"
                    value={manualForm.paymentDate}
                    onChange={(e) => setManualForm({ ...manualForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-medium"
                    required
                  />
                </div>
              </div>

              {/* Reference code */}
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Número de Comprobante / Referencia Bancaria
                </label>
                <input
                  type="text"
                  value={manualForm.referenceCode}
                  onChange={(e) => setManualForm({ ...manualForm, referenceCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-mono"
                  placeholder="Ej. BCOL-982401 o N° comprobante"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Observaciones / Notas
                </label>
                <input
                  type="text"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                  placeholder="Ej. Pago en recepción durante el check-in"
                />
              </div>

              {/* Mark as Verified Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={manualForm.markAsVerified}
                  onChange={(e) => setManualForm({ ...manualForm, markAsVerified: e.target.checked })}
                  className="rounded-sm text-[#1B4332] focus:ring-[#1B4332]"
                />
                <span className="text-stone-700 font-semibold text-xs">
                  Marcar este pago como verificado inmediatamente (Recomendado para Don Juaco)
                </span>
              </label>

              {/* Buttons */}
              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-[#1B4332] hover:bg-[#143225] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isProcessing ? 'Guardando...' : 'Guardar Pago en Finanzas'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: INSPECCIONAR COMPROBANTE A PANTALLA COMPLETA     */}
      {/* ======================================================== */}
      {inspectingSlipTx && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-300 p-5 space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-stone-200">
              <div>
                <h4 className="font-serif font-bold text-stone-900 text-base">
                  Comprobante de Pago Bancario
                </h4>
                <p className="text-xs text-stone-500 font-mono">
                  Ref: {inspectingSlipTx.referenceCode} • {formatCOP(inspectingSlipTx.amount)}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setInspectingSlipTx(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip image container */}
            <div className="rounded-2xl border border-stone-200 bg-stone-950 flex items-center justify-center min-h-[300px] overflow-hidden p-2">
              {inspectingSlipTx.proofSlipBase64 || inspectingSlipTx.proofSlipUrl ? (
                <img
                  src={inspectingSlipTx.proofSlipBase64 || inspectingSlipTx.proofSlipUrl}
                  alt="Comprobante de transferencia"
                  className="max-h-[60vh] max-w-full object-contain rounded-xl"
                />
              ) : (
                <div className="text-center text-stone-400 p-8">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Sin archivo gráfico adjunto.</p>
                </div>
              )}
            </div>

            {/* Slip Details */}
            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Canal Reportado:</span>
                <strong className="text-stone-900">{getPaymentChannelLabel(inspectingSlipTx.paymentChannel)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Valor:</span>
                <strong className="text-emerald-900 font-serif text-sm">{formatCOP(inspectingSlipTx.amount)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Estado:</span>
                <span className="font-bold">{inspectingSlipTx.verificationStatus}</span>
              </div>
            </div>

            {/* Action buttons inside inspection modal */}
            {inspectingSlipTx.verificationStatus === 'PENDING' ? (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => handleApproveTransfer(inspectingSlipTx.id)}
                  className="py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aprobar Pago & Confirmar Reserva</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalTx(inspectingSlipTx);
                    setInspectingSlipTx(null);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Rechazar Comprobante</span>
                </button>
              </div>
            ) : (
              <div className="flex justify-end pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setInspectingSlipTx(null)}
                  className="px-5 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: MOTIVO DE RECHAZO DE COMPROBANTE                  */}
      {/* ======================================================== */}
      {rejectModalTx && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="font-serif font-bold text-base">
                  Rechazar Comprobante de Pago
                </h4>
              </div>
              <button 
                type="button"
                onClick={() => setRejectModalTx(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Al rechazar el comprobante, el estado de la reserva asociada se actualizará a <strong>CANCELADA</strong> para liberar inmediatamente la cabaña en el calendario y permitir nuevas reservas.
            </p>

            <div className="space-y-2">
              <label className="block text-stone-800 font-bold text-xs">
                Motivo del Rechazo *
              </label>
              
              <div className="space-y-1.5 text-xs">
                {[
                  'El comprobante no coincide con la cuenta o no es legible.',
                  'Transferencia no recibida en el extracto bancario.',
                  'El monto transferido es inferior al anticipo requerido.',
                  'Comprobante duplicado o reutilizado.',
                  'Cuenta de destino incorrecta.'
                ].map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReasonText(reason)}
                    className={`w-full text-left p-2 rounded-xl border text-2xs font-medium transition-colors ${
                      rejectReasonText === reason
                        ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <textarea
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                rows={3}
                className="w-full mt-2 p-2.5 rounded-xl border border-stone-300 text-xs bg-white text-stone-900"
                placeholder="Escribe el motivo del rechazo..."
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-100 text-xs">
              <button
                type="button"
                onClick={() => setRejectModalTx(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isProcessing}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                {isProcessing ? 'Rechazando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Resolution Voucher Lightbox Modal */}
      <VoucherModal
        isOpen={!!fullVoucherTx}
        onClose={() => setFullVoucherTx(null)}
        transaction={fullVoucherTx}
        reservationCode={fullVoucherTx ? reservationsMap.get(fullVoucherTx.reservationId)?.reservationCode : undefined}
        guestName={fullVoucherTx ? reservationsMap.get(fullVoucherTx.reservationId)?.guest?.fullName : undefined}
      />

    </div>
  );
};
