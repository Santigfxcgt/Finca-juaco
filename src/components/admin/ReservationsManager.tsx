import React, { useState } from 'react';
import { 
  Search, 
  CheckCircle, 
  LogIn, 
  LogOut, 
  XCircle, 
  Eye, 
  AlertCircle, 
  FileText, 
  Mail,
  Send,
  Bell,
  Check,
  FileSpreadsheet,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Reservation, ReservationStatus } from '../../types';
import { formatCOP, formatDateEs, getStatusBadge } from '../../utils/formatters';
import { ReservationsReport } from './ReservationsReport';
import { AdminTableSkeleton } from './AdminTableSkeleton';

interface ReservationsManagerProps {
  reservations: Reservation[];
  onStatusChange: (reservationId: string, nextStatus: ReservationStatus, reason?: string) => Promise<void>;
  onInspectReservation: (res: Reservation) => void;
  initialSection?: 'operations' | 'report';
  isLoading?: boolean;
}

export const ReservationsManager: React.FC<ReservationsManagerProps> = ({
  reservations,
  onStatusChange,
  onInspectReservation,
  initialSection = 'operations',
  isLoading = false
}) => {
  const [activeSection, setActiveSection] = useState<'operations' | 'report'>(initialSection);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cancelModalRes, setCancelModalRes] = useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const filtered = reservations.filter(res => {
    if (statusFilter !== 'ALL' && res.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    const codeMatch = res.reservationCode.toLowerCase().includes(term);
    const guestMatch = res.guest?.fullName.toLowerCase().includes(term);
    const docMatch = res.guest?.documentNumber.toLowerCase().includes(term);
    const roomMatch = res.room?.name.toLowerCase().includes(term);

    return codeMatch || guestMatch || docMatch || roomMatch;
  });

  const handleConfirmCancel = async () => {
    if (!cancelModalRes) return;
    setIsUpdating(true);
    try {
      await onStatusChange(cancelModalRes.id, 'CANCELLED', cancelReason || 'Cancelado por el administrador');
      setCancelModalRes(null);
      setCancelReason('');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendConfirmationNotif = async (res: Reservation) => {
    try {
      const response = await fetch('/api/notifications/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: res.id })
      });
      const data = await response.json();
      if (data.success) {
        if (data.gmailComposeUrl && !data.deliveredViaSMTP) {
          window.open(data.gmailComposeUrl, '_blank');
        }
        setActionFeedback(data.deliveredViaSMTP ? `Confirmación enviada vía SMTP a ${res.guest?.email}` : `Comprobante abierto en Gmail para ${res.guest?.email}`);
        setTimeout(() => setActionFeedback(null), 4000);
      } else {
        setActionFeedback(data.error || 'No se pudo enviar la confirmación');
        setTimeout(() => setActionFeedback(null), 3000);
      }
    } catch (err) {
      setActionFeedback('Error enviando correo.');
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleSendReminderNotif = async (res: Reservation) => {
    try {
      const response = await fetch('/api/notifications/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: res.id })
      });
      const data = await response.json();
      if (data.success) {
        setActionFeedback(`Recordatorio 2 días enviado a ${res.guest?.fullName}`);
        setTimeout(() => setActionFeedback(null), 4000);
      }
    } catch (err) {
      setActionFeedback('Error enviando recordatorio.');
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Sub-navigation tabs within Gestor de Reservas */}
      <div className="bg-white p-2 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSection('operations')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'operations'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-700" />
            <span>Gestión Operativa & Estados</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-700 text-[10px] font-mono">
              {reservations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('report')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'report'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Reporte de Reservas</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-900 text-emerald-200 text-[10px] font-semibold">
              Excel / PDF
            </span>
          </button>
        </div>

        {/* Quick hint on active section */}
        <div className="px-3 py-1 text-2xs text-stone-500 hidden md:flex items-center gap-1.5">
          {activeSection === 'operations' ? (
            <span>💡 Realiza transiciones de estado, check-in, check-out y envíos de confirmación.</span>
          ) : (
            <span>📊 Filtra por rango de fechas y descarga informes para contabilidad y recepción.</span>
          )}
        </div>
      </div>

      {/* Render Section: Reporte de Reservas */}
      {activeSection === 'report' ? (
        <ReservationsReport 
          reservations={reservations} 
          onInspectReservation={onInspectReservation} 
          isLoading={isLoading}
        />
      ) : (
        /* Render Section: Gestión Operativa & Estados */
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden space-y-2">
          
          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold text-center animate-in fade-in flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              <span>{actionFeedback}</span>
            </div>
          )}

          {/* Header & Controls */}
          <div className="p-4 sm:p-5 border-b border-stone-200 bg-[#FAF8F5] space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900">
                  Gestión de Reservas, Notificaciones & Recordatorios
                </h3>
                <p className="text-xs text-stone-500">
                  Confirmación automática por email/WhatsApp y recordatorios a 2 días del check-in.
                </p>
              </div>

              {/* Search bar & quick switch to report */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Buscar por código, huésped o cédula..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-stone-300 bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('report')}
                  className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1.5"
                  title="Abrir Reporte de Reservas"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="hidden sm:inline">Ver Reporte</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
              {[
                { id: 'ALL', label: `Todas (${reservations.length})` },
                { id: 'PENDING_PAYMENT', label: `Pendientes Pago (${reservations.filter(r => r.status === 'PENDING_PAYMENT').length})` },
                { id: 'CONFIRMED', label: `Confirmadas (${reservations.filter(r => r.status === 'CONFIRMED').length})` },
                { id: 'CHECKED_IN', label: `En Hospedaje (${reservations.filter(r => r.status === 'CHECKED_IN').length})` },
                { id: 'CHECKED_OUT', label: `Finalizadas (${reservations.filter(r => r.status === 'CHECKED_OUT').length})` },
                { id: 'CANCELLED', label: `Canceladas (${reservations.filter(r => r.status === 'CANCELLED').length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-2xs border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Código & Cabaña</th>
                  <th className="py-3 px-4">Huésped & Contacto</th>
                  <th className="py-3 px-4">Fechas (Check-in / Out)</th>
                  <th className="py-3 px-4">Notificaciones</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones & Transición</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {isLoading ? (
                  <AdminTableSkeleton rows={6} type="reservations" />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">
                      No se encontraron reservas con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filtered.map((res) => {
                    const badge = getStatusBadge(res.status);
                    return (
                      <tr key={res.id} className="hover:bg-stone-50/70 transition-colors">
                        
                        {/* Code & Room */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-amber-900 block">
                            {res.reservationCode}
                          </span>
                          <span className="font-serif text-stone-900 font-medium">
                            {res.room?.name || 'Cabaña'}
                          </span>
                        </td>

                        {/* Guest */}
                        <td className="py-3.5 px-4">
                          <strong className="text-stone-900 block font-medium">
                            {res.guest?.fullName}
                          </strong>
                          <span className="text-stone-500 text-2xs block">
                            📧 {res.guest?.email}
                          </span>
                          <span className="text-stone-400 text-2xs block">
                            📱 {res.guest?.phone}
                          </span>
                        </td>

                        {/* Dates */}
                        <td className="py-3.5 px-4">
                          <span className="text-stone-900 block font-semibold">
                            {formatDateEs(res.checkInDate)}
                          </span>
                          <span className="text-stone-500 text-2xs block">
                            Hasta: {formatDateEs(res.checkOutDate)}
                          </span>
                        </td>

                        {/* Notification Badges */}
                        <td className="py-3.5 px-4 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-3xs font-bold flex items-center gap-1">
                              <Mail className="w-3 h-3 text-emerald-600" />
                              <span>Confirmación OK</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSendConfirmationNotif(res)}
                              className="p-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 text-3xs cursor-pointer"
                              title="Reenviar correo de confirmación"
                            >
                              <Send className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-3xs font-bold flex items-center gap-1 border ${
                              res.reminderSent 
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200' 
                                : 'bg-stone-50 text-stone-600 border-stone-200'
                            }`}>
                              <Bell className="w-3 h-3" />
                              <span>{res.reminderSent ? 'Recordatorio 2D Enviado' : 'Recordatorio 2D Programado'}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSendReminderNotif(res)}
                              className="p-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 text-3xs cursor-pointer"
                              title="Enviar recordatorio de 2 días ahora"
                            >
                              <Send className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {badge.label}
                          </span>
                          {res.transactions && res.transactions.some(t => t.proofSlipBase64 || t.proofSlipUrl) && (
                            <button
                              type="button"
                              onClick={() => onInspectReservation(res)}
                              className="mt-1 flex items-center gap-1 text-2xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md cursor-pointer hover:bg-emerald-100 transition-colors"
                              title="Click para ver comprobante"
                            >
                              <FileText className="w-3 h-3 text-emerald-600" />
                              <span>Comprobante adjunto</span>
                            </button>
                          )}
                        </td>

                        {/* Actions based on State Machine */}
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* View Details */}
                          <button
                            onClick={() => onInspectReservation(res)}
                            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 cursor-pointer"
                            title="Ver detalles completos"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Transition: PENDING_PAYMENT -> CONFIRMED */}
                          {res.status === 'PENDING_PAYMENT' && (
                            <button
                              onClick={() => onStatusChange(res.id, 'CONFIRMED')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-2xs cursor-pointer shadow-xs inline-flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Confirmar Pago</span>
                            </button>
                          )}

                          {/* Transition: CONFIRMED or PENDING_PAYMENT -> CHECKED_IN */}
                          {(res.status === 'CONFIRMED' || res.status === 'PENDING_PAYMENT') && (
                            <button
                              onClick={() => onStatusChange(res.id, 'CHECKED_IN')}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-2xs cursor-pointer shadow-xs inline-flex items-center gap-1"
                              title="Registrar entrada / Check-in del huésped"
                            >
                              <LogIn className="w-3 h-3" />
                              <span>Check-in</span>
                            </button>
                          )}

                          {/* Transition: CHECKED_IN -> CHECKED_OUT */}
                          {res.status === 'CHECKED_IN' && (
                            <button
                              onClick={() => onStatusChange(res.id, 'CHECKED_OUT')}
                              className="px-2.5 py-1 rounded-lg bg-stone-700 hover:bg-stone-800 text-white font-semibold text-2xs cursor-pointer shadow-xs inline-flex items-center gap-1"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>Check-out</span>
                            </button>
                          )}

                          {/* Cancel allowed if not checked out */}
                          {res.status !== 'CHECKED_OUT' && res.status !== 'CANCELLED' && (
                            <button
                              onClick={() => setCancelModalRes(res)}
                              className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                              title="Cancelar reserva"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Cancellation Reason Modal */}
          {cancelModalRes && (
            <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-stone-200 space-y-4">
                <h4 className="font-serif font-bold text-stone-900 text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  Cancelar Reserva {cancelModalRes.reservationCode}
                </h4>
                <p className="text-xs text-stone-600">
                  Esta acción liberará la cabaña <strong>{cancelModalRes.room?.name}</strong> para nuevas solicitudes de reserva.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Motivo de la Cancelación:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ej. Solicitud del huésped por fuerza mayor, falta de pago dentro de los 25 min..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setCancelModalRes(null)}
                    className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    disabled={isUpdating}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    {isUpdating ? 'Cancelando...' : 'Confirmar Cancelación'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
