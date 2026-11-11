import React from 'react';
import { MapPin, ArrowDown, Coffee, Trees } from 'lucide-react';
import { motion } from 'motion/react';

interface HeroSectionProps {
  onExploreCabins: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1] as const
    }
  }
};

export const HeroSection: React.FC<HeroSectionProps> = ({ onExploreCabins }) => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-3xl overflow-hidden bg-[#1B4332] text-white border border-[#143225] shadow-sm"
      >
        
        {/* Large Format Authentic Photograph with subtle cinematic reveal */}
        <motion.div 
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 z-0"
        >
          <img
            src="/src/assets/images/habitacion_triple_campestre.jpg"
            alt="Finca La Colmena de Don Juaco en Montenegro Quindío"
            className="w-full h-full object-cover object-center filter brightness-[0.45] contrast-105"
          />
        </motion.div>

        {/* Content Container with Staggered Motion */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 px-6 sm:px-12 lg:px-16 py-16 sm:py-24 lg:py-28 max-w-4xl"
        >
          
          {/* Unboxed Editorial Metadata Kicker */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-widest text-emerald-200 font-semibold mb-4"
          >
            <span className="flex items-center gap-1.5 text-amber-300">
              <Trees className="w-3.5 h-3.5" />
              Montenegro · Quindío
            </span>
            <span aria-hidden="true" className="text-white/40">·</span>
            <span>A 5,6 km del Parque del Café</span>
            <span aria-hidden="true" className="text-white/40">·</span>
            <span>7 Cabañas Exclusivas</span>
          </motion.div>

          {/* Monumental Headline (Max 2 lines at all viewports) */}
          <motion.h1 
            variants={itemVariants}
            className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] mb-6"
          >
            El descanso auténtico en el corazón del Quindío
          </motion.h1>

          {/* Concrete Supporting Sentence */}
          <motion.p 
            variants={itemVariants}
            className="text-base sm:text-lg text-emerald-50/90 font-normal leading-relaxed max-w-2xl mb-8"
          >
            Finca La Colmena de Don Juaco: un refugio campestre rodeado de cafetales, piscina al aire libre y hospitalidad tradicional con delicioso desayuno campesino incluido en toda estadía.
          </motion.p>

          {/* Seasonal Rate Overview Strip */}
          <motion.div 
            variants={itemVariants}
            className="inline-flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 p-4 rounded-2xl bg-black/40 border border-white/15 text-xs sm:text-sm text-stone-200 mb-8 backdrop-blur-xs"
          >
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-white/70">Desayuno incluido:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">Temporada Regular:</span>
              <span className="font-mono font-bold text-amber-300 text-base">$85.000 COP</span>
              <span className="text-2xs text-white/60">/ noche</span>
            </div>
            <span className="hidden sm:inline text-white/30">|</span>
            <div className="flex items-center gap-2">
              <span className="text-amber-200 font-semibold">Temporada Alta (20 Dic - 20 Ene):</span>
              <span className="font-mono font-bold text-amber-300 text-base">$120.000 COP</span>
            </div>
          </motion.div>

          {/* Primary Action Buttons with Tactile Spring Micro-interactions */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5"
          >
            <motion.button
              type="button"
              onClick={onExploreCabins}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="px-8 py-3.5 rounded-xl bg-[#005400] hover:bg-[#003D00] text-white font-bold text-sm sm:text-base transition-colors shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 border border-emerald-500/30"
            >
              <span>Ver Cabañas & Fechas</span>
              <ArrowDown className="w-4 h-4" />
            </motion.button>
            <motion.a
              href="#donde-nos-ubicamos"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById('donde-nos-ubicamos');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors border border-white/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-emerald-300" />
              <span>Cómo Llegar (Montenegro)</span>
            </motion.a>
          </motion.div>

        </motion.div>

        {/* Ambient bottom caption */}
        <div className="relative z-10 px-6 sm:px-12 py-3 bg-black/40 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-2xs text-emerald-100/70">
          <span>Reserva agroturística registrada • Quindío, Colombia</span>
          <span>Check-in: 3:00 PM · Check-out: 1:00 PM · Mascotas bienvenidas</span>
        </div>

      </motion.div>
    </section>
  );
};
