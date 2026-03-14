import React, { useState, useEffect } from 'react';
import { Bookmark, Ghost } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../ui/Button';
import { SocialService } from '../../services/socialService';
import { useAuth } from '../../context/AuthContext';
import { Post as FeedPost } from '../feed/Post';
import { Post as PostType } from '../../types';

import { SEO } from '../common/SEO';

export const BookmarksList = () => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await SocialService.getBookmarks(user.id);
        setBookmarks(data);
      } catch (error) {
        console.error('Error fetching bookmarks', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-slate-400 font-medium">Cargando tus guardados...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-[650px] border-x border-slate-100 min-h-screen bg-white">
      <SEO title="Guardados" description="Tus publicaciones guardadas en Nexury. Accede a tu contenido favorito de forma privada." />
      <header className="sticky top-0 z-40 glass p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-bold font-display brand-text-gradient flex items-center gap-2">
          <Bookmark className="text-indigo-600" />
          Guardados
        </h1>
      </header>
      
      {bookmarks.length > 0 ? (
        <div className="flex flex-col">
          {bookmarks.map(post => (
            <FeedPost key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 sm:p-20 text-center gap-6">
          <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center animate-bounce">
            <Ghost size={48} />
          </div>
          <div className="max-w-xs">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Aún no hay nada aquí</h2>
            <p className="text-slate-500">Guarda publicaciones para leerlas más tarde. Aparecerán aquí de forma privada.</p>
          </div>
          <Button 
            variant="primary" 
            onClick={() => {
              const event = new CustomEvent('changeView', { detail: 'Inicio' });
              window.dispatchEvent(event);
            }}
            className="rounded-2xl px-8"
          >
            Explorar contenido
          </Button>
        </div>
      )}
    </div>
  );
};
