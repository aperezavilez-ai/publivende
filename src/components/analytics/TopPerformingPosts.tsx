import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Heart, MessageSquare } from 'lucide-react';

export function TopPerformingPosts() {
  const topPosts = [
    {
      id: '1',
      contenido: '🎉 Oferta especial del día! 30% de descuento...',
      red: 'Instagram',
      vistas: 8920,
      likes: 567,
      comentarios: 89,
      engagementRate: 7.3,
    },
    {
      id: '2',
      contenido: '💡 Tips para mejorar tu productividad...',
      red: 'LinkedIn',
      vistas: 6540,
      likes: 432,
      comentarios: 67,
      engagementRate: 7.6,
    },
    {
      id: '3',
      contenido: '🌟 Nuevo producto disponible ahora...',
      red: 'Facebook',
      vistas: 7230,
      likes: 489,
      comentarios: 54,
      engagementRate: 7.5,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Posts con Mejor Rendimiento</CardTitle>
        <CardDescription>Tus publicaciones más exitosas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {topPosts.map((post, index) => (
          <div key={post.id} className="flex items-center gap-4 border-b pb-4 last:border-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              {index + 1}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium line-clamp-1">{post.contenido}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Badge variant="outline">{post.red}</Badge>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {post.vistas.toLocaleString()}
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {post.likes}
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {post.comentarios}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">{post.engagementRate}%</div>
              <div className="text-xs text-muted-foreground">engagement</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
