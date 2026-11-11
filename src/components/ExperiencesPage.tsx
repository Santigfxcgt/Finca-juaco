import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  BedDouble, 
  ChevronRight, 
  MessageCircle, 
  Eye, 
  X,
  Maximize2
} from 'lucide-react';
import { AppModule } from '../types';

interface ExperiencesPageProps {
  onNavigate: (module: AppModule) => void;
}

interface ExperienceItem {
  id: string;
  tag: string;
  badge: string;
  emoji: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  highlights: string[];
}

export const ExperiencesPage: React.FC<ExperiencesPageProps> = ({ onNavigate }) => {
  const [selectedFilter, setSelectedFilter] = useState<'todas' | 'mascotas' | 'ninos' | 'piscina'>('todas');
  const [activeImageModal, setActiveImageModal] = useState<{ src: string; title: string; desc: string } | null>(null);
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

  const experiences: ExperienceItem[] = [
    {
      id: 'mascotas',
      tag: 'mascotas',
      badge: 'Zona Verde para Mascotas',
      emoji: '🐕',
      title: 'Amplia Zona Verde para Mascotas',
      description: 'Extensa pradera de césped natural, segura y rodeada de árboles nativos, donde los perros y mascotas corren, juegan con la pelota y disfrutan de total libertad en pleno contacto con la naturaleza.',
      image: photoUrls['mascotas'] || '/experiences/zona-mascotas.jpg',
      alt: 'Amplia zona verde para mascotas en Finca La Colmena',
      highlights: ['100% Pet Friendly', 'Césped natural seguro', 'Sombra bajo árboles nativos']
    },
    {
      id: 'ninos',
      tag: 'ninos',
      badge: 'Parque Infantil',
      emoji: '🎪',
      title: 'Zona Recreativa con Columpios para Niños',
      description: 'Parque campestre al aire libre con columpios tradicionales de madera, resbaladero, casita de aventuras y rampa de cuerdas sobre césped suave, para que los niños disfruten con alegría y seguridad.',
      image: photoUrls['ninos'] || '/experiences/zona-ninos.jpg',
      alt: 'Zona recreativa para niños con columpios en Finca La Colmena',
      highlights: ['Columpios y resbaladero', 'Césped mullido y seguro', 'Visibilidad para los padres']
    },
    {
      id: 'piscina',
      tag: 'piscina',
      badge: 'Piscina Campestre',
      emoji: '🏊‍♂️',
      title: 'Piscina Campestre & Solárium',
      description: 'Piscina al aire libre con aguas cristalinas rodeada de vegetación tropical y vista panorámica a las montañas, con área de solárium y asoleadoras para relajarse bajo el sol del Quindío.',
      image: photoUrls['piscina'] || '/experiences/piscina.jpg',
      alt: 'Piscina campestre y solárium en Finca La Colmena',
      highlights: ['Aguas cristalinas', 'Asoleadoras y solárium', 'Vista a las montañas']
    }
  ];

  const filteredExperiences = selectedFilter === 'todas'
    ? experiences
    : experiences.filter(exp => exp.tag === selectedFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-in fade-in duration-200">
      
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#D7C7B2]/70">
        <div className="flex items-center space-x-2 text-xs text-[#6D5A4B]">
          <button 
            onClick={() => onNavigate('inicio')}
            className="hover:text-[#1B4332] font-medium transition-colors cursor-pointer"
          >
            Inicio
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#1B4332] font-bold">Experiencias</span>
        </div>

        <button
          onClick={() => onNavigate('inicio')}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border border-[#D7C7B2] hover:border-[#1B4332] bg-[#FAF6F0] text-[#2C1E16] text-xs font-semibold shadow-2xs hover:bg-[#EAE0D2] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#1B4332]" />
          <span>Volver a Habitaciones</span>
        </button>
      </div>

      {/* Minimalist Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-2xs uppercase tracking-widest font-extrabold text-[#005400] block mb-1">
              Finca La Colmena • Montenegro, Quindío
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#330757] tracking-tight">
              Experiencias de la Finca
            </h1>
            <p className="text-[#212121] text-xs sm:text-sm mt-1.5 max-w-2xl font-normal leading-relaxed">
              Descubre los espacios al aire libre pensados para el descanso, la diversión de los niños, el juego libre de tus mascotas y el disfrute de toda la familia.
            </p>
          </div>

          {/* Minimalist Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
            <button
              onClick={() => setSelectedFilter('todas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFilter === 'todas'
                  ? 'bg-[#005400] text-white shadow-2xs'
                  : 'text-[#212121] hover:text-[#330757] hover:bg-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedFilter('mascotas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFilter === 'mascotas'
                  ? 'bg-[#005400] text-white shadow-2xs'
                  : 'text-[#212121] hover:text-[#330757] hover:bg-white'
              }`}
            >
              🐕 Mascotas
            </button>
            <button
              onClick={() => setSelectedFilter('ninos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFilter === 'ninos'
                  ? 'bg-[#005400] text-white shadow-2xs'
                  : 'text-[#212121] hover:text-[#330757] hover:bg-white'
              }`}
            >
              🎪 Niños
            </button>
            <button
              onClick={() => setSelectedFilter('piscina')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFilter === 'piscina'
                  ? 'bg-[#005400] text-white shadow-2xs'
                  : 'text-[#212121] hover:text-[#330757] hover:bg-white'
              }`}
            >
              🏊‍♂️ Piscina
            </button>
          </div>
        </div>
      </div>

      {/* Visual Image-First Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {filteredExperiences.map((exp) => {
          const currentImg = exp.image;

          return (
            <article 
              key={exp.id} 
              className="group bg-white rounded-3xl overflow-hidden border border-[#D7C7B2]/80 hover:border-[#1B4332] transition-all duration-300 hover:shadow-xl flex flex-col"
            >
              {/* Immersive Photo Container */}
              <div 
                className="relative aspect-16/10 sm:aspect-16/10 w-full overflow-hidden bg-stone-100 cursor-pointer"
                onClick={() => setActiveImageModal({ src: currentImg, title: exp.title, desc: exp.description })}
              >
                <img 
                  src={currentImg}
                  alt={exp.alt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                {/* Floating Badge */}
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-xs text-[#1B4332] text-xs font-bold shadow-md flex items-center gap-1.5">
                    <span>{exp.emoji}</span>
                    <span>{exp.badge}</span>
                  </span>
                </div>

                {/* Zoom Trigger Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageModal({ src: currentImg, title: exp.title, desc: exp.description });
                  }}
                  className="absolute bottom-4 right-4 z-10 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur-xs transition-all flex items-center gap-1.5 shadow-sm opacity-90 group-hover:opacity-100 cursor-pointer"
                  title="Ver imagen completa"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ampliar</span>
                </button>
              </div>

            {/* Content Details */}
            <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2C1E16] mb-2.5 leading-snug">
                  {exp.title}
                </h2>
                <p className="text-[#5A4535] text-xs sm:text-sm leading-relaxed mb-5 font-normal">
                  {exp.description}
                </p>
              </div>

              {/* Minimalist Feature Chips */}
              <div className="pt-4 border-t border-[#D7C7B2]/50 flex flex-wrap items-center gap-2">
                {exp.highlights.map((h, i) => (
                  <span 
                    key={i}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#FAF6F0] text-[#1B4332] text-2xs font-semibold border border-[#D7C7B2]/60"
                  >
                    • {h}
                  </span>
                ))}
              </div>
            </div>
          </article>
          );
        })}
      </div>

      {/* Minimalist Bottom Action Bar */}
      <div className="bg-[#FAF6F0] rounded-3xl p-6 sm:p-8 border border-[#D7C7B2] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2C1E16]">
            ¿Listo para vivir estas experiencias?
          </h3>
          <p className="text-xs sm:text-sm text-[#6D5A4B] mt-0.5">
            Todas estas áreas están incluidas sin costo adicional al hospedarte en nuestras 7 habitaciones campestres.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('inicio')}
            className="px-5 py-3 bg-[#1B4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <BedDouble className="w-4 h-4" />
            <span>Ver Habitaciones</span>
          </button>
          <a
            href="https://wa.me/573015677776?text=Hola%20Don%20Juaco,%20quiero%20conocer%20más%20sobre%20las%20experiencias%20de%20la%20finca"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 bg-white hover:bg-[#EFE7DC] text-[#2C1E16] border border-[#D7C7B2] text-xs sm:text-sm font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-[#2D6A4F]" />
            <span>Consultar por WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Full-Screen Image Lightbox Modal */}
      {activeImageModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          onClick={() => setActiveImageModal(null)}
        >
          <div 
            className="relative max-w-5xl w-full max-h-[92vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setActiveImageModal(null)}
              className="absolute -top-12 right-0 sm:top-3 sm:right-3 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer border border-white/20"
              title="Cerrar vista"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-hidden rounded-2xl bg-black shadow-2xl w-full max-h-[80vh] flex items-center justify-center">
              <img 
                src={activeImageModal.src} 
                alt={activeImageModal.title}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[80vh] w-auto h-auto object-contain select-none"
              />
            </div>

            <div className="w-full mt-3 px-2 flex items-center justify-between text-white/90">
              <div>
                <h4 className="font-serif text-base sm:text-lg font-bold text-white">
                  {activeImageModal.title}
                </h4>
                <p className="text-2xs sm:text-xs text-white/70 line-clamp-1">
                  {activeImageModal.desc}
                </p>
              </div>
              <span className="text-2xs text-white/50 tracking-wider uppercase font-semibold">
                Finca La Colmena
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
