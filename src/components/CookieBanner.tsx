import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, X } from 'lucide-react';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Validación de persistencia: si ya existe la clave en localStorage, no se muestra
    try {
      const consent = localStorage.getItem('cookies_consent');
      if (!consent) {
        // Breve retraso para una aparición suave y natural
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // Manejo seguro de errores en caso de bloqueo de cookies de terceros en el navegador
    }
  }, []);

  const handleConsent = (choice: 'all' | 'essential') => {
    try {
      localStorage.setItem('cookies_consent', choice);
    } catch (e) {
      console.warn('No se pudo guardar la preferencia de cookies en localStorage', e);
    }

    // Transición suave de salida
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 320);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Consentimiento de Cookies"
      className={`fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-50 transition-all duration-300 ease-out ${
        isClosing ? 'opacity-0 translate-y-4 scale-95 pointer-events-none' : 'opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-bottom-4 duration-300'
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md border border-stone-200 shadow-2xl rounded-2xl p-4 sm:p-5 text-stone-800">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#1B4332] flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
            <Cookie className="w-4 h-4 text-[#1B4332]" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs sm:text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                <span>Tu Privacidad en Don Juaco</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#1B4332]" />
              </h4>
              <button
                onClick={() => handleConsent('essential')}
                className="text-stone-400 hover:text-stone-600 p-1 -mr-1 -mt-1 rounded-lg transition-colors cursor-pointer"
                title="Cerrar y aceptar solo esenciales"
                aria-label="Cerrar banner de cookies"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-2xs sm:text-xs text-stone-600 leading-relaxed">
              Utilizamos cookies técnicas necesarias para gestionar tus reservas y cookies analíticas para mejorar tu experiencia en nuestra finca. Consulta nuestra{' '}
              <a
                href="/assets/aistudio/Pol_tica_Integral_de_Privacidad_y_Cookies_46d82097.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1B4332] font-semibold underline hover:text-[#2D6A4F] transition-colors"
              >
                Política de Privacidad y Cookies
              </a>.
            </p>

            {/* Botones de acción con Flexbox y clara jerarquía visual */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => handleConsent('essential')}
                className="px-3.5 py-1.5 text-2xs sm:text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all cursor-pointer text-center"
              >
                Solo Esenciales
              </button>
              <button
                type="button"
                onClick={() => handleConsent('all')}
                className="px-4 py-2 text-2xs sm:text-xs font-bold text-white bg-[#1B4332] hover:bg-[#2D6A4F] active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer text-center"
              >
                Aceptar Todas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
