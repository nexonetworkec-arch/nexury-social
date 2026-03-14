import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Send, Info } from 'lucide-react';
import { AppointmentService } from '../../services/appointmentService';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';

interface RequestAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: User;
}

export const RequestAppointmentModal: React.FC<RequestAppointmentModalProps> = ({ isOpen, onClose, targetUser }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const appointmentDate = `${date}T${time}:00`;
      await AppointmentService.createAppointment({
        requesterId: user.id,
        receiverId: targetUser.id,
        title,
        description,
        appointmentDate
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setTitle('');
        setDescription('');
        setDate('');
        setTime('');
      }, 2000);
    } catch (error) {
      console.error('Error creating appointment', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-6 sm:mb-8 sticky top-0 bg-white z-10 pb-2">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 text-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                    <Calendar size={20} className="sm:hidden" />
                    <Calendar size={24} className="hidden sm:block" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Solicitar Cita</h2>
                    <p className="text-xs sm:text-sm text-slate-500">Con <span className="font-bold text-slate-700">{targetUser.display_name}</span></p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              {success ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center"
                >
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Send size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Solicitud Enviada!</h3>
                  <p className="text-slate-500">Tu solicitud de cita ha sido enviada con éxito.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Título de la Cita</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej: Reunión de proyecto, Café, etc."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 border-none rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-slate-900 text-sm sm:text-base"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Fecha</label>
                      <div className="relative">
                        <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="date" 
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full pl-12 pr-4 sm:pr-5 py-3 sm:py-4 bg-slate-50 border-none rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-slate-900 text-sm sm:text-base"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Hora</label>
                      <div className="relative">
                        <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="time" 
                          required
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="w-full pl-12 pr-4 sm:pr-5 py-3 sm:py-4 bg-slate-50 border-none rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-slate-900 text-sm sm:text-base"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Descripción / Motivo</label>
                    <textarea 
                      rows={3}
                      placeholder="Cuéntale un poco más sobre el motivo de la cita..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 border-none rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-slate-900 resize-none text-sm sm:text-base"
                    />
                  </div>

                  <div className="bg-amber-50 p-4 rounded-xl sm:rounded-2xl flex gap-3">
                    <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] sm:text-xs text-amber-700 leading-relaxed">
                      El usuario recibirá una notificación y podrá aceptar o rechazar tu solicitud. Te avisaremos cuando haya una respuesta.
                    </p>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 sm:py-5 bg-indigo-600 text-white rounded-xl sm:rounded-[1.5rem] font-bold text-base sm:text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Send size={20} /> Enviar Solicitud
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
