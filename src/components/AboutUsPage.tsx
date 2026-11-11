import React from 'react';
import { ArrowLeft, ChevronRight, Waves, UtensilsCrossed, BedDouble, MapPin, Sparkles, Trees, Car, ShieldCheck } from 'lucide-react';
import { AppModule } from '../types';

interface AboutUsPageProps {
  onNavigate: (module: AppModule) => void;
}

export const AboutUsPage: React.FC<AboutUsPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in duration-200">
      
      {/* Breadcrumb & Navigation Bar */}
      <div className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-[#D7C7B2]/60">
        <div className="flex items-center space-x-2 text-xs text-[#6D5A4B]">
          <button 
            onClick={() => onNavigate('inicio')}
            className="hover:text-[#005400] font-medium transition-colors cursor-pointer"
          >
            Inicio
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#005400] font-bold">Quiénes Somos</span>
        </div>

        <button
          onClick={() => onNavigate('inicio')}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border border-[#D7C7B2] hover:border-[#005400] bg-[#FAF6F0] text-[#2C1E16] text-xs font-semibold shadow-2xs hover:bg-[#EAE0D2] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#005400]" />
          <span>Volver al Inicio</span>
        </button>
      </div>

      {/* Editorial Container */}
      <div className="bg-white rounded-3xl border border-[#D7C7B2]/80 p-8 sm:p-14 shadow-xs">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 pb-8 border-b border-stone-200">
          <span className="text-2xs sm:text-xs font-bold uppercase tracking-widest text-[#005400] inline-flex items-center gap-1.5">
            <Trees className="w-3.5 h-3.5 text-[#005400]" />
            Refugio de Descanso & Naturaleza • Quindío
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#330757] tracking-tight mt-2 mb-3">
            Quiénes Somos
          </h1>
          <p className="text-xs sm:text-sm text-[#212121] leading-relaxed">
            TURIM . Juaco • Finca La Colmena: un refugio totalmente de descanso y naturaleza en el corazón del paisaje cafetero de Montenegro, Quindío.
          </p>
        </div>

        {/* Central Narrative Text - Official Content */}
        <div className="max-w-2xl mx-auto space-y-6 text-[#4A3B32] text-sm sm:text-base leading-relaxed text-justify">
          <p>
            Somos un refugio totalmente de descanso y naturaleza diseñado para conectar con la tranquilidad del paisaje del Quindío. Disfruta de instalaciones completas que incluyen piscina al aire libre, bañera de hidromasaje, terraza, jardín y parking privado gratuito.
          </p>
          
          <p>
            Sorpréndete con una oferta gastronómica excepcional en nuestro restaurante y bar, con deliciosas opciones de desayuno a la carta o americano.
          </p>
          
          <p>
            Nuestras habitaciones combinan confort y funcionalidad, equipadas con baño privado, escritorio, TV de pantalla plana, armario y lencería completa. Además, contamos con zona de juegos infantiles, servicio de conserjería, organización de tours y traslado al aeropuerto.
          </p>
          
          <p>
            Estamos ubicados estratégicamente en Montenegro. Somos el punto de partida perfecto para explorar la región: a solo 5,6 km del Parque Nacional del Café y a 21 km de PANACA, contamos con acceso a rutas de senderismo y actividades al aire libre. Un destino altamente valorado por parejas y familias que buscan una escapada inolvidable.
          </p>
        </div>

        {/* Visual Pillars & Services Grid */}
        <div className="mt-12 pt-10 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-[#005400]/10 flex items-center justify-center text-[#005400]">
              <Waves className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-[#330757]">Descanso & Bienestar</h4>
            <p className="text-2xs text-stone-600">Piscina al aire libre, hidromasaje, terraza y amplios jardines.</p>
          </div>

          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-[#005400]/10 flex items-center justify-center text-[#005400]">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-[#330757]">Gastronomía & Bar</h4>
            <p className="text-2xs text-stone-600">Restaurante con opciones de desayuno a la carta y americano.</p>
          </div>

          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-[#005400]/10 flex items-center justify-center text-[#005400]">
              <BedDouble className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-[#330757]">Confort & Comodidad</h4>
            <p className="text-2xs text-stone-600">Baño privado, Smart TV, escritorio y lencería completa.</p>
          </div>

          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-[#005400]/10 flex items-center justify-center text-[#005400]">
              <MapPin className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-[#330757]">Ubicación Montenegro</h4>
            <p className="text-2xs text-stone-600">A 5,6 km del Parque del Café y 21 km de PANACA.</p>
          </div>
        </div>

        {/* CTA to Reserve */}
        <div className="mt-10 text-center">
          <button
            onClick={() => onNavigate('inicio')}
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-[#005400] hover:bg-[#003D00] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ver Cabañas y Reservar Estadía</span>
          </button>
        </div>

      </div>

    </div>
  );
};
