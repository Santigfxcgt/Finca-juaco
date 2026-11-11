import React, { useState } from 'react';
import { 
  Search, 
  ShieldCheck, 
  MessageCircle, 
  LogOut, 
  Lock, 
  Menu, 
  X,
  Users, 
  History, 
  Sparkles, 
  MapPin,
  BedDouble,
  ChevronRight,
  Coffee
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppModule } from '../types';

interface NavbarProps {
  activeModule: AppModule;
  setActiveModule: (module: AppModule) => void;
  onOpenLookup: () => void;
  pendingTransactionsCount: number;
  isAdminAuthenticated: boolean;
  onOpenAdminLogin: () => void;
  onAdminLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeModule,
  setActiveModule,
  onOpenLookup,
  pendingTransactionsCount,
  isAdminAuthenticated,
  onOpenAdminLogin,
  onAdminLogout
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleModuleSelect = (mod: AppModule) => {
    if (mod === 'admin') {
      if (!isAdminAuthenticated) {
        onOpenAdminLogin();
      } else {
        setActiveModule('admin');
      }
    } else {
      setActiveModule(mod);
    }
    setIsMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clientMenuItems = [
    {
      id: 'inicio' as AppModule,
      label: 'Inicio & Habitaciones',
      subtitle: 'Reserva directa',
      Icon: BedDouble
    },
    {
      id: 'quienes-somos' as AppModule,
      label: 'Quiénes Somos',
      subtitle: 'Tradición familiar',
      Icon: Users
    },
    {
      id: 'nuestra-historia' as AppModule,
      label: 'Nuestra Historia',
      subtitle: 'Legado cafetero',
      Icon: History
    },
    {
      id: 'experiencias' as AppModule,
      label: 'Experiencias de la Finca',
      subtitle: 'Piscina y naturaleza',
      Icon: Sparkles
    },
    {
      id: 'donde-nos-ubicamos' as AppModule,
      label: 'Dónde Nos Ubicamos',
      subtitle: 'Mapa y cómo llegar',
      Icon: MapPin
    }
  ];

  return (
    <>
      {/* 1. Mobile Top Header Bar (Only visible on small screens < lg) */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#005400] text-white shadow-md border-b border-[#003D00] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors cursor-pointer"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => handleModuleSelect('inicio')}
            className="flex items-center space-x-2.5 text-left cursor-pointer"
          >
            <img
              src="/logo_turim_juaco.svg"
              alt="Logo TURIM . Juaco - Finca La Colmena"
              className="h-9 w-auto object-contain rounded-lg bg-white/10 p-0.5"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="font-serif text-sm font-bold tracking-tight text-white block leading-tight">
                Finca La Colmena
              </span>
              <span className="text-[10px] tracking-wider uppercase text-emerald-200 font-semibold block">
                de Don Juaco • Finca Hotel
              </span>
            </div>
          </button>
        </div>

        <button
          onClick={onOpenLookup}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          title="Consultar estado de reserva existente"
        >
          <Search className="w-3.5 h-3.5 text-emerald-200" />
          <span className="hidden xs:inline">Mi Reserva</span>
        </button>
      </header>

      {/* 2. Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            key="mobile-nav-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* 3. Fixed Left Vertical Sidebar (position: fixed, height: 100vh, width: 250px) */}
      <aside
        style={{
          width: '250px',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 40
        }}
        className={`bg-[#005400] text-white flex flex-col border-r border-[#003D00] shadow-2xl select-none transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand Header */}
        <div className="p-4 border-b border-[#003D00] bg-[#003D00]/60 flex items-center justify-between shrink-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleModuleSelect('inicio')}
            className="flex items-center space-x-3 text-left group focus:outline-none cursor-pointer min-w-0"
          >
            <img
              src="/logo_turim_juaco.svg"
              alt="Logo TURIM . Juaco - Finca La Colmena"
              className="h-11 w-auto object-contain rounded-xl bg-white/10 p-1 shadow-xs group-hover:scale-105 transition-transform shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <span className="font-serif text-base font-bold tracking-tight text-white block leading-tight truncate">
                Finca La Colmena
              </span>
              <span className="text-[10px] tracking-wider uppercase text-emerald-200 font-semibold block truncate">
                de Don Juaco • Hotel
              </span>
            </div>
          </motion.button>

          {/* Close button on mobile */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Subtitle / Hospitality Badge */}
        <div className="px-4 py-2.5 bg-[#003D00] border-b border-[#002B00] flex items-center justify-between text-[11px] shrink-0">
          <div className="flex items-center space-x-2">
            <Coffee className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="text-emerald-100 font-semibold">Desayuno Incluido</span>
          </div>
          <span className="text-[10px] bg-white/15 text-white font-bold px-2 py-0.5 rounded-full">
            Quindío
          </span>
        </div>

        {/* Main Vertical Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2" aria-label="Navegación Principal de Cliente">
          <div className="px-2.5 pb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-200/75 block">
              Menú del Huésped
            </span>
          </div>

          {clientMenuItems.map(({ id, label, subtitle, Icon }) => {
            const isActive = activeModule === id;
            return (
              <motion.button
                key={id}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModuleSelect(id)}
                className={`w-full text-left px-3 py-3 rounded-xl transition-colors duration-150 flex items-center justify-between group cursor-pointer border ${
                  isActive
                    ? 'bg-white text-[#005400] font-bold border-white shadow-md'
                    : 'bg-transparent text-white/90 border-transparent hover:bg-white/12 hover:text-white hover:border-white/20'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`p-2 rounded-xl transition-colors shrink-0 flex items-center justify-center ${
                      isActive
                        ? 'bg-[#005400] text-white shadow-2xs'
                        : 'bg-white/10 text-emerald-200 group-hover:bg-white/20 group-hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs block truncate leading-snug">
                      {label}
                    </span>
                    <span
                      className={`text-[10px] block truncate ${
                        isActive ? 'text-[#005400]/75 font-medium' : 'text-emerald-200/70 group-hover:text-emerald-100'
                      }`}
                    >
                      {subtitle}
                    </span>
                  </div>
                </div>

                <ChevronRight
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive
                      ? 'text-[#005400] translate-x-0.5'
                      : 'text-white/40 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'
                  }`}
                />
              </motion.button>
            );
          })}

          {/* Separator for Reservation Lookup & Direct Contact */}
          <div className="pt-4 pb-1 px-2.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-200/75 block">
              Gestión & Ayuda
            </span>
          </div>

          {/* Consultar Reserva Existente */}
          <motion.button
            whileHover={{ x: 2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setIsMobileSidebarOpen(false);
              onOpenLookup();
            }}
            className="w-full text-left px-3 py-2.5 rounded-xl border border-white/25 bg-white/10 hover:bg-white/20 text-white transition-all flex items-center space-x-3 group cursor-pointer shadow-2xs"
          >
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 group-hover:bg-amber-400 group-hover:text-stone-950 transition-colors shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Consultar Reserva</span>
              <span className="text-[10px] text-emerald-200/80 block truncate">Estado y comprobantes</span>
            </div>
          </motion.button>

          {/* Contacto WhatsApp Directo */}
          <motion.a
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            href="https://wa.me/573015677776?text=Hola%20Don%20Juaco,%20quisiera%20informaci%C3%B3n%20sobre%20Finca%20La%20Colmena"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-left px-3 py-2.5 rounded-xl border border-white/15 bg-transparent hover:bg-white/12 text-white transition-all flex items-center space-x-3 group cursor-pointer"
          >
            <div className="p-2 rounded-xl bg-white/10 text-emerald-200 group-hover:bg-white/20 group-hover:text-white transition-colors shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold block truncate">WhatsApp Directo</span>
              <span className="text-[10px] text-emerald-200/80 block truncate">+57 301 567 7776</span>
            </div>
          </motion.a>
        </nav>

        {/* Bottom Section: Admin Access */}
        <div className="p-3 border-t border-[#003D00] bg-[#003D00]/80 space-y-1.5 shrink-0">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => handleModuleSelect('admin')}
            className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
              activeModule === 'admin'
                ? 'bg-white text-[#005400] font-bold shadow-xs'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              {isAdminAuthenticated ? (
                <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-emerald-200 shrink-0" />
              )}
              <span className="truncate">Panel Administrativo</span>
            </div>

            {pendingTransactionsCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-bold shrink-0">
                {pendingTransactionsCount}
              </span>
            ) : isAdminAuthenticated ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-400/20 text-emerald-200 font-medium shrink-0">
                Activo
              </span>
            ) : null}
          </motion.button>

          {isAdminAuthenticated && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onAdminLogout}
              className="w-full px-3 py-2 rounded-xl text-xs font-medium text-red-200 hover:text-white hover:bg-red-500/20 transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              title="Cerrar sesión de administrador"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión Admin</span>
            </motion.button>
          )}
        </div>
      </aside>
    </>
  );
};

