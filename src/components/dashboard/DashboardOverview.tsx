import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Eye, Heart, MessageSquare, Share2, Calendar, Zap } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { RecentPostsTable } from './RecentPostsTable';
import { UpcomingPostsCalendar } from './UpcomingPostsCalendar';

export function DashboardOverview() {
  // TODO: Fetch real data from API
  const metrics = {
    totalViews: 125430,
    totalLikes: 8920,
    totalComments: 1240,
    totalShares: 560,
    viewsChange: 12.5,
    likesChange: 8.3,
    commentsChange: -2.1,
    sharesChange: 15.7,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Vista general de tu rendimiento en redes sociales
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Programar Post
          </Button>
          <Button>
            <Zap className="mr-2 h-4 w-4" />
            Generar con Autopilot
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Vistas Totales"
          value={metrics.totalViews.toLocaleString()}
          change={metrics.viewsChange}
          icon={Eye}
        />
        <MetricCard
          title="Me Gusta"
          value={metrics.totalLikes.toLocaleString()}
          change={metrics.likesChange}
          icon={Heart}
        />
        <MetricCard
          title="Comentarios"
          value={metrics.totalComments.toLocaleString()}
          change={metrics.commentsChange}
          icon={MessageSquare}
        />
        <MetricCard
          title="Compartidos"
          value={metrics.totalShares.toLocaleString()}
          change={metrics.sharesChange}
          icon={Share2}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Recent Posts */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Posts Recientes</CardTitle>
            <CardDescription>
              Tus últimas publicaciones y su rendimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentPostsTable />
          </CardContent>
        </Card>

        {/* Upcoming Posts */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Próximas Publicaciones</CardTitle>
            <CardDescription>
              Posts programados para los próximos días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UpcomingPostsCalendar />
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Posts Este Mes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">
              +5 desde el mes pasado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Engagement Rate
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8%</div>
            <p className="text-xs text-muted-foreground">
              +0.3% desde el mes pasado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Mejor Red Social
            </CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Instagram</div>
            <p className="text-xs text-muted-foreground">
              6.2% engagement rate
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
