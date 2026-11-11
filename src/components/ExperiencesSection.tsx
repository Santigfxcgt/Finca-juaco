import React, { useState, useEffect } from 'react';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface ExperiencesSectionProps {
  onNavigateToExperiences?: () => void;
}

export const ExperiencesSection: React.FC<ExperiencesSectionProps> = ({ onNavigateToExperiences }) => {
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({
    mascotas: '/experiences/zona-mascotas.jpg',
    ninos: '/experiences/zona-ninos.jpg',
    piscina: '/experiences/piscina.jpg'
  });

  useEffect(() => {
    fetch('/api/experiences/photos')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.experiences)) {
          const map: Record<string, string> = {};
          data.experiences.forEach((item: any) => {
            if (item.id && item.url) {
              map[item.id] = item.url;
            }
          });
          setPhotoUrls(prev => ({ ...prev, ...map }));
        }
      })
      .catch(() => {});
  }, []);

  const experiences = [
    {
      id: 'mascotas',
      title: 'Zona Verde para Mascotas',
      emoji: '🐕',
      badge: 'Pet Friendly',
      image: photoUrls['mascotas'] || '/experiences/zona-mascotas.jpg',
      alt: 'Zona verde para mascotas en Finca La Colmena',
      description: 'Extensa pradera natural para correr y jugar en libertad con tus mascotas.'
    },
    {
      id: 'ninos',
      title: 'Zona Recreativa con Columpios',
      emoji: '🎪',
      badge: 'Niños & Familia',
      image: photoUrls['ninos'] || '/experiences/zona-ninos.jpg',
      alt: 'Parque infantil con columpios en Finca La Colmena',
      description: 'Columpios rústicos, resbaladero y juegos al aire libre para los más pequeños.'
    },
    {
      id: 'piscina',
      title: 'Piscina Campestre & Solárium',
      emoji: '🏊‍♂️',
      badge: 'Piscina & Relax',
      image: photoUrls['piscina'] || '/experiences/piscina.jpg',
      alt: 'Piscina campestre en Finca La Colmena',
      description: 'Aguas cristalinas, asoleadoras y vista a las montañas para refrescarte.'
    }
  ];

  return (
    <section id="experiencias" className="py-14 sm:py-16 bg-[#FAF6F0] border-y border-[#D7C7B2]/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Minimalist Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
        >
          <div>
            <span className="text-2xs uppercase tracking-widest font-extrabold text-[#1B4332] block mb-1">
              Espacios de la Finca
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#2C1E16] tracking-tight">
              Experiencias al Aire Libre
            </h2>
            <p className="text-[#6D5A4B] text-xs sm:text-sm mt-1 max-w-xl font-normal">
              Zonas verdes para mascotas, parque infantil con columpios y piscina campestre para disfrutar en familia.
            </p>
          </div>

          {onNavigateToExperiences && (
            <motion.button
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              onClick={onNavigateToExperiences}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B4332] hover:text-[#2D6A4F] transition-colors cursor-pointer self-start sm:self-end"
            >
              <span>Ver todas las experiencias</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          )}
        </motion.div>

        {/* Minimalist Image Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {experiences.map((exp, idx) => {
            const currentImg = exp.image;

            return (
              <motion.div 
                key={exp.id} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={onNavigateToExperiences}
                className="group bg-white rounded-3xl overflow-hidden border border-[#D7C7B2]/80 shadow-xs hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between cursor-pointer hover:border-[#1B4332]"
              >
                <div className="relative aspect-4/3 overflow-hidden bg-stone-100">
                  <img 
                    src={currentImg}
                    alt={exp.alt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[#1B4332] text-2xs font-bold shadow-xs">
                    {exp.emoji} {exp.badge}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#2C1E16] mb-1 leading-snug">
                      {exp.title}
                    </h3>
                    <p className="text-[#5A4535] text-xs leading-relaxed line-clamp-2">
                      {exp.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-[#D7C7B2]/40 text-2xs text-[#1B4332] font-semibold flex items-center justify-between">
                    <span>Conocer más</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
