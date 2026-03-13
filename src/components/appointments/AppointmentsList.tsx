import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, Check, X, Info, User } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { Appointment } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { VerifiedBadge } from '../ui/VerifiedBadge';

import { SEO } from '../common/SEO';

export const AppointmentsList = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  }, [user]);

  const loadAppointments = async () => {
    try {
      const data = await dataService.getAppointments(user!.id);
      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await dataService.updateAppointmentStatus(id, status);
      loadAppointments();
    } catch (error) {
      console.error('Error updating appointment status', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <SEO title="Mis Citas" description="Gestiona tus encuentros y reuniones con otros usuarios en Nexury." />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mis Citas</h1>
          <p className="text-slate-500">Gestiona tus encuentros y reuniones con otros usuarios.</p>
        </div>
        <div className="bg-indigo-100 text-indigo-600 p-3 rounded-2xl">
          <Calendar size={24} />
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No tienes citas agendadas</h3>
          <p className="text-slate-500">Las solicitudes de citas aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const isRequester = appointment.requester_id === user?.id;
            const otherUser = isRequester 
              ? { name: appointment.receiver_display_name, username: appointment.receiver_username, avatar: appointment.receiver_avatar, isVerified: appointment.receiver_is_verified }
              : { name: appointment.requester_display_name, username: appointment.requester_username, avatar: appointment.requester_avatar, isVerified: appointment.requester_is_verified };

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={appointment.id}
                className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img 
                      src={otherUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.username}`} 
                      alt={otherUser.name}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm"
                    />
                    <div>
                      <h3 className="font-bold text-slate-900">{appointment.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                        <User size={14} />
                        <div className="flex items-center gap-1">
                          <span>{isRequester ? 'Para: ' : 'De: '} <span className="font-medium text-slate-700">{otherUser.name}</span></span>
                          {otherUser.isVerified && (
                            <VerifiedBadge size={14} />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                        <Clock size={14} />
                        <span>{format(new Date(appointment.appointment_date), "d 'de' MMMM, yyyy - HH:mm", { locale: es })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {appointment.status === 'pending' ? (
                      !isRequester ? (
                        <>
                          <button 
                            onClick={() => handleStatusChange(appointment.id, 'accepted')}
                            className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Check size={16} /> Aceptar
                          </button>
                          <button 
                            onClick={() => handleStatusChange(appointment.id, 'rejected')}
                            className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                          >
                            <X size={16} /> Rechazar
                          </button>
                        </>
                      ) : (
                        <span className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold uppercase tracking-wider">
                          Pendiente
                        </span>
                      )
                    ) : (
                      <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider ${
                        appointment.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' : 
                        appointment.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 
                        'bg-slate-50 text-slate-400'
                      }`}>
                        {appointment.status === 'accepted' ? 'Aceptada' : 
                         appointment.status === 'rejected' ? 'Rechazada' : 'Cancelada'}
                      </span>
                    )}
                  </div>
                </div>

                {appointment.description && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl text-sm text-slate-600 flex gap-3">
                    <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                    <p>{appointment.description}</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
