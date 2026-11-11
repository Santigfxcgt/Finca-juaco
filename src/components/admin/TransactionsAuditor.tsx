import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  ShieldCheck, 
  Image as ImageIcon,
  AlertTriangle,
  X,
  User,
  Home,
  Calendar,
  Loader2
} from 'lucide-react';
import { Transaction, VerificationStatus, Reservation, ReservationStatus } from '../../types';
import { formatCOP, getPaymentChannelLabel, getVerificationStatusBadge } from '../../utils/formatters';
import { AdminTableSkeleton } from './AdminTableSkeleton';
import { VoucherModal } from './VoucherModal';

interface TransactionsAuditorProps {
  transactions: Transaction[];
  reservations?: Reservation[];
  onVerifyTransaction: (id: string, status: VerificationStatus, reason?: string) => Promise<void>;
  onStatusChange?: (id: string, nextStatus: ReservationStatus, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export const TransactionsAuditor: React.FC<TransactionsAuditorProps> = ({
  transactions,
  reservations = [],
  onVerifyTransaction,
  onStatusChange,
  isLoading = false
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [inspectSlip, setInspectSlip] = useState<Transaction | null>(null);
  const [fullVoucherTx, setFullVoucherTx] = useState<Transaction | null>(null);
  const [rejectingTx, setRejectingTx] = useState<Transaction | null>(null);
  const [rejectReason, setRejectReason] = useState('El comprobante no coincide con la cuenta o no es legible.');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filtered = transactions.filter(tx => {
    if (activeFilter === 'ALL') return true;
    return tx.verificationStatus === activeFilter;
  });

  const totalVerified = transactions
    .filter(t => t.verificationStatus === 'VERIFIED')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalPending = transactions
    .filter(t => t.verificationStatus === 'PENDING')
    .reduce((acc, t) => acc + t.amount, 0);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  const handleVerify = async (txId: string, status: VerificationStatus, customReason?: string) => {
    setProcessingId(txId);
    try {
      await onVerifyTransaction(txId, status, status === 'REJECTED' ? (customReason || rejectReason) : undefined);
      
      if (status === 'VERIFIED') {
        showNotification('success', '¡Pago verificado y reserva confirmada exitosamente!');
      } else {
        showNotification('success', 'Pago rechazado y reserva cancelada para liberar disponibilidad.');
      }

      setInspectSlip(null);
      setRejectingTx(null);
      setRejectReason('El comprobante no coincide con la cuenta o no es legible.');
    } catch (err: any) {
      showNotification('error', err?.message || 'Ocurrió un error al procesar la solicitud.');
    } finally {
      setProcessingId(null);
    }
  };

  // Helper to find associated reservation
  const getReservationForTx = (reservationId: string): Reservation | undefined => {
    return reservations.find(r => r.id === reservationId);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden space-y-4">
      
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div className={`mx-4 mt-4 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${
          feedbackMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
            : 'bg-rose-50 text-rose-900 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button 
            onClick={() => setFeedbackMessage(null)}
            className="text-stone-400 hover:text-stone-700 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Header */}
      <div className="p-4 sm:p-5 border-b border-stone-200 bg-[#FAF8F5]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-700" />
              <span>Auditoría de Pagos & Comprobantes</span>
            </h3>
            <p className="text-xs text-stone-500">
              Validación contable de transferencias Bancolombia, Nequi y Daviplata para confirmación o rechazo de reservas.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-3">
            <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs">
              <span className="text-emerald-700 block text-2xs font-bold uppercase">Verificado</span>
              <strong className="text-emerald-900 font-serif text-sm">{formatCOP(totalVerified)}</strong>
            </div>
            <div className="bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl text-xs">
              <span className="text-amber-700 block text-2xs font-bold uppercase">Por Auditar</span>
              <strong className="text-amber-900 font-serif text-sm">{formatCOP(totalPending)}</strong>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-4 text-xs font-semibold overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: `Todos (${transactions.length})` },
            { id: 'PENDING', label: `Pendientes (${transactions.filter(t => t.verificationStatus === 'PENDING').length})` },
            { id: 'VERIFIED', label: `Aprobados (${transactions.filter(t => t.verificationStatus === 'VERIFIED').length})` },
            { id: 'REJECTED', label: `Rechazados (${transactions.filter(t => t.verificationStatus === 'REJECTED').length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === tab.id
                  ? 'bg-amber-700 text-white shadow-xs'
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
        <table className="w-full text-left text-xs text-stone-700 min-w-[850px]">
          <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-2xs border-b border-stone-200">
            <tr>
              <th className="py-3 px-4">Canal</th>
              <th className="py-3 px-4">Huésped & Reserva</th>
              <th className="py-3 px-4">Referencia / Comprobante</th>
              <th className="py-3 px-4">Monto Liquidado</th>
              <th className="py-3 px-4">Fecha de Envío</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Acciones de Auditoría</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading ? (
              <AdminTableSkeleton rows={6} type="transactions" />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-stone-400">
                  No hay transacciones registradas bajo este criterio.
                </td>
              </tr>
            ) : (
              filtered.map((tx) => {
                const badge = getVerificationStatusBadge(tx.verificationStatus);
                const res = getReservationForTx(tx.reservationId);
                const isCurrentlyProcessing = processingId === tx.id;

                return (
                  <tr key={tx.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* Payment Channel */}
                    <td className="py-3.5 px-4 font-semibold text-stone-900">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 text-2xs font-mono font-bold">
                        {getPaymentChannelLabel(tx.paymentChannel)}
                      </span>
                    </td>

                    {/* Guest & Reservation */}
                    <td className="py-3.5 px-4">
                      {res ? (
                        <div>
                          <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-stone-400" />
                            <span>{res.guest?.fullName || 'Huésped Registrado'}</span>
                          </div>
                          <div className="text-2xs text-stone-500 flex items-center gap-1 mt-0.5">
                            <Home className="w-2.5 h-2.5 text-stone-400" />
                            <span>{res.room?.name || 'Cabaña'}</span>
                            <span className="text-stone-300">•</span>
                            <span className="font-mono text-amber-800 font-semibold">{res.reservationCode}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-stone-400 text-2xs italic">ID: {tx.reservationId.slice(0, 10)}...</span>
                      )}
                    </td>

                    {/* Reference & Slip Indicator */}
                    <td className="py-3.5 px-4">
                      {(() => {
                        const backupLocal = typeof window !== 'undefined' ? localStorage.getItem(`colmena_voucher_${tx.reservationId}`) : null;
                        const proofSrc = tx.proofSlipBase64 || tx.proofSlipUrl || backupLocal;
                        return (
                          <div className="flex items-center gap-2">
                            {proofSrc ? (
                              <button
                                type="button"
                                onClick={() => setInspectSlip(tx)}
                                className="w-10 h-10 rounded-lg overflow-hidden border border-stone-300 hover:border-amber-700 transition-colors shrink-0 bg-stone-100 cursor-pointer group/thumb relative shadow-2xs"
                                title="Click para inspeccionar comprobante"
                              >
                                <img 
                                  src={proofSrc} 
                                  alt="Comprobante" 
                                  className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform" 
                                />
                              </button>
                            ) : null}
                            <div>
                              <span className="font-mono font-bold text-amber-900 block">
                                {tx.referenceCode}
                              </span>
                              {proofSrc ? (
                                <span className="text-2xs text-emerald-700 font-semibold flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3 text-emerald-600" /> Soporte adjunto
                                </span>
                              ) : (
                                <span className="text-2xs text-stone-400">Sin archivo</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-serif font-bold text-stone-900 whitespace-nowrap">
                      {formatCOP(tx.amount)}
                    </td>

                    {/* Submission Date */}
                    <td className="py-3.5 px-4 text-stone-500 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>

                    {/* Verification Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-2xs font-semibold ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Actions: Horizontally aligned in a single line (flex-row, whitespace-nowrap) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex flex-row items-center justify-end gap-1.5 whitespace-nowrap">
                        {/* 1. Ver Soporte */}
                        <button
                          onClick={() => setInspectSlip(tx)}
                          className="px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                          title="Ver imagen y detalles del comprobante"
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-600" />
                          <span>Ver Soporte</span>
                        </button>

                        {/* 2. Aceptar & 3. Rechazar (Horizontalmente uno después de otro) */}
                        {tx.verificationStatus === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleVerify(tx.id, 'VERIFIED')}
                              disabled={isCurrentlyProcessing}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-semibold cursor-pointer shadow-xs inline-flex items-center gap-1.5 transition-all text-xs disabled:opacity-50"
                              title="Aprobar pago y confirmar reserva"
                            >
                              {isCurrentlyProcessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                              <span>Aceptar</span>
                            </button>

                            <button
                              onClick={() => {
                                setRejectingTx(tx);
                                setRejectReason('El comprobante no coincide con la cuenta o no es legible.');
                              }}
                              disabled={isCurrentlyProcessing}
                              className="px-2.5 py-1.5 rounded-lg border border-rose-300 bg-rose-50/70 hover:bg-rose-100 active:scale-95 text-rose-700 font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-all text-xs disabled:opacity-50"
                              title="Rechazar pago y cancelar reserva"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Rechazar</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-2xs text-stone-400 italic px-1">
                            {tx.verificationStatus === 'VERIFIED' ? 'Procesado' : 'Rechazado'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal 1: Proof Slip Preview Modal */}
      {inspectSlip && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h4 className="font-serif font-bold text-stone-900 text-base">
                  Comprobante #{inspectSlip.referenceCode}
                </h4>
                <p className="text-2xs text-stone-500">
                  Canal: {getPaymentChannelLabel(inspectSlip.paymentChannel)}
                </p>
              </div>
              <button
                onClick={() => setInspectSlip(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip Image */}
            {(() => {
              const localBackup = typeof window !== 'undefined' ? localStorage.getItem(`colmena_voucher_${inspectSlip.reservationId}`) : null;
              const modalSrc = inspectSlip.proofSlipBase64 || inspectSlip.proofSlipUrl || localBackup;

              return (
                <div className="rounded-2xl bg-stone-100 overflow-hidden border border-stone-200 min-h-60 max-h-96 flex flex-col items-center justify-center relative group/img">
                  {modalSrc ? (
                    <>
                      <img
                        src={modalSrc}
                        alt="Soporte de pago"
                        onClick={() => setFullVoucherTx(inspectSlip)}
                        className="w-full h-full object-contain max-h-96 rounded-2xl bg-white cursor-pointer hover:opacity-95 transition-opacity"
                        onError={(e) => {
                          if (inspectSlip.proofSlipBase64 && e.currentTarget.src !== inspectSlip.proofSlipBase64) {
                            e.currentTarget.src = inspectSlip.proofSlipBase64;
                          } else if (localBackup && e.currentTarget.src !== localBackup) {
                            e.currentTarget.src = localBackup;
                          }
                        }}
                      />
                      <div className="p-2 w-full bg-stone-50 border-t border-stone-200 flex items-center justify-between text-2xs text-stone-500">
                        <span>Fotografía oficial cargada por el huésped</span>
                        <button
                          type="button"
                          onClick={() => setFullVoucherTx(inspectSlip)}
                          className="px-2.5 py-1 bg-stone-800 hover:bg-stone-900 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver en tamaño completo</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-stone-400 text-center p-8">
                      <ImageIcon className="w-10 h-10 mx-auto mb-2 text-stone-300" />
                      <span className="text-xs">No se adjuntó archivo gráfico en este registro</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Slip Details */}
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-500">Monto Reportado:</span>
                <strong className="text-stone-900 font-serif text-sm">{formatCOP(inspectSlip.amount)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Canal de Pago:</span>
                <strong className="text-stone-900">{getPaymentChannelLabel(inspectSlip.paymentChannel)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Referencia:</span>
                <strong className="text-stone-900 font-mono">{inspectSlip.referenceCode}</strong>
              </div>
              {inspectSlip.notes && (
                <div className="pt-1 border-t border-stone-200 text-stone-600">
                  <span className="text-stone-400 text-2xs block">Notas del Huésped:</span>
                  <span>{inspectSlip.notes}</span>
                </div>
              )}
              {inspectSlip.rejectionReason && (
                <div className="pt-1 border-t border-rose-200 text-rose-700 bg-rose-50/50 p-2 rounded-lg">
                  <span className="font-semibold text-2xs block">Motivo de Rechazo:</span>
                  <span>{inspectSlip.rejectionReason}</span>
                </div>
              )}
            </div>

            {/* Action Row Inside Modal: Horizontal inline alignment */}
            <div className="flex flex-row items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setInspectSlip(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
              >
                Cerrar
              </button>

              {inspectSlip.verificationStatus === 'PENDING' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const current = inspectSlip;
                      setInspectSlip(null);
                      setRejectingTx(current);
                      setRejectReason('El comprobante no coincide con la cuenta o no es legible.');
                    }}
                    disabled={processingId === inspectSlip.id}
                    className="px-4 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Rechazar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVerify(inspectSlip.id, 'VERIFIED')}
                    disabled={processingId === inspectSlip.id}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {processingId === inspectSlip.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span>Aceptar & Confirmar</span>
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Modal 2: Rejection Modal */}
      {rejectingTx && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="font-serif font-bold text-stone-900 text-base">
                  Rechazar Pago & Cancelar Reserva
                </h4>
              </div>
              <button
                onClick={() => setRejectingTx(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Al rechazar el comprobante #{rejectingTx.referenceCode} por <strong className="text-stone-900 font-serif">{formatCOP(rejectingTx.amount)}</strong>, la reserva vinculada quedará cancelada y la cabaña volverá a estar disponible inmediatamente en el calendario.
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Motivo del Rechazo:
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ej. Valor consignado no coincide, número de cuenta erróneo, imagen ilegible..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {/* Horizontal action buttons */}
            <div className="flex flex-row items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRejectingTx(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleVerify(rejectingTx.id, 'REJECTED', rejectReason)}
                disabled={processingId === rejectingTx.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {processingId === rejectingTx.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>Confirmar Rechazo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Voucher Modal */}
      <VoucherModal
        isOpen={!!fullVoucherTx}
        onClose={() => setFullVoucherTx(null)}
        transaction={fullVoucherTx}
      />

    </div>
  );
};
