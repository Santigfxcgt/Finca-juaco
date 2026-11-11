import React, { useState } from 'react';
import { 
  Users, 
  BedDouble, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  Coffee,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Room } from '../types';
import { formatCOP } from '../utils/formatters';
import { formatDirectDriveUrl, getRoomFallbackImage } from '../utils/driveImages';

interface RoomCardProps {
  room: Room;
  nights: number;
  multiplier: number;
  onBook: (room: Room) => void;
  isAvailable?: boolean;
  layoutMode?: 'grid' | 'editorial';
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  nights,
  multiplier,
  onBook,
  isAvailable = true,
  layoutMode = 'grid'
}) => {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  const rawImages = room.images && room.images.length > 0 ? room.images : [getRoomFallbackImage(room.id)];
  const images = rawImages.map(img => formatDirectDriveUrl(img));

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFailed(false);
    setCurrentImgIndex((prev) => (prev + 1) % images.length);
  };

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFailed(false);
    setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const calculatedNightlyRate = Math.round(room.basePrice * multiplier);
  const totalStay = calculatedNightlyRate * nights;

  const currentImageUrl = imageFailed ? getRoomFallbackImage(room.id) : images[currentImgIndex];

  // -------------------------------------------------------------
  // MODO CUADRÍCULA (GRID CAMPESTRE RESPONSIVE) - Tarjeta Vertical
  // -------------------------------------------------------------
  if (layoutMode === 'grid') {
    return (
      <motion.article 
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={`bg-white rounded-3xl border ${
          room.outOfService 
            ? 'border-stone-300 opacity-80' 
            : 'border-[#D7C7B2]/70 hover:border-[#1B4332]'
        } overflow-hidden transition-all duration-300 flex flex-col group shadow-xs hover:shadow-lg`}
      >
        {/* Contenedor de Fotografía */}
        <div className="relative aspect-16/10 bg-stone-100 overflow-hidden shrink-0">
          <AnimatePresence mode="wait">
            <motion.img
              key={`${currentImgIndex}-${imageFailed}`}
              src={currentImageUrl}
              alt={room.name}
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={() => {
                if (!imageFailed) setImageFailed(true);
              }}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-700"
            />
          </AnimatePresence>

          {/* Carrusel interactivo */}
          {images.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between p-2.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
              <button
                type="button"
                onClick={prevImg}
                className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/85 text-white backdrop-blur-xs flex items-center justify-center transition-colors cursor-pointer shadow-md"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextImg}
                className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/85 text-white backdrop-blur-xs flex items-center justify-center transition-colors cursor-pointer shadow-md"
                aria-label="Siguiente foto"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Etiquetas superiores */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-md bg-[#1B4332] text-white text-xs font-bold tracking-wider shadow-xs">
              {room.roomNumber}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-black/65 text-white text-[10px] font-semibold backdrop-blur-xs">
              {room.capacity} huéspedes
            </span>
          </div>

          {/* Contador de fotos */}
          {images.length > 1 && (
            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/65 text-white text-[10px] font-mono font-bold backdrop-blur-xs">
              0{currentImgIndex + 1} / 0{images.length}
            </div>
          )}

          {/* Fuera de servicio */}
          {room.outOfService && (
            <div className="absolute inset-0 bg-stone-950/85 flex flex-col items-center justify-center p-4 text-center text-white">
              <AlertTriangle className="w-7 h-7 text-amber-400 mb-1.5" />
              <span className="font-bold text-xs uppercase tracking-wider">Fuera de Servicio</span>
              <p className="text-[11px] text-stone-300 mt-1 max-w-xs">{room.outOfServiceReason || 'Mantenimiento preventivo programado.'}</p>
            </div>
          )}
        </div>

        {/* Cuerpo de la Tarjeta */}
        <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
          <div>
            {/* Precio & Temporada */}
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-serif font-bold text-[#330757]">
                  {formatCOP(calculatedNightlyRate)}
                </span>
                <span className="text-xs text-stone-500 font-medium">/ noche</span>
              </div>
              {multiplier > 1.0 && (
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                  Alta ({Number(multiplier).toFixed(2)}x)
                </span>
              )}
            </div>

            {/* Título de la Habitación */}
            <h3 className="font-serif text-xl font-bold text-[#330757] leading-tight mb-2 group-hover:text-[#1B4332] transition-colors">
              {room.name}
            </h3>

            {/* Metadatos directos */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-stone-600 mb-3 font-medium">
              <span className="flex items-center gap-1 text-[#1B4332] font-semibold">
                <Users className="w-3.5 h-3.5" />
                {room.capacity} pers.
              </span>
              <span className="text-stone-300">·</span>
              <span className="flex items-center gap-1 text-stone-600">
                <BedDouble className="w-3.5 h-3.5 text-stone-500" />
                <span className="truncate max-w-[150px]">{room.bedType}</span>
              </span>
            </div>

            {/* Descripción */}
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed mb-4 line-clamp-3">
              {room.description}
            </p>

            {/* Lista de comodidades */}
            <div className="pt-3 border-t border-dashed border-[#D7C7B2]/70 mb-5">
              <div className="grid grid-cols-2 gap-1.5 text-xs text-stone-700">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#1B4332] shrink-0" />
                  <span className="truncate">Baño privado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#1B4332] shrink-0" />
                  <span className="truncate">Agua caliente</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-[#1B4332] shrink-0" />
                  <span className="truncate font-medium text-[#1B4332]">Desayuno inc.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#1B4332] shrink-0" />
                  <span className="truncate">Wi-Fi & TV</span>
                </div>
              </div>
            </div>
          </div>

          {/* Botón Reservar */}
          <div>
            {nights > 1 && (
              <div className="text-[11px] text-stone-600 mb-2 text-right">
                Total estadía ({nights} noches): <strong className="text-[#330757]">{formatCOP(totalStay)}</strong>
              </div>
            )}
            <motion.button
              type="button"
              onClick={() => onBook(room)}
              disabled={room.outOfService || !isAvailable || room.meetsMinStay === false}
              whileHover={!(room.outOfService || !isAvailable || room.meetsMinStay === false) ? { scale: 1.02 } : {}}
              whileTap={!(room.outOfService || !isAvailable || room.meetsMinStay === false) ? { scale: 0.98 } : {}}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center ${
                room.outOfService || !isAvailable || room.meetsMinStay === false
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300'
                  : 'bg-[#1B4332] hover:bg-[#2D6A4F] text-white shadow-xs hover:shadow-md'
              }`}
            >
              {room.outOfService
                ? 'Fuera de Servicio'
                : !isAvailable
                ? 'No Disponible'
                : room.meetsMinStay === false
                ? `Mínimo ${room.minStayRequired} noches`
                : 'Reservar Habitación'}
            </motion.button>
          </div>
        </div>
      </motion.article>
    );
  }

  // -------------------------------------------------------------
  // MODO EDITORIAL (BANNER HORIZONTAL EXPANDIDO)
  // -------------------------------------------------------------
  return (
    <motion.article 
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`bg-white rounded-3xl border ${room.outOfService ? 'border-stone-300 opacity-80' : 'border-[#D7C7B2]/80 hover:border-[#1B4332]'} overflow-hidden transition-colors duration-300 flex flex-col lg:flex-row group shadow-xs hover:shadow-md`}
    >
      {/* Fotografía en Gran Formato */}
      <div className="relative lg:w-5/12 aspect-16/10 lg:aspect-auto bg-stone-100 overflow-hidden shrink-0 min-h-[260px]">
        <AnimatePresence mode="wait">
          <motion.img
            key={`${currentImgIndex}-${imageFailed}`}
            src={currentImageUrl}
            alt={room.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => {
              if (!imageFailed) setImageFailed(true);
            }}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700"
          />
        </AnimatePresence>

        {images.length > 1 && (
          <div className="absolute inset-0 flex items-center justify-between p-3 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              onClick={prevImg}
              className="w-10 h-10 rounded-xl bg-black/60 hover:bg-black/85 text-white backdrop-blur-xs flex items-center justify-center transition-colors cursor-pointer shadow-md"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={nextImg}
              className="w-10 h-10 rounded-xl bg-black/60 hover:bg-black/85 text-white backdrop-blur-xs flex items-center justify-center transition-colors cursor-pointer shadow-md"
              aria-label="Siguiente foto"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="px-3 py-1 rounded-md bg-[#1B4332] text-white text-xs font-bold tracking-wider shadow-xs">
            {room.roomNumber}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-black/65 text-white text-2xs font-semibold backdrop-blur-xs">
            {room.viewType}
          </span>
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-black/65 text-white text-2xs font-mono font-bold tracking-wider backdrop-blur-xs">
            0{currentImgIndex + 1} / 0{images.length}
          </div>
        )}

        {room.outOfService && (
          <div className="absolute inset-0 bg-stone-950/85 flex flex-col items-center justify-center p-6 text-center text-white">
            <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
            <span className="font-bold text-sm uppercase tracking-wider">Fuera de Servicio</span>
            <p className="text-xs text-stone-300 mt-1 max-w-xs">{room.outOfServiceReason || 'Mantenimiento preventivo programado.'}</p>
          </div>
        )}
      </div>

      {/* Contenido y Dotación */}
      <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-2">
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#330757] leading-tight">
              {room.name}
            </h3>
            {multiplier > 1.0 && (
              <span className="text-2xs uppercase tracking-wider font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-md">
                Tarifa Alta ({Number(multiplier).toFixed(2)}x)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 font-medium mb-3">
            <span className="flex items-center gap-1.5 text-[#1B4332] font-bold">
              <Users className="w-3.5 h-3.5" />
              Capacidad: {room.capacity} huéspedes
            </span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="flex items-center gap-1.5 text-stone-700">
              <BedDouble className="w-3.5 h-3.5 text-stone-500" />
              {room.bedType}
            </span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="flex items-center gap-1 text-[#1B4332] font-semibold">
              <Coffee className="w-3.5 h-3.5" />
              Desayuno Tradicional Incluido
            </span>
          </div>

          <p className="text-stone-700 text-sm leading-relaxed mb-5 font-normal">
            {room.description}
          </p>

          <div className="bg-[#FAF8F5] rounded-2xl p-3.5 mb-5 border border-[#D7C7B2]/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-2">
              Dotación & Comodidades Incluidas
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-stone-800">
              {room.amenities.map((amenity, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#1B4332] shrink-0" />
                  <span className="truncate">{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer y Botón */}
        <div className="pt-4 border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-[#330757] font-serif">
                {formatCOP(calculatedNightlyRate)}
              </span>
              <span className="text-xs text-stone-500 font-medium">/ noche</span>
            </div>
            {nights > 1 && (
              <span className="text-xs text-stone-600 block mt-0.5">
                Total estadía ({nights} noches): <strong className="text-[#330757]">{formatCOP(totalStay)}</strong>
              </span>
            )}
            {room.meetsMinStay === false && room.minStayRequired && (
              <span className="text-2xs text-amber-800 font-bold block mt-1">
                Estadía mínima requerida: {room.minStayRequired} noches
              </span>
            )}
          </div>

          <motion.button
            type="button"
            onClick={() => onBook(room)}
            disabled={room.outOfService || !isAvailable || room.meetsMinStay === false}
            whileHover={!(room.outOfService || !isAvailable || room.meetsMinStay === false) ? { scale: 1.02 } : {}}
            whileTap={!(room.outOfService || !isAvailable || room.meetsMinStay === false) ? { scale: 0.96 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`min-h-[44px] px-8 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer flex items-center justify-center ${
              room.outOfService || !isAvailable || room.meetsMinStay === false
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300'
                : 'bg-[#1B4332] hover:bg-[#2D6A4F] text-white shadow-xs hover:shadow-md'
            }`}
          >
            {room.outOfService
              ? 'Fuera de Servicio'
              : !isAvailable
              ? 'No Disponible para estas fechas'
              : room.meetsMinStay === false
              ? `Mínimo ${room.minStayRequired} noches`
              : 'Reservar Cabaña'}
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
};
