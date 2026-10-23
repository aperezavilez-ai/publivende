import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';

export function UpcomingPostsCalendar() {
  // TODO: Fetch real data
  const upcomingPosts = [
    {
      id: '1',
      contenido: '🌟 Nuevo producto disponible! No te lo pierdas...',
      fecha: '2024-01-16',
      hora: '10:00',
      redes: ['facebook', 'instagram'],
    },
    {
      id: '2',
      contenido: '📊 Estadísticas del mes: Resultados increíbles...',
      fecha: '2024-01-16',
      hora: '15:30',
      redes: ['linkedin'],
    },
    {
      id: '3',
      contenido: '🎁 Sorteo especial para nuestros seguidores...',
      fecha: '2024-01-17',
      hora: '12:00',
      redes: ['instagram', 'tiktok'],
    },
    {
      id: '4',
      contenido: '💬 Pregunta del día: ¿Cuál es tu favorito?',
      fecha: '2024-01-17',
      hora: '18:00',
      redes: ['twitter', 'facebook'],
    },
  ];

  const getRedIcon = (red: string) => {
    const icons: Record<string, string> = {
      facebook: '📘',
      instagram: '📷',
      twitter: '🐦',
      linkedin: '💼',
      tiktok: '🎵',
    };
    return icons[red] || '📱';
  };

  return (
    <div className="space-y-4">
      {upcomingPosts.map((post) => (
        <div
          key={post.id}
          className="flex gap-3 border-l-2 border-primary pl-3 py-2"
        >
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium line-clamp-2">{post.contenido}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {post.fecha}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {post.hora}
              </div>
            </div>
            <div className="flex gap-1">
              {post.redes.map((red) => (
                <span key={red} title={red} className="text-sm">
                  {getRedIcon(red)}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
