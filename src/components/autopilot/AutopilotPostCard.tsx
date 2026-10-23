import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Edit, Clock, Image, Brain } from 'lucide-react';

interface AutopilotPostCardProps {
  post: {
    id: string;
    contenido: string;
    sugerenciaImagen: string;
    redesRecomendadas: string[];
    mejorHorario: string;
    razonamiento: string;
    generadoAt: string;
  };
}

export function AutopilotPostCard({ post }: AutopilotPostCardProps) {
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
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">IA Generado</Badge>
              <Badge variant="outline">
                <Clock className="mr-1 h-3 w-3" />
                {post.mejorHorario}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            {post.redesRecomendadas.map((red) => (
              <span key={red} title={red} className="text-lg">
                {getRedIcon(red)}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <p className="text-base leading-relaxed">{post.contenido}</p>

          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Image className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Sugerencia de imagen:</span> {post.sugerenciaImagen}
              </p>
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg border-l-4 border-primary">
            <div className="flex items-start gap-2">
              <Brain className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <p className="text-sm">
                <span className="font-medium text-primary">Por qué funcionará:</span>{' '}
                {post.razonamiento}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm">
              <XCircle className="mr-2 h-4 w-4" />
              Rechazar
            </Button>
            <Button size="sm">
              <CheckCircle className="mr-2 h-4 w-4" />
              Aprobar y Programar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
