import React from 'react';
import { Trees } from 'lucide-react';
import { motion } from 'motion/react';

export function AboutUsSection() {
  return (
    <section id="quienes-somos" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 scroll-mt-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-3xl border border-[#D7C7B2]/80 p-8 sm:p-14 shadow-xs"
      >
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 pb-8 border-b border-stone-200">
          <span className="text-2xs sm:text-xs font-bold uppercase tracking-widest text-[#005400] inline-flex items-center gap-1.5">
            <Trees className="w-3.5 h-3.5 text-[#005400]" />
            Refugio de Descanso & Naturaleza • Quindío
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#330757] tracking-tight mt-2 mb-3">
            Quiénes Somos
          </h2>
          <p className="text-xs sm:text-sm text-[#212121] leading-relaxed">
            TURIM . Juaco • Finca La Colmena: un refugio totalmente de descanso y naturaleza en Montenegro, Quindío.
          </p>
        </div>

        {/* Central Narrative Text - Official Content */}
        <div className="max-w-2xl mx-auto space-y-6 text-[#4A3B32] text-sm sm:text-base leading-relaxed text-justify">
          <p>
            somos un refugio totalmente de descanso y naturaleza diseñado para conectar con la tranquilidad del paisaje del Quindío. Disfruta de instalaciones completas que incluyen piscina al aire libre, bañera de hidromasaje, terraza, jardín y parking privado gratuito.
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

      </motion.div>
    </section>
  );
}
