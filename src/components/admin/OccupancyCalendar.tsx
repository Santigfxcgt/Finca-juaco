import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Search, RotateCcw } from 'lucide-react';
import { Room, Reservation } from '../../types';

interface OccupancyCalendarProps {
  rooms: Room[];
  reservations: Reservation[];
  onSelectReservation: (res: Reservation) => void;
  onCreateWalkIn: (roomId: string, date: string) => void;
}

const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

export const OccupancyCalendar: React.FC<OccupancyCalendarProps> = ({
  rooms,
  reservations,
  onSelectReservation,
  onCreateWalkIn
}) => {
  const DAYS_COUNT = 14;

  // Helper to get a clean local midnight Date
  const getTodayMidnight = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  // Format Date to YYYY-MM-DD in local time
  const toLocalISO = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Current base date of the 14-day calendar window
  const [baseDate, setBaseDate] = useState<Date>(() => getTodayMidnight());

  // Filter controls state (Day, Month 0-11, Year)
  const [selectedDay, setSelectedDay] = useState<number>(() => getTodayMidnight().getDate());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => getTodayMidnight().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(() => getTodayMidnight().getFullYear());

  // Calculate how many days exist in the selected Month/Year
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInSelectedMonth = getDaysInMonth(selectedYear, selectedMonth);

  // Sync filter dropdowns and baseDate together when user changes Day, Month, or Year
  const applyDateFilter = (day: number, month: number, year: number) => {
    const maxDay = getDaysInMonth(year, month);
    const validDay = Math.min(day, maxDay);
    setSelectedDay(validDay);
    setSelectedMonth(month);
    setSelectedYear(year);
    setBaseDate(new Date(year, month, validDay));
  };

  // Navigate by week or month and sync filter selectors
  const shiftCalendarDays = (deltaDays: number) => {
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + deltaDays);
    setBaseDate(nextDate);
    setSelectedDay(nextDate.getDate());
    setSelectedMonth(nextDate.getMonth());
    setSelectedYear(nextDate.getFullYear());
  };

  const shiftCalendarMonth = (deltaMonths: number) => {
    const targetMonthDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + deltaMonths, 1);
    const maxDay = getDaysInMonth(targetMonthDate.getFullYear(), targetMonthDate.getMonth());
    const targetDay = Math.min(baseDate.getDate(), maxDay);
    const nextDate = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), targetDay);
    setBaseDate(nextDate);
    setSelectedDay(nextDate.getDate());
    setSelectedMonth(nextDate.getMonth());
    setSelectedYear(nextDate.getFullYear());
  };

  const handleResetToToday = () => {
    const today = getTodayMidnight();
    setBaseDate(today);
    setSelectedDay(today.getDate());
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  const todayStr = toLocalISO(getTodayMidnight());
  const selectedFilterDateStr = toLocalISO(new Date(selectedYear, selectedMonth, Math.min(selectedDay, daysInSelectedMonth)));

  const dates: {
    dateStr: string;
    dayName: string;
    dayNum: number;
    monthShort: string;
    isToday: boolean;
    isSelectedFilterDate: boolean;
    isWeekend: boolean;
  }[] = [];

  for (let i = 0; i < DAYS_COUNT; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const dateStr = toLocalISO(d);
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    dates.push({
      dateStr,
      dayName: dayNames[d.getDay()],
      dayNum: d.getDate(),
      monthShort: MONTHS_ES[d.getMonth()].slice(0, 3),
      isToday: dateStr === todayStr,
      isSelectedFilterDate: dateStr === selectedFilterDateStr,
      isWeekend
    });
  }

  // Current displayed Month and Year label (e.g. "Octubre 2026")
  const currentMonthYearLabel = `${MONTHS_ES[baseDate.getMonth()]} ${baseDate.getFullYear()}`;

  // Generate available years (from 2020 to 2032 to support past and future consultations)
  const yearOptions: number[] = [];
  for (let y = 2020; y <= 2032; y++) {
    yearOptions.push(y);
  }

  // Get reservation occupying a room on a given date
  const getReservationForRoomAndDate = (roomId: string, dateStr: string): Reservation | undefined => {
    return reservations.find(res => {
      if (res.roomId !== roomId) return false;
      if (res.status === 'CANCELLED') return false;
      // Al momento del huésped hacer check-out, la habitación pasa automáticamente a estar disponible
      if (res.status === 'CHECKED_OUT') return false;
      return dateStr >= res.checkInDate && dateStr < res.checkOutDate;
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      
      {/* Calendar Header Controls */}
      <div className="p-4 sm:p-5 border-b border-stone-200 space-y-4 bg-[#FAF8F5]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
              <CalIcon className="w-5 h-5 text-amber-700" />
              <span>Calendario Visual de Ocupación</span>
            </h3>
            <p className="text-xs text-stone-500">
              Visualización de cabañas, bloqueos de reserva y mantenimientos preventivos.
            </p>
          </div>

          {/* Legend con la paleta exacta de la imagen */}
          <div className="flex flex-wrap items-center gap-2.5 text-2xs">
            <span className="flex items-center gap-1.5 text-stone-800 font-semibold bg-[#CDE7C9] px-2.5 py-1 rounded-md border border-[#B4D7B0]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#8EB686]" /> Disponible
            </span>
            <span className="flex items-center gap-1.5 text-stone-900 font-bold bg-[#F4CD54] px-2.5 py-1 rounded-md border border-[#E2BC40]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#DDAA22]" /> Pendiente
            </span>
            <span className="flex items-center gap-1.5 text-white font-bold bg-[#2B6CB0] px-2.5 py-1 rounded-md border border-[#245C96]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#1E5794]" /> Confirmada
            </span>
            <span className="flex items-center gap-1.5 text-white font-bold bg-[#BA3838] px-2.5 py-1 rounded-md border border-[#9E2E2E]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#9E2E2E]" /> Ocupada
            </span>
            <span className="flex items-center gap-1.5 text-stone-900 font-semibold bg-[#A0AEC0] px-2.5 py-1 rounded-md border border-[#8A96A6]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#718096]" /> Mantenimiento
            </span>
          </div>
        </div>

        {/* Date Filter (Día, Mes, Año) & Month Navigation Bar */}
        <div className="pt-3 border-t border-stone-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Date Search Filter: Día / Mes / Año */}
          <div className="flex flex-wrap items-center gap-2 bg-white px-3 py-2 rounded-xl border border-stone-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1B4332] pr-1">
              <Search className="w-3.5 h-3.5 text-amber-700" />
              <span>Filtrar por fecha:</span>
            </div>

            {/* Day Selector */}
            <div className="flex items-center gap-1">
              <label htmlFor="cal-filter-day" className="text-[11px] font-semibold text-stone-500">
                Día
              </label>
              <select
                id="cal-filter-day"
                value={Math.min(selectedDay, daysInSelectedMonth)}
                onChange={(e) => applyDateFilter(Number(e.target.value), selectedMonth, selectedYear)}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 hover:bg-white text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1B4332] transition-colors cursor-pointer"
              >
                {Array.from({ length: daysInSelectedMonth }, (_, idx) => idx + 1).map((day) => (
                  <option key={day} value={day}>
                    {String(day).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-1">
              <label htmlFor="cal-filter-month" className="text-[11px] font-semibold text-stone-500">
                Mes
              </label>
              <select
                id="cal-filter-month"
                value={selectedMonth}
                onChange={(e) => applyDateFilter(selectedDay, Number(e.target.value), selectedYear)}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 hover:bg-white text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1B4332] transition-colors cursor-pointer"
              >
                {MONTHS_ES.map((mName, idx) => (
                  <option key={mName} value={idx}>
                    {mName}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-1">
              <label htmlFor="cal-filter-year" className="text-[11px] font-semibold text-stone-500">
                Año
              </label>
              <select
                id="cal-filter-year"
                value={selectedYear}
                onChange={(e) => applyDateFilter(selectedDay, selectedMonth, Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 hover:bg-white text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1B4332] transition-colors cursor-pointer"
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Reset to Current Date */}
            {selectedFilterDateStr !== todayStr && (
              <button
                type="button"
                onClick={handleResetToToday}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer ml-auto sm:ml-1"
                title="Volver a la fecha actual"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Fecha actual</span>
              </button>
            )}
          </div>

          {/* Navigation Buttons with Dynamic Current Month & Year Box */}
          <div className="flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => shiftCalendarMonth(-1)}
              className="p-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer shadow-2xs"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              className="px-4 py-1.5 min-w-[145px] text-center rounded-xl border border-[#1B4332]/25 bg-[#1B4332]/10 text-xs font-bold text-[#1B4332] shadow-2xs select-none"
              title="Mes y año en visualización"
            >
              {currentMonthYearLabel}
            </div>

            <button
              type="button"
              onClick={() => shiftCalendarMonth(1)}
              className="p-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer shadow-2xs"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Week Fine Navigation */}
            <div className="hidden sm:flex items-center space-x-1 pl-1 border-l border-stone-300">
              <button
                type="button"
                onClick={() => shiftCalendarDays(-7)}
                className="px-2 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-[11px] font-semibold text-stone-600 transition-colors cursor-pointer"
                title="Retroceder 7 días"
              >
                -7d
              </button>
              <button
                type="button"
                onClick={() => shiftCalendarDays(7)}
                className="px-2 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-[11px] font-semibold text-stone-600 transition-colors cursor-pointer"
                title="Avanzar 7 días"
              >
                +7d
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          
          {/* Day Headers Row */}
          <div className="grid grid-cols-[180px_repeat(14,1fr)] border-b border-stone-200 bg-stone-50 text-xs text-stone-700 font-semibold">
            <div className="p-3 text-left border-r border-stone-200 bg-stone-100/80 flex flex-col justify-center">
              <span>Cabaña / Habitación</span>
              <span className="text-[10px] font-normal text-stone-500">
                Desde { String(baseDate.getDate()).padStart(2, '0') } { MONTHS_ES[baseDate.getMonth()].slice(0, 3) } { baseDate.getFullYear() }
              </span>
            </div>
            {dates.map((d, i) => (
              <div
                key={i}
                className={`p-2 text-center border-r border-stone-200/80 transition-colors ${
                  d.isSelectedFilterDate
                    ? 'bg-[#1B4332] text-white font-bold'
                    : d.isToday
                    ? 'bg-amber-100/70 text-amber-900 font-bold'
                    : d.isWeekend
                    ? 'bg-stone-100/60'
                    : ''
                }`}
              >
                <span
                  className={`block text-2xs uppercase ${
                    d.isSelectedFilterDate ? 'text-emerald-200' : 'text-stone-500'
                  }`}
                >
                  {d.dayName}
                </span>
                <span className="text-xs block leading-tight">{d.dayNum}</span>
                <span
                  className={`block text-[9px] uppercase ${
                    d.isSelectedFilterDate ? 'text-emerald-100 font-medium' : 'text-stone-400'
                  }`}
                >
                  {d.monthShort}
                </span>
              </div>
            ))}
          </div>

          {/* Room Rows */}
          {rooms.map((room) => (
            <div
              key={room.id}
              className="grid grid-cols-[180px_repeat(14,1fr)] border-b border-stone-200/70 hover:bg-stone-50/50 transition-colors text-xs"
            >
              {/* Room Identifier */}
              <div className="p-3 border-r border-stone-200 bg-white flex flex-col justify-center">
                <span className="font-mono text-2xs text-amber-800 font-bold uppercase">{room.roomNumber}</span>
                <span className="font-serif font-bold text-stone-900 text-xs truncate" title={room.name}>
                  {room.name}
                </span>
                <span className="text-[10px] text-stone-600 truncate" title={room.bedType}>
                  {room.bedType}
                </span>
                <span className="text-2xs text-stone-500 font-semibold">Cap. {room.capacity} pers.</span>
              </div>

              {/* Day cells */}
              {dates.map((d, dateIdx) => {
                const res = getReservationForRoomAndDate(room.id, d.dateStr);

                // Fuera de servicio / Mantenimiento: Gris (#A0AEC0)
                if (room.outOfService) {
                  return (
                    <div
                      key={dateIdx}
                      className="border-r border-stone-200/60 p-1 flex items-center justify-center select-none"
                      title={room.outOfServiceReason || 'Fuera de Servicio / Mantenimiento'}
                    >
                      <div className="w-full h-full min-h-[38px] rounded-lg bg-[#A0AEC0] border border-[#8A96A6] text-stone-900 font-bold text-2xs flex items-center justify-center shadow-xs">
                        <span className="truncate px-1">Mantenimiento</span>
                      </div>
                    </div>
                  );
                }

                // Con Reserva: Pendiente = Amarillo, Confirmada = Azul, Hospedado = Rojo
                if (res) {
                  const isCheckInDay = res.checkInDate === d.dateStr;
                  const isPending = res.status === 'PENDING_PAYMENT';
                  const isConfirmed = res.status === 'CONFIRMED';
                  const isOccupied = res.status === 'CHECKED_IN';

                  const cellStyle = isPending
                    ? 'bg-[#F4CD54] border-[#E2BC40] text-stone-900'
                    : isConfirmed
                    ? 'bg-[#2B6CB0] border-[#245C96] text-white'
                    : isOccupied
                    ? 'bg-[#BA3838] border-[#9E2E2E] text-white'
                    : 'bg-[#A0AEC0] border-[#8A96A6] text-stone-900';

                  const statusTitle = isPending
                    ? 'Pendiente'
                    : isConfirmed
                    ? 'Confirmada'
                    : isOccupied
                    ? 'Ocupada'
                    : res.status;

                  return (
                    <div
                      key={dateIdx}
                      onClick={() => onSelectReservation(res)}
                      className="border-r border-stone-200/60 p-1 relative cursor-pointer group"
                      title={`Reserva ${res.reservationCode}: ${res.guest?.fullName || 'Huésped'} (${statusTitle})`}
                    >
                      <div
                        className={`w-full h-full min-h-[38px] rounded-lg p-1 border text-2xs font-bold transition-all shadow-xs flex flex-col justify-center items-center overflow-hidden hover:brightness-105 active:scale-98 ${cellStyle}`}
                      >
                        <span className="leading-tight text-center truncate w-full px-0.5">
                          {statusTitle}
                        </span>
                        <span className="text-[10px] font-medium opacity-90 truncate w-full text-center">
                          {isCheckInDay ? `In: ${res.guest?.fullName?.split(' ')[0]}` : res.reservationCode.slice(-4)}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Disponible: Verde claro (#CDE7C9)
                return (
                  <div
                    key={dateIdx}
                    onClick={() => onCreateWalkIn(room.id, d.dateStr)}
                    className="border-r border-stone-200/60 p-1 cursor-pointer flex items-center justify-center transition-colors group"
                    title={`Disponible - Click para crear reserva en ${room.name} el ${d.dateStr}`}
                  >
                    <div className="w-full h-full min-h-[38px] rounded-lg bg-[#CDE7C9] group-hover:bg-[#BFDEBB] border border-[#B4D7B0] flex items-center justify-center transition-all shadow-2xs">
                      <span className="text-2xs font-semibold text-emerald-800/50 group-hover:text-emerald-900 group-hover:scale-110 transition-all">
                        +
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

        </div>
      </div>

    </div>
  );
};
