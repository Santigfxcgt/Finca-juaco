import React, { useState } from 'react';
import { 
  Navigation, 
  ArrowLeft, 
  ChevronRight, 
  ExternalLink, 
  Phone, 
  Copy, 
  Check, 
  LocateFixed, 
  AlertCircle,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { AppModule } from '../types';

interface LocationPageProps {
  onNavigate: (module: AppModule) => void;
}

export const LocationPage: React.FC<LocationPageProps> = ({ onNavigate }) => {
  const exactGoogleMapsUrl = 'https://maps.google.com/?cid=3521013696986298488&entry=gps';
  const wazeUrl = 'https://waze.com/ul?q=Finca%20La%20Colmena%20Montenegro%20Quindio&navigate=yes';
  
  const [copiedLink, setCopiedLink] = useState(false);
  const [mapMode, setMapMode] = useState<'interactive' | 'satellite'>('interactive');
  const [userGps, setUserGps] = useState<{
    lat: number;
    lng: number;
    distanceKm: number;
    driveMinutes: number;
    loading: boolean;
    error: string | null;
  }>({
    lat: 0,
    lng: 0,
    distanceKm: 0,
    driveMinutes: 0,
    loading: false,
    error: null
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(exactGoogleMapsUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleDetectLiveLocation = () => {
    if (!navigator.geolocation) {
      setUserGps(prev => ({ ...prev, error: 'Tu navegador no soporta geolocalización GPS.' }));
      return;
    }

    setUserGps(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        // Approximate estate coordinates in Montenegro
        const targetLat = 4.5668;
        const targetLng = -75.7505;

        // Haversine formula
        const R = 6371;
        const dLat = ((targetLat - uLat) * Math.PI) / 180;
        const dLon = ((targetLng - uLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((uLat * Math.PI) / 180) *
            Math.cos((targetLat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distKm = R * c;
        const driveMins = Math.max(1, Math.round((distKm / 40) * 60));

        setUserGps({
          lat: uLat,
          lng: uLng,
          distanceKm: Math.round(distKm * 10) / 10,
          driveMinutes: driveMins,
          loading: false,
          error: null
        });
      },
      (err) => {
        let msg = 'No se pudo obtener la ubicación GPS.';
        if (err.code === 1) msg = 'Permiso de ubicación denegado.';
        else if (err.code === 2) msg = 'Señal GPS no disponible.';
        setUserGps(prev => ({ ...prev, loading: false, error: msg }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in duration-200">
      
      {/* Breadcrumb & Navigation Bar */}
      <div className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-[#D7C7B2]/60">
        <div className="flex items-center space-x-2 text-xs text-[#6D5A4B]">
          <button 
            onClick={() => onNavigate('inicio')}
            className="hover:text-[#1B4332] font-medium transition-colors cursor-pointer"
          >
            Inicio
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#1B4332] font-bold">Dónde Nos Ubicamos</span>
        </div>

        <button
          onClick={() => onNavigate('inicio')}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border border-[#D7C7B2] hover:border-[#1B4332] bg-[#FAF6F0] text-[#2C1E16] text-xs font-semibold shadow-2xs hover:bg-[#EAE0D2] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#1B4332]" />
          <span>Volver al Inicio</span>
        </button>
      </div>

      {/* Minimalist Map Container */}
      <div className="bg-white rounded-3xl border border-[#D7C7B2]/80 overflow-hidden shadow-xs">
        
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-stone-200 text-center max-w-2xl mx-auto">
          <span className="text-2xs sm:text-xs font-bold uppercase tracking-widest text-[#005400]">
            Ubicación Exacta • Montenegro, Quindío
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#330757] tracking-tight mt-1 mb-2">
            Dónde Nos Ubicamos
          </h1>
          <p className="text-xs sm:text-sm text-[#212121] leading-relaxed">
            Finca La Colmena de Don Juaco en Montenegro, Quindío. Vía de fácil acceso y parqueadero privado gratuito.
          </p>
        </div>

        {/* Map Toolbar */}
        <div className="px-6 py-3 bg-[#FAF6F0] border-b border-[#D7C7B2]/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-[#2C1E16]">
              Mapa Interactivo de Finca La Colmena
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-white p-1 rounded-xl border border-[#D7C7B2] text-2xs">
              <button
                onClick={() => setMapMode('interactive')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  mapMode === 'interactive' 
                    ? 'bg-[#1B4332] text-white shadow-2xs' 
                    : 'text-[#6D5A4B] hover:bg-stone-100'
                }`}
              >
                Mapa Interactivo
              </button>
              <button
                onClick={() => setMapMode('satellite')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  mapMode === 'satellite' 
                    ? 'bg-[#1B4332] text-white shadow-2xs' 
                    : 'text-[#6D5A4B] hover:bg-stone-100'
                }`}
              >
                Satelital
              </button>
            </div>

            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl border border-[#D7C7B2] bg-white text-2xs font-semibold text-[#2C1E16] hover:bg-stone-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Ubicación'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Google Map Iframe */}
        <div className="relative w-full h-[450px] sm:h-[550px] bg-stone-100">
          {mapMode === 'interactive' ? (
            <iframe
              title="Ubicación Exacta Finca La Colmena"
              src="https://maps.google.com/maps?cid=3521013696986298488&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
            />
          ) : (
            <iframe
              title="Vista Satelital Finca La Colmena"
              src="https://maps.google.com/maps?cid=3521013696986298488&t=k&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
            />
          )}

          {/* Floating Direct GPS Navigation Buttons */}
          <div className="absolute bottom-4 right-4 z-10 flex flex-wrap gap-2">
            <a
              href={exactGoogleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-[#1B4332] hover:bg-[#143225] text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-102 cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>Abrir en Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-[#00D8F6] hover:bg-[#00B4D8] text-stone-950 text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-102 cursor-pointer"
            >
              <span>🚙 Waze</span>
            </a>
          </div>
        </div>

        {/* Minimalist Bottom Actions & GPS Assistant */}
        <div className="p-6 sm:p-8 bg-[#FAF6F0] space-y-6">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#1B4332]/10 border border-[#1B4332]/20 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-[#1B4332]" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm sm:text-base text-[#2C1E16]">
                  ¿Vienes en camino a la finca?
                </h4>
                <p className="text-2xs sm:text-xs text-[#6D5A4B]">
                  Abre la ruta directa en tu GPS preferido o pide la ubicación en vivo por WhatsApp.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={handleDetectLiveLocation}
                disabled={userGps.loading}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-[#FAF6F0] hover:bg-white text-[#2C1E16] border border-[#D7C7B2] rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LocateFixed className="w-3.5 h-3.5 text-[#1B4332]" />
                <span>{userGps.loading ? 'Calculando distancia...' : 'Calcular Mi Distancia'}</span>
              </button>

              <a
                href="https://wa.me/573015677776?text=Hola%20Don%20Juaco,%20voy%20en%20camino%20a%20Finca%20La%20Colmena.%20¿Me%20compartes%20la%20ubicación%20en%20tiempo%20real?"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-4 py-2.5 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>WhatsApp Don Juaco</span>
              </a>
            </div>
          </div>

          {/* User GPS Result */}
          {userGps.distanceKm > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-950 animate-in fade-in">
              <div className="flex items-center gap-3">
                <span className="text-xl">📍</span>
                <div>
                  <span className="font-bold block">
                    Estás a {userGps.distanceKm} km de Finca La Colmena
                  </span>
                  <span className="text-2xs text-emerald-700">
                    Tiempo estimado de viaje en vehículo: ~{userGps.driveMinutes} minutos.
                  </span>
                </div>
              </div>

              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${userGps.lat},${userGps.lng}&destination=Finca+La+Colmena+Montenegro+Quindio`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-[#1B4332] hover:bg-[#143225] text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 shrink-0"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Iniciar Ruta</span>
              </a>
            </div>
          )}

          {userGps.error && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{userGps.error}</span>
            </div>
          )}

          {/* Key Quick Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#D7C7B2]/50 text-2xs text-[#6D5A4B]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1B4332] shrink-0" />
              <span>Vía asfaltada para cualquier vehículo</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1B4332] shrink-0" />
              <span>Parqueadero privado gratuito cerrado</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1B4332] shrink-0" />
              <span>A 5 min del Parque del Café</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
