import React, { useState } from 'react';
import { Lock, User, Key, X, AlertCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { username: string; fullName: string }) => void;
}

export function AdminLoginModal({ isOpen, onClose, onLoginSuccess }: AdminLoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Credenciales inválidas');
      }

      // Save token in sessionStorage
      sessionStorage.setItem('colmena_admin_token', data.token);
      sessionStorage.setItem('colmena_admin_user', JSON.stringify(data.user));

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Credenciales inválidas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="admin-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div 
            key="admin-modal-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 14 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="bg-[#FAF6F0] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#D7C7B2] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full text-[#6D5A4B] hover:text-[#2C1E16] hover:bg-[#D7C7B2]/40 transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </motion.button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#1B4332]/10 border border-[#1B4332]/25 flex items-center justify-center text-[#1B4332]">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-[#1B4332] block">
                  Acceso Restringido
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#2C1E16]">
                  Panel Administrativo
                </h3>
              </div>
            </div>

            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5A4535] mb-1.5">
                  Nombre de Usuario
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7A6856] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#D7C7B2] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] transition-all text-[#2C1E16]"
                    placeholder="Ingrese su usuario"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5A4535] mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-[#7A6856] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#D7C7B2] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332] transition-all text-[#2C1E16]"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-[#1B4332] hover:bg-[#143225] text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Ingresar al Administrador</span>
                      <ArrowRight className="w-4 h-4 text-emerald-300" />
                    </>
                  )}
                </motion.button>
              </div>
            </form>

            <div className="mt-5 text-center">
              <p className="text-2xs text-[#7A6856]">
                Control de inventario, calendario de ocupación y auditoría de pagos de Finca La Colmena.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
