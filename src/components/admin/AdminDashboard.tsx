import React, { useState } from 'react';
import { 
  Calendar as CalIcon, 
  Users, 
  DollarSign, 
  AlertCircle, 
  FileText, 
  Layers, 
  PlusCircle, 
  Eye, 
  X,
  CreditCard,
  Settings,
  Sparkles,
  CheckCircle2,
  BarChart3,
  ChevronDown,
  Menu,
  LogOut,
  RefreshCw,
  ExternalLink,
  BedDouble,
  Camera,
  ShieldCheck
} from 'lucide-react';
import { Room, Reservation, Transaction, SeasonRate, EstateSettings, ReservationStatus, VerificationStatus } from '../../types';
import { formatCOP, formatDateEs, getStatusBadge } from '../../utils/formatters';
import { OccupancyCalendar } from './OccupancyCalendar';
import { ReservationsManager } from './ReservationsManager';
import { TransactionsAuditor } from './TransactionsAuditor';
import { FinancesManager } from './FinancesManager';
import { InventorySettings } from './InventorySettings';
import { DataAnalyticsDashboard } from './DataAnalyticsDashboard';
import { ExperiencesAdminManager } from './ExperiencesAdminManager';
import { VoucherModal } from './VoucherModal';

interface AdminDashboardProps {
  rooms: Room[];
  reservations: Reservation[];
  transactions: Transaction[];
  seasons: SeasonRate[];
  settings: EstateSettings | null;
  onRefreshData: () => Promise<void>;
  onAdminLogout?: () => void;
  onGoToPublicSite?: () => void;
  inactivitySecondsLeft?: number;
  isLoadingData?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  rooms,
  reservations,
  transactions,
  seasons,
  settings,
  onRefreshData,
  onAdminLogout,
  onGoToPublicSite,
  inactivitySecondsLeft,
  isLoadingData
}) => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'reservations' | 'finances' | 'auditor' | 'analytics' | 'settings' | 'experiences'>('calendar');
  const [settingsSubTab, setSettingsSubTab] = useState<'rooms' | 'photos' | 'experiences' | 'seasons' | 'estate'>('photos');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inspectedRes, setInspectedRes] = useState<Reservation | null>(null);
  const [viewVoucherTx, setViewVoucherTx] = useState<Transaction | null>(null);
  const [walkInModal, setWalkInModal] = useState<{ open: boolean; roomId: string; date: string }>({
    open: false,
    roomId: '',
    date: ''
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Walk-in form state
  const [walkInForm, setWalkInForm] = useState({
    fullName: '',
    documentNumber: '',
    phone: '',
    email: '',
    nights: 1
  });
  const [isCreatingWalkIn, setIsCreatingWalkIn] = useState(false);

  // Top KPIs
  const totalRooms = rooms.length || 1;
  const occupiedCount = reservations.filter(r => r.status === 'CHECKED_IN').length;
  const occupancyRate = Math.round((occupiedCount / totalRooms) * 100);

  const totalConfirmedRevenue = reservations
    .filter(r => r.status === 'CONFIRMED' || r.status === 'CHECKED_IN' || r.status === 'CHECKED_OUT')
    .reduce((acc, r) => acc + r.totalAmount, 0);

  const pendingTransactions = transactions.filter(t => t.verificationStatus === 'PENDING').length;
  const pendingHoldCount = reservations.filter(r => r.status === 'PENDING_PAYMENT').length;

  // Status transition handler for state machine
  const handleStatusChange = async (resId: string, nextStatus: ReservationStatus, reason?: string) => {
    try {
      const res = await fetch(`/api/reservations/${resId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextStatus, status: nextStatus, reason })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (data.reservation && inspectedRes && (inspectedRes.id === resId || inspectedRes.reservationCode === resId)) {
          setInspectedRes(data.reservation);
        }
        await onRefreshData();
      } else {
        alert(data.error || 'No se pudo actualizar el estado de la reserva');
      }
    } catch (e: any) {
      alert('Error de conexión al actualizar estado de reserva');
    }
  };

  // Transaction verification handler
  const handleVerifyTransaction = async (txId: string, status: VerificationStatus, reason?: string) => {
    try {
      const res = await fetch(`/api/transactions/${txId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: status, status, reason, rejectionReason: reason })
      });
      if (res.ok) {
        await onRefreshData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Error verificando transacción');
      }
    } catch (e) {
      alert('Error de conexión al verificar el pago');
    }
  };

  // Update room
  const handleUpdateRoom = async (roomId: string, updates: Partial<Room>) => {
    const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('colmena_admin_token') : null;
    await fetch(`/api/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken || 'token-admin-donjuaco-session-2026'}`,
        'x-admin-token': adminToken || 'token-admin-donjuaco-session-2026'
      },
      body: JSON.stringify(updates)
    });
    await onRefreshData();
  };

  // Update settings
  const handleUpdateSettings = async (updates: Partial<EstateSettings>) => {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    await onRefreshData();
  };

  // Create season
  const handleCreateSeason = async (season: Partial<SeasonRate>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(season)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'No se pudo registrar la temporada.' };
      }
      await onRefreshData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión al guardar la temporada.' };
    }
  };

  // Update season
  const handleUpdateSeason = async (seasonId: string, updates: Partial<SeasonRate>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/seasons/${seasonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'No se pudo actualizar la temporada.' };
      }
      await onRefreshData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión al actualizar la temporada.' };
    }
  };

  // Delete season
  const handleDeleteSeason = async (seasonId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/seasons/${seasonId}`, {
        method: 'DELETE'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'No se pudo eliminar la temporada.' };
      }
      await onRefreshData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión al eliminar la temporada.' };
    }
  };

  // Walk-in creation submission
  const handleCreateWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInForm.fullName || !walkInForm.documentNumber) return;
    setIsCreatingWalkIn(true);

    try {
      const checkInDate = walkInModal.date;
      const d = new Date(checkInDate);
      d.setDate(d.getDate() + walkInForm.nights);
      const checkOutDate = d.toISOString().split('T')[0];

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: walkInModal.roomId,
          checkInDate,
          checkOutDate,
          adults: 2,
          children: 0,
          guestData: {
            fullName: walkInForm.fullName,
            documentType: 'CC',
            documentNumber: walkInForm.documentNumber,
            email: walkInForm.email || 'walkin@colmena.com',
            phone: walkInForm.phone || '3000000000',
            nationality: 'Colombiana'
          },
          specialRequests: 'Reserva directa (Walk-in en recepción)'
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Immediately mark as checked in or confirmed
        await handleStatusChange(data.reservation.id, 'CHECKED_IN');
        setWalkInModal({ open: false, roomId: '', date: '' });
        setWalkInForm({ fullName: '', documentNumber: '', phone: '', email: '', nights: 1 });
      }
    } finally {
      setIsCreatingWalkIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col relative w-full font-sans">
      {/* 1. Backdrop for mobile view */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* 2. Fixed Vertical Sidebar (250px width, 100vh height, position: fixed) */}
      <aside 
        style={{ width: '250px', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 40 }}
        className={`bg-[#1B4332] text-white flex flex-col border-r border-[#143225] shadow-2xl transition-transform duration-300 ease-in-out select-none ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand & Emblem Header */}
        <div className="p-4 border-b border-[#143225] bg-[#143225]/70 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo_turim_juaco.svg" 
              alt="Logo TURIM . Juaco" 
              className="h-10 w-auto object-contain rounded-xl bg-white/10 p-1 shadow-xs"
            />
            <div>
              <span className="font-serif text-base font-bold text-white block leading-tight">
                TURIM . Juaco
              </span>
              <span className="text-[10px] tracking-wider uppercase text-emerald-200 font-semibold block">
                Finca La Colmena
              </span>
            </div>
          </div>
          {/* Close button on mobile */}
          <button 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label="Cerrar Menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status indicator */}
        <div className="px-4 py-2.5 bg-[#0F261C] border-b border-[#143225] flex items-center justify-between text-[11px] shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-200 font-semibold">Panel Operativo</span>
          </div>
          <span className="text-[10px] bg-emerald-950/80 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-800">
            {occupancyRate}% Ocupación
          </span>
        </div>

        {/* Navigation Menu (Vertical List - One Below Another) */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          <div className="px-3 pt-1 pb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300/60 block">
              Operaciones
            </span>
          </div>

          {/* 1. Calendario de Ocupación */}
          <button
            onClick={() => {
              setActiveTab('calendar');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-white/15 text-white font-bold border-l-4 border-amber-400 shadow-xs'
                : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <CalIcon className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Calendario Ocupación</span>
            </div>
          </button>

          {/* 2. Gestor de Reservas */}
          <button
            onClick={() => {
              setActiveTab('reservations');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'reservations'
                ? 'bg-white/15 text-white font-bold border-l-4 border-amber-400 shadow-xs'
                : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Layers className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Gestor de Reservas</span>
            </div>
            {pendingHoldCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-bold">
                {pendingHoldCount}
              </span>
            )}
          </button>

          {/* 3. Finanzas & Contabilidad */}
          <button
            onClick={() => {
              setActiveTab('finances');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'finances'
                ? 'bg-white/15 text-white font-bold border-l-4 border-amber-400 shadow-xs'
                : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <DollarSign className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Finanzas & Caja</span>
            </div>
            {pendingTransactions > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
                {pendingTransactions}
              </span>
            )}
          </button>

          {/* 4. Auditoría de Pagos */}
          <button
            onClick={() => {
              setActiveTab('auditor');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'auditor'
                ? 'bg-white/15 text-white font-bold border-l-4 border-amber-400 shadow-xs'
                : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <CreditCard className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Auditoría de Pagos</span>
            </div>
            {pendingTransactions > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
                {pendingTransactions}
              </span>
            )}
          </button>

          {/* 4. Análisis Estadístico */}
          <button
            onClick={() => {
              setActiveTab('analytics');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-white/15 text-white font-bold border-l-4 border-amber-400 shadow-xs'
                : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <BarChart3 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Análisis Estadístico</span>
            </div>
          </button>

          {/* 5. Fotos de Experiencias */}
          <button
            onClick={() => {
              setActiveTab('experiences');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'experiences'
                ? 'bg-white/15 text-white font-bold border-l-4 border-amber-400 shadow-xs'
                : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Camera className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Fotos Experiencias</span>
            </div>
          </button>

          {/* Section: Configuración & Finca */}
          <div className="px-3 pt-4 pb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300/60 block">
              Ajustes & Finca
            </span>
          </div>

          {/* 6. Cabañas & Habitaciones */}
          <button
            onClick={() => {
              setActiveTab('settings');
              setSettingsSubTab('rooms');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'settings' && (settingsSubTab === 'rooms' || settingsSubTab === 'photos')
                ? 'bg-white/15 text-white font-bold border-l-4 border-amber-400 shadow-xs'
                : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <BedDouble className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Cabañas & Precios</span>
            </div>
          </button>

          {/* 7. Tarifas Estacionales */}
          <button
            onClick={() => {
              setActiveTab('settings');
              setSettingsSubTab('seasons');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'settings' && settingsSubTab === 'seasons'
                ? 'bg-white/15 text-white font-bold border-l-4 border-amber-400 shadow-xs'
                : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <DollarSign className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Tarifas Estacionales</span>
            </div>
          </button>

          {/* 8. Configuración de Finca */}
          <button
            onClick={() => {
              setActiveTab('settings');
              setSettingsSubTab('estate');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'settings' && settingsSubTab === 'estate'
                ? 'bg-white/15 text-white font-bold border-l-4 border-amber-400 shadow-xs'
                : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Settings className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Ajustes de Finca</span>
            </div>
          </button>
        </div>

        {/* Inactivity Security Token Protection Badge */}
        <div className="p-3 border-t border-[#143225] bg-[#10271d]">
          <div className={`p-2.5 rounded-xl border text-xs transition-all ${
            (inactivitySecondsLeft !== undefined && inactivitySecondsLeft <= 10)
              ? 'bg-rose-950/90 border-rose-500 text-rose-100 shadow-sm animate-pulse'
              : 'bg-[#143225]/80 border-emerald-500/20 text-emerald-100'
          }`}>
            <div className="flex items-center justify-between font-bold mb-1">
              <span className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Token de Seguridad
              </span>
              <span className={`px-2 py-0.5 rounded-md text-2xs font-mono font-bold ${
                (inactivitySecondsLeft !== undefined && inactivitySecondsLeft <= 10)
                  ? 'bg-rose-600 text-white animate-bounce'
                  : 'bg-emerald-800 text-emerald-200'
              }`}>
                {inactivitySecondsLeft ?? 30}s
              </span>
            </div>
            <p className="text-[10px] text-stone-300 leading-tight">
              {(inactivitySecondsLeft !== undefined && inactivitySecondsLeft <= 10)
                ? '¡Inactividad! Mueve el cursor o presiona una tecla para continuar.'
                : 'Cierre automático tras 30 segundos sin movimiento.'}
            </p>
          </div>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-[#143225] bg-[#143225]/80 space-y-1.5 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar Datos'}</span>
          </button>

          {onGoToPublicSite && (
            <button
              onClick={onGoToPublicSite}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium text-emerald-100 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-300" />
              <span>Ver Sitio Web</span>
            </button>
          )}

          {onAdminLogout && (
            <button
              onClick={onAdminLogout}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium text-red-200 hover:text-white hover:bg-red-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          )}
        </div>
      </aside>

      {/* 3. Main Content Area (padded on left by 250px on desktop so it is NEVER hidden under the fixed sidebar) */}
      <div 
        style={{ minHeight: '100vh' }}
        className="w-full min-h-screen lg:pl-[250px] bg-[#FAF8F5] flex flex-col flex-1"
      >
        {/* Mobile Top Header (only visible on screens < lg) */}
        <div className="lg:hidden sticky top-0 z-30 bg-[#1B4332] text-white px-4 py-3 flex items-center justify-between shadow-md border-b border-[#143225]">
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              aria-label="Abrir Menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <span className="font-serif text-sm font-bold block leading-tight">Admin Finca La Colmena</span>
              <span className="text-[10px] text-emerald-200 block uppercase">Panel de Control</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 rounded-full text-3xs font-mono font-bold border ${
              (inactivitySecondsLeft !== undefined && inactivitySecondsLeft <= 10)
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                : 'bg-white/10 text-emerald-200 border-white/20'
            }`} title="Tiempo restante antes del cierre automático por inactividad">
              🛡️ {inactivitySecondsLeft ?? 30}s
            </span>
            {pendingTransactions > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-3xs font-bold">
                {pendingTransactions}
              </span>
            )}
            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
          
          {/* Top Operational Status Header Card */}
          <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Panel Operativo del Hotel & Reservas</span>
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                  Administración Finca La Colmena
                </h1>
                <p className="text-xs text-stone-500 mt-0.5">
                  Control en tiempo real de disponibilidad, reservas, pagos y tarifas estacionales.
                </p>
              </div>

              {/* Quick KPI stats */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs">
                  <span className="text-emerald-800 font-semibold block text-[10px] uppercase">Ocupación</span>
                  <span className="font-bold text-emerald-950 text-sm">{occupancyRate}%</span>
                </div>
                <div className="px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs">
                  <span className="text-amber-800 font-semibold block text-[10px] uppercase">Ingresos Confirmados</span>
                  <span className="font-bold text-amber-950 text-sm">{formatCOP(totalConfirmedRevenue)}</span>
                </div>
                {pendingTransactions > 0 && (
                  <div className="px-3.5 py-2 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs">
                    <span className="text-rose-800 font-semibold block text-[10px] uppercase">Por Auditar</span>
                    <span className="font-bold text-rose-950 text-sm">{pendingTransactions} pagos</span>
                  </div>
                )}
                {/* Security Inactivity Token Status */}
                <div className={`px-3 py-1.5 rounded-2xl border text-xs flex items-center gap-2 transition-all ${
                  (inactivitySecondsLeft !== undefined && inactivitySecondsLeft <= 10)
                    ? 'bg-rose-50 border-rose-300 text-rose-800 animate-pulse shadow-xs'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                }`}>
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${(inactivitySecondsLeft !== undefined && inactivitySecondsLeft <= 10) ? 'text-rose-600' : 'text-emerald-600'}`} />
                  <div>
                    <span className="text-[10px] uppercase font-bold block leading-tight text-stone-500">
                      Protección (30s)
                    </span>
                    <span className="font-bold text-xs font-mono">
                      {inactivitySecondsLeft ?? 30}s restante
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="hidden md:inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="Actualizar datos del servidor"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </button>
              </div>
            </div>
          </div>

      {/* Main Tab Content */}
      {activeTab === 'calendar' && (
        <OccupancyCalendar
          rooms={rooms}
          reservations={reservations}
          onSelectReservation={(res) => setInspectedRes(res)}
          onCreateWalkIn={(roomId, date) => setWalkInModal({ open: true, roomId, date })}
        />
      )}

      {activeTab === 'reservations' && (
        <ReservationsManager
          reservations={reservations}
          onStatusChange={handleStatusChange}
          onInspectReservation={(res) => setInspectedRes(res)}
          isLoading={Boolean(isLoadingData || isRefreshing)}
        />
      )}

      {activeTab === 'finances' && (
        <FinancesManager
          reservations={reservations}
          transactions={transactions}
          rooms={rooms}
          settings={settings}
          onRefreshData={onRefreshData}
          onVerifyTransaction={handleVerifyTransaction}
          onStatusChange={handleStatusChange}
        />
      )}

      {activeTab === 'auditor' && (
        <TransactionsAuditor
          transactions={transactions}
          reservations={reservations}
          onVerifyTransaction={handleVerifyTransaction}
          onStatusChange={handleStatusChange}
          isLoading={Boolean(isLoadingData || isRefreshing)}
        />
      )}

      {activeTab === 'analytics' && (
        <DataAnalyticsDashboard
          rooms={rooms}
          reservations={reservations}
        />
      )}

      {activeTab === 'experiences' && (
        <ExperiencesAdminManager />
      )}

          {activeTab === 'settings' && (
            <InventorySettings
              rooms={rooms}
              seasons={seasons}
              settings={settings}
              onUpdateRoom={handleUpdateRoom}
              onUpdateSettings={handleUpdateSettings}
              onCreateSeason={handleCreateSeason}
              onUpdateSeason={handleUpdateSeason}
              onDeleteSeason={handleDeleteSeason}
              initialTab={settingsSubTab}
            />
          )}
        </div>
      </div>

      {/* Walk-in Reservation Modal */}
      {walkInModal.open && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <h4 className="font-serif font-bold text-stone-900 text-base">
                Crear Reserva Directa (Walk-in)
              </h4>
              <button onClick={() => setWalkInModal({ open: false, roomId: '', date: '' })}>
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleCreateWalkInSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Nombre Completo Huésped *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Andrés Felipe Gómez"
                  value={walkInForm.fullName}
                  onChange={(e) => setWalkInForm({ ...walkInForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Número de Documento (Cédula) *</label>
                <input
                  type="text"
                  required
                  placeholder="1094829104"
                  value={walkInForm.documentNumber}
                  onChange={(e) => setWalkInForm({ ...walkInForm, documentNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Teléfono</label>
                  <input
                    type="tel"
                    placeholder="310 000 0000"
                    value={walkInForm.phone}
                    onChange={(e) => setWalkInForm({ ...walkInForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Noches de Estadía</label>
                  <input
                    type="number"
                    min={1}
                    value={walkInForm.nights}
                    onChange={(e) => setWalkInForm({ ...walkInForm, nights: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setWalkInModal({ open: false, roomId: '', date: '' })}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingWalkIn}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
                >
                  {isCreatingWalkIn ? 'Registrando...' : 'Registrar Check-in Inmediato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Reservation Detail Drawer */}
      {inspectedRes && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-end">
          <div className="bg-white w-full max-w-lg h-full p-6 shadow-2xl overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-stone-200">
              <div>
                <span className="text-2xs font-mono font-bold uppercase text-amber-800">
                  {inspectedRes.reservationCode}
                </span>
                <h3 className="font-serif text-xl font-bold text-stone-900">
                  Detalle de Reserva
                </h3>
              </div>
              <button
                onClick={() => setInspectedRes(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status & Transitions */}
            <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-stone-600">Estado Actual:</span>
                {(() => {
                  const badge = getStatusBadge(inspectedRes.status);
                  return (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                  );
                })()}
              </div>

              {/* State Machine Transition Buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-200 text-xs">
                {inspectedRes.status === 'PENDING_PAYMENT' && (
                  <button
                    onClick={() => handleStatusChange(inspectedRes.id, 'CONFIRMED')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-xs"
                  >
                    Confirmar Pago Manualmente
                  </button>
                )}
                {(inspectedRes.status === 'CONFIRMED' || inspectedRes.status === 'PENDING_PAYMENT') && (
                  <button
                    onClick={() => handleStatusChange(inspectedRes.id, 'CHECKED_IN')}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <span>Registrar Check-in</span>
                  </button>
                )}
                {inspectedRes.status === 'CHECKED_IN' && (
                  <button
                    onClick={() => handleStatusChange(inspectedRes.id, 'CHECKED_OUT')}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-white font-semibold cursor-pointer shadow-xs"
                  >
                    Registrar Check-out
                  </button>
                )}
              </div>
            </div>

            {/* Guest & Room Details */}
            <div className="space-y-3 text-xs text-stone-700">
              <div className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-1">
                <span className="text-stone-400 text-2xs block uppercase font-bold">Huésped Titular</span>
                <strong className="text-stone-900 text-sm">{inspectedRes.guest?.fullName}</strong>
                <p>{inspectedRes.guest?.documentType}: {inspectedRes.guest?.documentNumber}</p>
                <p>Email: {inspectedRes.guest?.email}</p>
                <p>Tel: {inspectedRes.guest?.phone}</p>
              </div>

              <div className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-1">
                <span className="text-stone-400 text-2xs block uppercase font-bold">Cabaña & Fechas</span>
                <strong className="text-stone-900 text-sm font-serif">{inspectedRes.room?.name}</strong>
                <p>Entrada: {formatDateEs(inspectedRes.checkInDate)} (15:00)</p>
                <p>Salida: {formatDateEs(inspectedRes.checkOutDate)} (11:00)</p>
                <p>Tarifa Noche: {formatCOP(inspectedRes.nightlyRate)}</p>
                <p className="font-bold text-amber-900 pt-1 border-t border-stone-100">
                  Total Liquidado: {formatCOP(inspectedRes.totalAmount)}
                </p>
              </div>

              {inspectedRes.specialRequests && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="font-bold text-amber-900 block mb-1">Petición Especial:</span>
                  <p>{inspectedRes.specialRequests}</p>
                </div>
              )}
            </div>

            {/* Transactions & Payment Vouchers */}
            {inspectedRes.transactions && inspectedRes.transactions.length > 0 && (
              <div className="space-y-2 text-xs">
                <span className="font-bold text-stone-800 block">Comprobantes & Pagos Registrados:</span>
                {inspectedRes.transactions.map(t => {
                  const backupLocal = typeof window !== 'undefined' ? localStorage.getItem(`colmena_voucher_${t.reservationId}`) : null;
                  const voucherImg = t.proofSlipBase64 || t.proofSlipUrl || backupLocal;

                  return (
                    <div key={t.id} className="p-3 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <strong className="text-stone-900 block font-mono">{t.referenceCode}</strong>
                          <span className="text-stone-500 text-2xs">{t.paymentChannel}</span>
                        </div>
                        <div className="text-right">
                          <strong className="text-stone-900 block">{formatCOP(t.amount)}</strong>
                          <span className={`text-2xs font-semibold block ${
                            t.verificationStatus === 'VERIFIED' ? 'text-emerald-700' :
                            t.verificationStatus === 'REJECTED' ? 'text-rose-700' : 'text-amber-800'
                          }`}>
                            {t.verificationStatus === 'VERIFIED' ? 'Aprobado' :
                             t.verificationStatus === 'REJECTED' ? 'Rechazado' : 'Pendiente Verificación'}
                          </span>
                        </div>
                      </div>

                      {/* Attached voucher preview */}
                      {voucherImg && (
                        <div className="flex items-center gap-3 pt-2 border-t border-stone-200 bg-white p-2 rounded-lg">
                          <img 
                            src={voucherImg} 
                            alt="Comprobante" 
                            onClick={() => setViewVoucherTx(t)}
                            className="w-12 h-12 object-cover rounded-md border border-stone-200 shrink-0 bg-stone-100 cursor-pointer hover:opacity-90 transition-opacity"
                            onError={(e) => {
                              if (t.proofSlipBase64 && e.currentTarget.src !== t.proofSlipBase64) {
                                e.currentTarget.src = t.proofSlipBase64;
                              } else if (backupLocal && e.currentTarget.src !== backupLocal) {
                                e.currentTarget.src = backupLocal;
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-stone-800 text-2xs block truncate">
                              Comprobante adjuntado por el huésped
                            </span>
                            <button
                              type="button"
                              onClick={() => setViewVoucherTx(t)}
                              className="text-2xs text-[#1B4332] font-bold hover:underline inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                            >
                              <span>Ver imagen completa</span>
                              <ExternalLink className="w-3 h-3 text-emerald-700" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* WhatsApp Contact */}
            <a
              href={`https://wa.me/57${inspectedRes.guest?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${inspectedRes.guest?.fullName}, le escribe Don Juaco de Finca La Colmena respecto a su reserva ${inspectedRes.reservationCode}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
            >
              <span>Escribir al Huésped por WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {/* Full Resolution Voucher Lightbox Modal */}
      <VoucherModal
        isOpen={!!viewVoucherTx}
        onClose={() => setViewVoucherTx(null)}
        transaction={viewVoucherTx}
        reservationCode={inspectedRes?.reservationCode}
        guestName={inspectedRes?.guest?.fullName}
      />

    </div>
  );
};
