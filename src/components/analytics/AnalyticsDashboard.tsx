import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Users, Target } from 'lucide-react';
import { EngagementChart } from './EngagementChart';
import { NetworkComparison } from './NetworkComparison';
import { TopPerformingPosts } from './TopPerformingPosts';
import { AudienceInsights } from './AudienceInsights';

export function AnalyticsDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Analytics
        </h1>
        <p className="text-muted-foreground">
          Análisis profundo de tu rendimiento en redes sociales
        </p>
      </div>

      {/* Time Period Selector */}
      <Tabs defaultValue="30d" className="space-y-6">
        <TabsList>
          <TabsTrigger value="7d">7 días</TabsTrigger>
          <TabsTrigger value="30d">30 días</TabsTrigger>
          <TabsTrigger value="90d">90 días</TabsTrigger>
          <TabsTrigger value="1y">1 año</TabsTrigger>
        </TabsList>

        <TabsContent value="30d" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alcance Total</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">245,890</div>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +18.2% vs período anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5.8%</div>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +0.7% vs período anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nuevos Seguidores</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+1,234</div>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12.5% vs período anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CTR Promedio</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3.2%</div>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +0.4% vs período anterior
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Engagement por Día</CardTitle>
                <CardDescription>Evolución del engagement en los últimos 30 días</CardDescription>
              </CardHeader>
              <CardContent>
                <EngagementChart />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comparación por Red Social</CardTitle>
                <CardDescription>Rendimiento de cada plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <NetworkComparison />
              </CardContent>
            </Card>
          </div>

          {/* Top Posts & Audience */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TopPerformingPosts />
            <AudienceInsights />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
