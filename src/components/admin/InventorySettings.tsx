import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Home, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  Plus, 
  Trash2,
  Sparkles,
  Camera,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Link as LinkIcon,
  ShieldCheck,
  Check,
  Database,
  Server,
  RefreshCw
} from 'lucide-react';
import { Room, SeasonRate, EstateSettings } from '../../types';
import { formatCOP } from '../../utils/formatters';
import { processImageFile, uploadRoomPhoto, resetRoomPhoto, uploadRoomImageMultipart } from '../../utils/imageProcessor';
import { formatDirectDriveUrl } from '../../utils/driveImages';
import { ExperiencesAdminManager } from './ExperiencesAdminManager';

interface InventorySettingsProps {
  rooms: Room[];
  seasons: SeasonRate[];
  settings: EstateSettings | null;
  onUpdateRoom: (roomId: string, updates: Partial<Room>) => Promise<void>;
  onUpdateSettings: (updates: Partial<EstateSettings>) => Promise<void>;
  onCreateSeason: (season: Partial<SeasonRate>) => Promise<{ success: boolean; error?: string }>;
  onUpdateSeason?: (seasonId: string, updates: Partial<SeasonRate>) => Promise<{ success: boolean; error?: string }>;
  onDeleteSeason?: (seasonId: string) => Promise<{ success: boolean; error?: string }>;
  initialTab?: 'rooms' | 'photos' | 'experiences' | 'seasons' | 'estate';
}

export const InventorySettings: React.FC<InventorySettingsProps> = ({
  rooms,
  seasons,
  settings,
  onUpdateRoom,
  onUpdateSettings,
  onCreateSeason,
  onUpdateSeason,
  onDeleteSeason,
  initialTab
}) => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'photos' | 'experiences' | 'seasons' | 'estate'>(initialTab || 'photos');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // Photo management state
  const [uploadingRoomId, setUploadingRoomId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null);
  const [urlInputRoomId, setUrlInputRoomId] = useState<string | null>(null);
  const [customUrlValue, setCustomUrlValue] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Minimalist Room Photo Upload state
  const [multipartRoomId, setMultipartRoomId] = useState<string>(rooms[0]?.id || '');
  const [multipartUploading, setMultipartUploading] = useState(false);
  const [multipartResponse, setMultipartResponse] = useState<{
    status?: 'success' | 'error';
    message?: string;
    error?: string;
  } | null>(null);

  const handleUploadImageFile = async (file: File) => {
    if (!file) return;
    if (!multipartRoomId) {
      alert('Por favor selecciona la habitación a editar.');
      return;
    }
    setMultipartUploading(true);
    setMultipartResponse(null);
    try {
      const res = await uploadRoomImageMultipart(file, multipartRoomId);
      if (res.success && res.image_path) {
        await onUpdateRoom(multipartRoomId, { images: [res.image_path] });
        setLocalPreviews(prev => ({ ...prev, [multipartRoomId]: res.image_path! }));
        setMultipartResponse({
          status: 'success',
          message: 'Foto actualizada correctamente.'
        });
        triggerSuccessToast('¡Foto de la habitación actualizada correctamente!');
      } else {
        setMultipartResponse({
          status: 'error',
          error: res.error || 'No se pudo subir la fotografía.'
        });
      }
    } catch (err: any) {
      setMultipartResponse({
        status: 'error',
        error: err.message || 'Error inesperado al subir imagen.'
      });
    } finally {
      setMultipartUploading(false);
    }
  };

  // SMTP Test Email state
  const [testEmailRecipient, setTestEmailRecipient] = useState('restreporojassantiago940@gmail.com');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      alert('Por favor ingresa un correo electrónico válido');
      return;
    }
    setIsSendingTestEmail(true);
    setTestEmailStatus(null);
    try {
      const res = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: testEmailRecipient,
          smtpUser: estateForm.smtpUser,
          smtpPass: estateForm.smtpPass,
          smtpHost: estateForm.smtpHost,
          smtpPort: estateForm.smtpPort
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestEmailStatus({
          success: true,
          message: data.message || 'Correo de prueba enviado correctamente.'
        });
      } else {
        setTestEmailStatus({
          success: false,
          message: data.error || data.message || 'No se pudo enviar el correo de prueba.'
        });
      }
    } catch (err: any) {
      setTestEmailStatus({
        success: false,
        message: `Error de conexión: ${err.message}`
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Supabase / PostgreSQL Database Connection State
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [isMigratingDb, setIsMigratingDb] = useState(false);
  const [dbActionResult, setDbActionResult] = useState<string | null>(null);

  const checkDbConnection = async () => {
    setIsCheckingDb(true);
    setDbActionResult(null);
    try {
      const res = await fetch('/api/database/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err: any) {
      console.warn('Error verificando estado de base de datos:', err);
    } finally {
      setIsCheckingDb(false);
    }
  };

  const [storageStatus, setStorageStatus] = useState<any>(null);

  const checkStorageConnection = async () => {
    try {
      const res = await fetch('/api/storage/status');
      if (res.ok) {
        const data = await res.json();
        setStorageStatus(data);
      }
    } catch (err: any) {
      console.warn('Error verificando Supabase Storage:', err);
    }
  };

  useEffect(() => {
    checkDbConnection();
    checkStorageConnection();
  }, []);

  const handleMigrateDb = async () => {
    const adminToken = sessionStorage.getItem('colmena_admin_token') || 'token-admin-donjuaco-session-2026';
    setIsMigratingDb(true);
    setDbActionResult(null);
    try {
      const res = await fetch('/api/database/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDbActionResult('✅ ' + (data.message || 'Migración exitosa a Supabase'));
        checkDbConnection();
      } else {
        setDbActionResult('⚠️ ' + (data.error || data.message || 'Error en migración'));
      }
    } catch (err: any) {
      setDbActionResult('❌ Error: ' + err.message);
    } finally {
      setIsMigratingDb(false);
    }
  };

  // Room parameters editing
  const [roomEditForm, setRoomEditForm] = useState<{ 
    basePrice: number; 
    capacity: number; 
    bedType: string;
    description: string;
    outOfService: boolean; 
    outOfServiceReason: string 
  }>({
    basePrice: 0,
    capacity: 2,
    bedType: '',
    description: '',
    outOfService: false,
    outOfServiceReason: ''
  });

  // Season form & editing state
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [seasonErrorMsg, setSeasonErrorMsg] = useState<string | null>(null);
  const [newSeason, setNewSeason] = useState({
    name: '',
    startDate: '',
    endDate: '',
    multiplier: 1.2,
    minimumStayNights: 2
  });

  // Base reference price from rooms (default $85.000 COP)
  const referenceBasePrice = rooms.length > 0 ? rooms[0].basePrice : 85000;

  // Automatic calculation of season nights from startDate and endDate (never manual)
  const calculateSeasonNights = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 0;
    const start = new Date(`${startStr}T00:00:00`);
    const end = new Date(`${endStr}T00:00:00`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const formatDisplayDate = (isoDate: string): string => {
    if (!isoDate) return '—';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const calculatedFormNights = calculateSeasonNights(newSeason.startDate, newSeason.endDate);

  // Real-time validation of the season form (date range, minimum nights, multiplier, and date conflicts)
  const seasonValidationError = (() => {
    if (!newSeason.name.trim()) return null; // Don't show error before typing
    if (!newSeason.startDate || !newSeason.endDate) return null;

    const start = new Date(`${newSeason.startDate}T00:00:00`);
    const end = new Date(`${newSeason.endDate}T00:00:00`);
    if (end <= start) {
      return 'La fecha de fin debe ser posterior a la fecha de inicio (mínimo 1 noche).';
    }

    const nights = calculateSeasonNights(newSeason.startDate, newSeason.endDate);
    if (!Number.isInteger(Number(newSeason.minimumStayNights)) || Number(newSeason.minimumStayNights) <= 0) {
      return 'Las noches mínimas deben ser un número entero válido mayor a 0.';
    }
    if (Number(newSeason.minimumStayNights) > nights) {
      return `Las noches mínimas (${newSeason.minimumStayNights}) no pueden superar la cantidad total de noches de la temporada (${nights} noches).`;
    }
    if (isNaN(Number(newSeason.multiplier)) || Number(newSeason.multiplier) <= 0) {
      return 'El multiplicador tarifario debe ser un valor numérico válido mayor a 0.';
    }

    // Check overlapping with existing active seasons
    const conflicting = seasons.find(s => {
      if (editingSeasonId && s.id === editingSeasonId) return false;
      if (!s.isActive) return false;
      const exStart = new Date(`${s.startDate}T00:00:00`);
      const exEnd = new Date(`${s.endDate}T00:00:00`);
      return start < exEnd && end > exStart;
    });

    if (conflicting) {
      return `Conflicto de fechas: Este período se cruza con "${conflicting.name}" (${formatDisplayDate(conflicting.startDate)} al ${formatDisplayDate(conflicting.endDate)}).`;
    }

    return null;
  })();

  // Estate settings form
  const [estateForm, setEstateForm] = useState<Partial<EstateSettings>>(settings || {});

  useEffect(() => {
    if (settings) {
      setEstateForm(prev => ({
        ...settings,
        ...prev,
        // preserve typed fields if user is modifying
        smtpUser: prev.smtpUser !== undefined ? prev.smtpUser : settings.smtpUser,
        smtpPass: prev.smtpPass !== undefined ? prev.smtpPass : settings.smtpPass,
        smtpHost: prev.smtpHost !== undefined ? prev.smtpHost : settings.smtpHost,
        smtpPort: prev.smtpPort !== undefined ? prev.smtpPort : settings.smtpPort
      }));
    }
  }, [settings]);

  const triggerSuccessToast = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  /**
   * Process & upload an image in ANY format
   */
  const handleSelectAndUploadPhoto = async (roomId: string, file: File) => {
    if (!file) return;

    setUploadingRoomId(roomId);
    setUploadStatus(prev => ({ ...prev, [roomId]: 'Optimizando formato de imagen...' }));

    // Instant local preview using base64 once processed, or immediate FileReader
    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLocalPreviews(prev => ({ ...prev, [roomId]: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    } catch {
      // ignore
    }

    // If file is directly supported by the strict multipart/form-data endpoint (jpg, jpeg, png, webp)
    const lowerName = (file.name || '').toLowerCase();
    const isStandardMultipartFormat = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png') || lowerName.endsWith('.webp');

    if (isStandardMultipartFormat) {
      setUploadStatus(prev => ({ ...prev, [roomId]: 'Subiendo con multipart/form-data a /upload/habitaciones...' }));
      const multiRes = await uploadRoomImageMultipart(file, roomId);
      if (multiRes.success && multiRes.image_path) {
        await onUpdateRoom(roomId, { images: [multiRes.image_path] });
        setLocalPreviews(prev => ({ ...prev, [roomId]: multiRes.image_path! }));
        setUploadStatus(prev => ({ ...prev, [roomId]: '¡Foto guardada con éxito!' }));
        triggerSuccessToast(`¡Fotografía subida exitosamente con multipart/form-data a ${multiRes.image_path}!`);
        setUploadingRoomId(null);
        setTimeout(() => {
          setUploadStatus(prev => {
            const next = { ...prev };
            delete next[roomId];
            return next;
          });
        }, 3500);
        return;
      }
    }

    try {
      // Optimize image client-side to convert any other format (HEIC/GIF/BMP/AVIF/SVG) to fast-loading HD JPEG
      const processed = await processImageFile(file, 1920, 0.90);
      
      setLocalPreviews(prev => ({ ...prev, [roomId]: processed.base64Data }));

      setUploadStatus(prev => ({ ...prev, [roomId]: 'Guardando en el servidor...' }));

      const res = await uploadRoomPhoto(roomId, processed.base64Data, processed.fileName);

      if (res.success && res.photoUrl) {
        // Update room with new photo URL
        await onUpdateRoom(roomId, { images: [res.photoUrl] });
        setLocalPreviews(prev => ({ ...prev, [roomId]: res.photoUrl! }));
        setUploadStatus(prev => ({ ...prev, [roomId]: '¡Foto guardada con éxito!' }));
        triggerSuccessToast(`¡Fotografía actualizada con éxito para la cabaña! (${processed.fileSizeKB} KB optimizados)`);
      } else {
        alert(res.error || 'No se pudo guardar la fotografía.');
        setUploadStatus(prev => ({ ...prev, [roomId]: 'Error al guardar' }));
      }
    } catch (err: any) {
      alert(`Error al procesar la imagen: ${err.message || 'Formato no soportado'}`);
      setUploadStatus(prev => ({ ...prev, [roomId]: 'Error en procesamiento' }));
    } finally {
      setUploadingRoomId(null);
      setTimeout(() => {
        setUploadStatus(prev => {
          const next = { ...prev };
          delete next[roomId];
          return next;
        });
      }, 3500);
    }
  };

  /**
   * Set custom image URL
   */
  const handleApplyCustomUrl = async (roomId: string) => {
    if (!customUrlValue.trim()) return;
    const rawUrl = customUrlValue.trim();
    const url = formatDirectDriveUrl(rawUrl);
    setUploadingRoomId(roomId);
    try {
      await onUpdateRoom(roomId, { images: [url] });
      setLocalPreviews(prev => ({ ...prev, [roomId]: url }));
      setUrlInputRoomId(null);
      setCustomUrlValue('');
      triggerSuccessToast(
        rawUrl.includes('drive.google.com') 
          ? '¡Enlace de Google Drive convertido a vista directa y asignado correctamente!' 
          : 'Enlace de imagen asignado correctamente.'
      );
    } catch (err: any) {
      alert('Error al asignar el enlace de imagen: ' + err.message);
    } finally {
      setUploadingRoomId(null);
    }
  };

  /**
   * Reset photo to default
   */
  const handleResetToDefault = async (roomId: string) => {
    if (!confirm('¿Deseas restaurar la foto original por defecto de esta habitación?')) return;

    setUploadingRoomId(roomId);
    try {
      const res = await resetRoomPhoto(roomId);
      if (res.success) {
        setLocalPreviews(prev => {
          const next = { ...prev };
          delete next[roomId];
          return next;
        });
        await onUpdateRoom(roomId, {});
        triggerSuccessToast('Fotografía restaurada al estado original de fábrica.');
      } else {
        alert(res.error || 'Error restaurando imagen.');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setUploadingRoomId(null);
    }
  };

  const startEditRoom = (r: Room) => {
    setEditingRoomId(r.id);
    setRoomEditForm({
      basePrice: r.basePrice,
      capacity: r.capacity,
      bedType: r.bedType || '',
      description: r.description || '',
      outOfService: r.outOfService,
      outOfServiceReason: r.outOfServiceReason || ''
    });
  };

  const handleSaveRoom = async (roomId: string) => {
    setIsSaving(true);
    try {
      await onUpdateRoom(roomId, roomEditForm);
      setEditingRoomId(null);
      triggerSuccessToast('Cabaña actualizada exitosamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEstate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateSettings(estateForm);
      triggerSuccessToast('Configuración de finca guardada exitosamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditSeason = (season: SeasonRate) => {
    setEditingSeasonId(season.id);
    setSeasonErrorMsg(null);
    setNewSeason({
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
      multiplier: Number(season.multiplier.toFixed(2)),
      minimumStayNights: season.minimumStayNights
    });
  };

  const cancelEditSeason = () => {
    setEditingSeasonId(null);
    setSeasonErrorMsg(null);
    setNewSeason({
      name: '',
      startDate: '',
      endDate: '',
      multiplier: 1.2,
      minimumStayNights: 2
    });
  };

  const handleAddSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    setSeasonErrorMsg(null);

    if (!newSeason.name.trim()) {
      setSeasonErrorMsg('Por favor ingresa el nombre de la temporada.');
      return;
    }
    if (!newSeason.startDate || !newSeason.endDate) {
      setSeasonErrorMsg('Por favor selecciona la fecha de inicio y la fecha de fin.');
      return;
    }

    const start = new Date(`${newSeason.startDate}T00:00:00`);
    const end = new Date(`${newSeason.endDate}T00:00:00`);
    if (end <= start) {
      setSeasonErrorMsg('La fecha de fin no puede ser anterior ni igual a la fecha de inicio.');
      return;
    }

    const nights = calculateSeasonNights(newSeason.startDate, newSeason.endDate);
    const minNights = Number(newSeason.minimumStayNights);
    const mult = Number(newSeason.multiplier);

    if (isNaN(minNights) || !Number.isInteger(minNights) || minNights <= 0) {
      setSeasonErrorMsg('Las noches mínimas deben ser un número válido mayor a 0.');
      return;
    }

    if (minNights > nights) {
      setSeasonErrorMsg(`Las noches mínimas (${minNights}) no pueden ser mayores a la duración de la temporada (${nights} noches).`);
      return;
    }

    if (isNaN(mult) || mult <= 0) {
      setSeasonErrorMsg('El multiplicador tarifario debe ser un valor numérico válido mayor a 0.');
      return;
    }

    // Check overlapping seasons
    const conflicting = seasons.find(s => {
      if (editingSeasonId && s.id === editingSeasonId) return false;
      if (!s.isActive) return false;
      const exStart = new Date(`${s.startDate}T00:00:00`);
      const exEnd = new Date(`${s.endDate}T00:00:00`);
      return start < exEnd && end > exStart;
    });

    if (conflicting) {
      setSeasonErrorMsg(
        `No es posible guardar: El período (${formatDisplayDate(newSeason.startDate)} - ${formatDisplayDate(newSeason.endDate)}) entra en conflicto con la temporada "${conflicting.name}" (${formatDisplayDate(conflicting.startDate)} - ${formatDisplayDate(conflicting.endDate)}).`
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<SeasonRate> = {
        name: newSeason.name.trim(),
        startDate: newSeason.startDate,
        endDate: newSeason.endDate,
        nightsCount: nights,
        multiplier: Number(mult.toFixed(2)),
        minimumStayNights: minNights
      };

      if (editingSeasonId && onUpdateSeason) {
        const res = await onUpdateSeason(editingSeasonId, payload);
        if (!res.success) {
          setSeasonErrorMsg(res.error || 'Error al actualizar la temporada.');
          return;
        }
        setEditingSeasonId(null);
        triggerSuccessToast('Temporada actualizada correctamente.');
      } else {
        const res = await onCreateSeason(payload);
        if (!res.success) {
          setSeasonErrorMsg(res.error || 'Error al registrar la temporada.');
          return;
        }
        triggerSuccessToast('Temporada agregada al calendario sin conflictos.');
      }

      setNewSeason({ name: '', startDate: '', endDate: '', multiplier: 1.2, minimumStayNights: 2 });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveSeason = async (seasonId: string) => {
    if (!onDeleteSeason) return;
    setIsSaving(true);
    try {
      const res = await onDeleteSeason(seasonId);
      if (res.success) {
        if (editingSeasonId === seasonId) {
          cancelEditSeason();
        }
        triggerSuccessToast('Temporada eliminada del sistema.');
      } else {
        setSeasonErrorMsg(res.error || 'No se pudo eliminar la temporada.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {saveSuccessMsg && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-200 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="p-5 border-b border-stone-200 bg-[#FAF6F0]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#1B4332] text-white">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900">
                Inventario, Fotos Reales & Parámetros
              </h3>
              <p className="text-xs text-stone-600">
                Panel exclusivo de administración para Finca La Colmena de Don Juaco
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-2xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Modo Administrador Protegido</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mt-4 text-xs font-semibold">
          {[
            { id: 'photos', label: '📸 Fotos Habitaciones' },
            { id: 'experiences', label: '🌿 Fotos Experiencias' },
            { id: 'rooms', label: 'Cabañas & Mantenimiento' },
            { id: 'seasons', label: 'Tarifas Estacionales' },
            { id: 'estate', label: 'Cuentas de Pago & Finca' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#1B4332] text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        
        {/* ======================================================== */}
        {/* TAB PHOTOS: COMPREHENSIVE PHOTOS MANAGER (ADMIN ONLY)     */}
        {/* ======================================================== */}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            
            {/* Panel Minimalista: Actualiza la foto de las habitaciones */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-serif font-bold text-stone-900 text-base flex items-center gap-2">
                    <Camera className="w-5 h-5 text-amber-600" />
                    Actualiza la foto de las habitaciones
                  </h4>
                  <p className="text-xs text-stone-500 mt-1">
                    Selecciona la habitación que deseas editar y sube la nueva fotografía para publicarla al instante.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Botón / Selector para seleccionar la habitación a editar */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-600">Habitación:</span>
                    <select
                      id="select-room-to-edit"
                      value={multipartRoomId}
                      onChange={(e) => {
                        setMultipartRoomId(e.target.value);
                        setMultipartResponse(null);
                      }}
                      className="px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer transition-all"
                    >
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.roomNumber} - {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Botón para subir la imagen */}
                  <label className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-xs ${
                    multipartUploading
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-98'
                  }`}>
                    {multipartUploading ? (
                      <>
                        <span className="animate-spin text-sm">⌛</span>
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
                      disabled={multipartUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await handleUploadImageFile(file);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Notificación de estado minimalista */}
              {multipartResponse && (
                <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
                  multipartResponse.status === 'success'
                    ? 'border-emerald-100 text-emerald-700'
                    : 'border-red-100 text-red-600'
                }`}>
                  <span className="flex items-center gap-1.5 font-medium">
                    {multipartResponse.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    {multipartResponse.message || multipartResponse.error}
                  </span>
                  <button
                    onClick={() => setMultipartResponse(null)}
                    className="text-stone-400 hover:text-stone-600 text-2xs cursor-pointer ml-3"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>

            {/* Rooms Photos Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => {
                const currentPhoto = localPreviews[room.id] || room.images?.[0] || '/logo_don_juaco.jpg';
                const isUploading = uploadingRoomId === room.id;
                const statusMessage = uploadStatus[room.id];
                const isDragOver = dragOverRoomId === room.id;
                const isUrlOpen = urlInputRoomId === room.id;

                return (
                  <div 
                    key={room.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverRoomId(room.id);
                    }}
                    onDragLeave={() => setDragOverRoomId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverRoomId(null);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleSelectAndUploadPhoto(room.id, file);
                    }}
                    className={`p-4 rounded-2xl border transition-all bg-white shadow-2xs flex flex-col justify-between space-y-3 ${
                      isDragOver 
                        ? 'border-amber-500 ring-2 ring-amber-300 bg-amber-50/30' 
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div>
                      {/* Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-[#1B4332] text-white">
                            {room.roomNumber}
                          </span>
                          <h5 className="font-serif font-bold text-stone-900 text-sm mt-1">
                            {room.name}
                          </h5>
                          <p className="text-[11px] text-stone-600">{room.bedType}</p>
                        </div>
                        <span className="text-2xs text-stone-500 font-mono">
                          Cap. {room.capacity} pers.
                        </span>
                      </div>

                      {/* Image Preview Box with drag and drop */}
                      <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 mb-3 group">
                        <img 
                          src={currentPhoto} 
                          alt={room.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                        />
                        
                        {/* Status Overlay */}
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-white text-center">
                            <span className="text-2xl animate-spin mb-1.5">⌛</span>
                            <span className="text-xs font-semibold text-amber-300">
                              {statusMessage || 'Procesando imagen...'}
                            </span>
                            <span className="text-2xs text-stone-300 mt-0.5">
                              Por favor espera unos segundos
                            </span>
                          </div>
                        )}

                        {!isUploading && isDragOver && (
                          <div className="absolute inset-0 bg-amber-600/80 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-white text-center">
                            <Upload className="w-8 h-8 text-white mb-1 animate-bounce" />
                            <span className="text-xs font-bold">Suelta la imagen aquí</span>
                          </div>
                        )}

                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                          <span className="text-3xs text-white/90 font-medium px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs">
                            Vista previa en vivo
                          </span>
                        </div>
                      </div>

                      {/* URL input drawer if opened */}
                      {isUrlOpen && (
                        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 mb-3 space-y-2 text-xs">
                          <label className="block text-2xs font-semibold text-stone-700">
                            Pegar enlace web de la imagen:
                          </label>
                          <input 
                            type="url"
                            placeholder="https://ejemplo.com/mifoto.jpg"
                            value={customUrlValue}
                            onChange={(e) => setCustomUrlValue(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs"
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                setUrlInputRoomId(null);
                                setCustomUrlValue('');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-stone-300 text-2xs font-semibold text-stone-600 hover:bg-stone-200"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleApplyCustomUrl(room.id)}
                              className="flex-1 px-2.5 py-1 rounded-lg bg-[#1B4332] text-white text-2xs font-semibold hover:bg-[#2D6A4F]"
                            >
                              Aplicar Enlace
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions Area */}
                    <div className="space-y-2">
                      {/* Main Upload Button */}
                      <label 
                        className={`w-full py-2.5 px-3 rounded-xl border font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs ${
                          isUploading
                            ? 'bg-stone-100 border-stone-300 text-stone-400 cursor-not-allowed'
                            : 'bg-amber-600 hover:bg-amber-700 border-amber-600 text-white active:scale-98'
                        }`}
                      >
                        {isUploading ? (
                          <>
                            <span className="animate-spin text-sm">⌛</span>
                            <span>{statusMessage || 'Guardando...'}</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            <span>Seleccionar Imagen (Cualquier Formato)</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.avif"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSelectAndUploadPhoto(room.id, file);
                            e.target.value = ''; // Reset input so same file can be selected again if desired
                          }}
                        />
                      </label>

                      {/* Secondary Quick Actions */}
                      <div className="flex items-center justify-between gap-1 pt-1 text-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            setUrlInputRoomId(isUrlOpen ? null : room.id);
                            setCustomUrlValue('');
                          }}
                          className="px-2 py-1 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Pegar enlace web directo de la imagen"
                        >
                          <LinkIcon className="w-3 h-3 text-stone-500" />
                          <span>Pegar URL</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResetToDefault(room.id)}
                          disabled={isUploading}
                          className="px-2 py-1 rounded-lg border border-stone-200 hover:bg-rose-50 text-stone-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Restaurar la fotografía original de fábrica"
                        >
                          <RotateCcw className="w-3 h-3 text-stone-400" />
                          <span>Restaurar por defecto</span>
                        </button>
                      </div>

                      <p className="text-3xs text-stone-400 text-center">
                        Formatos soportados: JPG, PNG, WEBP, HEIC, GIF, BMP, AVIF
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB EXPERIENCES: EXPERIENCES PHOTOS MANAGER              */}
        {/* ======================================================== */}
        {activeTab === 'experiences' && (
          <ExperiencesAdminManager />
        )}

        {/* ======================================================== */}
        {/* TAB 1: ROOMS INVENTORY & PARAMS                           */}
        {/* ======================================================== */}
        {activeTab === 'rooms' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map(room => (
                <div 
                  key={room.id}
                  className={`p-4 rounded-2xl border ${room.outOfService ? 'bg-stone-50 border-amber-300' : 'bg-white border-stone-200'} shadow-2xs flex flex-col justify-between`}
                >
                  {editingRoomId === room.id ? (
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <strong className="font-serif text-sm text-stone-900">{room.name}</strong>
                        <span className="font-mono text-2xs uppercase text-amber-800 font-bold">{room.roomNumber}</span>
                      </div>

                      <div>
                        <label className="block text-stone-600 font-semibold mb-1">Precio Base (COP):</label>
                        <input
                          type="number"
                          value={roomEditForm.basePrice}
                          onChange={(e) => setRoomEditForm({ ...roomEditForm, basePrice: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 font-semibold mb-1">Capacidad Máxima (Huéspedes):</label>
                        <input
                          type="number"
                          value={roomEditForm.capacity}
                          onChange={(e) => setRoomEditForm({ ...roomEditForm, capacity: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 font-semibold mb-1">Configuración de Camas:</label>
                        <input
                          type="text"
                          placeholder="Ej. 1 cama doble + 1 cama sencilla..."
                          value={roomEditForm.bedType}
                          onChange={(e) => setRoomEditForm({ ...roomEditForm, bedType: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 font-semibold mb-1">Descripción de la Cabaña:</label>
                        <textarea
                          rows={2}
                          placeholder="Descripción detallada de la habitación..."
                          value={roomEditForm.description}
                          onChange={(e) => setRoomEditForm({ ...roomEditForm, description: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs"
                        />
                      </div>

                      <div className="pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={roomEditForm.outOfService}
                            onChange={(e) => setRoomEditForm({ ...roomEditForm, outOfService: e.target.checked })}
                            className="rounded-sm text-amber-600 focus:ring-amber-500"
                          />
                          <span className="font-semibold text-stone-800">Bloquear Fuera de Servicio</span>
                        </label>
                      </div>

                      {roomEditForm.outOfService && (
                        <div>
                          <label className="block text-stone-600 font-semibold mb-1">Motivo del Bloqueo:</label>
                          <input
                            type="text"
                            placeholder="Ej. Mantenimiento de jacuzzi..."
                            value={roomEditForm.outOfServiceReason}
                            onChange={(e) => setRoomEditForm({ ...roomEditForm, outOfServiceReason: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300"
                          />
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setEditingRoomId(null)}
                          className="flex-1 py-1.5 border border-stone-300 rounded-lg text-stone-600 hover:bg-stone-100"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveRoom(room.id)}
                          disabled={isSaving}
                          className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-2xs font-mono font-bold uppercase text-amber-800">{room.roomNumber}</span>
                          <h4 className="font-serif font-bold text-sm text-stone-900">{room.name}</h4>
                        </div>
                        {room.outOfService ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-2xs font-bold uppercase">
                            Fuera de Servicio
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-2xs font-bold uppercase">
                            Operativa
                          </span>
                        )}
                      </div>

                      <div className="relative aspect-16/9 rounded-lg overflow-hidden my-2 border border-stone-200">
                        <img 
                          src={localPreviews[room.id] || room.images?.[0] || '/logo_don_juaco.jpg'} 
                          alt={room.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="text-stone-600 text-xs space-y-1">
                        <p>Precio base: <strong className="text-stone-900 font-serif">{formatCOP(room.basePrice)}</strong></p>
                        <p>Camas: <strong className="text-stone-900">{room.bedType}</strong></p>
                        <p>Capacidad: <strong className="text-stone-900">{room.capacity} huéspedes</strong></p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {room.amenities.map((am, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] text-stone-700">
                              {am}
                            </span>
                          ))}
                        </div>
                        {room.outOfService && (
                          <p className="text-rose-700 text-2xs mt-1">
                            Motivo: {room.outOfServiceReason || 'Mantenimiento preventivo'}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-stone-100 flex gap-2">
                        <button
                          onClick={() => startEditRoom(room)}
                          className="flex-1 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 font-semibold text-stone-700 cursor-pointer text-center"
                        >
                          Editar Parámetros
                        </button>
                        <button
                          onClick={() => setActiveTab('photos')}
                          className="py-1.5 px-3 rounded-lg bg-stone-100 hover:bg-stone-200 font-semibold text-stone-700 cursor-pointer flex items-center gap-1"
                          title="Ir a gestionar fotos de esta cabaña"
                        >
                          <Camera className="w-3.5 h-3.5 text-amber-700" />
                          <span>Foto</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SEASONAL RATES                                     */}
        {/* ======================================================== */}
        {activeTab === 'seasons' && (
          <div className="space-y-6 text-xs">
            
            {/* Explanatory Header & Reference Base Rate */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF6F0] border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-stone-900 text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-700" />
                  <span>Gestión de Tarifas Estacionales y Reglas de Estadía</span>
                </h4>
                <p className="text-xs text-stone-600 max-w-3xl leading-relaxed">
                  Configura las temporadas especiales (baja, media, alta o festivos) definiendo su <strong>fecha de inicio</strong> y <strong>fecha de fin</strong>. El sistema calcula automáticamente la duración en noches, valida que no existan cruces entre temporadas y aplica el multiplicador tarifario y las noches mínimas únicamente dentro del rango configurado.
                </p>
              </div>
              <div className="px-4 py-3 rounded-xl bg-white border border-stone-200 shadow-2xs shrink-0 text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Tarifa Base Regular (1.0x)
                </span>
                <span className="font-serif text-lg font-bold text-[#1B4332]">
                  {formatCOP(referenceBasePrice)}
                </span>
                <span className="text-[10px] text-stone-500 block">por noche (fuera de temporada)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Create / Edit Season Form (5 cols) */}
              <form
                onSubmit={handleAddSeason}
                className="lg:col-span-5 p-5 rounded-2xl border border-stone-200 bg-[#FAF8F5] space-y-4 shadow-2xs"
              >
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <h4 className="font-serif font-bold text-stone-900 text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4 text-amber-600" />
                    <span>{editingSeasonId ? 'Editar Temporada Seleccionada' : 'Configurar Nueva Temporada'}</span>
                  </h4>
                  {editingSeasonId && (
                    <button
                      type="button"
                      onClick={cancelEditSeason}
                      className="text-2xs font-semibold text-stone-500 hover:text-stone-800 underline cursor-pointer"
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>

                {/* Error Alert */}
                {(seasonErrorMsg || seasonValidationError) && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{seasonErrorMsg || seasonValidationError}</span>
                  </div>
                )}

                {/* 1. Nombre de la Temporada */}
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Nombre de la Temporada *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Temporada Alta Fin de Año, Semana Santa..."
                    value={newSeason.name}
                    onChange={(e) => {
                      setSeasonErrorMsg(null);
                      setNewSeason({ ...newSeason, name: e.target.value });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                    required
                  />
                </div>

                {/* 2. Fecha de Inicio & Fecha de Fin */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">
                      Fecha de Inicio *
                    </label>
                    <input
                      type="date"
                      value={newSeason.startDate}
                      onChange={(e) => {
                        setSeasonErrorMsg(null);
                        setNewSeason({ ...newSeason, startDate: e.target.value });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">
                      Fecha de Fin *
                    </label>
                    <input
                      type="date"
                      value={newSeason.endDate}
                      min={newSeason.startDate || undefined}
                      onChange={(e) => {
                        setSeasonErrorMsg(null);
                        setNewSeason({ ...newSeason, endDate: e.target.value });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                      required
                    />
                  </div>
                </div>

                {/* 3. Cantidad de Noches (Calculada automáticamente, NO editable manualmente) */}
                <div className="p-3.5 rounded-xl bg-white border border-stone-200/90 flex items-center justify-between">
                  <div>
                    <span className="text-stone-700 font-bold block">
                      Cantidad de Noches de la Temporada
                    </span>
                    <span className="text-[11px] text-stone-500">
                      {newSeason.startDate && newSeason.endDate && calculatedFormNights > 0
                        ? `Del ${formatDisplayDate(newSeason.startDate)} al ${formatDisplayDate(newSeason.endDate)}`
                        : 'Calculado automáticamente según Fecha de inicio y Fecha de fin'}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-[#1B4332]/10 border border-[#1B4332]/25 text-[#1B4332] font-bold text-sm shrink-0">
                    {calculatedFormNights > 0
                      ? `${calculatedFormNights} ${calculatedFormNights === 1 ? 'noche' : 'noches'}`
                      : '0 noches'}
                  </div>
                </div>

                {/* 4. Multiplicador Tarifario + Presets Rápidos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-stone-700 font-bold">
                      Multiplicador Tarifario *
                    </label>
                    <span className="text-[11px] font-semibold text-amber-800">
                      {Number(newSeason.multiplier || 1).toFixed(2)}x ({newSeason.multiplier >= 1 ? `+${Math.round((newSeason.multiplier - 1) * 100)}%` : `${Math.round((newSeason.multiplier - 1) * 100)}%`})
                    </span>
                  </div>

                  {/* Quick season multiplier presets */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: 'Baja (1.0x)', val: 1.0 },
                      { label: 'Media (1.2x)', val: 1.2 },
                      { label: 'Alta (1.41x)', val: 1.41 },
                      { label: 'Especial (1.5x)', val: 1.5 }
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setSeasonErrorMsg(null);
                          setNewSeason({ ...newSeason, multiplier: preset.val });
                        }}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                          Math.abs(Number(newSeason.multiplier) - preset.val) < 0.005
                            ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-2xs'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[11px] text-stone-500 block mb-1">Valor del Multiplicador (ej. 1.0, 1.2, 1.5):</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.5"
                        max="5.0"
                        value={newSeason.multiplier}
                        onChange={(e) => {
                          setSeasonErrorMsg(null);
                          setNewSeason({ ...newSeason, multiplier: Number(e.target.value) });
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                        required
                      />
                    </div>

                    {/* 5. Noches Mínimas */}
                    <div>
                      <span className="text-[11px] text-stone-500 block mb-1">Noches Mínimas por Reserva *:</span>
                      <input
                        type="number"
                        min="1"
                        max={calculatedFormNights > 0 ? calculatedFormNights : 30}
                        step="1"
                        value={newSeason.minimumStayNights}
                        onChange={(e) => {
                          setSeasonErrorMsg(null);
                          setNewSeason({ ...newSeason, minimumStayNights: Math.max(1, Math.floor(Number(e.target.value))) });
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Live Resulting Rate Preview */}
                <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/90 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">
                      Tarifa Resultante por Noche
                    </span>
                    <span className="text-[11px] text-amber-800">
                      Base {formatCOP(referenceBasePrice)} × {Number(newSeason.multiplier || 1).toFixed(2)}x
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-serif text-base font-bold text-amber-950 block">
                      {formatCOP(Math.round(referenceBasePrice * (Number(newSeason.multiplier) || 1)))} / noche
                    </span>
                    <span className="text-[10px] font-semibold text-amber-800">
                      Mín. {newSeason.minimumStayNights || 1} {(newSeason.minimumStayNights || 1) === 1 ? 'noche' : 'noches'} ({formatCOP(Math.round(referenceBasePrice * (Number(newSeason.multiplier) || 1)) * Math.max(1, Number(newSeason.minimumStayNights) || 1))})
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving || Boolean(seasonValidationError)}
                  className="w-full py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] disabled:bg-stone-300 text-white font-bold rounded-xl transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? 'Guardando...'
                      : editingSeasonId
                      ? 'Guardar Cambios de Temporada'
                      : 'Registrar Temporada'}
                  </span>
                </button>
              </form>

              {/* Right Column: Complete Summary of Configured Seasons (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-stone-900 text-sm">
                      Resumen de Temporadas Configuradas ({seasons.length})
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Detalle completo de períodos activos, duración calculada, noches mínimas, multiplicador y tarifa resultante.
                    </p>
                  </div>
                </div>

                {seasons.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-center space-y-2">
                    <Calendar className="w-8 h-8 text-stone-400 mx-auto" />
                    <p className="font-semibold text-stone-700">No hay temporadas especiales configuradas</p>
                    <p className="text-2xs text-stone-500">
                      En todas las fechas se aplicará la tarifa base regular de {formatCOP(referenceBasePrice)} / noche (1.0x).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {seasons.map((season) => {
                      const seasonNights = calculateSeasonNights(season.startDate, season.endDate);
                      const resultingNightlyRate = Math.round(referenceBasePrice * season.multiplier);
                      const minStayTotal = resultingNightlyRate * season.minimumStayNights;
                      const isBeingEdited = editingSeasonId === season.id;

                      return (
                        <div
                          key={season.id}
                          className={`p-4 rounded-2xl border transition-all bg-white shadow-2xs space-y-3 ${
                            isBeingEdited
                              ? 'border-[#1B4332] ring-2 ring-[#1B4332]/20 bg-emerald-50/20'
                              : 'border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          {/* Top Row: Season Name, Multiplier Badge & Actions */}
                          <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-stone-100">
                            <div>
                              <div className="flex items-center gap-2">
                                <strong className="font-serif text-stone-900 text-sm sm:text-base">
                                  {season.name}
                                </strong>
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-2xs">
                                  {Number(season.multiplier).toFixed(2)}x ({season.multiplier >= 1 ? `+${((season.multiplier - 1) * 100).toFixed(0)}%` : `${((season.multiplier - 1) * 100).toFixed(0)}%`})
                                </span>
                              </div>
                              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Activa únicamente del {formatDisplayDate(season.startDate)} al {formatDisplayDate(season.endDate)}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditSeason(season)}
                                className="px-2.5 py-1 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold text-2xs transition-colors cursor-pointer"
                              >
                                Editar
                              </button>
                              {onDeleteSeason && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSeason(season.id)}
                                  className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                                  title="Eliminar temporada"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Summary Grid with the 7 Required Data Points */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
                            {/* 1. Fecha de Inicio */}
                            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/70">
                              <span className="text-[10px] text-stone-500 uppercase font-bold block">
                                Fecha de Inicio
                              </span>
                              <strong className="text-stone-900 text-xs font-mono mt-0.5 block">
                                {formatDisplayDate(season.startDate)}
                              </strong>
                            </div>

                            {/* 2. Fecha de Fin */}
                            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/70">
                              <span className="text-[10px] text-stone-500 uppercase font-bold block">
                                Fecha de Fin
                              </span>
                              <strong className="text-stone-900 text-xs font-mono mt-0.5 block">
                                {formatDisplayDate(season.endDate)}
                              </strong>
                            </div>

                            {/* 3. Cantidad de Noches (Automática) */}
                            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                              <span className="text-[10px] text-emerald-800 uppercase font-bold block">
                                Cantidad de Noches
                              </span>
                              <strong className="text-emerald-950 text-xs mt-0.5 block">
                                {seasonNights} {seasonNights === 1 ? 'noche' : 'noches'}
                              </strong>
                            </div>

                            {/* 4. Noches Mínimas */}
                            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/70">
                              <span className="text-[10px] text-stone-500 uppercase font-bold block">
                                Noches Mínimas
                              </span>
                              <strong className="text-stone-900 text-xs mt-0.5 block">
                                Mín. {season.minimumStayNights} {season.minimumStayNights === 1 ? 'noche' : 'noches'}
                              </strong>
                            </div>

                            {/* 5. Multiplicador Tarifario */}
                            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/70">
                              <span className="text-[10px] text-stone-500 uppercase font-bold block">
                                Multiplicador
                              </span>
                              <strong className="text-stone-900 text-xs font-mono mt-0.5 block">
                                {Number(season.multiplier).toFixed(2)}x
                              </strong>
                            </div>

                            {/* 6. Tarifa Resultante */}
                            <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200">
                              <span className="text-[10px] text-amber-900 uppercase font-bold block">
                                Tarifa Resultante
                              </span>
                              <strong className="text-amber-950 text-xs font-serif mt-0.5 block">
                                {formatCOP(resultingNightlyRate)} / noche
                              </strong>
                              <span className="text-[9px] text-amber-800 block">
                                Estadía mín: {formatCOP(minStayTotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ESTATE SETTINGS & PAYMENT CHANNELS                 */}
        {/* ======================================================== */}
        {activeTab === 'estate' && (
          <form onSubmit={handleSaveEstate} className="space-y-4 max-w-2xl text-xs">
            <h4 className="font-serif font-bold text-stone-900 text-sm">
              Parámetros Bancarios & Canales de Recepción de Dinero
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Bancolombia (Ahorros):</label>
                <input
                  type="text"
                  value={estateForm.bancolombiaAccountNumber || ''}
                  onChange={(e) => setEstateForm({ ...estateForm, bancolombiaAccountNumber: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-mono"
                  placeholder="Número de cuenta Bancolombia"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Nequi (Celular):</label>
                <input
                  type="text"
                  value={estateForm.nequiNumber || ''}
                  onChange={(e) => setEstateForm({ ...estateForm, nequiNumber: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-mono"
                  placeholder="Celular Nequi"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">DaviPlata (Celular):</label>
                <input
                  type="text"
                  value={estateForm.daviplataNumber || ''}
                  onChange={(e) => setEstateForm({ ...estateForm, daviplataNumber: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-mono"
                  placeholder="Celular DaviPlata"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Banco Agrario (Ahorros):</label>
                <input
                  type="text"
                  value={estateForm.bancoAgrarioAccountNumber || ''}
                  onChange={(e) => setEstateForm({ ...estateForm, bancoAgrarioAccountNumber: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-mono"
                  placeholder="0491-300184-2"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">WhatsApp Concierge:</label>
                <input
                  type="text"
                  value={estateForm.whatsappNumber || ''}
                  onChange={(e) => setEstateForm({ ...estateForm, whatsappNumber: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-mono"
                  placeholder="573123456789"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Titular de las Cuentas:</label>
              <input
                type="text"
                value={estateForm.bancolombiaHolderName || ''}
                onChange={(e) => setEstateForm({ ...estateForm, bancolombiaHolderName: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
                placeholder="Nombre del titular"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Hora Check-In:</label>
                <input
                  type="text"
                  value={estateForm.checkInTime || '3:00 PM'}
                  onChange={(e) => setEstateForm({ ...estateForm, checkInTime: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Hora Check-Out:</label>
                <input
                  type="text"
                  value={estateForm.checkOutTime || '12:00 PM'}
                  onChange={(e) => setEstateForm({ ...estateForm, checkOutTime: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Tiempo de Bloqueo Temporal de Habitación (Minutos):
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={estateForm.paymentHoldMinutes ?? 25}
                onChange={(e) => setEstateForm({ ...estateForm, paymentHoldMinutes: Number(e.target.value) })}
                className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-mono"
                placeholder="25"
              />
              <p className="text-3xs text-stone-500 mt-0.5">
                Tiempo máximo que se reserva la cabaña mientras el cliente realiza el pago (Configurado en 25 minutos).
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Parámetros de la Finca</span>
              </button>
            </div>

            {/* Gmail SMTP Configuration Card */}
            <div className="mt-8 pt-6 border-t border-stone-200">
              <h4 className="font-serif font-bold text-stone-900 text-sm mb-1">
                Servidor de Envío de Correos Automáticos (Gmail SMTP)
              </h4>
              <p className="text-stone-600 mb-3 text-xs">
                Configura tu cuenta de Gmail para que el sistema envíe los comprobantes y recordatorios automáticamente a la dirección de correo que el cliente ingresa al reservar.
              </p>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Correo Gmail Emisor (SMTP User):
                    </label>
                    <input
                      type="email"
                      value={estateForm.smtpUser || ''}
                      onChange={(e) => setEstateForm({ ...estateForm, smtpUser: e.target.value })}
                      placeholder="restreporojassantiago940@gmail.com"
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Contraseña de Aplicación de Google (16 caracteres):
                    </label>
                    <input
                      type="password"
                      value={estateForm.smtpPass || ''}
                      onChange={(e) => setEstateForm({ ...estateForm, smtpPass: e.target.value })}
                      placeholder="•••• •••• •••• ••••"
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Google App Password Help Box */}
                <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 text-2xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <span>💡 Instrucciones para activar el envío automático con Gmail:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-amber-800/90 pl-1">
                    <li>
                      Ingresa a la seguridad de tu cuenta Google en{' '}
                      <a 
                        href="https://myaccount.google.com/apppasswords" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="underline font-bold text-amber-900 hover:text-black"
                      >
                        myaccount.google.com/apppasswords
                      </a>.
                    </li>
                    <li>Genera una Contraseña de Aplicación para "Correo" / "Finca Hotel".</li>
                    <li>Pega los 16 caracteres generados en el campo de arriba y presiona "Guardar Parámetros de la Finca".</li>
                  </ol>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Servidor Host:
                    </label>
                    <input
                      type="text"
                      value={estateForm.smtpHost || 'smtp.gmail.com'}
                      onChange={(e) => setEstateForm({ ...estateForm, smtpHost: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Puerto SMTP:
                    </label>
                    <input
                      type="number"
                      value={estateForm.smtpPort || 587}
                      onChange={(e) => setEstateForm({ ...estateForm, smtpPort: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Credenciales de Correo</span>
                  </button>
                </div>

                {/* Test Dispatch Box */}
                <div className="pt-3 border-t border-stone-200">
                  <label className="block text-stone-700 font-semibold mb-1">
                    Probar despacho de prueba a un correo Gmail:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      placeholder="restreporojassantiago940@gmail.com"
                      className="flex-1 px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                    />
                    <button
                      type="button"
                      disabled={isSendingTestEmail}
                      onClick={handleSendTestEmail}
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-semibold rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
                    >
                      {isSendingTestEmail ? 'Probando...' : 'Despachar Correo de Prueba'}
                    </button>
                  </div>

                  {testEmailStatus && (
                    <div className={`mt-2 p-3 rounded-xl text-xs ${testEmailStatus.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                      {testEmailStatus.message}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Supabase / PostgreSQL Direct Connection Card */}
            <div className="mt-8 pt-6 border-t border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-stone-900 text-sm">
                      Conexión Directa a Base de Datos (PostgreSQL / Supabase)
                    </h4>
                    <p className="text-stone-500 text-2xs">
                      Sincronización en la nube para persistencia permanente de habitaciones, reservas y transacciones.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={checkDbConnection}
                  disabled={isCheckingDb}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-2xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingDb ? 'animate-spin' : ''}`} />
                  <span>{isCheckingDb ? 'Verificando...' : 'Comprobar'}</span>
                </button>
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                {/* Connection Status Banner */}
                <div className={`p-3 rounded-xl border flex items-start gap-3 ${
                  dbStatus?.health?.isConnected
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                    : dbStatus?.health?.isConfigured
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-amber-50/90 border-amber-200 text-amber-950'
                }`}>
                  <div className="mt-0.5">
                    {dbStatus?.health?.isConnected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 text-xs">
                    <div className="font-bold flex items-center gap-2">
                      <span>
                        {dbStatus?.health?.isConnected
                          ? 'Conexión Activa con PostgreSQL / Supabase'
                          : dbStatus?.health?.isConfigured
                          ? 'Error al conectar con la URL configurada'
                          : 'Almacenamiento Local Persistente Activo (db_store.json)'}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        dbStatus?.health?.isConnected
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-amber-200 text-amber-900'
                      }`}>
                        {dbStatus?.health?.isConnected ? 'En Línea' : 'Modo Seguro Local'}
                      </span>
                    </div>

                    <p className="mt-1 text-stone-600 text-2xs">
                      {dbStatus?.health?.isConnected
                        ? `Conectado a base de datos "${dbStatus.health.database || 'postgres'}" (${dbStatus.health.provider.toUpperCase()}). Todos los cambios se guardan en la nube y en disco local.`
                        : dbStatus?.health?.error
                        ? `Detalle: ${dbStatus.health.error}`
                        : 'El sistema funciona de manera autónoma con el archivo local JSON. Para migrar a Supabase, define la variable DATABASE_URL en el archivo .env.'}
                    </p>

                    {dbStatus?.health?.tableCounts && dbStatus?.health?.isConnected && (
                      <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-2xs">
                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                          <span className="text-stone-500 block">Habitaciones</span>
                          <strong className="text-stone-900 font-mono text-xs">{dbStatus.health.tableCounts.rooms}</strong>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                          <span className="text-stone-500 block">Huéspedes</span>
                          <strong className="text-stone-900 font-mono text-xs">{dbStatus.health.tableCounts.guests}</strong>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                          <span className="text-stone-500 block">Reservas</span>
                          <strong className="text-stone-900 font-mono text-xs">{dbStatus.health.tableCounts.reservations}</strong>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                          <span className="text-stone-500 block">Transacciones</span>
                          <strong className="text-stone-900 font-mono text-xs">{dbStatus.health.tableCounts.transactions}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions or Migration Button */}
                {dbStatus?.health?.isConnected ? (
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-2xs text-stone-600">
                      ¿Deseas reenviar todos los datos locales actuales a Supabase?
                    </span>
                    <button
                      type="button"
                      onClick={handleMigrateDb}
                      disabled={isMigratingDb}
                      className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Server className="w-3.5 h-3.5" />
                      <span>{isMigratingDb ? 'Sincronizando...' : 'Forzar Sincronización a Supabase'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-2xs text-stone-600 bg-white p-3 rounded-xl border border-stone-200">
                    <div className="font-bold text-stone-800 flex items-center gap-1">
                      <span>💡 Pasos para conectar a Supabase por PostgreSQL directa:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>Copia la URI de conexión desde <strong>Supabase Dashboard &gt; Project Settings &gt; Database &gt; Connection string (URI)</strong>.</li>
                      <li>Abre el archivo <strong>.env</strong> de tu proyecto y agrega:</li>
                    </ol>
                    <div className="bg-stone-900 text-emerald-400 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto select-all">
                      DATABASE_URL="postgresql://postgres.[PROYECTO]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Al reiniciar el servidor, la aplicación creará automáticamente las tablas y sembrará las 7 habitaciones y reservas actuales.
                    </p>
                  </div>
                )}

                {dbActionResult && (
                  <div className="p-2.5 rounded-lg bg-stone-100 border border-stone-200 text-stone-800 text-xs font-mono">
                    {dbActionResult}
                  </div>
                )}
              </div>
            </div>

            {/* Supabase Storage Buckets Card */}
            <div className="mt-8 pt-6 border-t border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-stone-900 text-sm">
                      Almacenamiento en la Nube de Fotos y Comprobantes (Supabase Storage)
                    </h4>
                    <p className="text-stone-500 text-2xs">
                      Persistencia permanente en los buckets <strong>vouchers</strong> y <strong>rooms</strong> de Supabase.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={checkStorageConnection}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-2xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Comprobar Storage</span>
                </button>
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                <div className="p-3 rounded-xl border bg-blue-50/80 border-blue-200 text-blue-950 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <div className="font-bold flex items-center gap-2">
                      <span>Buckets Vinculados en el Servidor</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-200 text-blue-900">
                        vouchers & rooms
                      </span>
                    </div>
                    <p className="mt-1 text-stone-600 text-2xs">
                      Los comprobantes de huéspedes y fotos de habitaciones se suben automáticamente a tu almacenamiento en la nube de Supabase (con respaldo local simultáneo).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs">
                  <div className="bg-white p-3 rounded-xl border border-stone-200">
                    <span className="font-bold text-stone-800 block text-xs mb-1">Bucket: vouchers</span>
                    <p className="text-stone-500 text-[11px] mb-2">Comprobantes de pago adjuntados por huéspedes al reservar.</p>
                    <code className="text-blue-700 font-mono text-[10px] bg-blue-50 px-2 py-0.5 rounded block truncate">
                      https://wxjafauyokuudalwauzg.supabase.co/storage/v1/object/public/vouchers/...
                    </code>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-stone-200">
                    <span className="font-bold text-stone-800 block text-xs mb-1">Bucket: rooms</span>
                    <p className="text-stone-500 text-[11px] mb-2">Fotos oficiales y actualizadas de las 7 cabañas campestres.</p>
                    <code className="text-blue-700 font-mono text-[10px] bg-blue-50 px-2 py-0.5 rounded block truncate">
                      https://wxjafauyokuudalwauzg.supabase.co/storage/v1/object/public/rooms/...
                    </code>
                  </div>
                </div>

                <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 text-2xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <span>💡 Para habilitar la clave de API de subida a Storage:</span>
                  </div>
                  <p className="text-amber-800/90 text-[11px]">
                    Copia tu clave <strong>anon</strong> o <strong>service_role</strong> desde <strong>Supabase &gt; Project Settings &gt; API</strong> y agrégala en tu archivo <strong>.env</strong> como <code>SUPABASE_KEY="..."</code>.
                  </p>
                </div>
              </div>
            </div>
          </form>
        )}

      </div>

    </div>
  );
};
