import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Plus, TrendingUp, Calendar, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function CampanasDashboard() {
  const campanas = [
    {
      id: '1',
      nombre: 'Lanzamiento Verano 2024',
      estado: 'activa',
      fechaInicio: '2024-01-01',
      fechaFin: '2024-03-31',
      objetivo: 50000,
      alcanzado: 32500,
      posts: 24,
      engagement: 6.2,
    },
    {
      id: '2',
      nombre: 'Black Friday Especial',
      estado: 'programada',
      fechaInicio: '2024-11-20',
      fechaFin: '2024-11-30',
      objetivo: 100000,
      alcanzado: 0,
      posts: 15,
      engagement: 0,
    },
    {
      id: '3',
      nombre: 'San Valentín Love Campaign',
      estado: 'completada',
      fechaInicio: '2024-02-01',
      fechaFin: '2024-02-14',
      objetivo: 30000,
      alcanzado: 35420,
      posts: 18,
      engagement: 7.8,
    },
  ];

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'activa':
        return <Badge className="bg-green-600">Activa</Badge>;
      case 'programada':
        return <Badge variant="secondary">Programada</Badge>;
      case 'completada':
        return <Badge variant="outline">Completada</Badge>;
      default:
        return <Badge>{estado}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-primary" />
            Campañas de Marketing
          </h1>
          <p className="text-muted-foreground">
            Organiza y optimiza tus campañas de contenido
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Campaña
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campañas Activas</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campanas.filter((c) => c.estado === 'activa').length}
            </div>
            <p className="text-xs text-muted-foreground">de {campanas.length} totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alcance Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campanas.reduce((acc, c) => acc + c.alcanzado, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">personas alcanzadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posts Publicados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campanas.reduce((acc, c) => acc + c.posts, 0)}
            </div>
            <p className="text-xs text-muted-foreground">en todas las campañas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Promedio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                campanas.reduce((acc, c) => acc + c.engagement, 0) / campanas.length
              ).toFixed(1)}
              %
            </div>
            <p className="text-xs text-muted-foreground">tasa de engagement</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {campanas.map((campana) => (
          <Card key={campana.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle>{campana.nombre}</CardTitle>
                  <CardDescription>
                    {campana.fechaInicio} - {campana.fechaFin}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {getEstadoBadge(campana.estado)}
                  <Button variant="outline" size="sm">
                    Ver Detalles
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progreso del objetivo</span>
                    <span className="font-medium">
                      {campana.alcanzado.toLocaleString()} / {campana.objetivo.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={(campana.alcanzado / campana.objetivo) * 100}
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground">
                    {((campana.alcanzado / campana.objetivo) * 100).toFixed(1)}% completado
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Posts</p>
                    <p className="text-2xl font-bold">{campana.posts}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Alcance</p>
                    <p className="text-2xl font-bold">{campana.alcanzado.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Engagement</p>
                    <p className="text-2xl font-bold">{campana.engagement}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
