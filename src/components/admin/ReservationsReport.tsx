import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Search, 
  RotateCcw, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Filter, 
  AlertCircle,
  Eye,
  CheckCircle2,
  Users,
  DollarSign,
  BedDouble,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Reservation } from '../../types';
import { formatCOP, formatDateEs, getStatusBadge } from '../../utils/formatters';
import { AdminTableSkeleton } from './AdminTableSkeleton';

interface ReservationsReportProps {
  reservations: Reservation[];
  onInspectReservation?: (res: Reservation) => void;
  isLoading?: boolean;
}

export const ReservationsReport: React.FC<ReservationsReportProps> = ({
  reservations,
  onInspectReservation,
  isLoading = false
}) => {
  // Filter states
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [appliedStartDate, setAppliedStartDate] = useState<string>('');
  const [appliedEndDate, setAppliedEndDate] = useState<string>('');
  const [isFilterActive, setIsFilterActive] = useState<boolean>(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Handle Search trigger
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDateError(null);

    if (startDate && endDate && startDate > endDate) {
      setDateError('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }

    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setIsFilterActive(Boolean(startDate || endDate || statusFilter !== 'ALL'));
  };

  // Handle Clear Filters
  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setAppliedStartDate('');
    setAppliedEndDate('');
    setStatusFilter('ALL');
    setDateError(null);
    setIsFilterActive(false);
  };

  // Filtered dataset based on APPLIED filters
  const filteredReservations = useMemo(() => {
    return reservations.filter((res) => {
      // Status filter
      if (statusFilter !== 'ALL' && res.status !== statusFilter) {
        return false;
      }

      // Date range filter
      if (appliedStartDate || appliedEndDate) {
        const checkIn = res.checkInDate;
        const checkOut = res.checkOutDate;

        if (appliedStartDate && appliedEndDate) {
          // A reservation is included if check-in falls in range OR if reservation overlaps the range
          const isInRange = (checkIn >= appliedStartDate && checkIn <= appliedEndDate) ||
                            (checkIn <= appliedEndDate && checkOut >= appliedStartDate);
          if (!isInRange) return false;
        } else if (appliedStartDate) {
          if (checkIn < appliedStartDate && checkOut < appliedStartDate) return false;
        } else if (appliedEndDate) {
          if (checkIn > appliedEndDate) return false;
        }
      }

      return true;
    });
  }, [reservations, appliedStartDate, appliedEndDate, statusFilter]);

  // Statistics from filtered data
  const totalRevenue = useMemo(() => {
    return filteredReservations.reduce((acc, r) => acc + (r.totalAmount || 0), 0);
  }, [filteredReservations]);

  const totalGuests = useMemo(() => {
    return filteredReservations.reduce((acc, r) => acc + ((r.adults || 1) + (r.children || 0)), 0);
  }, [filteredReservations]);

  const totalNights = useMemo(() => {
    return filteredReservations.reduce((acc, r) => {
      try {
        const d1 = new Date(r.checkInDate).getTime();
        const d2 = new Date(r.checkOutDate).getTime();
        const nights = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
        return acc + nights;
      } catch {
        return acc + 1;
      }
    }, 0);
  }, [filteredReservations]);

  // ================= EXCEL EXPORT (.xlsx) =================
  const handleExportExcel = () => {
    try {
      setIsExporting(true);
      setShowExportMenu(false);

      const rows = filteredReservations.map((res) => {
        const badge = getStatusBadge(res.status);
        const guest = res.guest;
        const totalGuestsCount = (res.adults || 1) + (res.children || 0);

        return {
          'ID Reserva': res.reservationCode || res.id,
          'Cliente': guest?.fullName || 'N/A',
          'Tipo Doc': guest?.documentType || 'CC',
          'No. Documento': guest?.documentNumber || 'N/A',
          'Teléfono': guest?.phone || 'N/A',
          'Email': guest?.email || 'N/A',
          'Habitación / Cabaña': res.room?.name || `Habitación ${res.roomId}`,
          'Fecha Entrada': res.checkInDate,
          'Fecha Salida': res.checkOutDate,
          'Adultos': res.adults || 1,
          'Niños': res.children || 0,
          'Total Huéspedes': totalGuestsCount,
          'Tarifa Noche (COP)': res.nightlyRate || 0,
          'Valor Total (COP)': res.totalAmount || 0,
          'Estado': badge.label,
          'Fecha de Registro': res.createdAt ? res.createdAt.split('T')[0] : 'N/A',
          'Peticiones Especiales': res.specialRequests || 'Ninguna'
        };
      });

      // Create Workbook & Worksheet
      const ws = XLSX.utils.json_to_sheet(rows);

      // Set column widths
      ws['!cols'] = [
        { wch: 16 }, // ID
        { wch: 26 }, // Cliente
        { wch: 10 }, // Tipo Doc
        { wch: 16 }, // No. Documento
        { wch: 16 }, // Telefono
        { wch: 28 }, // Email
        { wch: 22 }, // Habitacion
        { wch: 14 }, // Fecha Entrada
        { wch: 14 }, // Fecha Salida
        { wch: 10 }, // Adultos
        { wch: 10 }, // Ninos
        { wch: 14 }, // Total Huespedes
        { wch: 18 }, // Tarifa Noche
        { wch: 18 }, // Valor Total
        { wch: 22 }, // Estado
        { wch: 16 }, // Fecha Registro
        { wch: 32 }  // Peticiones
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Reservas');

      // Filename with date range
      const dateSuffix = appliedStartDate && appliedEndDate 
        ? `${appliedStartDate}_al_${appliedEndDate}`
        : appliedStartDate 
          ? `desde_${appliedStartDate}`
          : appliedEndDate
            ? `hasta_${appliedEndDate}`
            : new Date().toISOString().split('T')[0];

      const fileName = `Reporte_Reservas_DonJuaco_${dateSuffix}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Error al exportar Excel:', err);
      alert('Ocurrió un error al generar el archivo Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  // ================= PDF EXPORT (.pdf) =================
  const handleExportPDF = () => {
    try {
      setIsExporting(true);
      setShowExportMenu(false);

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Header Brand styling
      doc.setFillColor(27, 67, 50); // #1B4332 Primary Brand Green
      doc.rect(0, 0, 297, 24, 'F');

      // Title & Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('FINCA HOTEL DON JUACO - REPORTE DE RESERVAS', 14, 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(210, 240, 220);
      const subtitleRange = appliedStartDate && appliedEndDate
        ? `Período: ${appliedStartDate} al ${appliedEndDate}`
        : appliedStartDate
          ? `Desde: ${appliedStartDate}`
          : appliedEndDate
            ? `Hasta: ${appliedEndDate}`
            : 'Período: Histórico Completo';

      const generatedAt = `Generado el: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
      doc.text(`${subtitleRange} | ${generatedAt}`, 14, 18);

      // KPI Summary Banner
      doc.setFillColor(250, 248, 245);
      doc.roundedRect(14, 28, 269, 14, 2, 2, 'F');
      doc.setDrawColor(220, 215, 205);
      doc.roundedRect(14, 28, 269, 14, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(80, 70, 60);

      const kpiText = `Total Reservas: ${filteredReservations.length}  |  Total Noches: ${totalNights}  |  Huéspedes: ${totalGuests}  |  Monto Liquidado: ${formatCOP(totalRevenue)}`;
      doc.text(kpiText, 20, 36.5);

      // Prepare Table Data
      const tableData = filteredReservations.map((res) => {
        const badge = getStatusBadge(res.status);
        const guest = res.guest?.fullName || 'N/A';
        const docNum = res.guest?.documentNumber ? `(${res.guest.documentNumber})` : '';
        const roomName = res.room?.name || `Hab. ${res.roomId}`;
        const totalGuestsCount = ((res.adults || 1) + (res.children || 0)).toString();

        return [
          res.reservationCode || res.id.slice(0, 8),
          `${guest} ${docNum}`.trim(),
          roomName,
          res.checkInDate,
          res.checkOutDate,
          totalGuestsCount,
          badge.label,
          formatCOP(res.totalAmount || 0)
        ];
      });

      // AutoTable
      autoTable(doc, {
        startY: 46,
        head: [['ID Reserva', 'Cliente & Cédula', 'Habitación', 'Check-in', 'Check-out', 'Huésp.', 'Estado', 'Valor Total']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [27, 67, 50],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          textColor: [40, 40, 40],
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 26, fontStyle: 'bold' },
          1: { cellWidth: 58 },
          2: { cellWidth: 44 },
          3: { cellWidth: 24 },
          4: { cellWidth: 24 },
          5: { cellWidth: 16, halign: 'center' },
          6: { cellWidth: 38 },
          7: { cellWidth: 39, halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: {
          fillColor: [248, 246, 242]
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Footer
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.setFontSize(7);
          doc.setTextColor(140, 140, 140);
          doc.text(
            `Página ${data.pageNumber} de ${pageCount} - Finca Hotel Don Juaco`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 6,
            { align: 'center' }
          );
        }
      });

      const dateSuffix = appliedStartDate && appliedEndDate 
        ? `${appliedStartDate}_al_${appliedEndDate}`
        : appliedStartDate 
          ? `desde_${appliedStartDate}`
          : appliedEndDate
            ? `hasta_${appliedEndDate}`
            : new Date().toISOString().split('T')[0];

      doc.save(`Reporte_Reservas_DonJuaco_${dateSuffix}.pdf`);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      alert('Ocurrió un error al generar el reporte en PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden space-y-4">
      
      {/* 1. Header with Title & Quick Info */}
      <div className="p-5 sm:p-6 border-b border-stone-200 bg-[#FAF8F5]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-[#1B4332] uppercase tracking-wider mb-1">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Módulo de Consulta y Auditoría</span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
              Reporte de Reservas
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Consulta, filtra por rango de fechas y descarga los informes en formato Excel (.xlsx) o PDF.
            </p>
          </div>

          {/* Action: Export button with Dropdown */}
          <div className="relative shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting || filteredReservations.length === 0}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer select-none ${
                filteredReservations.length === 0
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-[#1B4332] hover:bg-[#143225] text-white'
              }`}
              title="Descargar las reservas mostradas en tabla"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Generando archivo...' : 'Descargar reporte'}</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-80" />
            </button>

            {/* Dropdown Menu */}
            {showExportMenu && (
              <div 
                className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-30 animate-in fade-in zoom-in-95 duration-150"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <div className="px-3 py-1.5 border-b border-stone-100 text-[10px] font-bold uppercase text-stone-400">
                  Selecciona el Formato
                </div>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-stone-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <div>
                    <span className="block">Descargar Excel (.xlsx)</span>
                    <span className="text-[10px] text-stone-400 font-normal">Compatible con Microsoft Excel & Sheets</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-stone-700 hover:bg-rose-50 hover:text-rose-900 flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <FileText className="w-4 h-4 text-rose-700" />
                  <div>
                    <span className="block">Descargar PDF (.pdf)</span>
                    <span className="text-[10px] text-stone-400 font-normal">Documento formal imprimible apaisado</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Filter Bar: Fecha Inicial | Fecha Final | Buscar | Limpiar Filtros */}
        <form onSubmit={handleSearch} className="mt-5 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            
            {/* Fecha Inicial */}
            <div className="lg:col-span-4">
              <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#1B4332]" />
                <span>Fecha inicial</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (dateError) setDateError(null);
                }}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 bg-stone-50/50 text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] transition-all"
                placeholder="dd/mm/aaaa"
              />
            </div>

            {/* Fecha Final */}
            <div className="lg:col-span-4">
              <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#1B4332]" />
                <span>Fecha final</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (dateError) setDateError(null);
                }}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 bg-stone-50/50 text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] transition-all"
                placeholder="dd/mm/aaaa"
              />
            </div>

            {/* Action Buttons: Buscar & Limpiar */}
            <div className="lg:col-span-4 flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#143225] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar</span>
              </button>

              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-all cursor-pointer"
                title="Restablecer filtros y mostrar todas las reservas"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">Limpiar filtros</span>
                <span className="sm:hidden">Limpiar</span>
              </button>
            </div>

          </div>

          {/* Validation error message */}
          {dateError && (
            <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{dateError}</span>
            </div>
          )}

          {/* Active Filter Indicator */}
          {isFilterActive && (
            <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-stone-600">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-[11px]">
                  <Filter className="w-3 h-3" />
                  <span>
                    Filtro aplicado: {appliedStartDate ? `Desde ${appliedStartDate}` : ''} {appliedEndDate ? `Hasta ${appliedEndDate}` : ''}
                  </span>
                </span>
                <span className="text-stone-500">
                  ({filteredReservations.length} {filteredReservations.length === 1 ? 'reserva encontrada' : 'reservas encontradas'})
                </span>
              </div>

              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-[#1B4332] hover:underline font-semibold cursor-pointer"
              >
                Mostrar todas las reservas
              </button>
            </div>
          )}
        </form>

        {/* 3. Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Reservas</span>
              <FileText className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <span className="text-lg font-bold text-stone-900 font-mono">
              {filteredReservations.length}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-stone-200">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Noches Totales</span>
              <BedDouble className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <span className="text-lg font-bold text-stone-900 font-mono">
              {totalNights}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-stone-200">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Huéspedes Totales</span>
              <Users className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <span className="text-lg font-bold text-stone-900 font-mono">
              {totalGuests}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-stone-200">
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1B4332]">Valor Total</span>
              <DollarSign className="w-3.5 h-3.5 text-[#1B4332]" />
            </div>
            <span className="text-base sm:text-lg font-bold text-[#1B4332] font-mono">
              {formatCOP(totalRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Results Table */}
      <div className="p-4 sm:p-5 pt-0">
        <div className="overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-stone-600 uppercase tracking-wider text-[11px] border-b border-stone-200 select-none">
              <tr>
                <th className="py-3.5 px-4 font-bold">ID Reserva</th>
                <th className="py-3.5 px-4 font-bold">Nombre del Cliente</th>
                <th className="py-3.5 px-4 font-bold">Habitación</th>
                <th className="py-3.5 px-4 font-bold">Fecha de Entrada</th>
                <th className="py-3.5 px-4 font-bold">Fecha de Salida</th>
                <th className="py-3.5 px-4 font-bold text-center">Huéspedes</th>
                <th className="py-3.5 px-4 font-bold">Estado</th>
                <th className="py-3.5 px-4 font-bold text-right">Valor Total</th>
                {onInspectReservation && (
                  <th className="py-3.5 px-4 font-bold text-center">Acción</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {isLoading ? (
                <AdminTableSkeleton rows={6} type="general" />
              ) : filteredReservations.length === 0 ? (
                <tr>
                  <td 
                    colSpan={onInspectReservation ? 9 : 8} 
                    className="py-12 text-center text-stone-400"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-stone-700 text-sm">
                        No se encontraron reservas para las fechas seleccionadas.
                      </p>
                      <p className="text-xs text-stone-400">
                        Intenta ajustar el rango de fechas o presiona el botón "Limpiar filtros" para visualizar el registro completo.
                      </p>
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="mt-2 px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Restablecer Búsqueda
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => {
                  const badge = getStatusBadge(res.status);
                  const guest = res.guest;
                  const guestsCount = (res.adults || 1) + (res.children || 0);

                  return (
                    <tr key={res.id} className="hover:bg-stone-50/80 transition-colors">
                      
                      {/* ID Reserva */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1B4332] whitespace-nowrap">
                        {res.reservationCode || res.id.slice(0, 8)}
                      </td>

                      {/* Nombre del Cliente */}
                      <td className="py-3.5 px-4">
                        <strong className="text-stone-900 block font-medium">
                          {guest?.fullName || 'Huésped no registrado'}
                        </strong>
                        <span className="text-stone-400 text-2xs block">
                          {guest?.documentType || 'CC'}: {guest?.documentNumber || 'S/N'}
                        </span>
                      </td>

                      {/* Habitación */}
                      <td className="py-3.5 px-4">
                        <span className="font-serif text-stone-900 font-semibold block">
                          {res.room?.name || `Habitación #${res.roomId}`}
                        </span>
                        <span className="text-stone-400 text-2xs block">
                          Capacidad: {res.room?.capacity || 2} pers.
                        </span>
                      </td>

                      {/* Fecha Entrada */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-stone-900 font-medium block">
                          {formatDateEs(res.checkInDate)}
                        </span>
                        <span className="text-stone-400 font-mono text-2xs block">
                          {res.checkInDate}
                        </span>
                      </td>

                      {/* Fecha Salida */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-stone-900 font-medium block">
                          {formatDateEs(res.checkOutDate)}
                        </span>
                        <span className="text-stone-400 font-mono text-2xs block">
                          {res.checkOutDate}
                        </span>
                      </td>

                      {/* Huéspedes */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 font-semibold font-mono text-xs">
                          {guestsCount}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Valor Total */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <strong className="text-stone-900 font-mono text-xs block font-bold">
                          {formatCOP(res.totalAmount || 0)}
                        </strong>
                        <span className="text-stone-400 text-2xs block">
                          Noche: {formatCOP(res.nightlyRate || 0)}
                        </span>
                      </td>

                      {/* Acción Inspect */}
                      {onInspectReservation && (
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onInspectReservation(res)}
                            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 cursor-pointer transition-colors"
                            title="Ver detalles de la reserva"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer with Summary notes */}
        <div className="mt-3 flex flex-col sm:flex-row items-center justify-between text-2xs text-stone-500 px-2 gap-2">
          <span>
            Mostrando <strong>{filteredReservations.length}</strong> de <strong>{reservations.length}</strong> reservas registradas.
          </span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-emerald-800">
              <CheckCircle2 className="w-3 h-3" />
              <span>Reporte listo para exportar</span>
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
