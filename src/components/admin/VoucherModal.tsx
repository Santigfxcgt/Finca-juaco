import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Download, RefreshCw, AlertTriangle, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Transaction } from '../../types';
import { formatCOP } from '../../utils/formatters';

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  reservationCode?: string;
  guestName?: string;
}

const SUPABASE_CDN_BASE = 'https://wxjafauyokuudalwauzg.supabase.co/storage/v1/object/public/vouchers/';
const DEFAULT_FALLBACK_IMG = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80';

export const VoucherModal: React.FC<VoucherModalProps> = ({
  isOpen,
  onClose,
  transaction,
  reservationCode,
  guestName
}) => {
  const [sources, setSources] = useState<string[]>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState<number>(0);
  const [imageError, setImageError] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  // Compute candidate sources whenever transaction changes
  useEffect(() => {
    if (!transaction) {
      setSources([]);
      setCurrentSourceIndex(0);
      setImageError(false);
      return;
    }

    const candidates: string[] = [];

    // 1. Direct base64 data
    if (transaction.proofSlipBase64 && transaction.proofSlipBase64.startsWith('data:image/')) {
      candidates.push(transaction.proofSlipBase64);
    }

    // 2. Direct proofSlipUrl if provided
    if (transaction.proofSlipUrl) {
      if (transaction.proofSlipUrl.startsWith('data:image/')) {
        if (!candidates.includes(transaction.proofSlipUrl)) {
          candidates.push(transaction.proofSlipUrl);
        }
      } else {
        candidates.push(transaction.proofSlipUrl);
      }

      // 3. If relative path (/vouchers/filename.jpg), derive Supabase Storage CDN URL
      if (transaction.proofSlipUrl.startsWith('/vouchers/')) {
        const rawFileName = transaction.proofSlipUrl.replace('/vouchers/', '').split('?')[0];
        if (rawFileName) {
          const supabaseUrl = `${SUPABASE_CDN_BASE}${rawFileName}`;
          if (!candidates.includes(supabaseUrl)) {
            candidates.push(supabaseUrl);
          }
        }
      }
    }

    // 4. LocalStorage backup from client-side uploads
    if (typeof window !== 'undefined' && transaction.reservationId) {
      const backupLocal = localStorage.getItem(`colmena_voucher_${transaction.reservationId}`);
      if (backupLocal && !candidates.includes(backupLocal)) {
        candidates.push(backupLocal);
      }
    }

    // 5. Fallback receipt asset
    candidates.push(DEFAULT_FALLBACK_IMG);

    setSources(candidates);
    setCurrentSourceIndex(0);
    setImageError(false);
    setIsZoomed(false);
  }, [transaction]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !transaction) return null;

  const currentSrc = sources[currentSourceIndex] || DEFAULT_FALLBACK_IMG;

  const handleImageError = () => {
    if (currentSourceIndex < sources.length - 1) {
      setCurrentSourceIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };

  /**
   * Safely opens the image in a new tab:
   * Converts base64 to a Blob URL if needed to bypass browser top-level data: URI blocking.
   */
  const handleOpenInNewTab = () => {
    try {
      if (!currentSrc) return;

      if (currentSrc.startsWith('data:image/')) {
        const parts = currentSrc.split(';base64,');
        const contentType = parts[0].replace('data:', '') || 'image/jpeg';
        const raw = atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (!win) {
          alert('Por favor permite ventanas emergentes en tu navegador para ver la imagen.');
        }
      } else {
        const fullUrl = currentSrc.startsWith('/') 
          ? `${window.location.origin}${currentSrc}` 
          : currentSrc;
        window.open(fullUrl, '_blank');
      }
    } catch (err) {
      console.warn('Error abriendo imagen en nueva pestaña:', err);
      // Popup fallback window
      const win = window.open();
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>Comprobante ${transaction.referenceCode}</title></head>
            <body style="margin:0; background:#0f172a; display:flex; align-items:center; justify-center; min-height:100vh;">
              <img src="${currentSrc}" style="max-width:100%; max-height:100vh; margin:auto; object-fit:contain;" />
            </body>
          </html>
        `);
      }
    }
  };

  /**
   * Downloads the image file to the user's computer.
   */
  const handleDownload = () => {
    try {
      const code = reservationCode || transaction.reservationId || 'COL-2026';
      const fileName = `Comprobante_${code}_${transaction.referenceCode}.jpg`;

      if (currentSrc.startsWith('data:image/')) {
        const link = document.createElement('a');
        link.href = currentSrc;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        fetch(currentSrc)
          .then(res => res.blob())
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          })
          .catch(() => {
            const link = document.createElement('a');
            link.href = currentSrc;
            link.download = fileName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          });
      }
    } catch (e) {
      console.error('Error descargando imagen:', e);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Modal Header */}
          <div className="bg-[#1B4332] text-white px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-800/80 flex items-center justify-center text-emerald-200 border border-emerald-700/50">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
                  <span>Comprobante de Pago</span>
                  <span className="font-mono text-xs bg-emerald-900/80 px-2 py-0.5 rounded-md text-emerald-200 font-normal">
                    {transaction.referenceCode}
                  </span>
                </h3>
                <p className="text-2xs text-emerald-100/90">
                  {guestName ? `Huésped: ${guestName}` : 'Reserva'}{' '}
                  {reservationCode ? `• Código: ${reservationCode}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleDownload}
                className="p-2 rounded-xl text-emerald-100 hover:bg-white/10 transition-colors cursor-pointer"
                title="Descargar comprobante"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="p-2 rounded-xl text-emerald-100 hover:bg-white/10 transition-colors cursor-pointer"
                title="Abrir en ventana independiente"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-emerald-100 hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body: High Resolution Viewer */}
          <div className="p-4 sm:p-6 bg-stone-900 flex-1 overflow-y-auto flex flex-col items-center justify-center relative min-h-[350px]">
            {imageError ? (
              <div className="text-center text-stone-300 p-8 space-y-3 max-w-sm">
                <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
                <h4 className="font-bold text-white text-sm">No se pudo cargar la vista previa</h4>
                <p className="text-2xs text-stone-400">
                  La imagen del comprobante puede ser un archivo local no almacenado o con formato restringido. Puedes intentar abrirla directamente:
                </p>
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir Archivo Original</span>
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center relative group">
                <img
                  src={currentSrc}
                  alt={`Comprobante ${transaction.referenceCode}`}
                  onError={handleImageError}
                  onClick={() => setIsZoomed(!isZoomed)}
                  className={`max-h-[65vh] w-auto max-w-full object-contain rounded-2xl bg-white shadow-2xl transition-transform duration-300 cursor-zoom-in ${
                    isZoomed ? 'scale-125 cursor-zoom-out' : ''
                  }`}
                />

                <span className="mt-2 text-3xs text-stone-400 block bg-stone-950/70 px-3 py-1 rounded-full border border-stone-800">
                  {isZoomed ? 'Click para alejar' : 'Click en la imagen para ampliar'}
                </span>
              </div>
            )}
          </div>

          {/* Modal Footer: Transaction Summary & Controls */}
          <div className="p-4 bg-stone-50 border-t border-stone-200 shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto">
                <div>
                  <span className="text-[10px] text-stone-500 block uppercase font-bold">Monto Abonado</span>
                  <strong className="text-emerald-800 font-serif text-sm block">
                    {formatCOP(transaction.amount)}
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] text-stone-500 block uppercase font-bold">Medio de Pago</span>
                  <span className="text-stone-900 font-mono font-semibold block text-xs">
                    {transaction.paymentChannel}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-stone-500 block uppercase font-bold">Referencia</span>
                  <span className="text-stone-900 font-mono block text-xs">
                    {transaction.referenceCode}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-stone-500 block uppercase font-bold">Estado</span>
                  <span className={`inline-flex items-center gap-1 font-bold text-xs ${
                    transaction.verificationStatus === 'VERIFIED' ? 'text-emerald-700' :
                    transaction.verificationStatus === 'REJECTED' ? 'text-rose-700' : 'text-amber-800'
                  }`}>
                    {transaction.verificationStatus === 'VERIFIED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {transaction.verificationStatus === 'VERIFIED' ? 'Aprobado' :
                     transaction.verificationStatus === 'REJECTED' ? 'Rechazado' : 'Pendiente Verificación'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="px-4 py-2 bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver imagen completa en pestaña</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
