import React from 'react';
import { Calendar, Users, Search, RotateCcw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SeasonRate } from '../types';
import { formatCOP, formatDateEs, getTodayDateString, getTomorrowDateString } from '../utils/formatters';

interface SearchBarProps {
  checkInDate: string;
  setCheckInDate: (date: string) => void;
  checkOutDate: string;
  setCheckOutDate: (date: string) => void;
  guestCount: number | '';
  setGuestCount: (count: number | '') => void;
  onSearch: () => void;
  onClear: () => void;
  isSearching: boolean;
  isFiltered: boolean;
  activeSeason?: SeasonRate | null;
  seasonalMultiplier?: number;
  validationError?: string | null;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  checkInDate,
  setCheckInDate,
  checkOutDate,
  setCheckOutDate,
  guestCount,
  setGuestCount,
  onSearch,
  onClear,
  isSearching,
  isFiltered,
  activeSeason,
  seasonalMultiplier = 1.0,
  validationError
}) => {
  // Calculate nights
  let nights = 1;
  if (checkInDate && checkOutDate) {
    const diff = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
    nights = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  // Base rate calculation: $85.000 COP regular, adjusted by seasonalMultiplier
  const baseRate = 85000;
  const calculatedNightlyRate = Math.round(baseRate * seasonalMultiplier);
  const estimatedTotal = calculatedNightlyRate * nights;
  const advanceRequired = Math.round(estimatedTotal * 0.5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-3xl border border-[#D7C7B2]/80 p-4 sm:p-6 shadow-xs"
      >
        
        {/* Header of Search & Live Quote */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-4 border-b border-stone-200/80 gap-2">
          <div>
            <span className="text-2xs font-extrabold uppercase tracking-widest text-[#005400] block mb-0.5">
              Cotizador & Disponibilidad en Tiempo Real
            </span>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#330757]">
              Selecciona tus fechas de estadía y huéspedes
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-600 bg-[#FAF6F0] px-3 py-1.5 rounded-xl border border-[#D7C7B2]/50">
            <span className="w-2 h-2 rounded-full bg-[#005400] animate-pulse" />
            <span>Fechas automáticas: <strong className="text-stone-800">Hoy → Mañana ({nights} {nights === 1 ? 'noche' : 'noches'})</strong></span>
          </div>
        </div>

        {/* Validation Error Banner */}
        <AnimatePresence>
          {validationError && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25 }}
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center space-x-2 overflow-hidden"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unified Segmented Search Console (Apple Segmented Style) */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-[#FAF8F5] rounded-2xl p-2 border border-[#D7C7B2]/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-center">
            
            {/* Segment 1: Check-in */}
            <div className="lg:col-span-3 bg-white rounded-xl p-2.5 sm:p-3 border border-stone-200/60 hover:border-[#005400] focus-within:border-[#005400] transition-colors">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#330757] mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#005400] shrink-0" />
                Llegada (Check-in)
              </label>
              <input
                type="date"
                required
                value={checkInDate}
                min={getTodayDateString()}
                onChange={(e) => {
                  const newIn = e.target.value;
                  setCheckInDate(newIn);
                  if (newIn && (!checkOutDate || checkOutDate <= newIn)) {
                    setCheckOutDate(getTomorrowDateString(newIn));
                  }
                }}
                className="w-full text-sm font-medium text-[#212121] bg-transparent focus:outline-hidden cursor-pointer"
              />
            </div>

            {/* Segment 2: Check-out */}
            <div className="lg:col-span-3 bg-white rounded-xl p-2.5 sm:p-3 border border-stone-200/60 hover:border-[#005400] focus-within:border-[#005400] transition-colors">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#330757] mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#005400] shrink-0" />
                Salida (Check-out)
              </label>
              <input
                type="date"
                required
                value={checkOutDate}
                min={checkInDate ? getTomorrowDateString(checkInDate) : getTomorrowDateString()}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full text-sm font-medium text-[#212121] bg-transparent focus:outline-hidden cursor-pointer"
              />
            </div>

            {/* Segment 3: Ergonomic Guest Stepper with 44x44px touch targets */}
            <div className="lg:col-span-4 bg-white rounded-xl p-2.5 sm:p-3 border border-stone-200/60 hover:border-[#005400] transition-colors">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#330757] mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#005400] shrink-0" />
                Huéspedes
              </span>
              <div className="flex items-center justify-between gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    const current = typeof guestCount === 'number' ? guestCount : 2;
                    if (current > 1) {
                      setGuestCount(current - 1);
                    } else {
                      setGuestCount('');
                    }
                  }}
                  className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                  title="Disminuir huéspedes"
                  aria-label="Disminuir huéspedes"
                >
                  -
                </motion.button>
                <div className="text-center flex-1 px-1">
                  <span className="text-xs sm:text-sm font-semibold text-[#212121] block leading-tight">
                    {guestCount === '' 
                      ? 'Todas (1 a 6 pax)' 
                      : `${guestCount} ${guestCount === 1 ? 'Huésped' : 'Huéspedes'}`}
                  </span>
                  <span className="text-[10px] text-stone-500 block truncate">
                    {guestCount === '' ? 'Filtro flexible' : `Cabañas para ${guestCount} personas`}
                  </span>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    const current = typeof guestCount === 'number' ? guestCount : 0;
                    if (current < 6) {
                      setGuestCount(current + 1);
                    }
                  }}
                  className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                  title="Aumentar huéspedes"
                  aria-label="Aumentar huéspedes"
                >
                  +
                </motion.button>
              </div>
            </div>

            {/* Segment 4: Action Buttons with Spring Feedback */}
            <div className="lg:col-span-2 flex items-center gap-1.5 h-full">
              <motion.button
                type="submit"
                disabled={isSearching}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-[#005400] hover:bg-[#003D00] disabled:bg-stone-300 text-white font-bold text-xs sm:text-sm transition-colors shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>{isSearching ? 'Buscando...' : 'Consultar'}</span>
              </motion.button>

              {isFiltered && (
                <motion.button
                  type="button"
                  onClick={onClear}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="min-h-[44px] px-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center shrink-0"
                  title="Restablecer filtros"
                  aria-label="Restablecer filtros"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </div>

          </div>

          {/* Live Quote Breakdown Card (Tone Step over hairlines) */}
          <motion.div 
            layout
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="mt-3 bg-[#FAF8F5] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#D7C7B2]/40"
          >
            
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-[#330757]">
                  Cotización estimada para {nights} {nights === 1 ? 'noche' : 'noches'}:
                </span>
                <span className="text-stone-600">
                  ({formatDateEs(checkInDate)} → {formatDateEs(checkOutDate)})
                </span>
                {activeSeason && (
                  <span className="text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-md text-2xs">
                    {activeSeason.name} ({seasonalMultiplier}x)
                  </span>
                )}
              </div>
              <p className="text-2xs text-stone-600">
                Tarifa base por cabaña: <strong className="text-stone-900">{formatCOP(calculatedNightlyRate)} / noche</strong> · Incluye desayuno campesino tradicional para los huéspedes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Total Estadía Estimado</span>
                <span className="font-serif font-bold text-lg text-[#330757] leading-none">
                  {formatCOP(estimatedTotal)}
                </span>
              </div>

              <div className="text-right pl-3.5 border-l border-stone-300/80">
                <span className="text-[10px] text-[#005400] font-bold uppercase tracking-wider block">Anticipo Requerido (50%)</span>
                <span className="font-serif font-bold text-base text-[#005400] leading-none">
                  {formatCOP(advanceRequired)}
                </span>
              </div>
            </div>

          </motion.div>

        </form>

      </motion.div>
    </div>
  );
};
