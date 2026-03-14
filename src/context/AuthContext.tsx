import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { AuthService } from '../services/authService';
import { ErrorHandler, ErrorType } from '../utils/errorHandler';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { email: string, password: string }) => Promise<void>;
  register: (userData: { email: string, password: string }) => Promise<{ needsConfirmation: boolean } | void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signInWithSupabase: (email: string) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  resetPasswordEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  reauthenticate: (password: string) => Promise<void>;
  recoveryMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const refreshingRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  const isRefreshTokenError = (error: any) => {
    return error?.message?.includes('Refresh Token Not Found') || 
           error?.message?.includes('invalid_refresh_token');
  };

  const login = async (credentials: { email: string, password: string }) => {
    try {
      const { data, error: sbError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (sbError) {
        const appError = ErrorHandler.handle(sbError, ErrorType.AUTH);
        
        if (ErrorHandler.isAuthError(sbError)) {
          localStorage.removeItem('nexury-auth-token');
        }
        
        throw new Error(appError.message);
      }
      
      if (data.session) {
        await refreshUser(data.session.user);
      }
      
      localStorage.setItem('nexury_email', credentials.email);
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async (sbUserOverride?: any) => {
    if (refreshingRef.current) {
      console.log('Refresh user already in progress, skipping...');
      return;
    }

    refreshingRef.current = true;
    console.log('Refreshing user data...');
    try {
      let sbUser = sbUserOverride;
      
      if (!sbUser) {
        // Timeout de 5 segundos para la llamada a Supabase (más corto para reaccionar rápido)
        const { data, error: authError } = await Promise.race([
          supabase.auth.getUser(),
          new Promise<{ data: { user: null }, error: any }>((resolve) => 
            setTimeout(() => resolve({ data: { user: null }, error: new Error('Timeout calling getUser') }), 5000)
          )
        ]);
        
        if (authError) {
          console.log('Auth error during refresh:', authError);
          
          // Manejar error de token de refresco inválido
          if (isRefreshTokenError(authError)) {
            console.warn('Sesión expirada o token inválido detectado. Limpiando estado...');
            setUser(null);
            userIdRef.current = null;
            // Limpiar almacenamiento local para forzar nueva sesión
            localStorage.removeItem('nexury-auth-token');
            return;
          }

          if (authError.message === 'Timeout calling getUser' && userIdRef.current) {
            console.log('Timeout but user exists, keeping current state');
            return;
          }
          setUser(null);
          userIdRef.current = null;
          return;
        }
        sbUser = data?.user;
      }
      
      if (!sbUser) {
        console.log('No active session found');
        setUser(null);
        userIdRef.current = null;
        return;
      }

      console.log('Auth user found:', sbUser.id);
      userIdRef.current = sbUser.id;

      // SOLUCIÓN PROFESIONAL: Establecer estado optimista inmediato
      // Esto permite que el usuario entre a la app sin esperar a la DB de perfiles
      const optimisticUser = {
        id: sbUser.id,
        email: sbUser.email || '',
        username: sbUser.email?.split('@')[0] || 'usuario',
        display_name: sbUser.user_metadata?.display_name || sbUser.email?.split('@')[0] || 'Usuario',
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${sbUser.id}`,
        is_admin: false,
        is_super_admin: false,
        is_verified: false,
        followers_count: 0,
        following_count: 0,
        total_likes_received: 0,
        is_optimistic: true // Flag para saber que es carga parcial
      };

      // Si no tenemos usuario o el que tenemos es diferente, ponemos el optimista
      if (!user || user.id !== sbUser.id) {
        setUser(optimisticUser as any);
      }

      // El resto de la carga se hace en "segundo plano" respecto al estado de carga global
      const loadFullProfile = async () => {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sbUser.id)
            .maybeSingle();
          
          if (profileError) {
            console.error('Error fetching profile:', profileError);
          }

          if (profile) {
            console.log('User profile loaded successfully');
            
            if (profile.is_blocked && !profile.is_super_admin) {
              console.log('User is blocked, signing out...');
              await logout();
              return;
            }
            
            const counts = await AuthService.getUserCounts(sbUser.id).catch(() => ({ followers: 0, following: 0, total_likes: 0 }));
            const userWithRoles = {
              ...profile,
              is_admin: profile.is_admin || profile.is_super_admin,
              followers_count: counts.followers,
              following_count: counts.following,
              total_likes_received: counts.total_likes,
              is_optimistic: false
            };
            setUser(userWithRoles);
          } else {
            // Si no hay perfil, intentamos crearlo pero no bloqueamos al usuario
            console.log('Profile not found, creating in background...');
            const { data: newProfile } = await supabase
              .from('profiles')
              .insert([{
                id: sbUser.id,
                email: sbUser.email,
                username: sbUser.email?.split('@')[0] || `user_${sbUser.id.substring(0, 5)}`,
                display_name: sbUser.user_metadata?.display_name || sbUser.email?.split('@')[0] || 'Usuario',
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${sbUser.id}`
              }])
              .select()
              .maybeSingle();
            
            if (newProfile) {
              setUser({ ...newProfile, is_optimistic: false } as any);
            }
          }
        } catch (err) {
          console.warn('Background profile load failed, keeping optimistic state', err);
        }
      };

      // Disparamos la carga completa sin await para no bloquear
      loadFullProfile();

    } catch (error) {
      console.error('Refresh user critical failure:', error);
    } finally {
      console.log('Refresh user finished');
      refreshingRef.current = false;
    }
  };

  const register = async (userData: { email: string, password: string }) => {
    try {
      const { data: sbData, error: sbError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: userData.email.split('@')[0]
          }
        }
      });

      if (sbError) {
        console.error('Supabase registration error:', sbError);
        if (sbError.message.includes('Database error saving new user')) {
          throw new Error('Error al crear el perfil. Por favor, ejecuta el Código Maestro SQL en Supabase.');
        }
        throw sbError;
      }

      // Si hay sesión inmediata (confirm_email desactivado en Supabase)
      if (sbData.session) {
        await refreshUser(sbData.session.user);
        return { needsConfirmation: false } as any;
      }

      // Si no hay sesión, es que requiere confirmación por email
      if (sbData.user && !sbData.session) {
        return { needsConfirmation: true } as any;
      }
      
      localStorage.setItem('nexury_email', userData.email);
    } catch (error) {
      console.error('Registration failed', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      userIdRef.current = null;
      localStorage.removeItem('nexury_email');
    } catch (error) {
      console.warn('Supabase signout failed', error);
    }
  };

  const signInWithSupabase = async (email: string) => {
    // Implementación futura con Supabase:
    // await supabase.auth.signInWithOtp({ email })
    console.log('Iniciando sesión para:', email);
  };

  const resendConfirmationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: window.location.origin,
      }
    });
    if (error) throw error;
  };

  const resetPasswordEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setRecoveryMode(false);
  };

  const reauthenticate = async (password: string) => {
    if (!user?.email) throw new Error('Usuario no identificado');
    
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    });
    
    if (error) {
      throw new Error('Contraseña incorrecta');
    }
  };

  useEffect(() => {
    let mounted = true;
    let isInitialCheckDone = false;

    // Escuchar cambios en la autenticación de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user && mounted) {
          // Solo refrescar si el usuario ID es diferente al que ya tenemos cargado
          // Esto evita el bucle infinito y llamadas redundantes
          if (session.user.id !== userIdRef.current) {
            console.log('User session active and ID changed, refreshing user data...');
            await refreshUser(session.user);
          } else {
            console.log('Auth state changed but user ID is the same, skipping refresh');
          }
        }
      }
      
      if (event === 'SIGNED_OUT' && mounted) {
        console.log('User signed out');
        setUser(null);
        userIdRef.current = null;
        setLoading(false);
      }

      if (event === 'PASSWORD_RECOVERY' && mounted) {
        console.log('Password recovery mode active');
        setRecoveryMode(true);
        setLoading(false);
      }
    });

    // Verificación inicial de sesión
    const checkSession = async () => {
      if (!mounted) return;
      console.log('Checking initial session...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session && mounted) {
          console.log('Session found, refreshing user...');
          await refreshUser(session.user);
        } else {
          console.log('No initial session found');
          setUser(null);
          userIdRef.current = null;
        }
      } catch (err: any) {
        console.error('Error checking session:', err);
        // Si el error es por un token de refresco inválido, limpiamos la sesión
        if (isRefreshTokenError(err)) {
          console.warn('Error crítico de sesión detectado en el arranque. Cerrando sesión...');
          await logout();
        }
      } finally {
        if (mounted) {
          isInitialCheckDone = true;
          console.log('Initial session check finished');
          setLoading(false);
        }
      }
    };

    checkSession();

    // Timeout de seguridad para evitar carga infinita
    const timeout = setTimeout(() => {
      if (mounted && !isInitialCheckDone) {
        console.warn('Safety timeout triggered: forcing loading to false');
        setLoading(false);
      }
    }, 10000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Suscribirse a cambios en el perfil del usuario actual (en un efecto separado)
  useEffect(() => {
    let profileSubscription: any = null;
    
    if (user?.id) {
      console.log('Setting up real-time profile subscription for:', user.id);
      profileSubscription = supabase
        .channel(`public:profiles:id=eq.${user.id}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles',
          filter: `id=eq.${user.id}`
        }, (payload) => {
          console.log('Profile updated in real-time:', payload.new);
          setUser(prev => {
            if (!prev) return payload.new as User;
            
            // Verificar si realmente hay cambios significativos para evitar re-renders innecesarios
            const hasChanges = 
              payload.new.display_name !== prev.display_name ||
              payload.new.avatar_url !== prev.avatar_url ||
              payload.new.bio !== prev.bio ||
              payload.new.is_verified !== prev.is_verified ||
              payload.new.is_admin !== prev.is_admin ||
              payload.new.is_super_admin !== prev.is_super_admin ||
              payload.new.followers_count !== prev.followers_count ||
              payload.new.following_count !== prev.following_count ||
              payload.new.total_likes_received !== prev.total_likes_received;

            if (!hasChanges) return prev;

            return { 
              ...prev, 
              ...payload.new,
              // Asegurar que los contadores se mantengan si no vienen en el payload
              followers_count: payload.new.followers_count !== undefined ? payload.new.followers_count : prev.followers_count,
              following_count: payload.new.following_count !== undefined ? payload.new.following_count : prev.following_count,
              total_likes_received: payload.new.total_likes_received !== undefined ? payload.new.total_likes_received : prev.total_likes_received
            };
          });
        })
        .subscribe();
    }

    return () => {
      if (profileSubscription) {
        console.log('Cleaning up profile subscription');
        supabase.removeChannel(profileSubscription);
      }
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout, 
      refreshUser, 
      signInWithSupabase,
      resendConfirmationEmail,
      resetPasswordEmail,
      updatePassword,
      reauthenticate,
      recoveryMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
