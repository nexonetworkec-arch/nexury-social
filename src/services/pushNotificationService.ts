import { dataService } from '../services/dataService';

export const pushNotificationService = {
  /**
   * Registra el Service Worker
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js');
        console.log('Service Worker registrado con éxito:', registration.scope);
        return registration;
      } catch (error) {
        console.error('Error al registrar el Service Worker:', error);
        return null;
      }
    }
    return null;
  },

  /**
   * Solicita permiso al usuario para enviar notificaciones y suscribe al usuario
   */
  async requestPermission(userId: string): Promise<boolean> {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn('Este navegador no soporta notificaciones push');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const registration = await this.registerServiceWorker();
        if (!registration) return false;

        // En una implementación real, aquí usaríamos pushManager.subscribe con una VAPID key
        // Para este entorno, seguiremos usando un identificador único que represente la suscripción
        // pero ahora vinculado al registro del Service Worker
        const subscription = await registration.pushManager.getSubscription();
        
        let token: string;
        if (subscription) {
          token = JSON.stringify(subscription);
        } else {
          // Si no hay suscripción real (porque falta VAPID), simulamos una vinculada al SW
          token = `sw_token_${registration.scope}_${userId}`;
        }
        
        await dataService.savePushToken(userId, token, 'web');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error al solicitar permiso de notificación:', error);
      return false;
    }
  },

  /**
   * Verifica el estado actual del permiso
   */
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }
};
