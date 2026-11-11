import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  Sparkles, 
  Dog, 
  Smile, 
  Waves, 
  Maximize2, 
  X, 
  Camera
} from 'lucide-react';
import { uploadExperiencePhoto, fileToBase64 } from '../../utils/imageProcessor';

interface ExperienceMeta {
  id: string;
  title: string;
  emoji: string;
  badge: string;
  defaultPath: string;
  icon: React.ReactNode;
  description: string;
  recommendation: string;
}

const EXPERIENCES_LIST: ExperienceMeta[] = [
  {
    id: 'mascotas',
    title: 'Amplia Zona Verde para Mascotas',
    emoji: '🐕',
    badge: '100% Pet Friendly',
    defaultPath: '/experiences/zona-mascotas.jpg',
    icon: <Dog className="w-5 h-5 text-emerald-600" />,
    description: 'Pradera natural segura donde las mascotas corren, juegan con la pelota y disfrutan al aire libre.',
    recommendation: 'Recomendado: Formato horizontal 16:9 o 4:3, mostrando amplitud de césped, naturaleza o mascotas jugando.'
  },
  {
    id: 'ninos',
    title: 'Zona Recreativa con Columpios para Niños',
    emoji: '🎪',
    badge: 'Parque Infantil & Juegos',
    defaultPath: '/experiences/zona-ninos.jpg',
    icon: <Smile className="w-5 h-5 text-amber-600" />,
    description: 'Parque rústico de madera con columpios, resbaladero y juegos infantiles sobre césped suave.',
    recommendation: 'Recomendado: Formato horizontal 16:9, mostrando los columpios, resbaladero o juegos al aire libre.'
  },
  {
    id: 'piscina',
    title: 'Piscina Campestre & Solárium',
    emoji: '🏊‍♂️',
    badge: 'Piscina & Solárium',
    defaultPath: '/experiences/piscina.jpg',
    icon: <Waves className="w-5 h-5 text-sky-600" />,
    description: 'Piscina al aire libre con aguas cristalinas, solárium con asoleadoras y vista a las montañas.',
    recommendation: 'Recomendado: Fotografía con buena iluminación natural, vista al agua cristalina y entorno campestre.'
  }
];

export const ExperiencesAdminManager: React.FC = () => {
  const [activePhotos, setActivePhotos] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    EXPERIENCES_LIST.forEach(exp => {
      initial[exp.id] = `${exp.defaultPath}?v=${Date.now()}`;
    });
    return initial;
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
          setActivePhotos(prev => ({ ...prev, ...map }));
        }
      })
      .catch(() => {});
  }, []);

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedExpId, setSelectedExpId] = useState<string>(EXPERIENCES_LIST[0].id);
  const [topBannerStatus, setTopBannerStatus] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<{ id: string; text: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<{ id: string; text: string } | null>(null);
  const [lightboxImg, setLightboxImg] = useState<{ src: string; title: string } | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileSelected = async (expId: string, file: File) => {
    if (!file) return;

    setUploadingId(expId);
    setErrorMessage(null);
    setSuccessMessage(null);
    setTopBannerStatus(null);

    try {
      const base64 = await fileToBase64(file);
      const result = await uploadExperiencePhoto(expId, base64, file.name);

      if (result.success && result.photoUrl) {
        const cacheBustedUrl = `${result.photoUrl}${result.photoUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
        setActivePhotos(prev => ({
          ...prev,
          [expId]: cacheBustedUrl
        }));

        setSuccessMessage({
          id: expId,
          text: '¡Fotografía actualizada y guardada con éxito!'
        });
        setTopBannerStatus({
          status: 'success',
          message: 'Foto de la experiencia actualizada correctamente.'
        });

        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } else {
        const localDataUrl = base64;
        setActivePhotos(prev => ({
          ...prev,
          [expId]: localDataUrl
        }));

        setSuccessMessage({
          id: expId,
          text: 'Fotografía guardada temporalmente.'
        });
        setTopBannerStatus({
          status: 'success',
          message: 'Fotografía guardada temporalmente.'
        });
      }
    } catch (err: any) {
      setErrorMessage({
        id: expId,
        text: err.message || 'Ocurrió un error al procesar la imagen.'
      });
      setTopBannerStatus({
        status: 'error',
        message: err.message || 'Ocurrió un error al procesar la imagen.'
      });
    } finally {
      setUploadingId(null);
      if (fileInputRefs.current[expId]) {
        fileInputRefs.current[expId]!.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, expId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(expId, e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Panel Minimalista: Actualiza la foto de las experiencias */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="font-serif font-bold text-stone-900 text-base flex items-center gap-2">
              <Camera className="w-5 h-5 text-amber-600" />
              Actualiza la foto de las experiencias
            </h4>
            <p className="text-xs text-stone-500 mt-1">
              Selecciona la experiencia que deseas editar y sube la nueva fotografía para publicarla al instante.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Botón / Selector para seleccionar la experiencia a editar */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-600">Experiencia:</span>
              <select
                id="select-experience-to-edit"
                value={selectedExpId}
                onChange={(e) => {
                  setSelectedExpId(e.target.value);
                  setTopBannerStatus(null);
                }}
                className="px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer transition-all"
              >
                {EXPERIENCES_LIST.map(exp => (
                  <option key={exp.id} value={exp.id}>
                    {exp.emoji} {exp.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón para subir la imagen */}
            <label className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-xs ${
              uploadingId === selectedExpId
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-98'
            }`}>
              {uploadingId === selectedExpId ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Subir Imagen</span>
                </>
              )}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                disabled={uploadingId === selectedExpId}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await handleFileSelected(selectedExpId, file);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Notificación de estado minimalista */}
        {topBannerStatus && (
          <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
            topBannerStatus.status === 'success'
              ? 'border-emerald-100 text-emerald-700'
              : 'border-red-100 text-red-600'
          }`}>
            <span className="flex items-center gap-1.5 font-medium">
              {topBannerStatus.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              {topBannerStatus.message}
            </span>
            <button
              onClick={() => setTopBannerStatus(null)}
              className="text-stone-400 hover:text-stone-600 text-2xs cursor-pointer ml-3"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>

      {/* Grid of Experiences */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {EXPERIENCES_LIST.map((exp) => {
          const currentImgUrl = activePhotos[exp.id] || `${exp.defaultPath}?v=${Date.now()}`;
          const isUploading = uploadingId === exp.id;
          const isSuccess = successMessage?.id === exp.id;
          const isError = errorMessage?.id === exp.id;

          return (
            <div 
              key={exp.id}
              className="bg-white rounded-3xl overflow-hidden border border-[#D7C7B2] shadow-xs hover:border-[#1B4332] transition-all flex flex-col justify-between"
            >
              {/* Header of Card */}
              <div className="p-5 sm:p-6 border-b border-[#D7C7B2]/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF6F0] border border-[#D7C7B2] flex items-center justify-center text-lg">
                    {exp.emoji}
                  </div>
                  <div>
                    <span className="text-2xs font-bold text-[#1B4332] uppercase tracking-wider block">
                      {exp.badge}
                    </span>
                    <h3 className="font-serif text-base sm:text-lg font-bold text-[#2C1E16]">
                      {exp.title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLightboxImg({ src: currentImgUrl, title: exp.title })}
                  className="p-2 rounded-xl bg-[#FAF6F0] hover:bg-[#EAE0D2] text-[#2C1E16] text-xs font-semibold border border-[#D7C7B2] transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  title="Ver en alta resolución"
                >
                  <Eye className="w-4 h-4 text-[#1B4332]" />
                  <span className="hidden sm:inline">Ver Foto</span>
                </button>
              </div>

              {/* Photo Preview & Drop Area */}
              <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, exp.id)}
                    onClick={() => fileInputRefs.current[exp.id]?.click()}
                    className={`relative aspect-16/9 w-full rounded-2xl overflow-hidden border-2 border-dashed transition-all cursor-pointer group bg-stone-50 ${
                      isUploading 
                        ? 'border-emerald-500 bg-emerald-50/50' 
                        : 'border-[#D7C7B2] hover:border-[#1B4332]'
                    }`}
                  >
                    <img 
                      src={currentImgUrl}
                      alt={exp.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4 text-center backdrop-blur-2xs">
                      <Upload className="w-8 h-8 mb-2 animate-bounce" />
                      <span className="text-xs font-bold">Haz clic o arrastra una nueva foto aquí</span>
                      <span className="text-2xs text-stone-200 mt-1">Soporta JPG, PNG, WEBP de cualquier tamaño</span>
                    </div>

                    {isUploading && (
                      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white backdrop-blur-xs">
                        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
                        <span className="text-xs font-bold">Guardando fotografía permanentemente...</span>
                      </div>
                    )}
                  </div>

                  <p className="text-2xs text-[#6D5A4B] mt-2 italic">
                    💡 {exp.recommendation}
                  </p>
                </div>

                {/* Feedback Messages */}
                {isSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMessage.text}</span>
                  </div>
                )}

                {isError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMessage.text}</span>
                  </div>
                )}

                {/* Hidden File Input & Upload Trigger */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <input 
                    type="file"
                    ref={(el) => { fileInputRefs.current[exp.id] = el; }}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelected(exp.id, e.target.files[0]);
                      }
                    }}
                  />

                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRefs.current[exp.id]?.click()}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#1B4332] hover:bg-[#143225] disabled:opacity-50 text-white text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUploading ? 'Subiendo...' : 'Subir / Reemplazar'}</span>
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <div 
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setLightboxImg(null)}
              className="absolute -top-12 right-0 sm:top-2 sm:right-2 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-hidden rounded-2xl bg-black shadow-2xl max-h-[80vh] flex items-center justify-center">
              <img 
                src={lightboxImg.src} 
                alt={lightboxImg.title}
                className="max-w-full max-h-[80vh] w-auto h-auto object-contain"
              />
            </div>

            <div className="w-full mt-3 px-2 flex items-center justify-between text-white">
              <h4 className="font-serif text-base font-bold">{lightboxImg.title}</h4>
              <span className="text-2xs text-stone-400">Vista previa en alta resolución</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
