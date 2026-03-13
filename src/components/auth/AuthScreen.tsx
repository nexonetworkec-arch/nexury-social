import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';

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
      <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
        {/* Mobile Background */}
        <div className="absolute inset-0 z-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 sm:p-12 text-center border border-white z-10"
        >
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Mail size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">¡Casi listo!</h2>
          <p className="text-slate-500 text-lg mb-8 leading-relaxed">
            Hemos enviado un enlace a <span className="font-bold text-slate-900">{email}</span>. 
            Activa tu cuenta para empezar.
          </p>

          <div className="space-y-4 mb-8">
            <Button 
              onClick={() => {
                setNeedsConfirmation(false);
                setIsLogin(true);
              }}
              className="w-full py-4.5 rounded-[1.5rem] text-lg font-bold"
            >
              Volver al inicio
            </Button>
            
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 transition-colors uppercase tracking-widest"
            >
              {resending ? 'REENVIANDO...' : 'REENVIAR ENLACE'}
            </button>
          </div>

          {resendSuccess && (
            <p className="text-emerald-600 text-xs font-bold bg-emerald-50 py-3 rounded-2xl border border-emerald-100">
              ¡ENLACE REENVIADO CON ÉXITO!
            </p>
          )}
          
          {error && (
            <p className="text-rose-500 text-xs font-bold bg-rose-50 py-3 rounded-2xl border border-rose-100 mt-2">
              {error.toUpperCase()}
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  if (recoveryMode) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
        {/* Mobile Background */}
        <div className="absolute inset-0 z-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 sm:p-12 border border-white z-10"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Lock size={36} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Nueva contraseña</h2>
            <p className="text-slate-500 mt-3 text-lg leading-relaxed">Ingresa tu nueva contraseña para recuperar el acceso.</p>
          </div>

          {updateSuccess ? (
            <div className="text-center">
              <div className="bg-emerald-50 text-emerald-600 p-6 rounded-[1.5rem] border border-emerald-100 mb-8 font-medium">
                ¡Contraseña actualizada con éxito!
              </div>
              <Button 
                onClick={() => window.location.reload()}
                className="w-full py-4.5 rounded-[1.5rem] text-lg font-bold shadow-xl shadow-indigo-200/50"
              >
                Ir al inicio
              </Button>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Nueva contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="w-full pl-14 pr-14 py-4 bg-white border-2 border-slate-100 rounded-[1.5rem] focus:ring-0 focus:border-indigo-600/20 transition-all placeholder:text-slate-300 text-slate-900 shadow-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Confirmar nueva contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="w-full pl-14 pr-14 py-4 bg-white border-2 border-slate-100 rounded-[1.5rem] focus:ring-0 focus:border-indigo-600/20 transition-all placeholder:text-slate-300 text-slate-900 shadow-sm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 py-3 rounded-2xl border border-rose-100">
                  {error.toUpperCase()}
                </p>
              )}

              <Button
                type="submit"
                isLoading={loading}
                className="w-full py-4.5 rounded-[1.5rem] text-lg font-bold shadow-2xl shadow-indigo-200/50"
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
      <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
        {/* Mobile Background */}
        <div className="absolute inset-0 z-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 sm:p-12 border border-white z-10"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Mail size={36} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Recuperar acceso</h2>
            <p className="text-slate-500 mt-3 text-lg leading-relaxed">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
          </div>

          {resetSuccess ? (
            <div className="text-center">
              <div className="bg-emerald-50 text-emerald-600 p-6 rounded-[1.5rem] border border-emerald-100 mb-8 font-medium">
                ¡Correo enviado! Revisa tu bandeja de entrada.
              </div>
              <Button 
                onClick={() => setIsForgotPassword(false)}
                className="w-full py-4.5 rounded-[1.5rem] text-lg font-bold shadow-xl shadow-indigo-200/50"
              >
                Volver al inicio
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Correo electrónico</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                  <input
                    type="email"
                    required
                    placeholder="tu@email.com"
                    className="w-full pl-14 pr-5 py-4 bg-white border-2 border-slate-100 rounded-[1.5rem] focus:ring-0 focus:border-indigo-600/20 transition-all placeholder:text-slate-300 text-slate-900 shadow-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 py-3 rounded-2xl border border-rose-100">
                  {error.toUpperCase()}
                </p>
              )}

              <Button
                type="submit"
                isLoading={loading}
                className="w-full py-4.5 rounded-[1.5rem] text-lg font-bold shadow-2xl shadow-indigo-200/50"
              >
                Enviar enlace
              </Button>

              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="w-full text-center text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors py-2 uppercase tracking-widest"
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
    <div className="min-h-screen bg-white flex overflow-hidden relative">
      {/* Mobile Background - Only visible on small screens */}
      <div className="lg:hidden absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
          alt=""
          className="w-full h-full object-cover opacity-20"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-indigo-50/50" />
      </div>

      {/* Left Side - Visual/Atmospheric (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900">
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
            alt="Atmospheric background"
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/80 via-slate-900/40 to-transparent" />
        </motion.div>

        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-3"
          >
            <Logo size="md" withGlint={false} className="border border-white/20" />
            <span className="text-2xl font-bold text-white tracking-tight">Nexury</span>
          </motion.div>

          <div className="max-w-md">
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-5xl font-bold text-white leading-tight mb-6"
            >
              Conecta con la <span className="text-indigo-400 italic">elegancia</span> de lo digital
            </motion.h1>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-slate-300 text-lg leading-relaxed"
            >
              Únete a la red social más exclusiva y profesional diseñada para creadores y visionarios.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="flex items-center gap-4 text-slate-400 text-sm"
          >
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <img 
                  key={i}
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`}
                  className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800"
                  alt="User"
                />
              ))}
            </div>
            <p>Más de 10k usuarios ya son parte.</p>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 z-10 overflow-y-auto lg:overflow-hidden">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="max-w-md w-full flex flex-col justify-center py-8"
        >
          {/* Mobile Logo & Brand */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <Logo size="lg" animate={true} className="mb-4" />
            <span className="text-2xl font-bold text-slate-900 tracking-tight">Nexury</span>
          </div>

          <div className="mb-8 sm:mb-10 text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
              Conecta con la <span className="text-indigo-600 italic">elegancia</span> de lo digital
            </h2>
            <p className="text-slate-500 text-lg">
              {isLogin 
                ? 'Bienvenido de nuevo. Tu comunidad exclusiva te espera.' 
                : 'Únete a la red social más exclusiva y profesional diseñada para creadores y visionarios.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Correo Electrónico</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input
                  type="email"
                  required
                  placeholder="tu@email.com"
                  className="w-full pl-14 pr-5 py-4 bg-white border-2 border-slate-100 rounded-[1.5rem] focus:ring-0 focus:border-indigo-600/20 focus:bg-white transition-all placeholder:text-slate-300 text-slate-900 text-base shadow-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Contraseña</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    ¿OLVIDASTE?
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full pl-14 pr-14 py-4 bg-white border-2 border-slate-100 rounded-[1.5rem] focus:ring-0 focus:border-indigo-600/20 focus:bg-white transition-all placeholder:text-slate-300 text-slate-900 text-base shadow-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Confirmar Contraseña</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required={!isLogin}
                      placeholder="••••••••"
                      className="w-full pl-14 pr-14 py-4 bg-white border-2 border-slate-100 rounded-[1.5rem] focus:ring-0 focus:border-indigo-600/20 focus:bg-white transition-all placeholder:text-slate-300 text-slate-900 text-base shadow-sm"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-rose-50 border border-rose-100 rounded-2xl"
              >
                <p className="text-rose-600 text-xs font-medium text-center">
                  {error}
                </p>
              </motion.div>
            )}

            <Button
              type="submit"
              isLoading={loading}
              className="w-full py-4.5 rounded-[1.5rem] mt-4 text-lg font-bold shadow-2xl shadow-indigo-200/50 hover:shadow-indigo-300/50 transition-all transform active:scale-[0.98]"
              leftIcon={isLogin ? <LogIn size={22} /> : <UserPlus size={22} />}
            >
              {isLogin ? 'Entrar a Nexury' : 'Crear mi cuenta'}
            </Button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-slate-400 text-sm mb-4">
              {isLogin ? '¿Aún no eres parte?' : '¿Ya tienes una cuenta?'}
            </p>
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="w-full py-4 rounded-[1.5rem] border-2 border-slate-100 text-slate-700 font-bold hover:bg-slate-50 transition-all text-base active:scale-[0.98]"
            >
              {isLogin ? 'Registrarme ahora' : 'Iniciar sesión'}
            </button>

            {/* Mobile Social Proof */}
            <div className="lg:hidden mt-12 flex flex-col items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <img 
                    key={i}
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 20}`}
                    className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 shadow-sm"
                    alt="User"
                  />
                ))}
              </div>
              <p className="text-slate-400 text-xs">Más de 10k usuarios ya son parte de Nexury.</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-300">
              Nexury by Nexo Network Ec.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

