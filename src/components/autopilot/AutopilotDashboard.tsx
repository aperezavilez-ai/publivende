import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, CheckCircle, XCircle, Calendar, Sparkles } from 'lucide-react';
import { AutopilotPostCard } from './AutopilotPostCard';
import { AutopilotSettings } from './AutopilotSettings';

export function AutopilotDashboard() {
  const [autopilotEnabled, setAutopilotEnabled] = useState(true);

  const stats = {
    postsGenerated: 47,
    postsApproved: 42,
    postsRejected: 5,
    upcomingPosts: 8,
  };

  const pendingPosts = [
    {
      id: '1',
      contenido: '🌟 ¿Sabías que nuestros productos están hechos con materiales 100% sostenibles? Cuida del planeta mientras cuidas de ti. #Sostenibilidad #EcoFriendly',
      sugerenciaImagen: 'Imagen de productos ecológicos en un ambiente natural con tonos verdes',
      redesRecomendadas: ['instagram', 'facebook'],
      mejorHorario: '14:30',
      razonamiento: 'Contenido educativo que conecta con los valores de la marca. Horario óptimo para engagement en Instagram.',
      generadoAt: '2024-01-16T10:00:00Z',
    },
    {
      id: '2',
      contenido: '💡 Tip del día: Combina nuestra crema hidratante con el sérum para potenciar sus efectos. Tu piel te lo agradecerá ✨',
      sugerenciaImagen: 'Flat lay de los dos productos mencionados con elementos decorativos minimalistas',
      redesRecomendadas: ['instagram', 'tiktok'],
      mejorHorario: '18:00',
      razonamiento: 'Tips de valor agregado generan alta interacción. Formato ideal para reels de TikTok.',
      generadoAt: '2024-01-16T10:15:00Z',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Autopilot
          </h1>
          <p className="text-muted-foreground">
            IA genera contenido automáticamente basado en tu marca
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Autopilot</span>
            <Switch
              checked={autopilotEnabled}
              onCheckedChange={setAutopilotEnabled}
            />
          </div>
          <Button variant="outline">
            <Sparkles className="mr-2 h-4 w-4" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posts Generados</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.postsGenerated}</div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.postsApproved}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.postsApproved / stats.postsGenerated) * 100).toFixed(1)}% tasa de aprobación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rechazados</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.postsRejected}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.postsRejected / stats.postsGenerated) * 100).toFixed(1)}% tasa de rechazo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingPosts}</div>
            <p className="text-xs text-muted-foreground">Posts programados</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Posts Pendientes de Aprobación</CardTitle>
          <CardDescription>
            Revisa y aprueba el contenido generado por Autopilot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {pendingPosts.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No hay posts pendientes de aprobación
              </p>
              <Button className="mt-4">
                <Sparkles className="mr-2 h-4 w-4" />
                Generar Nuevo Contenido
              </Button>
            </div>
          ) : (
            pendingPosts.map((post) => (
              <AutopilotPostCard key={post.id} post={post} />
            ))
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <AutopilotSettings />
    </div>
  );
}
