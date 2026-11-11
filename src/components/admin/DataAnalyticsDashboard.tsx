import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  BedDouble, 
  Home, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Sparkles,
  Users,
  Award,
  ArrowUpDown
} from 'lucide-react';
import { Room, Reservation } from '../../types';

interface DataAnalyticsDashboardProps {
  rooms: Room[];
  reservations: Reservation[];
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_SHORT_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const ROOM_COLORS = [
  { color: '#d97706', bar: 'bg-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' }, // Hab 1
  { color: '#059669', bar: 'bg-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' }, // Hab 2
  { color: '#0284c7', bar: 'bg-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800' }, // Hab 3
  { color: '#7c3aed', bar: 'bg-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-800' }, // Hab 4
  { color: '#ea580c', bar: 'bg-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' }, // Hab 5
  { color: '#e11d48', bar: 'bg-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800' }, // Hab 6
  { color: '#0d9488', bar: 'bg-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800' }, // Hab 7
];

// Helper to robustly match a reservation to a room
export function isReservationForRoom(r: Reservation, room: Room): boolean {
  if (r.roomId && r.roomId === room.id) return true;
  if (r.room?.id && r.room.id === room.id) return true;
  if (r.room?.name && r.room.name === room.name) return true;
  if (r.room?.roomNumber && r.room.roomNumber === room.roomNumber) return true;
  if (r.room?.slug && room.slug && r.room.slug === room.slug) return true;
  
  // Match by room number extraction (e.g. #1, #2, #3, #4, #5, #6, #7)
  const rStr = `${r.roomId || ''} ${r.room?.name || ''} ${r.room?.roomNumber || ''} ${r.room?.slug || ''}`;
  const roomStr = `${room.id || ''} ${room.name || ''} ${room.roomNumber || ''} ${room.slug || ''}`;
  
  const rNumMatch = rStr.match(/(\d+)/);
  const roomNumMatch = roomStr.match(/(\d+)/);
  
  if (rNumMatch && roomNumMatch && rNumMatch[1] === roomNumMatch[1]) {
    return true;
  }
  return false;
}

const StylizedDonutSvg: React.FC<{
  slices: { label: string; value: number; color: string }[];
  total: number;
  centerPrimary: string | number;
  centerSecondary: string;
  size?: number;
}> = ({ slices, total, centerPrimary, centerSecondary, size = 126 }) => {
  const cx = 70;
  const cy = 70;
  const r = 52;
  const C = 2 * Math.PI * r;
  const strokeWidth = 9.5;

  const validSlices = slices.filter(s => s.value > 0);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      className="select-none overflow-visible"
    >
      {/* Background track circle */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#f5f5f4"
        strokeWidth={strokeWidth}
      />

      {/* Slices */}
      {total > 0 && validSlices.length === 1 && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={validSlices[0].color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${C} ${C}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-all duration-700 ease-out"
        />
      )}

      {total > 0 && validSlices.length > 1 && (() => {
        const gap = 3.5;
        let accumulated = 0;
        return validSlices.map((s, idx) => {
          const fraction = s.value / total;
          const arc = fraction * C;
          const visibleArc = Math.max(1, arc - gap);
          const dashArray = `${visibleArc} ${C - visibleArc}`;
          const dashOffset = -accumulated;
          accumulated += arc;

          return (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
              className="transition-all duration-500 ease-out"
            />
          );
        });
      })()}

      {/* Center text */}
      <g className="pointer-events-none select-none">
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-stone-900 font-bold"
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: '23px',
            fontWeight: 700
          }}
        >
          {centerPrimary}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-stone-400 font-medium uppercase"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '9.5px',
            fontWeight: 600,
            letterSpacing: '0.05em'
          }}
        >
          {centerSecondary}
        </text>
      </g>
    </svg>
  );
};

export const DataAnalyticsDashboard: React.FC<DataAnalyticsDashboardProps> = ({
  rooms,
  reservations
}) => {
  // Current date anchor (defaulting to September 2026 based on app current date)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(8); // 8 = Septiembre (0-indexed)
  const [roomSortMode, setRoomSortMode] = useState<'number' | 'reservations'>('number');

  const selectedMonthName = MONTH_NAMES[selectedMonthIndex];

  // Helper to get number of days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
  }, [selectedYear, selectedMonthIndex]);

  // Filter valid non-cancelled reservations
  const validReservations = useMemo(() => {
    return reservations.filter(r => r.status !== 'CANCELLED');
  }, [reservations]);

  // Total real reservations in the entire system (all time)
  const totalSystemReservations = validReservations.length;

  // 1. Calculate reservations by month for selected year
  const monthlyData = useMemo(() => {
    const counts = new Array(12).fill(0);

    validReservations.forEach(r => {
      if (!r.checkInDate) return;
      const [yearStr, monthStr] = r.checkInDate.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1; // 0-indexed

      if (y === selectedYear && m >= 0 && m < 12) {
        counts[m] += 1;
      }
    });

    return counts.map((count, idx) => ({
      monthIndex: idx,
      monthName: MONTH_NAMES[idx],
      shortName: MONTH_SHORT_NAMES[idx],
      count
    }));
  }, [validReservations, selectedYear]);

  // Max value for monthly chart scaling
  const maxMonthlyCount = useMemo(() => {
    const max = Math.max(...monthlyData.map(d => d.count), 1);
    return Math.ceil(max / 5) * 5 || 5;
  }, [monthlyData]);

  // 2. Reservations for the SELECTED month
  const selectedMonthReservations = useMemo(() => {
    return validReservations.filter(r => {
      if (!r.checkInDate) return false;
      const [yearStr, monthStr] = r.checkInDate.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;
      return y === selectedYear && m === selectedMonthIndex;
    });
  }, [validReservations, selectedYear, selectedMonthIndex]);

  // Total reservations in the selected month
  const totalReservationsMonth = selectedMonthReservations.length;

  // 3. Normalized Individual Rooms List (#1 to #7)
  const sortedRoomsList = useMemo(() => {
    // If rooms is provided, sort by room number 1..7
    const list = [...rooms];
    if (list.length === 0) {
      // Fallback default definitions if empty
      return [1, 2, 3, 4, 5, 6, 7].map(num => ({
        id: `room-${num}`,
        roomNumber: `Habitación #${num}`,
        name: `Habitación #${num}`,
        capacity: 3,
        basePrice: 85000,
        sortOrder: num
      } as Room));
    }
    return list.sort((a, b) => {
      const numA = parseInt(a.roomNumber?.replace(/\D/g, '') || a.name?.replace(/\D/g, '') || a.id.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.roomNumber?.replace(/\D/g, '') || b.name?.replace(/\D/g, '') || b.id.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });
  }, [rooms]);

  // 4. Individual Room Data for Selected Month (#1, #2, #3, #4, #5, #6, #7)
  const individualRoomsData = useMemo(() => {
    const total = selectedMonthReservations.length;

    return sortedRoomsList.map((room, idx) => {
      const roomNum = parseInt(room.roomNumber?.replace(/\D/g, '') || room.name?.replace(/\D/g, '') || room.id.replace(/\D/g, '') || String(idx + 1), 10);
      const label = `Habitación #${roomNum}`;
      
      // Count reservations in selected month for this room
      const monthReservations = selectedMonthReservations.filter(r => isReservationForRoom(r, room));
      const count = monthReservations.length;
      
      // Count total reservations across all time for this room
      const allTimeReservations = validReservations.filter(r => isReservationForRoom(r, room));
      const allTimeCount = allTimeReservations.length;

      // Count year reservations
      const yearReservations = validReservations.filter(r => {
        if (!r.checkInDate?.startsWith(String(selectedYear))) return false;
        return isReservationForRoom(r, room);
      });
      const yearCount = yearReservations.length;

      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      const theme = ROOM_COLORS[(roomNum - 1) % ROOM_COLORS.length] || ROOM_COLORS[0];

      return {
        roomNumber: roomNum,
        label,
        roomId: room.id,
        room,
        count,
        yearCount,
        allTimeCount,
        percentage,
        theme
      };
    });
  }, [sortedRoomsList, selectedMonthReservations, validReservations, selectedYear]);

  // Max count among rooms for visual scaling
  const maxRoomReservationsCount = useMemo(() => {
    const max = Math.max(...individualRoomsData.map(r => r.count), 1);
    return Math.ceil(max / 2) * 2 || 2;
  }, [individualRoomsData]);

  // Room data sorted according to active sort mode
  const displayedRoomsData = useMemo(() => {
    if (roomSortMode === 'reservations') {
      return [...individualRoomsData].sort((a, b) => b.count - a.count || a.roomNumber - b.roomNumber);
    }
    return [...individualRoomsData].sort((a, b) => a.roomNumber - b.roomNumber);
  }, [individualRoomsData, roomSortMode]);

  // Room with most & least reservations in the month
  const highestRoom = useMemo(() => {
    if (totalReservationsMonth === 0) return null;
    return [...individualRoomsData].reduce((prev, curr) => (curr.count > prev.count ? curr : prev));
  }, [individualRoomsData, totalReservationsMonth]);

  const lowestRoom = useMemo(() => {
    if (totalReservationsMonth === 0) return null;
    return [...individualRoomsData].reduce((prev, curr) => (curr.count < prev.count ? curr : prev));
  }, [individualRoomsData, totalReservationsMonth]);

  // 5. Metric Cards calculation for selected month
  const uniqueRoomsReserved = useMemo(() => {
    return individualRoomsData.filter(r => r.count > 0).length;
  }, [individualRoomsData]);

  const totalRoomsCount = sortedRoomsList.length || 7;
  const availableRoomsCount = Math.max(0, totalRoomsCount - uniqueRoomsReserved);

  // Total reserved room-nights in the month
  const occupiedNightsMonth = useMemo(() => {
    let totalNights = 0;
    selectedMonthReservations.forEach(r => {
      if (r.checkInDate && r.checkOutDate) {
        const inD = new Date(r.checkInDate);
        const outD = new Date(r.checkOutDate);
        const diffDays = Math.max(1, Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
        totalNights += diffDays;
      } else {
        totalNights += 1;
      }
    });
    return totalNights;
  }, [selectedMonthReservations]);

  // Total capacity nights = total rooms * days in month
  const totalCapacityNights = (sortedRoomsList.length || 7) * daysInMonth;
  const occupancyPercentage = Math.min(
    100, 
    Math.round((occupiedNightsMonth / (totalCapacityNights || 1)) * 100)
  );

  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonthIndex(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonthIndex(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ---------------- Encabezado Principal ---------------- */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">
              <BarChart3 className="w-4 h-4 text-amber-700" />
              <span>Dashboard de Administración</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              Resumen de reservaciones
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Análisis mensual del flujo de huéspedes, ocupación y demanda individual para cada una de las 7 habitaciones de Finca La Colmena.
            </p>
          </div>

          {/* Selector de Mes y Año */}
          <div className="flex items-center gap-2 bg-[#FAF8F5] p-1.5 rounded-xl border border-stone-200 self-start md:self-auto">
            <button
              onClick={handlePrevMonth}
              title="Mes anterior"
              className="p-2 hover:bg-stone-200/70 text-stone-700 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              <Calendar className="w-4 h-4 text-amber-700" />
              <select
                value={selectedMonthIndex}
                onChange={(e) => setSelectedMonthIndex(parseInt(e.target.value, 10))}
                className="bg-transparent text-sm font-bold text-stone-800 focus:outline-none cursor-pointer pr-1"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-transparent text-sm font-semibold text-stone-600 focus:outline-none cursor-pointer pl-1 border-l border-stone-300"
              >
                {[2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNextMonth}
              title="Mes siguiente"
              className="p-2 hover:bg-stone-200/70 text-stone-700 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Month Chips for Fast Navigation */}
        <div className="flex items-center gap-1.5 mt-5 overflow-x-auto pb-1 pt-2 border-t border-stone-100 text-xs">
          <span className="text-stone-400 font-medium mr-1 text-2xs uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3" /> Mes:
          </span>
          {MONTH_SHORT_NAMES.map((short, idx) => (
            <button
              key={short}
              onClick={() => setSelectedMonthIndex(idx)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedMonthIndex === idx
                  ? 'bg-amber-700 text-white font-bold shadow-xs'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {short}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- 4 Tarjetas con Indicadores Reales y Diagramas Estilizados ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Tarjeta 1: Total Reservaciones (Total Real del Sistema y del Mes) */}
        {(() => {
          const total = totalReservationsMonth;
          // Donut slices for each individual room (#1 to #7)
          const slices = individualRoomsData.map(r => ({
            label: r.label,
            value: r.count,
            color: r.theme.color
          }));

          return (
            <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs flex flex-col justify-between hover:border-amber-300 hover:shadow-sm transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-2xs font-bold uppercase tracking-wider text-stone-500 block">
                      Total de Reservaciones
                    </span>
                    <span className="text-3xs text-stone-400 font-medium">
                      {selectedMonthName} {selectedYear}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>

                {/* Gráfico Donut estilizado con texto vectorial centrado */}
                <div className="flex items-center justify-center py-2 my-1">
                  <StylizedDonutSvg 
                    slices={slices} 
                    total={total} 
                    centerPrimary={total}
                    centerSecondary="reservas"
                    size={128} 
                  />
                </div>
              </div>

              {/* Indicador y Resumen */}
              <div className="pt-3.5 border-t border-stone-100 space-y-1.5 text-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-600 font-medium">Reservas del mes:</span>
                  <span className="font-mono font-bold text-amber-800 text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {total} {total === 1 ? 'reserva' : 'reservas'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Total registradas (sistema):</span>
                  <span className="font-mono font-semibold text-stone-700">
                    {totalSystemReservations} reservas
                  </span>
                </div>
                <div className="pt-1.5 flex items-center justify-between text-3xs text-stone-400 border-t border-stone-100/70">
                  <span>Actualización automática</span>
                  <span className="text-emerald-700 font-medium">En tiempo real</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Tarjeta 2: Habitaciones Reservadas (Ratio de inventario) */}
        {(() => {
          const reservedCount = uniqueRoomsReserved;
          const totalRooms = totalRoomsCount || 7;
          const unreservedCount = Math.max(0, totalRooms - reservedCount);
          const slices = [
            { label: 'Con reserva', value: reservedCount, color: '#059669' },
            { label: 'Sin reserva', value: unreservedCount, color: '#e7e5e4' }
          ];

          return (
            <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs flex flex-col justify-between hover:border-emerald-300 hover:shadow-sm transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xs font-bold uppercase tracking-wider text-stone-500">
                    Habitaciones Reservadas
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <BedDouble className="w-4 h-4" />
                  </div>
                </div>

                {/* Gráfico Donut */}
                <div className="flex items-center justify-center py-2 my-1">
                  <StylizedDonutSvg 
                    slices={slices} 
                    total={totalRooms} 
                    centerPrimary={reservedCount}
                    centerSecondary={`de ${totalRooms} habs`}
                    size={128} 
                  />
                </div>
              </div>

              {/* Leyenda */}
              <div className="pt-3.5 border-t border-stone-100 space-y-2 text-2xs">
                {slices.map((s, idx) => {
                  const pct = totalRooms > 0 ? Math.round((s.value / totalRooms) * 100) : 0;
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
                          style={{ backgroundColor: s.color }} 
                        />
                        <span className="text-stone-600 font-medium">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-stone-800 font-semibold">{s.value}</span>
                        <span className="text-3xs text-stone-400 font-normal bg-stone-50 px-1.5 py-0.5 rounded border border-stone-100">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 flex items-center justify-between text-3xs text-stone-400 border-t border-stone-100/70">
                  <span>Inventario oficial</span>
                  <span className="font-mono font-medium text-stone-600">{totalRooms} habitaciones (#1 a #7)</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Tarjeta 3: Habitaciones Disponibles */}
        {(() => {
          const availCount = availableRoomsCount;
          const totalRooms = totalRoomsCount || 7;
          const bookedCount = uniqueRoomsReserved;
          const slices = [
            { label: 'Disponibles', value: availCount, color: '#0284c7' },
            { label: 'Ocupadas', value: bookedCount, color: '#e7e5e4' }
          ];

          return (
            <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs flex flex-col justify-between hover:border-sky-300 hover:shadow-sm transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xs font-bold uppercase tracking-wider text-stone-500">
                    Habitaciones Disponibles
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                    <Home className="w-4 h-4" />
                  </div>
                </div>

                {/* Gráfico Donut */}
                <div className="flex items-center justify-center py-2 my-1">
                  <StylizedDonutSvg 
                    slices={slices} 
                    total={totalRooms} 
                    centerPrimary={availCount}
                    centerSecondary="libres"
                    size={128} 
                  />
                </div>
              </div>

              {/* Leyenda */}
              <div className="pt-3.5 border-t border-stone-100 space-y-2 text-2xs">
                {slices.map((s, idx) => {
                  const pct = totalRooms > 0 ? Math.round((s.value / totalRooms) * 100) : 0;
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
                          style={{ backgroundColor: s.color }} 
                        />
                        <span className="text-stone-600 font-medium">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-stone-800 font-semibold">{s.value}</span>
                        <span className="text-3xs text-stone-400 font-normal bg-stone-50 px-1.5 py-0.5 rounded border border-stone-100">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 flex items-center justify-between text-3xs text-stone-400 border-t border-stone-100/70">
                  <span>Disponibilidad</span>
                  <span className="font-mono font-medium text-stone-600">{totalRooms > 0 ? Math.round((availCount / totalRooms) * 100) : 0}% del cupo</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Tarjeta 4: Porcentaje de Ocupación */}
        {(() => {
          const occPct = Math.min(100, Math.max(0, occupancyPercentage));
          const occNights = occupiedNightsMonth;
          const totalCap = totalCapacityNights || 1;
          const freeNights = Math.max(0, totalCap - occNights);
          const slices = [
            { label: 'Noches ocupadas', value: occNights, color: '#b45309' },
            { label: 'Capacidad libre', value: freeNights, color: '#e7e5e4' }
          ];

          return (
            <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-xs flex flex-col justify-between hover:border-amber-300 hover:shadow-sm transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xs font-bold uppercase tracking-wider text-stone-500">
                    Porcentaje de Ocupación
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>

                {/* Gráfico Donut */}
                <div className="flex items-center justify-center py-2 my-1">
                  <StylizedDonutSvg 
                    slices={slices} 
                    total={totalCap} 
                    centerPrimary={`${occPct}%`}
                    centerSecondary="ocupación"
                    size={128} 
                  />
                </div>
              </div>

              {/* Leyenda */}
              <div className="pt-3.5 border-t border-stone-100 space-y-2 text-2xs">
                {slices.map((s, idx) => {
                  const pct = totalCap > 0 ? Math.round((s.value / totalCap) * 100) : 0;
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
                          style={{ backgroundColor: s.color }} 
                        />
                        <span className="text-stone-600 font-medium">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-stone-800 font-semibold">{s.value}</span>
                        <span className="text-3xs text-stone-400 font-normal bg-stone-50 px-1.5 py-0.5 rounded border border-stone-100">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 flex items-center justify-between text-3xs text-stone-400 border-t border-stone-100/70">
                  <span>Capacidad mensual</span>
                  <span className="font-mono font-medium text-stone-600">{totalCap} noches</span>
                </div>
              </div>
            </div>
          );
        })()}

      </div>

      {/* ---------------- Las 2 Gráficas Organizadas Lado a Lado ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ==============================================================
            Gráfica 1: Reservaciones realizadas por mes
            Título: “Cantidad de reservaciones por mes”
           ============================================================== */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-700" />
                <span>Cantidad de reservaciones por mes</span>
              </h3>
              <span className="text-2xs font-bold uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-mono">
                Año {selectedYear}
              </span>
            </div>
            <p className="text-xs text-stone-500 mb-6">
              Variación y comportamiento de la demanda en el transcurso de los 12 meses.
            </p>
          </div>

          {/* Bar Chart Container */}
          <div className="w-full pt-3">
            {/* Unified Chart Canvas Frame */}
            <div className="relative w-full bg-stone-50/60 rounded-xl border border-stone-200/80 p-3.5 sm:p-4 overflow-hidden">
              <div className="overflow-x-auto pb-1 scrollbar-thin">
                <div className="min-w-[340px] sm:min-w-full">
                  {/* Chart Body: Y-Axis + Bars & Month Labels */}
                  <div className="flex items-stretch gap-2 h-64">
                    
                    {/* Y-Axis scale numbers */}
                    <div className="w-7 flex flex-col justify-between text-right pr-1 pb-8 pointer-events-none select-none">
                      {[maxMonthlyCount, Math.round(maxMonthlyCount * 0.75), Math.round(maxMonthlyCount * 0.5), Math.round(maxMonthlyCount * 0.25), 0].map((val, i) => (
                        <span key={i} className="text-3xs font-mono text-stone-400">
                          {val}
                        </span>
                      ))}
                    </div>

                    {/* Plotting Area with Gridlines, Bars and Integrated Month Labels */}
                    <div className="flex-1 relative flex flex-col justify-between">
                      {/* Horizontal Gridlines */}
                      <div className="absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div key={i} className="w-full border-b border-stone-200/60 border-dashed" />
                        ))}
                      </div>

                      {/* 12 Month Columns */}
                      <div className="relative z-10 flex items-end justify-between w-full h-full">
                        {monthlyData.map((d) => {
                          const isSelected = d.monthIndex === selectedMonthIndex;
                          const heightPercentage = maxMonthlyCount > 0 
                            ? Math.max(d.count > 0 ? 8 : 3, Math.round((d.count / maxMonthlyCount) * 100))
                            : 3;

                          return (
                            <div
                              key={d.monthIndex}
                              onClick={() => setSelectedMonthIndex(d.monthIndex)}
                              className="group flex-1 flex flex-col items-center justify-end h-full cursor-pointer relative px-0.5"
                            >
                              {/* Hover Tooltip */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 bg-stone-900/95 text-white text-3xs font-medium py-1 px-2 rounded shadow-md pointer-events-none whitespace-nowrap z-20">
                                {d.monthName}: {d.count} {d.count === 1 ? 'reserva' : 'reservas'}
                              </div>

                              {/* Value label above bar */}
                              <span className={`text-3xs font-mono mb-1 transition-all select-none ${
                                isSelected 
                                  ? 'text-amber-800 font-bold scale-110' 
                                  : d.count > 0 
                                  ? 'text-stone-400 group-hover:text-stone-700' 
                                  : 'text-stone-300 opacity-60'
                              }`}>
                                {d.count}
                              </span>

                              {/* Bar Section Container */}
                              <div className="w-full flex items-end justify-center h-[calc(100%-3rem)]">
                                <div 
                                  className={`w-full max-w-[12px] sm:max-w-[15px] rounded-t-full transition-all duration-300 ${
                                    isSelected
                                      ? 'bg-amber-700 shadow-xs ring-2 ring-amber-500/20'
                                      : d.count > 0
                                      ? 'bg-stone-300/80 group-hover:bg-amber-400/80'
                                      : 'bg-stone-200/50'
                                  }`}
                                  style={{ height: `${heightPercentage}%` }}
                                />
                              </div>

                              {/* Axis Divider Line for this column */}
                              <div className={`w-full border-t transition-colors mt-0.5 ${
                                isSelected ? 'border-amber-700' : 'border-stone-300'
                              }`} />

                              {/* Month Text Label */}
                              <div className="w-full text-center py-1.5">
                                <span 
                                  className={`inline-block text-3xs sm:text-2xs uppercase tracking-tight transition-all rounded px-1 py-0.5 ${
                                    isSelected
                                      ? 'bg-amber-700 text-white font-bold shadow-2xs'
                                      : 'text-stone-500 group-hover:text-stone-900 font-medium'
                                  }`}
                                >
                                  {d.shortName}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Legend Note */}
            <div className="mt-3 flex items-center justify-between text-2xs text-stone-400 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-700 inline-block" />
                <span>Mes activo: <strong className="text-stone-700">{selectedMonthName}</strong></span>
              </span>
              <span>Total año {selectedYear}: <strong className="text-stone-800">{validReservations.filter(r => r.checkInDate?.startsWith(String(selectedYear))).length} reservas</strong></span>
            </div>
          </div>
        </div>

        {/* ==============================================================
            Gráfica 2: Reservaciones por Habitación Individual (#1 a #7)
            Título: “Reservaciones por habitación”
           ============================================================== */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
              <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-emerald-700" />
                <span>Reservaciones por habitación</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRoomSortMode(prev => prev === 'number' ? 'reservations' : 'number')}
                  className="inline-flex items-center gap-1 text-2xs font-semibold px-2.5 py-1 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200 transition-colors cursor-pointer"
                  title="Cambiar orden de visualización"
                >
                  <ArrowUpDown className="w-3 h-3 text-stone-500" />
                  <span>{roomSortMode === 'number' ? 'Orden: #1 al #7' : 'Orden: Mayor demanda'}</span>
                </button>
                <span className="text-2xs font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                  {selectedMonthName} {selectedYear}
                </span>
              </div>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Demanda individual de cada habitación (Habitación #1 a Habitación #7). Muestra 0 cuando no hay reservaciones.
            </p>
          </div>

          {/* Individual Room Bars & Visual Breakdown */}
          <div className="space-y-2.5 pt-1">
            {displayedRoomsData.map((item) => {
              // Bar width proportional to max count for clear visual comparison
              const relativeBarWidth = maxRoomReservationsCount > 0
                ? Math.round((item.count / maxRoomReservationsCount) * 100)
                : 0;

              const isMax = highestRoom && item.count === highestRoom.count && item.count > 0;
              const isZero = item.count === 0;

              return (
                <div 
                  key={item.label}
                  className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                    isMax 
                      ? 'border-emerald-300 bg-emerald-50/40 shadow-xs' 
                      : isZero
                      ? 'border-stone-200/70 bg-stone-50/40 opacity-75'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs" 
                        style={{ backgroundColor: item.theme.color }} 
                      />
                      <span className="font-serif font-bold text-sm text-stone-900">
                        {item.label}
                      </span>
                      
                      {isMax && (
                        <span className="inline-flex items-center gap-1 text-3xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Award className="w-2.5 h-2.5" />
                          Más reservada
                        </span>
                      )}
                      
                      {isZero && (
                        <span className="text-3xs font-medium px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">
                          Sin reservas este mes
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold text-sm sm:text-base ${
                        isZero ? 'text-stone-400' : 'text-stone-900'
                      }`}>
                        {item.count} {item.count === 1 ? 'reserva' : 'reservas'}
                      </span>
                      <span className={`text-2xs font-mono font-semibold px-1.5 py-0.5 rounded border ${
                        item.percentage > 0 
                          ? 'bg-stone-100 text-stone-700 border-stone-200' 
                          : 'bg-stone-50 text-stone-400 border-stone-100'
                      }`}>
                        {item.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar Frame */}
                  <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden border border-stone-200/70 p-0.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isZero ? 'bg-transparent' : item.theme.bar
                      }`}
                      style={{ 
                        width: `${Math.max(item.count > 0 ? 4 : 0, relativeBarWidth)}%`,
                        backgroundColor: item.count > 0 ? item.theme.color : 'transparent'
                      }}
                    />
                  </div>

                  {/* Room Annual Counter Details */}
                  <div className="mt-1 flex items-center justify-between text-3xs text-stone-400">
                    <span>Capacidad: {item.room?.capacity || 3} huéspedes</span>
                    <span>Acumulado año {selectedYear}: <strong className="text-stone-600 font-mono">{item.yearCount}</strong> | Histórico: <strong className="text-stone-600 font-mono">{item.allTimeCount}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Summary Footer */}
          <div className="mt-4 pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-2xs text-stone-500">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {highestRoom && highestRoom.count > 0 ? (
                  <>Mayor demanda: <strong className="text-stone-800 font-semibold">{highestRoom.label}</strong> ({highestRoom.count} reservas)</>
                ) : (
                  <>Sin reservas registradas para {selectedMonthName}</>
                )}
              </span>
            </div>
            <span className="font-mono text-stone-700 font-bold">
              Total {selectedMonthName}: {totalReservationsMonth} reservas
            </span>
          </div>

        </div>

      </div>

      {/* ---------------- Tabla Resumen Detallada de Reservas del Mes ---------------- */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="font-serif font-bold text-stone-900 text-sm flex items-center gap-2">
              <span>Listado de reservas de {selectedMonthName} {selectedYear}</span>
              <span className="text-2xs font-normal text-stone-500 font-mono">
                ({selectedMonthReservations.length} {selectedMonthReservations.length === 1 ? 'reserva' : 'reservas'})
              </span>
            </h4>
            <p className="text-2xs text-stone-500">
              Detalle de huéspedes y habitaciones asignadas (#1 a #7) para el período seleccionado.
            </p>
          </div>
          <span className="text-2xs text-stone-500 font-mono self-start sm:self-auto bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
            Total general en sistema: <strong className="text-stone-800">{totalSystemReservations}</strong>
          </span>
        </div>

        {selectedMonthReservations.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-xs">
            No se registran reservaciones para {selectedMonthName} de {selectedYear}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-2xs border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Huésped</th>
                  <th className="py-2.5 px-3">Habitación Asignada</th>
                  <th className="py-2.5 px-3">Check-In</th>
                  <th className="py-2.5 px-3">Check-Out</th>
                  <th className="py-2.5 px-3">Valor Total</th>
                  <th className="py-2.5 px-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {selectedMonthReservations.map(res => {
                  // Find room for reservation
                  const assignedRoom = sortedRoomsList.find(rm => isReservationForRoom(res, rm));
                  const roomLabel = assignedRoom?.roomNumber || assignedRoom?.name || res.room?.name || res.roomId;
                  const roomNum = parseInt(roomLabel?.replace(/\D/g, '') || '1', 10);
                  const roomTheme = ROOM_COLORS[(roomNum - 1) % ROOM_COLORS.length] || ROOM_COLORS[0];

                  return (
                    <tr key={res.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-900">
                        {res.reservationCode}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-stone-900">
                        {res.guest?.fullName || 'Huésped Registrado'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span 
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-2xs font-semibold border"
                          style={{
                            backgroundColor: `${roomTheme.color}15`,
                            color: roomTheme.color,
                            borderColor: `${roomTheme.color}35`
                          }}
                        >
                          <span 
                            className="w-1.5 h-1.5 rounded-full" 
                            style={{ backgroundColor: roomTheme.color }} 
                          />
                          {roomLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-stone-600 font-mono">
                        {res.checkInDate}
                      </td>
                      <td className="py-2.5 px-3 text-stone-600 font-mono">
                        {res.checkOutDate}
                      </td>
                      <td className="py-2.5 px-3 text-stone-800 font-mono font-medium">
                        ${(res.totalAmount || 0).toLocaleString('es-CO')} COP
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-stone-100 text-stone-700">
                          {res.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
