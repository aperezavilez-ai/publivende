import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Heart, MessageSquare, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function RecentPostsTable() {
  // TODO: Fetch real data
  const posts = [
    {
      id: '1',
      contenido: '🚀 Lanzamos nuestra nueva colección de verano! Descubre los mejores diseños...',
      redes: ['facebook', 'instagram'],
      estado: 'publicado',
      vistas: 2340,
      likes: 187,
      comentarios: 23,
      fecha: '2024-01-15',
    },
    {
      id: '2',
      contenido: '💡 Tips para mejorar tu productividad en el trabajo remoto...',
      redes: ['linkedin', 'twitter'],
      estado: 'publicado',
      vistas: 1820,
      likes: 142,
      comentarios: 31,
      fecha: '2024-01-14',
    },
    {
      id: '3',
      contenido: '🎉 Oferta especial del día! 30% de descuento en toda la tienda...',
      redes: ['instagram', 'tiktok'],
      estado: 'publicado',
      vistas: 4520,
      likes: 312,
      comentarios: 45,
      fecha: '2024-01-13',
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
      {posts.map((post) => (
        <div
          key={post.id}
          className="flex items-center justify-between border-b pb-4 last:border-0"
        >
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium line-clamp-2">{post.contenido}</p>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {post.redes.map((red) => (
                  <span key={red} title={red}>
                    {getRedIcon(red)}
                  </span>
                ))}
              </div>
              <Badge variant="outline" className="text-xs">
                {post.estado}
              </Badge>
              <span className="text-xs text-muted-foreground">{post.fecha}</span>
            </div>
          </div>

          <div className="flex items-center gap-6 ml-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>{post.vistas.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" />
              <span>{post.likes}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>{post.comentarios}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                <DropdownMenuItem>Editar</DropdownMenuItem>
                <DropdownMenuItem>Duplicar</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}
