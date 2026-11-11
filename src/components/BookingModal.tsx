import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  User, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Upload, 
  FileText, 
  ExternalLink,
  MessageCircle,
  ShieldAlert,
  Copy,
  Check,
  Mail,
  Send,
  Printer
} from 'lucide-react';
import { motion } from 'motion/react';
import { Room, Guest, Reservation, DocumentType, PaymentChannel } from '../types';
import { formatCOP, formatDateEs, getStatusBadge } from '../utils/formatters';
import { processImageFile } from '../utils/imageProcessor';

interface BookingModalProps {
  room: Room | null;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  multiplier: number;
  onClose: () => void;
  onBookingCreated: (res: Reservation) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  room,
  checkInDate,
  checkOutDate,
  nights,
  multiplier,
  onClose,
  onBookingCreated
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Live availability verification
  const [isCheckingAvailability, setIsCheckingAvailability] = useState<boolean>(true);
  const [roomAvailability, setRoomAvailability] = useState<{ available: boolean; reason: string | null }>({
    available: !room?.outOfService,
    reason: room?.outOfService ? (room.outOfServiceReason || 'Esta cabaña se encuentra temporalmente fuera de servicio.') : null
  });

  // Step 2: Guest Data
  const [guestData, setGuestData] = useState<{
    documentType: DocumentType;
    documentNumber: string;
    fullName: string;
    email: string;
    phone: string;
    nationality: string;
    emergencyContact: string;
    specialRequests: string;
  }>({
    documentType: 'CC',
    documentNumber: '',
    fullName: '',
    email: '',
    phone: '',
    nationality: 'Colombiana',
    emergencyContact: '',
    specialRequests: ''
  });

  // Track touched fields for instant, non-intrusive validation feedback
  const [touchedFields, setTouchedFields] = useState<{
    documentNumber?: boolean;
    fullName?: boolean;
    email?: boolean;
    phone?: boolean;
  }>({});

  // Field validation logic according to Colombian hotel hospitality norms
  const validationErrors = useMemo(() => {
    const errors: {
      documentNumber?: string;
      fullName?: string;
      email?: string;
      phone?: string;
    } = {};

    // 1. Validate Document Number
    const docType = guestData.documentType;
    const docNum = guestData.documentNumber.trim();
    if (!docNum) {
      errors.documentNumber = 'El número de documento es obligatorio.';
    } else if (docType === 'CC' || docType === 'CE') {
      if (!/^\d+$/.test(docNum)) {
        errors.documentNumber = 'El documento solo debe contener números.';
      } else if (docNum.length !== 10) {
        errors.documentNumber = `Debe contener exactamente 10 dígitos (tienes ${docNum.length}).`;
      }
    } else if (docType === 'NIT') {
      if (!/^\d+$/.test(docNum)) {
        errors.documentNumber = 'El NIT solo debe contener números.';
      } else if (docNum.length < 9 || docNum.length > 10) {
        errors.documentNumber = 'El NIT debe tener entre 9 y 10 dígitos.';
      }
    } else if (docType === 'PASSPORT') {
      if (docNum.length < 6 || docNum.length > 15) {
        errors.documentNumber = 'El pasaporte debe tener entre 6 y 15 caracteres.';
      }
    }

    // 2. Validate Full Name (at least 2 words, no numbers, min length)
    const name = guestData.fullName.trim();
    if (!name) {
      errors.fullName = 'El nombre completo del titular es obligatorio.';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(name)) {
      errors.fullName = 'El nombre solo puede contener letras y espacios (sin números).';
    } else {
      const parts = name.split(/\s+/).filter(p => p.length > 0);
      if (parts.length < 2) {
        errors.fullName = 'Por favor ingresa tu nombre y apellido completos.';
      } else if (parts.some(p => p.length < 2)) {
        errors.fullName = 'Cada nombre y apellido debe tener al menos 2 letras.';
      }
    }

    // 3. Validate Email Format
    const email = guestData.email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) {
      errors.email = 'El correo electrónico es obligatorio.';
    } else if (!emailRegex.test(email)) {
      errors.email = 'Ingresa un correo electrónico válido (ej. nombre@gmail.com).';
    }

    // 4. Validate Phone / WhatsApp
    const rawDigits = guestData.phone.trim().replace(/\D/g, '');
    if (!guestData.phone.trim()) {
      errors.phone = 'El teléfono celular / WhatsApp es obligatorio.';
    } else {
      const phoneDigits = (rawDigits.length === 12 && rawDigits.startsWith('57'))
        ? rawDigits.slice(2)
        : rawDigits;

      if (phoneDigits.length !== 10) {
        errors.phone = `El celular debe tener exactamente 10 dígitos (tienes ${phoneDigits.length}).`;
      } else if (!phoneDigits.startsWith('3') && !phoneDigits.startsWith('6')) {
        errors.phone = 'El número celular en Colombia debe iniciar con 3 (ej. 310...).';
      }
    }

    return errors;
  }, [guestData]);

  const isFormValid = useMemo(() => {
    return Object.keys(validationErrors).length === 0;
  }, [validationErrors]);

  const handleBlur = (field: 'documentNumber' | 'fullName' | 'email' | 'phone') => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  // Step 3: Created Reservation & Payment
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);
  const [paymentChoice, setPaymentChoice] = useState<'ANTICIPO' | 'PAGO_TOTAL'>('ANTICIPO');
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [notificationData, setNotificationData] = useState<any>(null);
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>('BANCOLOMBIA_TRANSFER');
  const [referenceCode, setReferenceCode] = useState('');
  const [proofSlipPreview, setProofSlipPreview] = useState<string | null>(null);
  const [proofSlipBase64, setProofSlipBase64] = useState<string | null>(null);
  const [proofSlipFileName, setProofSlipFileName] = useState<string>('comprobante.jpg');
  const [proofSlipSizeKB, setProofSlipSizeKB] = useState<number | null>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(25 * 60);

  // Check live room availability on mount and when dates change
  useEffect(() => {
    if (!room || !checkInDate || !checkOutDate) return;
    let isSubscribed = true;
    setIsCheckingAvailability(true);
    setErrorMsg(null);

    fetch(`/api/rooms/${room.id}/availability?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}`)
      .then(res => res.json())
      .then(data => {
        if (isSubscribed) {
          if (data && data.available !== undefined) {
            setRoomAvailability({
              available: Boolean(data.available),
              reason: data.reason || null
            });
            // If room is not available, ensure we don't allow Step 2
            if (!data.available) {
              setStep(1);
            }
          }
        }
      })
      .catch(() => {
        // network fallback
      })
      .finally(() => {
        if (isSubscribed) setIsCheckingAvailability(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [room?.id, checkInDate, checkOutDate]);

  // Hold Timer countdown
  useEffect(() => {
    if (step !== 3 || !createdReservation) return;
    const interval = setInterval(() => {
      const deadline = new Date(createdReservation.paymentHoldDeadline || Date.now()).getTime();
      const diff = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setHoldSecondsLeft(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, createdReservation]);

  if (!room) return null;

  const calculatedNightlyRate = Math.round(room.basePrice * multiplier);
  const totalAmount = calculatedNightlyRate * nights;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const reservationReceiptText = useMemo(() => {
    if (!createdReservation || !room) return '';
    return (
      `¡Hola, ${guestData.fullName}!\n\n` +
      `Confirmamos tu reserva en TURIM . Juaco • Finca La Colmena en Montenegro, Quindío.\n\n` +
      `════════════════════════════════════════\n` +
      `DETALLES DE TU RESERVA:\n` +
      `════════════════════════════════════════\n` +
      `• Código de Reserva: ${createdReservation.reservationCode}\n` +
      `• Cabaña: ${room.name}\n` +
      `• Check-In: ${checkInDate} (a partir de las 3:00 PM)\n` +
      `• Check-Out: ${checkOutDate} (hasta la 1:00 PM)\n` +
      `• Huéspedes: ${room.capacity} personas\n` +
      `• Total a Pagar: ${formatCOP(createdReservation.totalAmount)}\n\n` +
      `☕ INCLUIDO SIN COSTO ADICIONAL:\n` +
      `Desayuno campesino tradicional con café de origen, piscina campestre, senderos ecológicos, parque infantil, parqueadero privado gratuito y wifi.\n\n` +
      `📍 UBICACIÓN Y CÓMO LLEGAR:\n` +
      `Montenegro, Quindío (a 5 minutos del Parque del Café)\n` +
      `Google Maps: https://maps.google.com/?cid=3521013696986298488&entry=gps\n\n` +
      `CONTACTO DIRECTO DON JUACO:\n` +
      `Tel / WhatsApp: +57 301 567 7776\n` +
      `¡Te esperamos con los brazos abiertos en el Quindío! 🏡✨`
    );
  }, [createdReservation, room, guestData.fullName, checkInDate, checkOutDate]);

  const guestGmailTarget = guestData.email.trim();
  const gmailSubject = `Comprobante de Reserva [${createdReservation?.reservationCode || ''}] - TURIM . Juaco Finca La Colmena`;

  const directGmailWebUrl = useMemo(() => {
    if (notificationData?.gmailComposeUrl) return notificationData.gmailComposeUrl;
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(guestGmailTarget)}&su=${encodeURIComponent(gmailSubject)}&body=${encodeURIComponent(reservationReceiptText)}`;
  }, [notificationData?.gmailComposeUrl, guestGmailTarget, gmailSubject, reservationReceiptText]);

  const directMailtoUrl = useMemo(() => {
    if (notificationData?.mailtoUrl) return notificationData.mailtoUrl;
    return `mailto:${encodeURIComponent(guestGmailTarget)}?subject=${encodeURIComponent(gmailSubject)}&body=${encodeURIComponent(reservationReceiptText)}`;
  }, [notificationData?.mailtoUrl, guestGmailTarget, gmailSubject, reservationReceiptText]);

  // Step 1 to 2 transition: STRICT AVAILABILITY CHECK
  const handleProceedToGuestInfo = () => {
    if (isCheckingAvailability) {
      setErrorMsg('Estamos verificando la disponibilidad de la cabaña, por favor espera un momento.');
      return;
    }
    if (!roomAvailability.available || room.outOfService) {
      setErrorMsg(roomAvailability.reason || 'Esta cabaña no está disponible para las fechas seleccionadas.');
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  // Step 2: Submit Reservation to API (Creates PENDING_PAYMENT hold)
  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCheckingAvailability) {
      setErrorMsg('Verificando disponibilidad, un momento por favor.');
      return;
    }
    if (!roomAvailability.available || room.outOfService) {
      setErrorMsg('No es posible reservar: la cabaña no se encuentra disponible en las fechas elegidas.');
      return;
    }

    // Strict validation check for every guest field
    if (!isFormValid) {
      setTouchedFields({
        documentNumber: true,
        fullName: true,
        email: true,
        phone: true
      });
      const firstError = Object.values(validationErrors)[0];
      setErrorMsg(`No es posible continuar: ${firstError}`);
      return;
    }

    if (!acceptedTerms) {
      setErrorMsg('Debes aceptar la Política de Cancelación y la Política de Privacidad para continuar.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          checkInDate,
          checkOutDate,
          adults: room.capacity,
          children: 0,
          guestData,
          specialRequests: guestData.specialRequests
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo crear la reserva.');
      }

      setCreatedReservation(data.reservation);
      setBankDetails(data.bankDetails);
      if (data.notification) {
        setNotificationData(data.notification);
      }
      onBookingCreated(data.reservation);
      setStep(3); // Advance to payment step
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: File change handler for payment slip using processImageFile
  const handleProofSlipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const processed = await processImageFile(file, 1920, 0.88);
      setProofSlipFileName(processed.fileName);
      setProofSlipBase64(processed.base64Data);
      setProofSlipPreview(processed.previewUrl || processed.base64Data);
      setProofSlipSizeKB(processed.fileSizeKB);

      if (!referenceCode) {
        setReferenceCode(`SLIP-${Math.floor(100000 + Math.random() * 900000)}`);
      }
    } catch (err: any) {
      console.warn('Fallback a FileReader estándar para comprobante:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProofSlipBase64(reader.result);
          setProofSlipPreview(reader.result);
          setProofSlipFileName(file.name || 'comprobante.jpg');
          setProofSlipSizeKB(Math.round(file.size / 1024));
          if (!referenceCode) {
            setReferenceCode(`SLIP-${Math.floor(100000 + Math.random() * 900000)}`);
          }
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Submit Payment Slip
  const handleSubmitPaymentSlip = async () => {
    if (!createdReservation) return;

    if (!proofSlipBase64 && !referenceCode) {
      setErrorMsg('Por favor sube una foto de tu comprobante de pago o ingresa el número de referencia de la transferencia.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const advanceAmount = Math.round(createdReservation.totalAmount * 0.5);
      const amountToPay = paymentChoice === 'ANTICIPO' ? advanceAmount : createdReservation.totalAmount;
      const generatedRef = referenceCode || `TRANS-${Math.floor(100000 + Math.random() * 900000)}`;
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: createdReservation.id,
          paymentChannel,
          amount: amountToPay,
          paymentType: paymentChoice,
          referenceCode: generatedRef,
          base64Data: proofSlipBase64 || null,
          fileName: proofSlipFileName || 'comprobante.jpg',
          proofSlipUrl: proofSlipBase64 || '',
          notes: paymentChoice === 'ANTICIPO'
            ? `Anticipo (50%) registrado vía ${paymentChannel}`
            : `Pago total (100%) registrado vía ${paymentChannel}`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error registrando comprobante');
      }

      // Backup in client localStorage so voucher is never lost
      try {
        if (proofSlipBase64) {
          localStorage.setItem(`colmena_voucher_${createdReservation.id}`, proofSlipBase64);
        }
      } catch {
        // ignore quota
      }

      setStep(4); // Final confirmation voucher
    } catch (err: any) {
      setErrorMsg(err.message || 'Error enviando comprobante');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FAF6F0] w-full max-w-2xl rounded-3xl shadow-2xl border border-[#D7C7B2] overflow-hidden relative"
      >
        
        {/* Header */}
        <div className="bg-[#005400] text-white px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <img 
                src="/logo_turim_juaco.svg" 
                alt="Logo TURIM . Juaco" 
                className="w-10 h-7 rounded-lg object-contain" 
                referrerPolicy="no-referrer"
              />
              <h2 className="font-serif text-lg sm:text-xl font-bold text-white">
                Reserva en {room.name}
              </h2>
            </div>
            <p className="text-xs text-emerald-100 mt-0.5">
              Paso {step} de 4 • {
                step === 1 ? 'Detalles de la Estadía' :
                step === 2 ? 'Datos del Huésped' :
                step === 3 ? 'Pago & Bloqueo Temporal' : 'Voucher de Reserva'
              }
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onClose}
            className="p-2 rounded-xl text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Stepper Indicator */}
        <div className="grid grid-cols-4 border-b border-stone-200 text-center text-xs font-semibold py-2.5 px-4 bg-stone-50">
          <div className={step >= 1 ? 'text-[#005400] font-bold' : 'text-stone-400'}>1. Resumen</div>
          <div className={step >= 2 ? 'text-[#005400] font-bold' : 'text-stone-400'}>2. Huésped</div>
          <div className={step >= 3 ? 'text-[#005400] font-bold' : 'text-stone-400'}>3. Pago</div>
          <div className={step >= 4 ? 'text-[#005400] font-bold' : 'text-stone-400'}>4. Confirmación</div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto bg-white">
          
          {/* STEP 1: SUMMARY & PRICING */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex gap-4 items-center bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                <img
                  src={room.images?.[0] || '/logo_turim_juaco.svg'}
                  alt={room.name}
                  referrerPolicy="no-referrer"
                  className="w-24 h-20 object-cover rounded-xl shrink-0"
                />
                <div>
                  <span className="text-xs font-bold text-[#005400]">
                    {room.roomNumber}
                  </span>
                  <h4 className="font-serif font-bold text-[#330757] text-base">{room.name}</h4>
                  <p className="text-xs text-[#212121] font-medium">{room.bedType} • Capacidad: {room.capacity} huéspedes</p>
                </div>
              </div>

              {/* Dates & Rates Breakdown */}
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-stone-200 text-sm">
                <div className="flex justify-between text-[#212121]">
                  <span>Fechas de Estadía</span>
                  <strong className="text-[#330757] font-bold">
                    {formatDateEs(checkInDate)} → {formatDateEs(checkOutDate)}
                  </strong>
                </div>
                <div className="flex justify-between text-[#212121]">
                  <span>Total Noches</span>
                  <strong className="text-[#212121]">{nights} {nights === 1 ? 'noche' : 'noches'}</strong>
                </div>
                <div className="flex justify-between text-[#212121]">
                  <span>Tarifa Base por Noche</span>
                  <span>{formatCOP(room.basePrice)}</span>
                </div>
                {multiplier > 1.0 && (
                  <div className="flex justify-between text-[#330757] bg-purple-50 p-2 rounded-lg text-xs font-bold">
                    <span>Ajuste por Temporada Especial (x{multiplier})</span>
                    <span>+{formatCOP(calculatedNightlyRate - room.basePrice)} / noche</span>
                  </div>
                )}
                <div className="border-t border-stone-200 pt-3 flex justify-between items-baseline">
                  <span className="font-bold text-[#212121]">Total a Pagar</span>
                  <span className="text-2xl font-bold font-serif text-[#330757]">
                    {formatCOP(totalAmount)}
                  </span>
                </div>
              </div>

              <div className="bg-[#005400]/10 p-3.5 rounded-xl border border-[#005400]/25 text-xs text-[#212121] space-y-1.5">
                <p className="font-bold text-[#005400]">🏨 Dotación y configuración de {room.name}:</p>
                <p>• <strong>Camas:</strong> {room.bedType} (Capacidad máxima: {room.capacity} huéspedes).</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {room.amenities.map((item, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full bg-white text-[#005400] font-semibold border border-[#005400]/20 text-[11px]"
                    >
                      ✓ {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Unavailability Warning Banner */}
              {(!roomAvailability.available || room.outOfService) && (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 text-rose-900 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Habitación No Disponible para las Fechas Seleccionadas</span>
                  </div>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    {roomAvailability.reason || 'Esta cabaña ya se encuentra ocupada o reservada en el rango de fechas elegido. Por favor selecciona otra cabaña disponible o modifica tus fechas de viaje.'}
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full mt-2 py-2.5 px-4 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Ver Cabañas Disponibles en el Catálogo
                  </button>
                </div>
              )}

              {/* Proceed to Guest Info Button */}
              <button
                type="button"
                onClick={handleProceedToGuestInfo}
                disabled={isCheckingAvailability || !roomAvailability.available || room.outOfService}
                className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                  isCheckingAvailability || !roomAvailability.available || room.outOfService
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed border border-stone-300'
                    : 'bg-[#005400] hover:bg-[#003D00] text-white cursor-pointer hover:shadow-lg'
                }`}
              >
                {isCheckingAvailability ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Verificando disponibilidad en tiempo real...</span>
                  </>
                ) : !roomAvailability.available || room.outOfService ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Habitación No Disponible - Selecciona Otras Fechas</span>
                  </>
                ) : (
                  <span>Continuar con los Datos del Huésped</span>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: GUEST IDENTIFICATION */}
          {step === 2 && (
            (!roomAvailability.available || room.outOfService) ? (
              <div className="p-8 text-center space-y-4 bg-white rounded-2xl border border-rose-200">
                <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-lg text-rose-900">
                    Habitación No Disponible
                  </h4>
                  <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto leading-relaxed">
                    No es posible ingresar datos del huésped porque la cabaña <strong>{room.name}</strong> no está disponible para las fechas seleccionadas ({formatDateEs(checkInDate)} al {formatDateEs(checkOutDate)}).
                  </p>
                </div>
                <div className="flex gap-2 justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                  >
                    Volver al Resumen
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl bg-[#1B4332] text-white text-xs font-bold hover:bg-[#143225] shadow-xs cursor-pointer"
                  >
                    Elegir Otra Cabaña
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleCreateReservation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Tipo de Documento *
                  </label>
                  <select
                    value={guestData.documentType}
                    onChange={(e) => {
                      const newType = e.target.value as DocumentType;
                      setGuestData({ 
                        ...guestData, 
                        documentType: newType,
                        // If switching to CC/TI/CE, keep digits and max 10
                        documentNumber: newType !== 'PASSPORT' 
                          ? guestData.documentNumber.replace(/\D/g, '').slice(0, 10) 
                          : guestData.documentNumber
                      });
                      setTouchedFields(prev => ({ ...prev, documentNumber: true }));
                    }}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
                  >
                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                    <option value="CE">Cédula de Extranjería (CE)</option>
                    <option value="PASSPORT">Pasaporte</option>
                    <option value="NIT">NIT</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-700">
                      Número de Documento *
                    </label>
                    {guestData.documentType === 'CC' && (
                      <span className={`text-3xs font-mono font-medium ${
                        guestData.documentNumber.length === 10 ? 'text-emerald-700 font-bold' : 'text-stone-400'
                      }`}>
                        {guestData.documentNumber.length}/10 dígitos
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      inputMode={guestData.documentType !== 'PASSPORT' ? 'numeric' : 'text'}
                      placeholder={guestData.documentType === 'CC' ? 'Ej. 1094928174 (10 dígitos)' : 'Número de documento'}
                      value={guestData.documentNumber}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (guestData.documentType !== 'PASSPORT') {
                          val = val.replace(/\D/g, '').slice(0, 10);
                        }
                        setGuestData({ ...guestData, documentNumber: val });
                      }}
                      onBlur={() => handleBlur('documentNumber')}
                      className={`w-full px-3 py-2 pr-9 text-sm rounded-xl border transition-all ${
                        touchedFields.documentNumber && validationErrors.documentNumber
                          ? 'border-red-400 bg-red-50/20 focus:ring-1 focus:ring-red-400'
                          : touchedFields.documentNumber && !validationErrors.documentNumber && guestData.documentNumber
                          ? 'border-emerald-500 bg-emerald-50/15 focus:ring-1 focus:ring-emerald-500'
                          : 'border-stone-300 focus:ring-1 focus:ring-[#1B4332]'
                      }`}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {touchedFields.documentNumber && validationErrors.documentNumber && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      {touchedFields.documentNumber && !validationErrors.documentNumber && guestData.documentNumber && (
                        <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                      )}
                    </div>
                  </div>
                  {touchedFields.documentNumber && validationErrors.documentNumber ? (
                    <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                      <span>•</span> {validationErrors.documentNumber}
                    </p>
                  ) : (
                    <p className="text-3xs text-stone-400 mt-1">
                      {guestData.documentType === 'CC' 
                        ? 'Debe contener exactamente 10 dígitos numéricos.' 
                        : 'Ingresa tu número de identificación oficial.'}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nombre Completo del Titular *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carolina Herrera Pardo (nombre y apellido)"
                    value={guestData.fullName}
                    onChange={(e) => {
                      // Prevent typing numbers
                      const val = e.target.value.replace(/[0-9]/g, '');
                      setGuestData({ ...guestData, fullName: val });
                    }}
                    onBlur={() => handleBlur('fullName')}
                    className={`w-full px-3 py-2 pr-9 text-sm rounded-xl border transition-all ${
                      touchedFields.fullName && validationErrors.fullName
                        ? 'border-red-400 bg-red-50/20 focus:ring-1 focus:ring-red-400'
                        : touchedFields.fullName && !validationErrors.fullName && guestData.fullName
                        ? 'border-emerald-500 bg-emerald-50/15 focus:ring-1 focus:ring-emerald-500'
                        : 'border-stone-300 focus:ring-1 focus:ring-[#1B4332]'
                    }`}
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {touchedFields.fullName && validationErrors.fullName && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    {touchedFields.fullName && !validationErrors.fullName && guestData.fullName && (
                      <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    )}
                  </div>
                </div>
                {touchedFields.fullName && validationErrors.fullName ? (
                  <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                    <span>•</span> {validationErrors.fullName}
                  </p>
                ) : (
                  <p className="text-3xs text-stone-400 mt-1">
                    Ingresa al menos un nombre y un apellido (solo letras y espacios).
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Correo Electrónico *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="correo@ejemplo.com"
                      value={guestData.email}
                      onChange={(e) => setGuestData({ ...guestData, email: e.target.value })}
                      onBlur={() => handleBlur('email')}
                      className={`w-full px-3 py-2 pr-9 text-sm rounded-xl border transition-all ${
                        touchedFields.email && validationErrors.email
                          ? 'border-red-400 bg-red-50/20 focus:ring-1 focus:ring-red-400'
                          : touchedFields.email && !validationErrors.email && guestData.email
                          ? 'border-emerald-500 bg-emerald-50/15 focus:ring-1 focus:ring-emerald-500'
                          : 'border-stone-300 focus:ring-1 focus:ring-[#1B4332]'
                      }`}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {touchedFields.email && validationErrors.email && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      {touchedFields.email && !validationErrors.email && guestData.email && (
                        <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                      )}
                    </div>
                  </div>
                  {touchedFields.email && validationErrors.email ? (
                    <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                      <span>•</span> {validationErrors.email}
                    </p>
                  ) : (
                    <p className="text-3xs text-stone-400 mt-1">
                      Aquí recibirás la confirmación inmediata de tu reserva.
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-700">
                      Teléfono Celular / WhatsApp *
                    </label>
                    <span className={`text-3xs font-mono font-medium ${
                      guestData.phone.replace(/\D/g, '').length === 10 ? 'text-emerald-700 font-bold' : 'text-stone-400'
                    }`}>
                      {guestData.phone.replace(/\D/g, '').length}/10 dígitos
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      inputMode="numeric"
                      placeholder="310 445 8921 (10 dígitos)"
                      value={guestData.phone}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d\s+-]/g, '').slice(0, 15);
                        setGuestData({ ...guestData, phone: raw });
                      }}
                      onBlur={() => handleBlur('phone')}
                      className={`w-full px-3 py-2 pr-9 text-sm rounded-xl border transition-all ${
                        touchedFields.phone && validationErrors.phone
                          ? 'border-red-400 bg-red-50/20 focus:ring-1 focus:ring-red-400'
                          : touchedFields.phone && !validationErrors.phone && guestData.phone
                          ? 'border-emerald-500 bg-emerald-50/15 focus:ring-1 focus:ring-emerald-500'
                          : 'border-stone-300 focus:ring-1 focus:ring-[#1B4332]'
                      }`}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {touchedFields.phone && validationErrors.phone && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      {touchedFields.phone && !validationErrors.phone && guestData.phone && (
                        <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                      )}
                    </div>
                  </div>
                  {touchedFields.phone && validationErrors.phone ? (
                    <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                      <span>•</span> {validationErrors.phone}
                    </p>
                  ) : (
                    <p className="text-3xs text-stone-400 mt-1">
                      Número de 10 dígitos para mensajes y ubicación en WhatsApp.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nacionalidad
                  </label>
                  <input
                    type="text"
                    placeholder="Colombiana"
                    value={guestData.nationality}
                    onChange={(e) => setGuestData({ ...guestData, nationality: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Contacto de Emergencia
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre y teléfono de familiar"
                    value={guestData.emergencyContact}
                    onChange={(e) => setGuestData({ ...guestData, emergencyContact: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Peticiones Especiales (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Aniversario, restricciones alimentarias, hora estimada de llegada..."
                  value={guestData.specialRequests}
                  onChange={(e) => setGuestData({ ...guestData, specialRequests: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300"
                />
              </div>

              {/* Único Checkbox Legal Unificado (Política de Cancelación & Tratamiento de Datos) */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-700 leading-snug">
                  <input
                    type="checkbox"
                    id="legal-check"
                    name="legalCheck"
                    required
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-stone-300 text-[#1B4332] focus:ring-[#1B4332] cursor-pointer shrink-0"
                  />
                  <span>
                    He leído y acepto la{' '}
                    <a
                      href="/assets/aistudio/Pol_tica_de_Cancelaci_n_5d37bcbb.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1B4332] font-bold underline hover:text-[#2D6A4F]"
                    >
                      Política de Cancelación
                    </a>{' '}
                    (penalidad del 50% por inasistencia), y autorizo el tratamiento de mis datos personales conforme a la{' '}
                    <a
                      href="/assets/aistudio/Pol_tica_Integral_de_Privacidad_y_Cookies_46d82097.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1B4332] font-bold underline hover:text-[#2D6A4F]"
                    >
                      Política de Privacidad
                    </a>{' '}
                    de Finca La Colmena.
                  </span>
                </label>
              </div>

              <div className="flex flex-col gap-1.5 pt-2">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-sm font-semibold hover:bg-stone-50 cursor-pointer transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !acceptedTerms || !isFormValid}
                    className="w-2/3 py-2.5 rounded-xl bg-[#005400] hover:bg-[#003D00] disabled:bg-stone-200 disabled:text-stone-400 disabled:border disabled:border-stone-200 disabled:cursor-not-allowed text-white text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <span>{isSubmitting ? 'Enviando confirmación de reserva...' : 'Confirmar Reserva & Proceder al Pago'}</span>
                  </button>
                </div>
                {!isFormValid && (
                  <p className="text-3xs text-rose-700 bg-rose-50 border border-rose-200/80 rounded-xl py-1.5 px-3 text-center font-medium">
                    ⚠️ Por favor completa y corrige la información requerida de los campos resaltados para continuar.
                  </p>
                )}
                {isFormValid && !acceptedTerms && (
                  <p className="text-3xs text-stone-500 text-center font-medium">
                    * Debes aceptar las políticas para habilitar el botón de confirmación.
                  </p>
                )}
              </div>
            </form>
            )
          )}

          {/* STEP 3: PAYMENT HOLD & SLIP UPLOAD */}
          {step === 3 && createdReservation && (
            <div className="space-y-5">
              
              {/* Automated Confirmation Sent Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-emerald-900 animate-in fade-in duration-200">
                <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold text-emerald-950">¡Reserva registrada con éxito [{createdReservation.reservationCode}]!</strong>
                  <span>Se despachó automáticamente un correo HTML de confirmación con los detalles al correo ingresado: <strong>{guestData.email}</strong>.</span>
                  <span className="block text-[11px] text-emerald-700 mt-1">Revisa tu bandeja de entrada o la carpeta de Correo no deseado / Spam en {guestData.email}.</span>
                </div>
              </div>
              
              {/* Active Hold Countdown Banner */}
              <div className="bg-[#1B4332]/15 border border-[#1B4332]/40 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1B4332] text-white flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#1B4332] uppercase tracking-wider block">
                      Cabaña Bloqueada Temporalmente
                    </span>
                    <span className="text-xs text-[#5A4535]">
                      Código: <strong>{createdReservation.reservationCode}</strong> (Estado: Pendiente de Pago)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#7A6856] block">Tiempo restante:</span>
                  <span className="text-xl sm:text-2xl font-mono font-bold text-[#1B4332]">
                    {formatTimer(holdSecondsLeft)}
                  </span>
                </div>
              </div>

              {/* Instant Gmail Comprobante Access in Step 3 */}
              <div className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-red-100 text-red-700 flex items-center justify-center font-bold shrink-0">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-stone-600 block text-2xs">Comprobante asignado para envío al correo:</span>
                    <strong className="text-stone-900 font-mono text-2xs">{guestData.email}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href={directGmailWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-2xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Abrir en Gmail</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(reservationReceiptText, 'step3Receipt')}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 text-2xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedText === 'step3Receipt' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedText === 'step3Receipt' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Payment Option Selection: Anticipo 50% vs Pago Total 100% */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Modalidad de Pago de la Reserva
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Anticipo 50% */}
                  <div
                    onClick={() => setPaymentChoice('ANTICIPO')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      paymentChoice === 'ANTICIPO'
                        ? 'bg-emerald-50/70 border-emerald-700 shadow-xs ring-1 ring-emerald-700/20'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          paymentChoice === 'ANTICIPO' ? 'border-emerald-700 bg-emerald-700' : 'border-stone-400'
                        }`}>
                          {paymentChoice === 'ANTICIPO' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        Anticipo (50%)
                      </span>
                      <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Garantía Legal
                      </span>
                    </div>
                    <div className="text-base font-extrabold text-emerald-950 font-serif">
                      {formatCOP(Math.round(createdReservation.totalAmount * 0.5))}
                    </div>
                    <p className="text-[11px] text-stone-600 mt-1">
                      Abono para asegurar tu fecha. Saldo restante de <strong className="text-stone-800">{formatCOP(createdReservation.totalAmount - Math.round(createdReservation.totalAmount * 0.5))}</strong> al llegar a la finca.
                    </p>
                  </div>

                  {/* Option 2: Pago Total 100% */}
                  <div
                    onClick={() => setPaymentChoice('PAGO_TOTAL')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      paymentChoice === 'PAGO_TOTAL'
                        ? 'bg-emerald-50/70 border-emerald-700 shadow-xs ring-1 ring-emerald-700/20'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          paymentChoice === 'PAGO_TOTAL' ? 'border-emerald-700 bg-emerald-700' : 'border-stone-400'
                        }`}>
                          {paymentChoice === 'PAGO_TOTAL' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        Pago Total (100%)
                      </span>
                      <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                        Estadía Completa
                      </span>
                    </div>
                    <div className="text-base font-extrabold text-emerald-950 font-serif">
                      {formatCOP(createdReservation.totalAmount)}
                    </div>
                    <p className="text-[11px] text-stone-600 mt-1">
                      Cancela el 100% ahora y viaja con total tranquilidad ($0 saldo pendiente en recepción).
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Channel Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-2">
                  Selecciona tu Canal de Pago
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'BANCOLOMBIA_TRANSFER', label: 'Bancolombia' },
                    { id: 'NEQUI', label: 'Nequi' },
                    { id: 'BANCO_AGRARIO', label: 'Banco Agrario' },
                    { id: 'CREDIT_CARD', label: 'Tarjeta' },
                    { id: 'DAVIPLATA', label: 'Daviplata' }
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setPaymentChannel(ch.id as PaymentChannel)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        paymentChannel === ch.id
                          ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank Account Details Card */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs text-stone-700 space-y-2">
                {paymentChannel === 'BANCOLOMBIA_TRANSFER' && (
                  <>
                    <div className="flex justify-between items-center py-1 border-b border-stone-200">
                      <span>Banco / Tipo:</span>
                      <strong className="text-stone-900">Bancolombia • Ahorros</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-stone-200">
                      <span>Número de Cuenta:</span>
                      <div className="flex items-center space-x-1">
                        <strong className="font-mono text-stone-900">482-901842-19</strong>
                        <button 
                          type="button"
                          onClick={() => copyToClipboard('48290184219', 'bancolombia')}
                          className="p-1 hover:text-amber-700 cursor-pointer"
                        >
                          {copiedText === 'bancolombia' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span>Titular / NIT:</span>
                      <strong className="text-stone-900">Joaquín Restrepo • NIT 901.482.190-4</strong>
                    </div>
                  </>
                )}

                {paymentChannel === 'BANCO_AGRARIO' && (
                  <>
                    <div className="flex justify-between items-center py-1 border-b border-stone-200">
                      <span>Banco / Tipo:</span>
                      <strong className="text-stone-900">Banco Agrario de Colombia • Ahorros</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-stone-200">
                      <span>Número de Cuenta:</span>
                      <div className="flex items-center space-x-1">
                        <strong className="font-mono text-stone-900">0491-300184-2</strong>
                        <button 
                          type="button"
                          onClick={() => copyToClipboard('04913001842', 'bancoagrario')}
                          className="p-1 hover:text-amber-700 cursor-pointer"
                        >
                          {copiedText === 'bancoagrario' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span>Titular / NIT:</span>
                      <strong className="text-stone-900">Finca Hotel La Colmena de Don Juaco • NIT 901.482.190-4</strong>
                    </div>
                  </>
                )}

                {(paymentChannel === 'NEQUI' || paymentChannel === 'DAVIPLATA') && (
                  <>
                    <div className="flex justify-between items-center py-1 border-b border-stone-200">
                      <span>Canal:</span>
                      <strong className="text-stone-900">{paymentChannel}</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-stone-200">
                      <span>Número Celular:</span>
                      <div className="flex items-center space-x-1">
                        <strong className="font-mono text-stone-900 text-sm">301 567 7776</strong>
                        <button 
                          type="button"
                          onClick={() => copyToClipboard('3015677776', 'nequi')}
                          className="p-1 hover:text-amber-700 cursor-pointer"
                        >
                          {copiedText === 'nequi' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span>Titular:</span>
                      <strong className="text-stone-900">Finca La Colmena de Don Juaco</strong>
                    </div>
                  </>
                )}

                {paymentChannel === 'CREDIT_CARD' && (
                  <div className="p-3 bg-white rounded-xl border border-stone-200 text-center space-y-1">
                    <CreditCard className="w-6 h-6 mx-auto text-amber-700" />
                    <p className="font-semibold text-stone-900">Pasarela Virtual de Pago / Tarjeta</p>
                    <p className="text-stone-500">Aceptamos tarjetas débito y crédito. Puedes ingresar el código de aprobación para validación inmediata.</p>
                  </div>
                )}
              </div>

              {/* Upload Voucher Slip / Reference Code */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-700">
                    Comprobante de Pago (Foto o Captura) *
                  </label>
                  <span className="text-2xs text-[#1B4332] font-semibold">
                    JPG, PNG, WEBP o captura móvil
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej. BCOL-9842019 o N° de comprobante"
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
                  />
                  <label className="px-4 py-2 bg-[#1B4332] hover:bg-[#143225] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{proofSlipPreview ? 'Cambiar Foto' : 'Subir Comprobante'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProofSlipFileChange}
                    />
                  </label>
                </div>

                {/* Rich Voucher Preview Card */}
                {proofSlipPreview && (
                  <div className="p-3 rounded-2xl bg-white border border-[#D7C7B2] shadow-xs flex items-center gap-3">
                    <img 
                      src={proofSlipPreview} 
                      alt="Vista previa comprobante" 
                      className="w-16 h-16 object-cover rounded-xl border border-stone-200 shrink-0 bg-stone-50"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-emerald-800 font-bold text-xs">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Comprobante listo para enviar</span>
                      </div>
                      <p className="text-2xs text-stone-600 truncate mt-0.5 font-medium">
                        {proofSlipFileName} {proofSlipSizeKB ? `(${proofSlipSizeKB} KB)` : ''}
                      </p>
                      <p className="text-2xs text-stone-400 mt-0.5">
                        El administrador Don Juaco podrá inspeccionar y verificar este archivo.
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setProofSlipPreview(null);
                        setProofSlipBase64(null);
                        setProofSlipSizeKB(null);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleSubmitPaymentSlip}
                  disabled={isSubmitting}
                  className="w-full sm:w-2/3 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isSubmitting ? 'Enviando Comprobante...' : 'Enviar Comprobante de Pago'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="w-full sm:w-1/3 py-3 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold"
                >
                  Ver Voucher sin Enviar Aún
                </button>
              </div>

            </div>
          )}

          {/* STEP 4: CONFIRMED RESERVATION VOUCHER */}
          {step === 4 && createdReservation && (
            <div className="space-y-6 text-center py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1B4332]">
                  ¡Reserva Registrada Exitosamente!
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#2C1E16] mt-1">
                  Te esperamos en La Colmena
                </h3>
                <p className="text-xs text-[#6D5A4B] mt-1">
                  Guarda tu código para cualquier consulta o verificación de llegada.
                </p>
              </div>

              {/* Dedicated Gmail Comprobante Card */}
              <div className="bg-white border-2 border-emerald-600/30 rounded-2xl p-4 text-left shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">
                        Comprobante de Reserva al Gmail
                      </h4>
                      <p className="text-2xs text-stone-500 font-mono">
                        {guestData.email}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${notificationData?.deliveredViaSMTP ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {notificationData?.deliveredViaSMTP ? '✅ Enviado vía SMTP' : '📬 Listo para abrir en Gmail'}
                  </span>
                </div>

                <p className="text-2xs text-stone-600 leading-relaxed">
                  {notificationData?.deliveredViaSMTP 
                    ? `El comprobante ha sido despachado a tu correo ${guestData.email}. Si no lo ves de inmediato en tu bandeja principal, revisa la carpeta de Spam o Notificaciones de Gmail.`
                    : `Tu comprobante de reserva ha sido emitido con éxito para ${guestData.email}. Puedes abrirlo directamente en tu cuenta de Gmail con 1 solo clic:`
                  }
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <a
                    href={directGmailWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Abrir Comprobante en mi Gmail ({guestData.email})</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href={directMailtoUrl}
                    className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>App de Correo</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(reservationReceiptText, 'receiptText')}
                    className="py-2.5 px-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedText === 'receiptText' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText === 'receiptText' ? '¡Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>

                <div className="text-3xs text-[#7A6856] flex items-center gap-1 pt-1 border-t border-stone-100">
                  <Clock className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span>Recordatorio Automático: Recibirás un mensaje automatizado 2 días antes de tu fecha de check-in ({formatDateEs(checkInDate)}) con recomendaciones de viaje y ruta GPS en vivo.</span>
                </div>
              </div>

              {/* Voucher Ticket Box */}
              <div className="bg-[#EFE7DC] border-2 border-dashed border-[#D7C7B2] rounded-2xl p-5 text-left text-xs space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-[#D7C7B2]">
                  <div>
                    <span className="text-[#6D5A4B] block">Código de Reserva</span>
                    <strong className="text-lg font-mono text-[#2C1E16] font-bold">
                      {createdReservation.reservationCode}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1B4332]/15 text-[#1B4332] border border-[#1B4332]/30">
                      Pendiente Verificación
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[#5A4535]">
                  <div>
                    <span className="block text-[#7A6856]">Cabaña:</span>
                    <strong className="text-[#2C1E16]">{room.name}</strong>
                  </div>
                  <div>
                    <span className="block text-[#7A6856]">Titular:</span>
                    <strong className="text-[#2C1E16]">{guestData.fullName}</strong>
                  </div>
                  <div>
                    <span className="block text-[#7A6856]">Llegada (Check-in):</span>
                    <strong className="text-[#2C1E16]">{formatDateEs(checkInDate)} (15:00)</strong>
                  </div>
                  <div>
                    <span className="block text-[#7A6856]">Salida (Check-out):</span>
                    <strong className="text-[#2C1E16]">{formatDateEs(checkOutDate)} (11:00)</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#D7C7B2] flex justify-between items-baseline">
                  <span className="font-semibold text-[#2C1E16]">Total Liquidado:</span>
                  <span className="text-lg font-bold font-serif text-[#1B4332]">
                    {formatCOP(createdReservation.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Actions: Print / WhatsApp Don Juaco */}
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={`https://wa.me/573015677776?text=${encodeURIComponent(`Hola Don Juaco, he realizado la reserva ${createdReservation.reservationCode} para la cabaña ${room.name} a nombre de ${guestData.fullName}. ¡Deseo confirmar mi llegada!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-md flex items-center justify-center space-x-2 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Notificar a Don Juaco por WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-3 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-semibold"
                >
                  Imprimir Comprobante
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="text-xs text-stone-500 hover:text-stone-800 underline block mx-auto"
              >
                Cerrar ventana y volver a la finca
              </button>
            </div>
          )}

        </div>

      </motion.div>
    </motion.div>
  );
};
