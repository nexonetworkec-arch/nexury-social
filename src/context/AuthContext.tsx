import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { dataService } from '../services/dataService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { email: string, password: string }) => Promise<void>;
  register: (userData: { email: string, password: string }) => Promise<void>;
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

  const login = async (credentials: { email: string, password: string }) => {
    try {
      const { data, error: sbError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (sbError) {
        console.error('Supabase login error:', sbError);
        if (sbError.message.includes('Email not confirmed')) {
          throw new Error('Por favor, confirma tu correo electrónico antes de entrar.');
        }
        if (sbError.message.includes('Invalid login credentials')) {
          throw new Error('Credenciales inválidas. Si es tu primera vez en este nuevo servidor, por favor usa la pestaña "Registrarse" para crear tu cuenta.');
        }
        if (sbError.message.includes('no configurado')) {
          throw new Error(sbError.message);
        }
        throw sbError;
      }
      
      if (data.session) {
        await refreshUser();
      }
      
      localStorage.setItem('nexury_email', credentials.email);
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    console.log('Refreshing user data...');
    try {
      // Timeout de 4 segundos para la llamada a Supabase
      const { data, error: authError } = await Promise.race([
        supabase.auth.getUser(),
        new Promise<{ data: { user: null }, error: any }>((resolve) => 
          setTimeout(() => resolve({ data: { user: null }, error: new Error('Timeout calling getUser') }), 15000)
        )
      ]);
      
      const sbUser = data?.user;
      
      if (authError || !sbUser) {
        console.log('No active session or auth error:', authError);
        setUser(null);
        return;
      }

      console.log('Auth user found:', sbUser.id);

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
          throw new Error('Tu cuenta ha sido suspendida por un administrador.');
        }

        // Aseguramos que el objeto tenga las propiedades correctas
        const counts = await dataService.getUserCounts(sbUser.id);
        const userWithRoles = {
          ...profile,
          // Un super admin siempre tiene poderes de admin en el frontend
          is_admin: profile.is_admin || profile.is_super_admin,
          followers_count: counts.followers,
          following_count: counts.following,
          total_likes_received: counts.total_likes
        };
        setUser(userWithRoles);
      } else {
        console.log('Profile not found, attempting to create or using fallback...');
        // El perfil no existe, intentamos crearlo
        try {
          const { data: newProfile, error: insertError } = await supabase
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
            console.log('New profile created successfully');
            setUser(newProfile);
          } else {
            console.warn('Could not create profile, using fallback state', insertError);
            throw new Error('Profile creation failed');
          }
        } catch (err) {
          console.warn('Fallback to basic user object');
          const fallbackUser = {
            id: sbUser.id,
            email: sbUser.email || '',
            username: sbUser.email?.split('@')[0] || 'usuario',
            display_name: 'Usuario',
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${sbUser.id}`,
            created_at: new Date().toISOString(),
            is_admin: false,
            is_super_admin: false,
            is_verified: false
          };
          setUser(fallbackUser as any);
        }
      }
    } catch (error) {
      console.error('Refresh user critical failure:', error);
    } finally {
      console.log('Refresh user finished, setting loading to false');
      setLoading(false);
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
        await refreshUser();
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
          // Solo refrescar si no es la carga inicial (que ya lo hace checkSession)
          // o si el usuario actual es diferente
          if (isInitialCheckDone) {
            console.log('User session active, refreshing user data...');
            await refreshUser();
          }
        }
      }
      
      if (event === 'SIGNED_OUT' && mounted) {
        console.log('User signed out');
        setUser(null);
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
          await refreshUser();
        } else {
          console.log('No initial session found');
        }
      } catch (err) {
        console.error('Error checking session:', err);
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
