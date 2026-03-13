import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, LogIn, Sparkles, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';

export const AuthScreen = () => {
  const { login, register, resendConfirmationEmail, resetPasswordEmail, updatePassword, recoveryMode } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isLogin && password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await login({ email, password });
      } else {
        const result = await register({ email, password });
        if (result && (result as any).needsConfirmation) {
          setNeedsConfirmation(true);
        }
        // Si no necesita confirmación, el AuthContext ya habrá hecho el login
        // y el estado de la app cambiará automáticamente
      }
    } catch (err: any) {
      let errorMessage = err.message || 'Ocurrió un error';
      if (isLogin && (errorMessage.includes('Invalid login credentials') || errorMessage.includes('invalid_credentials'))) {
        errorMessage = 'Credenciales inválidas. Si es tu primera vez en este nuevo servidor, por favor usa la pestaña "Registrarse" para crear tu cuenta.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    setResendSuccess(false);
    try {
      await resendConfirmationEmail(email);
      setResendSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al reenviar el correo');
    } finally {
      setResending(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResetSuccess(false);
    try {
      await resetPasswordEmail(email);
      setResetSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al enviar el correo de recuperación');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }
    try {
      await updatePassword(password);
      setUpdateSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (needsConfirmation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 sm:p-12 text-center border border-slate-100"
        >
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Mail size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">¡Casi listo!</h2>
          <p className="text-slate-600 mb-6">
            Hemos enviado un enlace de confirmación a <span className="font-bold text-slate-900">{email}</span>. 
            Por favor, revisa tu bandeja de entrada para activar tu cuenta.
          </p>

          <div className="space-y-3 mb-8">
            <Button 
              onClick={() => {
                setNeedsConfirmation(false);
                setIsLogin(true);
              }}
              className="w-full py-4 rounded-2xl"
            >
              Volver al inicio de sesión
            </Button>
            
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 transition-colors"
            >
              {resending ? 'Reenviando...' : '¿No recibiste el correo? Reenviar enlace'}
            </button>
          </div>

          {resendSuccess && (
            <p className="text-emerald-600 text-sm font-medium bg-emerald-50 py-2 rounded-xl border border-emerald-100">
              ¡Enlace reenviado con éxito!
            </p>
          )}
          
          {error && (
            <p className="text-rose-500 text-sm font-medium bg-rose-50 py-2 rounded-xl border border-rose-100 mt-2">
              {error}
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  if (recoveryMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 sm:p-12 border border-slate-100"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Nueva contraseña</h2>
            <p className="text-slate-500 mt-2">Ingresa tu nueva contraseña para recuperar el acceso.</p>
          </div>

          {updateSuccess ? (
            <div className="text-center">
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl border border-emerald-100 mb-6">
                ¡Contraseña actualizada con éxito!
              </div>
              <Button 
                onClick={() => window.location.reload()}
                className="w-full py-4 rounded-2xl"
              >
                Ir al inicio
              </Button>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">Nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">Confirmar nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-rose-500 text-sm font-medium text-center bg-rose-50 py-2 rounded-xl border border-rose-100">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                isLoading={loading}
                className="w-full py-4 rounded-2xl"
              >
                Actualizar contraseña
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 sm:p-12 border border-slate-100"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Recuperar contraseña</h2>
            <p className="text-slate-500 mt-2">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
          </div>

          {resetSuccess ? (
            <div className="text-center">
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl border border-emerald-100 mb-6">
                ¡Correo enviado! Revisa tu bandeja de entrada.
              </div>
              <Button 
                onClick={() => setIsForgotPassword(false)}
                className="w-full py-4 rounded-2xl"
              >
                Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p className="text-rose-500 text-sm font-medium text-center bg-rose-50 py-2 rounded-xl border border-rose-100">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                isLoading={loading}
                className="w-full py-4 rounded-2xl"
              >
                Enviar enlace
              </Button>

              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors py-2"
              >
                Cancelar
              </button>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 overflow-hidden border border-slate-100"
      >
        <div className="p-8 sm:p-12">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 rotate-3">
              <Sparkles className="text-white" size={32} />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 text-center mb-2">
            {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
          </h2>
          <p className="text-slate-500 text-center mb-8">
            {isLogin 
              ? 'Ingresa tus credenciales para continuar' 
              : 'Únete a la comunidad de Nexury hoy mismo'}
          </p>

          <div className="mb-6 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 text-center">
            <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-400">
              Desarrollado por Nexo Network Ec.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Confirmar contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required={!isLogin}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <p className="text-rose-500 text-sm font-medium text-center bg-rose-50 py-2 rounded-xl border border-rose-100">
                {error}
              </p>
            )}

            <Button
              type="submit"
              isLoading={loading}
              className="w-full py-4 rounded-2xl mt-4"
              leftIcon={isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
            >
              {isLogin ? 'Entrar' : 'Registrarse'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Button
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

