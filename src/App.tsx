import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { RoomCard } from './components/RoomCard';
import { RoomCardSkeleton } from './components/RoomCardSkeleton';
import { AboutUsPage } from './components/AboutUsPage';
import { HistoryPage } from './components/HistoryPage';
import { ExperiencesPage } from './components/ExperiencesPage';
import { LocationPage } from './components/LocationPage';
import { BookingModal } from './components/BookingModal';
import { ReservationLookupModal } from './components/ReservationLookupModal';
import { ChatWidget } from './components/ChatWidget';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { CookieBanner } from './components/CookieBanner';
import { Room, Reservation, Transaction, SeasonRate, EstateSettings, AppModule } from './types';
import { formatDateEs, getTodayDateString, getTomorrowDateString } from './utils/formatters';
import { 
  Sparkles, 
  Coffee, 
  Navigation, 
  ExternalLink, 
  ShieldCheck, 
  Lock, 
  BedDouble,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ShieldAlert,
  FileText,
  Scale,
  MapPin,
  Phone,
  Mail,
  X,
  LayoutGrid,
  List
} from 'lucide-react';

export default function App() {
  const [activeModule, setActiveModule] = useState<AppModule>('inicio');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return typeof window !== 'undefined' && Boolean(sessionStorage.getItem('colmena_admin_token'));
  });
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);

  // Inactivity Protection Token & Timer (30s without movement closes admin session)
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState<number>(30);
  const [sessionTimeoutNotice, setSessionTimeoutNotice] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const INACTIVITY_LIMIT_SECONDS = 30;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [availableRooms, setAvailableRooms] = useState<Room[] | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [seasons, setSeasons] = useState<SeasonRate[]>([]);
  const [settings, setSettings] = useState<EstateSettings | null>(null);
  const [viewLayout, setViewLayout] = useState<'grid' | 'editorial'>('grid');

  // Search Bar state: Fecha de inicio (hoy por defecto) | Fecha de fin (mañana por defecto) | Cantidad de huéspedes
  const [checkInDate, setCheckInDate] = useState<string>(() => getTodayDateString());
  const [checkOutDate, setCheckOutDate] = useState<string>(() => getTomorrowDateString());
  const [guestCount, setGuestCount] = useState<number | ''>('');
  const [isFilterActive, setIsFilterActive] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [seasonalMultiplier, setSeasonalMultiplier] = useState(1.0);
  const [activeSeason, setActiveSeason] = useState<SeasonRate | null>(null);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState<boolean>(true);

  // Modals
  const [bookingModalRoom, setBookingModalRoom] = useState<Room | null>(null);
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);

  // Load all initial state from backend safely
  const refreshAllData = async () => {
    try {
      const parseJsonSafely = async (res: Response) => {
        if (!res.ok) return null;
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await res.json();
        }
        return null;
      };

      const [roomsRes, resRes, txRes, seasonsRes, settRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/reservations'),
        fetch('/api/transactions'),
        fetch('/api/seasons'),
        fetch('/api/settings')
      ]);

      const [roomsData, resData, txData, seasonsData, settData] = await Promise.all([
        parseJsonSafely(roomsRes),
        parseJsonSafely(resRes),
        parseJsonSafely(txRes),
        parseJsonSafely(seasonsRes),
        parseJsonSafely(settRes)
      ]);

      if (Array.isArray(roomsData) && roomsData.length > 0) {
        setAllRooms(roomsData);
        setRooms(roomsData);
      }
      if (Array.isArray(resData)) setReservations(resData);
      if (Array.isArray(txData)) setTransactions(txData);
      if (Array.isArray(seasonsData)) setSeasons(seasonsData);
      if (settData && typeof settData === 'object') setSettings(settData);
    } catch (err) {
      console.warn('Advertencia cargando datos de Finca La Colmena:', err);
    } finally {
      setIsLoadingInitialData(false);
    }
  };

  useEffect(() => {
    refreshAllData();
    const interval = setInterval(refreshAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check availability & seasonal pricing from API: GUARANTEES ONLY AVAILABLE ROOMS WITH EXACT CAPACITY ARE SHOWN
  const handleSearch = async (overrideIn?: string, overrideOut?: string, overrideGuests?: number | '') => {
    const curIn = overrideIn !== undefined ? overrideIn : checkInDate;
    const curOut = overrideOut !== undefined ? overrideOut : checkOutDate;
    const curGuests = overrideGuests !== undefined ? overrideGuests : guestCount;

    if (!curIn || !curOut || !curGuests) {
      setValidationError('Debes seleccionar obligatoriamente Fecha de inicio, Fecha de fin y Cantidad de huéspedes para buscar.');
      return;
    }

    if (new Date(curOut).getTime() <= new Date(curIn).getTime()) {
      setValidationError('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    setValidationError(null);
    setIsSearching(true);
    setIsFilterActive(true);

    try {
      const res = await fetch(`/api/availability?checkInDate=${curIn}&checkOutDate=${curOut}&guests=${curGuests}`);
      if (res.ok) {
        const data = await res.json();
        setSeasonalMultiplier(data.seasonalMultiplier || 1.0);
        setActiveSeason(data.activeSeason || null);
        if (data.availableRooms && Array.isArray(data.availableRooms)) {
          setAvailableRooms(data.availableRooms);
        } else {
          setAvailableRooms([]);
        }
      }
    } catch (err) {
      console.error('Error buscando disponibilidad:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Reset and clear filters back to initial state (defaulting to today and tomorrow)
  const handleClearFilters = () => {
    setCheckInDate(getTodayDateString());
    setCheckOutDate(getTomorrowDateString());
    setGuestCount('');
    setAvailableRooms(null);
    setIsFilterActive(false);
    setValidationError(null);
    setSeasonalMultiplier(1.0);
    setActiveSeason(null);
  };

  // Automatically update search results if all 3 criteria are selected and changed
  useEffect(() => {
    if (checkInDate && checkOutDate && guestCount) {
      handleSearch(checkInDate, checkOutDate, guestCount);
    } else if (isFilterActive && (!checkInDate || !checkOutDate || !guestCount)) {
      setAvailableRooms(null);
      setIsFilterActive(false);
    }
  }, [checkInDate, checkOutDate, guestCount]);

  // Calculate nights
  let nights = 1;
  if (checkInDate && checkOutDate) {
    const diff = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
    nights = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  // Only show rooms available for the selected dates and matching exact capacity
  const displayedRooms: Room[] = (() => {
    const sourceRooms = allRooms.length > 0 ? allRooms : rooms;
    if (isFilterActive && availableRooms !== null) {
      return availableRooms;
    }
    return sourceRooms.filter(r => !r.outOfService);
  })();

  // Inactivity Protection Watcher: If admin performs no movement for 30s, automatically invalidate session and return to home
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    // Reset timestamp on entering authenticated state
    lastActivityRef.current = Date.now();
    setInactivitySecondsLeft(INACTIVITY_LIMIT_SECONDS);

    const handleUserMovement = () => {
      lastActivityRef.current = Date.now();
      setInactivitySecondsLeft(INACTIVITY_LIMIT_SECONDS);
    };

    const movementEvents = [
      'mousemove',
      'mousedown',
      'mouseup',
      'keydown',
      'keyup',
      'scroll',
      'wheel',
      'touchstart',
      'touchmove',
      'pointermove',
      'pointerdown',
      'click'
    ];

    movementEvents.forEach((event) => {
      window.addEventListener(event, handleUserMovement, { passive: true });
    });

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, INACTIVITY_LIMIT_SECONDS - elapsedSeconds);

      setInactivitySecondsLeft(remaining);

      if (elapsedSeconds >= INACTIVITY_LIMIT_SECONDS) {
        // Invalidate token, clear admin session, redirect to home page and notify
        sessionStorage.removeItem('colmena_admin_token');
        sessionStorage.removeItem('colmena_admin_user');
        sessionStorage.removeItem('colmena_admin_last_activity');
        setIsAdminAuthenticated(false);
        setActiveModule('inicio');
        setSessionTimeoutNotice(true);
      }
    }, 500);

    return () => {
      movementEvents.forEach((event) => {
        window.removeEventListener(event, handleUserMovement);
      });
      clearInterval(checkInterval);
    };
  }, [isAdminAuthenticated]);

  // Handle Admin authentication actions
  const handleOpenAdminLogin = () => {
    setIsAdminLoginModalOpen(true);
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    setActiveModule('admin');
    setSessionTimeoutNotice(false);
    lastActivityRef.current = Date.now();
    setInactivitySecondsLeft(INACTIVITY_LIMIT_SECONDS);
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('colmena_admin_token');
    sessionStorage.removeItem('colmena_admin_user');
    sessionStorage.removeItem('colmena_admin_last_activity');
    setIsAdminAuthenticated(false);
    setActiveModule('inicio');
  };

  const navigateTo = (mod: AppModule) => {
    setActiveModule(mod);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pendingTransactionsCount = transactions.filter(t => t.verificationStatus === 'PENDING').length;

  return (
    <div className="min-h-screen bg-white text-[#212121] flex flex-col font-sans selection:bg-[#005400] selection:text-white">
      
      {/* Top Sticky Navigation with Top-Right Modules Dropdown (Only for public website views) */}
      {!(activeModule === 'admin' && isAdminAuthenticated) && (
        <Navbar
          activeModule={activeModule}
          setActiveModule={navigateTo}
          onOpenLookup={() => setIsLookupModalOpen(true)}
          pendingTransactionsCount={pendingTransactionsCount}
          isAdminAuthenticated={isAdminAuthenticated}
          onOpenAdminLogin={handleOpenAdminLogin}
          onAdminLogout={handleAdminLogout}
        />
      )}

      {/* Main Dedicated Page Router (Each module on its own view with fluid motion transitions) */}
      <main
        className={`flex-1 bg-white transition-all duration-300 ${
          !(activeModule === 'admin' && isAdminAuthenticated) ? 'lg:pl-[250px]' : ''
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModule}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Module 1: Admin Page */}
            {activeModule === 'admin' && (
              isAdminAuthenticated ? (
                <AdminDashboard
                  rooms={allRooms.length > 0 ? allRooms : rooms}
                  reservations={reservations}
                  transactions={transactions}
                  seasons={seasons}
                  settings={settings}
                  onRefreshData={refreshAllData}
                  onAdminLogout={handleAdminLogout}
                  onGoToPublicSite={() => navigateTo('inicio')}
                  inactivitySecondsLeft={inactivitySecondsLeft}
                  isLoadingData={isLoadingInitialData}
                />
              ) : (
                <div className="max-w-md mx-auto py-24 px-4 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-[#1B4332]/10 text-[#1B4332] flex items-center justify-center mx-auto mb-4 border border-[#1B4332]/20">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-[#2C1E16] mb-2">
                    Acceso al Panel de Administración
                  </h2>
                  <p className="text-[#5A4535] text-sm mb-6">
                    Debes iniciar sesión con tus credenciales autorizadas de administrador.
                  </p>
                  <button
                    onClick={handleOpenAdminLogin}
                    className="px-6 py-3 bg-[#1B4332] hover:bg-[#143225] text-white font-semibold rounded-xl text-sm transition-all shadow-md cursor-pointer"
                  >
                    Ingresar como Administrador
                  </button>
                </div>
              )
            )}

            {/* Module 2: Dedicated Quiénes Somos Page */}
            {activeModule === 'quienes-somos' && (
              <AboutUsPage onNavigate={navigateTo} />
            )}

            {/* Module 3: Dedicated Nuestra Historia Page */}
            {activeModule === 'nuestra-historia' && (
              <HistoryPage onNavigate={navigateTo} />
            )}

            {/* Module 4: Dedicated Experiencias Page */}
            {activeModule === 'experiencias' && (
              <ExperiencesPage onNavigate={navigateTo} />
            )}

            {/* Module 5: Dedicated Dónde Nos Ubicamos Page */}
            {activeModule === 'donde-nos-ubicamos' && (
              <LocationPage onNavigate={navigateTo} />
            )}

            {/* Module 6: Inicio & Habitaciones (Exclusively for Room Booking) */}
            {activeModule === 'inicio' && (
              <div className="space-y-8 pb-20 pt-2">
                
                {/* Clean Editorial Header (Zero Cards, Zero Clutter) */}
                <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-1">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#D7C7B2]/60">
                    <div>
                      <span className="text-2xs font-bold uppercase tracking-widest text-[#005400] block mb-1">
                        Montenegro · Quindío · Finca Hotel
                      </span>
                      <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#330757] tracking-tight">
                        Finca La Colmena de Don Juaco
                      </h1>
                      <p className="text-stone-600 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
                        Refugio campestre y descanso natural a 5,6 km del Parque del Café. Desayuno campesino tradicional incluido, piscina al aire libre y reserva directa sin intermediarios.
                      </p>
                    </div>
                    <div className="flex items-center flex-wrap gap-2 text-2xs sm:text-xs text-[#005400] font-semibold bg-[#005400]/6 px-3.5 py-2 rounded-xl border border-[#005400]/15 shrink-0">
                      <span>✓ Mejor tarifa directa</span>
                      <span className="text-stone-300">·</span>
                      <span>✓ Check-in 3:00 PM</span>
                      <span className="text-stone-300">·</span>
                      <span>✓ Pet Friendly</span>
                      <span className="text-stone-300">·</span>
                      <span>✓ Wifi & Parking gratis</span>
                    </div>
                  </div>
                </header>

                {/* Live Search Bar & Cotizador en Vivo */}
                <SearchBar
                  checkInDate={checkInDate}
                  setCheckInDate={setCheckInDate}
                  checkOutDate={checkOutDate}
                  setCheckOutDate={setCheckOutDate}
                  guestCount={guestCount}
                  setGuestCount={setGuestCount}
                  onSearch={() => handleSearch()}
                  onClear={handleClearFilters}
                  isSearching={isSearching}
                  isFiltered={isFilterActive}
                  activeSeason={activeSeason}
                  seasonalMultiplier={seasonalMultiplier}
                  validationError={validationError}
                />

                {/* Habitaciones Section - Editorial Spacious Layout */}
                <section id="cabanas" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
                  <div className="flex flex-col sm:flex-row items-start sm:items-baseline justify-between mb-8 gap-3 pb-4 border-b border-[#D7C7B2]/70">
                    <div>
                      <span className="text-2xs font-extrabold uppercase tracking-widest text-[#005400] block mb-1">
                        Cabañas Campestres de la Finca
                      </span>
                      <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#330757]">
                        {isFilterActive ? 'Habitaciones Disponibles para tu Estadía' : 'Catálogo de Cabañas & Acomodación'}
                      </h2>
                      <p className="text-stone-600 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                        {isFilterActive 
                          ? `Mostrando cabañas con disponibilidad verificada para ${guestCount} ${guestCount === 1 ? 'huésped' : 'huéspedes'}.`
                          : 'Cabañas #1, #2, #3, #5, #6 y #7 con baño privado, televisión de pantalla plana, wifi, lencería completa y desayuno campesino incluido.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {isFilterActive && checkInDate && checkOutDate && (
                        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#005400]/10 border border-[#005400]/25 text-xs text-[#005400] font-bold">
                          <CheckCircle2 className="w-4 h-4 text-[#005400] shrink-0" />
                          <span>
                            {displayedRooms.length} {displayedRooms.length === 1 ? 'cabaña disponible' : 'cabañas disponibles'} ({formatDateEs(checkInDate)} → {formatDateEs(checkOutDate)})
                          </span>
                        </div>
                      )}

                      {/* Selector de Vista: Galería Cuadrícula o Detallada */}
                      <div className="flex items-center p-1 bg-[#FAF6F0] rounded-xl border border-[#D7C7B2]/80 text-xs">
                        <button
                          type="button"
                          onClick={() => setViewLayout('grid')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            viewLayout === 'grid'
                              ? 'bg-[#1B4332] text-white shadow-xs'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                          title="Vista Cuadrícula (Galería responsive)"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span>Galería</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewLayout('editorial')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            viewLayout === 'editorial'
                              ? 'bg-[#1B4332] text-white shadow-xs'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                          title="Vista Detallada"
                        >
                          <List className="w-3.5 h-3.5" />
                          <span>Detallada</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Skeleton Loading State or Rooms List */}
                  {isLoadingInitialData || isSearching ? (
                    <div className={viewLayout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-6"}>
                      {[...Array(viewLayout === 'grid' ? 6 : 3)].map((_, idx) => (
                        <RoomCardSkeleton key={idx} index={idx} />
                      ))}
                    </div>
                  ) : displayedRooms.length === 0 ? (
                    <div className="bg-[#FAF6F0] rounded-3xl border-2 border-dashed border-[#D7C7B2] p-8 sm:p-12 text-center space-y-4 shadow-xs">
                      <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                        <Calendar className="w-8 h-8 text-amber-700" />
                      </div>
                      <div className="max-w-md mx-auto space-y-2">
                        <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2C1E16]">
                          No hay habitaciones disponibles para esta búsqueda
                        </h3>
                        <p className="text-xs sm:text-sm text-[#5A4535] leading-relaxed">
                          {isFilterActive ? (
                            <>
                              No encontramos habitaciones con capacidad exacta para <strong>{guestCount} {guestCount === 1 ? 'huésped' : 'huéspedes'}</strong> disponibles del <strong>{formatDateEs(checkInDate)}</strong> al <strong>{formatDateEs(checkOutDate)}</strong>.
                            </>
                          ) : (
                            'No hay habitaciones registradas o disponibles actualmente.'
                          )}
                        </p>
                        <p className="text-xs text-[#6D5A4B]">
                          Capacidades disponibles en la finca: <strong>Hab #1</strong> (3 pax), <strong>Hab #2</strong> (3 pax), <strong>Hab #3</strong> (4 pax), <strong>Hab #5</strong> (5 pax), <strong>Hab #6</strong> (3 pax) y <strong>Hab #7</strong> (5 pax).
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <button
                          onClick={handleClearFilters}
                          className="px-5 py-2.5 rounded-xl bg-[#005400] hover:bg-[#003D00] text-white font-semibold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Limpiar Filtros y Ver Todas</span>
                        </button>
                      </div>
                    </div>
                  ) : viewLayout === 'grid' ? (
                    /* Responsive CSS Grid Gallery */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                      {displayedRooms.map((room) => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          nights={nights}
                          multiplier={seasonalMultiplier}
                          layoutMode="grid"
                          onBook={(r) => setBookingModalRoom(r)}
                        />
                      ))}
                    </div>
                  ) : (
                    /* Editorial Spacious Stack */
                    <div className="space-y-6">
                      {displayedRooms.map((room) => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          nights={nights}
                          multiplier={seasonalMultiplier}
                          layoutMode="editorial"
                          onBook={(r) => setBookingModalRoom(r)}
                        />
                      ))}
                    </div>
                  )}
                </section>

              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Footer with Minimalist Layout & Legal Compliance (Ley 679/2001 & Ley 1581/2012) */}
      {!(activeModule === 'admin' && isAdminAuthenticated) && (
        <footer className="bg-stone-950 text-stone-400 border-t border-stone-900 text-xs lg:pl-[250px] transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 items-start">
              
              {/* Bloque Superior: Logo + Info con iconos sin palabras "Razón Social", "Ubicación" ni "Contacto" */}
              <div className="lg:col-span-6 space-y-3.5">
                <div 
                  onClick={() => navigateTo('inicio')} 
                  className="flex items-center space-x-3 cursor-pointer group w-fit"
                >
                  <img 
                    src="/logo_turim_juaco.svg" 
                    alt="Logo TURIM . Juaco - Finca La Colmena" 
                    className="w-10 h-8 rounded-lg object-contain group-hover:scale-105 transition-transform" 
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <strong className="text-white font-serif text-sm sm:text-base block">Finca La Colmena de Don Juaco</strong>
                    <span className="text-2xs text-stone-400">Hotel Boutique & Reserva Agroturística</span>
                  </div>
                </div>

                <div className="space-y-2 text-2xs sm:text-xs text-stone-400 pt-1">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>Vereda La Esmeralda, Montenegro, Quindío, Colombia</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <a href="tel:+573015677776" className="hover:text-stone-200 transition-colors">
                      +57 301 567 7776
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <a href="mailto:restreporojassantiago940@gmail.com" className="hover:text-stone-200 transition-colors">
                      restreporojassantiago940@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Bloque Central: Navegación limpia sin descripciones adicionales */}
              <div className="lg:col-span-3 space-y-2.5">
                <h4 className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Navegación</h4>
                <ul className="space-y-1.5 text-2xs sm:text-xs text-stone-400">
                  <li>
                    <button 
                      onClick={() => navigateTo('inicio')} 
                      className={`hover:text-white transition-colors cursor-pointer text-left ${activeModule === 'inicio' ? 'text-emerald-400 font-semibold' : ''}`}
                    >
                      Habitaciones
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigateTo('quienes-somos')} 
                      className={`hover:text-white transition-colors cursor-pointer text-left ${activeModule === 'quienes-somos' ? 'text-emerald-400 font-semibold' : ''}`}
                    >
                      Quiénes Somos
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigateTo('nuestra-historia')} 
                      className={`hover:text-white transition-colors cursor-pointer text-left ${activeModule === 'nuestra-historia' ? 'text-emerald-400 font-semibold' : ''}`}
                    >
                      Nuestra Historia
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigateTo('experiencias')} 
                      className={`hover:text-white transition-colors cursor-pointer text-left ${activeModule === 'experiencias' ? 'text-emerald-400 font-semibold' : ''}`}
                    >
                      Experiencias
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigateTo('donde-nos-ubicamos')} 
                      className={`hover:text-white transition-colors cursor-pointer text-left ${activeModule === 'donde-nos-ubicamos' ? 'text-emerald-400 font-semibold' : ''}`}
                    >
                      Dónde Nos Ubicamos
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => setIsLookupModalOpen(true)} 
                      className="hover:text-white transition-colors cursor-pointer text-left text-emerald-400/90 font-medium"
                    >
                      Consultar Reserva
                    </button>
                  </li>
                </ul>
              </div>

              {/* Bloque Central: Legal limpio sin descripciones adicionales */}
              <div className="lg:col-span-3 space-y-2.5">
                <h4 className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Legal</h4>
                <ul className="space-y-1.5 text-2xs sm:text-xs text-stone-400">
                  <li>
                    <a
                      href="/assets/aistudio/Pol_tica_Integral_de_Privacidad_y_Cookies_46d82097.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <span>Política de Datos & Cookies</span>
                      <ExternalLink className="w-3 h-3 text-stone-500" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="/assets/aistudio/Pol_tica_de_Cancelaci_n_5d37bcbb.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <span>Términos y Condiciones</span>
                      <ExternalLink className="w-3 h-3 text-stone-500" />
                    </a>
                  </li>
                </ul>
              </div>

            </div>
          </div>

          {/* Sub-footer (Base oscura): Franja en parte inferior absoluta, letra 11px, color atenuado, Ley 679 corrida sin tarjetas, sin iconos de alerta y sin bordes. Ícono de candado discreto en la esquina inferior derecha sin texto */}
          <div className="bg-black/60 border-t border-stone-900/80 px-4 sm:px-6 lg:px-8 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <p className="text-[11px] text-stone-500 leading-normal flex-1">
                En cumplimiento de la Ley 679 de 2001 y Ley 1336 de 2009, Finca La Colmena de Don Juaco advierte, previene y rechaza la explotación y el abuso sexual de niños, niñas y adolescentes (ESCNNA). Estas conductas son penalmente sancionadas en Colombia. © {new Date().getFullYear()} Finca La Colmena de Don Juaco. Todos los derechos reservados.
              </p>
              <button 
                onClick={() => {
                  if (isAdminAuthenticated) {
                    navigateTo('admin');
                  } else {
                    handleOpenAdminLogin();
                  }
                }} 
                className="text-stone-600 hover:text-stone-400 transition-colors p-1 rounded shrink-0 focus:outline-none focus:ring-1 focus:ring-stone-600"
                title={isAdminAuthenticated ? 'Panel Administrativo' : 'Acceso Administrativo'}
                aria-label="Acceso Administrativo"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Booking Modal */}
      <AnimatePresence>
        {bookingModalRoom && (
          <BookingModal
            key="booking-modal"
            room={bookingModalRoom}
            checkInDate={checkInDate || getTodayDateString()}
            checkOutDate={checkOutDate || getTomorrowDateString(checkInDate || getTodayDateString())}
            nights={checkInDate && checkOutDate ? nights : 1}
            multiplier={seasonalMultiplier}
            onClose={() => setBookingModalRoom(null)}
            onBookingCreated={() => {
              refreshAllData();
              if (checkInDate && checkOutDate && guestCount) {
                handleSearch();
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Reservation Lookup Modal */}
      <AnimatePresence>
        {isLookupModalOpen && (
          <ReservationLookupModal
            key="lookup-modal"
            onClose={() => setIsLookupModalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Chat Widget with Decision Tree & Concierge */}
      {activeModule !== 'admin' && (
        <ChatWidget
          onTriggerBooking={() => {
            navigateTo('inicio');
            setTimeout(() => {
              const el = document.getElementById('cabanas');
              el?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
        />
      )}

      {/* Inactivity Session Timeout Notice Modal */}
      <AnimatePresence>
        {sessionTimeoutNotice && (
          <motion.div
            key="timeout-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs"
            onClick={() => setSessionTimeoutNotice(false)}
          >
            <motion.div
              key="timeout-modal-dialog"
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 14 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 text-center relative"
            >
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setSessionTimeoutNotice(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                aria-label="Cerrar notificación"
              >
                <X className="w-5 h-5" />
              </motion.button>
              <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-inner">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#330757] mb-2">
                Sesión Cerrada por Inactividad
              </h3>
              <p className="text-stone-600 text-xs sm:text-sm leading-relaxed mb-6">
                Por protección y seguridad del sistema hotelero TURIM.Juaco, la sesión de administrador se ha cerrado automáticamente tras <strong>30 segundos sin movimiento</strong> en la página. Has sido redirigido a la página principal.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSessionTimeoutNotice(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Entendido
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSessionTimeoutNotice(false);
                    setIsAdminLoginModalOpen(true);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#005400] hover:bg-[#003D00] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Iniciar Sesión de Nuevo</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Minimalist Cookie Consent Banner */}
      <CookieBanner />

    </div>
  );
}
