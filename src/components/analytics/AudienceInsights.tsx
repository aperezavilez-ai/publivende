import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function AudienceInsights() {
  const demographics = {
    age: [
      { range: '18-24', percentage: 15 },
      { range: '25-34', percentage: 42 },
      { range: '35-44', percentage: 28 },
      { range: '45-54', percentage: 10 },
      { range: '55+', percentage: 5 },
    ],
    gender: [
      { type: 'Mujeres', percentage: 58 },
      { type: 'Hombres', percentage: 40 },
      { type: 'Otro', percentage: 2 },
    ],
    topLocations: [
      { city: 'Ciudad de México', percentage: 35 },
      { city: 'Guadalajara', percentage: 18 },
      { city: 'Monterrey', percentage: 15 },
      { city: 'Puebla', percentage: 12 },
      { city: 'Otras', percentage: 20 },
    ],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insights de Audiencia</CardTitle>
        <CardDescription>Demografía de tus seguidores</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Edad</h4>
          {demographics.age.map((item) => (
            <div key={item.range} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.range}</span>
                <span className="font-medium">{item.percentage}%</span>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Género</h4>
          {demographics.gender.map((item) => (
            <div key={item.type} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.type}</span>
                <span className="font-medium">{item.percentage}%</span>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Ubicaciones Principales</h4>
          {demographics.topLocations.map((item) => (
            <div key={item.city} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.city}</span>
              <span className="font-medium">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
