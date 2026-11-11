import React, { useState } from 'react';
import { Search, X, AlertCircle, Clock, CheckCircle2, Upload, MessageCircle, Mail, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { Reservation } from '../types';
import { formatCOP, formatDateEs, getStatusBadge, getPaymentChannelLabel } from '../utils/formatters';
import { processImageFile } from '../utils/imageProcessor';

interface ReservationLookupModalProps {
  onClose: () => void;
}

export const ReservationLookupModal: React.FC<ReservationLookupModalProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);

  // Upload slip state
  const [slipFile, setSlipFile] = useState<string | null>(null);
  const [slipBase64, setSlipBase64] = useState<string | null>(null);
  const [slipFileName, setSlipFileName] = useState<string>('comprobante.jpg');
  const [refCode, setRefCode] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);
    setReservation(null);
    setUploadSuccess(false);

    try {
      const res = await fetch(`/api/reservations?search=${encodeURIComponent(searchTerm.trim())}`);
      const data = await res.json();

      if (!res.ok || !Array.isArray(data) || data.length === 0) {
        setErrorMsg('No encontramos ninguna reserva con ese código o número de documento. Verifica e intenta nuevamente.');
      } else {
        setReservation(data[0]);
      }
    } catch (err: any) {
      setErrorMsg('Error consultando el servidor.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const processed = await processImageFile(file, 1920, 0.88);
      setSlipBase64(processed.base64Data);
      setSlipFile(processed.previewUrl || processed.base64Data);
      setSlipFileName(processed.fileName);
      if (!refCode) {
        setRefCode(`SLIP-${Date.now().toString().slice(-6)}`);
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSlipBase64(reader.result);
          setSlipFile(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadProof = async () => {
    if (!reservation) return;
    if (!slipBase64 && !refCode) {
      setErrorMsg('Por favor adjunta la fotografía de tu comprobante de pago.');
      return;
    }

    setIsUploading(true);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: reservation.id,
          paymentChannel: 'BANCOLOMBIA_TRANSFER',
          amount: reservation.totalAmount,
          referenceCode: refCode || `SLIP-${Date.now().toString().slice(-6)}`,
          base64Data: slipBase64 || null,
          fileName: slipFileName || 'comprobante.jpg',
          proofSlipUrl: slipBase64 || '',
          notes: 'Comprobante adjuntado desde el módulo de consulta de reserva.'
        })
      });

      if (res.ok) {
        setUploadSuccess(true);
        // Refresh reservation
        const refreshed = await fetch(`/api/reservations/${reservation.id}`);
        if (refreshed.ok) {
          const freshData = await refreshed.json();
          setReservation(freshData);
        }
      }
    } catch (err) {
      setErrorMsg('No se pudo cargar el comprobante.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 14 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FAF6F0] w-full max-w-xl rounded-3xl shadow-2xl border border-[#D7C7B2] overflow-hidden relative"
      >
        
        {/* Header */}
        <div className="bg-[#005400] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-emerald-200" />
            <h3 className="font-serif text-lg font-bold text-white">
              Consultar Mi Reserva
            </h3>
          </div>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onClose}
            className="p-1.5 rounded-xl text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="p-6 space-y-5">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="block text-xs font-semibold text-[#5A4535]">
              Ingresa tu Código de Reserva (Ej. COL-2026-9012) o Cédula/Documento:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="COL-2026-XXXX o 1094928174"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-[#D7C7B2] bg-white text-[#2C1E16] focus:ring-2 focus:ring-[#1B4332]"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-5 py-2.5 rounded-xl bg-[#005400] hover:bg-[#003D00] disabled:bg-stone-300 text-white text-sm font-bold shadow-xs transition-all cursor-pointer"
              >
                {isSearching ? 'Buscando...' : 'Consultar'}
              </button>
            </div>
          </form>

          {/* Error */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Found Reservation Card */}
          {reservation && (
            <div className="bg-[#EFE7DC] rounded-2xl border border-[#D7C7B2] p-5 space-y-4 text-xs">
              
              {/* Top status */}
              <div className="flex items-center justify-between pb-3 border-b border-[#D7C7B2]">
                <div>
                  <span className="text-[#6D5A4B] block text-2xs uppercase tracking-wider">Código</span>
                  <span className="font-mono text-base font-bold text-[#2C1E16]">{reservation.reservationCode}</span>
                </div>
                <div>
                  {(() => {
                    const badge = getStatusBadge(reservation.status);
                    return (
                      <span className={`px-2.5 py-1 rounded-full font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-2 gap-3 text-[#5A4535]">
                <div>
                  <span className="text-[#7A6856] block">Cabaña:</span>
                  <strong className="text-[#2C1E16] text-sm font-serif">{reservation.room?.name || 'Cabaña'}</strong>
                </div>
                <div>
                  <span className="text-[#7A6856] block">Titular:</span>
                  <strong className="text-[#2C1E16] text-sm">{reservation.guest?.fullName}</strong>
                </div>
                <div>
                  <span className="text-[#7A6856] block">Llegada:</span>
                  <strong className="text-[#2C1E16]">{formatDateEs(reservation.checkInDate)} (15:00)</strong>
                </div>
                <div>
                  <span className="text-[#7A6856] block">Salida:</span>
                  <strong className="text-[#2C1E16]">{formatDateEs(reservation.checkOutDate)} (11:00)</strong>
                </div>
                <div>
                  <span className="text-[#7A6856] block">Total Liquidado:</span>
                  <strong className="text-[#1B4332] font-serif text-sm font-bold">
                    {formatCOP(reservation.totalAmount)}
                  </strong>
                </div>
                <div>
                  <span className="text-[#7A6856] block">Documento:</span>
                  <strong className="text-[#2C1E16]">{reservation.guest?.documentType} {reservation.guest?.documentNumber}</strong>
                </div>
              </div>

              {/* Transactions list */}
              {reservation.transactions && reservation.transactions.length > 0 && (
                <div className="pt-2 border-t border-[#D7C7B2]">
                  <span className="font-semibold text-[#2C1E16] block mb-2">Comprobantes / Pagos Registrados:</span>
                  <div className="space-y-1.5">
                    {reservation.transactions.map((tx) => (
                      <div key={tx.id} className="p-2 rounded-lg bg-[#FAF6F0] border border-[#D7C7B2] flex items-center justify-between">
                        <div>
                          <strong className="text-[#2C1E16]">{getPaymentChannelLabel(tx.paymentChannel)}</strong>
                          <span className="text-[#7A6856] text-2xs block">Ref: {tx.referenceCode}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-[#2C1E16]">{formatCOP(tx.amount)}</span>
                          <span className={`block text-2xs font-semibold ${
                            tx.verificationStatus === 'VERIFIED' ? 'text-[#1B4332]' :
                            tx.verificationStatus === 'REJECTED' ? 'text-rose-700' : 'text-amber-800'
                          }`}>
                            {tx.verificationStatus === 'VERIFIED' ? 'Aprobado' :
                             tx.verificationStatus === 'REJECTED' ? 'Rechazado' : 'Pendiente Verificación'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* If pending payment: allow uploading proof slip */}
              {reservation.status === 'PENDING_PAYMENT' && (
                <div className="pt-3 border-t border-[#D7C7B2] bg-[#FAF6F0] p-3.5 rounded-xl border border-[#D7C7B2] space-y-2">
                  <span className="font-bold text-[#1B4332] flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Adjuntar Comprobante de Pago
                  </span>
                  <p className="text-[#5A4535] text-2xs">
                    Transfiere a Bancolombia Ahorros # 482-901842-19 o Nequi 301 567 7776 y adjunta tu soporte:
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="N° de referencia / comprobante"
                      value={refCode}
                      onChange={(e) => setRefCode(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-[#D7C7B2] rounded-lg text-xs"
                    />
                    <label className="px-3 py-1.5 bg-[#EFE7DC] border border-[#D7C7B2] hover:bg-[#EAE0D2] rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 text-[#2C1E16]">
                      <Upload className="w-3 h-3 text-[#1B4332]" />
                      <span>{slipFile ? 'Cambiar Foto' : 'Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelected}
                      />
                    </label>
                    <button
                      onClick={handleUploadProof}
                      disabled={isUploading}
                      className="px-3 py-1.5 bg-[#1B4332] hover:bg-[#143225] text-white rounded-lg font-semibold text-xs cursor-pointer"
                    >
                      {isUploading ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>

                  {slipFile && (
                    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-[#D7C7B2] text-xs">
                      <img src={slipFile} alt="Preview" className="w-10 h-10 object-cover rounded-md border border-stone-200" />
                      <span className="text-2xs text-stone-600 truncate flex-1">{slipFileName}</span>
                      <button 
                        type="button" 
                        onClick={() => { setSlipFile(null); setSlipBase64(null); }} 
                        className="text-rose-600 text-2xs font-semibold hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                  )}

                  {uploadSuccess && (
                    <div className="text-[#1B4332] font-semibold text-2xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Comprobante enviado. Don Juaco lo validará en breve.
                    </div>
                  )}
                </div>
              )}

              {/* Gmail direct receipt button */}
              {reservation.guest?.email && (
                <div className="pt-2">
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(reservation.guest.email)}&su=${encodeURIComponent(`Comprobante de Reserva [${reservation.reservationCode}] - TURIM . Juaco Finca La Colmena`)}&body=${encodeURIComponent(`¡Hola, ${reservation.guest.fullName}!\n\nAquí tienes los detalles de tu reserva [${reservation.reservationCode}] en TURIM . Juaco • Finca La Colmena:\n\n• Cabaña: ${reservation.room?.name || ''}\n• Check-In: ${reservation.checkInDate} (a partir de las 3:00 PM)\n• Check-Out: ${reservation.checkOutDate} (hasta la 1:00 PM)\n• Valor Total: $${reservation.totalAmount.toLocaleString('es-CO')} COP\n\n☕ Incluye desayuno campesino, piscina campestre y parqueadero.\n📍 Ubicación GPS: https://maps.google.com/?cid=3521013696986298488&entry=gps\nContacto Don Juaco: +57 301 567 7776`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs mb-2"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Abrir Comprobante en mi Gmail ({reservation.guest.email})</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* WhatsApp direct contact button */}
              <div className="pt-1">
                <a
                  href={`https://wa.me/573015677776?text=${encodeURIComponent(`Hola Don Juaco, deseo consultar información sobre mi reserva ${reservation.reservationCode} para la cabaña ${reservation.room?.name || ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#23533E] text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contactar a Don Juaco por WhatsApp con esta reserva</span>
                </a>
              </div>

            </div>
          )}

        </div>

      </motion.div>
    </motion.div>
  );
};
