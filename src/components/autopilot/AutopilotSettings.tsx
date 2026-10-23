import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings, Save } from 'lucide-react';

export function AutopilotSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración de Autopilot
        </CardTitle>
        <CardDescription>
          Personaliza cómo el Autopilot genera contenido para tu marca
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="industria">Industria</Label>
            <Input id="industria" placeholder="Ej: E-commerce de belleza" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tono">Tono de Marca</Label>
            <Select defaultValue="profesional">
              <SelectTrigger id="tono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profesional">Profesional</SelectItem>
                <SelectItem value="casual">Casual y cercano</SelectItem>
                <SelectItem value="inspirador">Inspirador</SelectItem>
                <SelectItem value="divertido">Divertido</SelectItem>
                <SelectItem value="educativo">Educativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="audiencia">Audiencia Objetivo</Label>
          <Textarea
            id="audiencia"
            placeholder="Describe tu audiencia objetivo: edad, intereses, comportamientos..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="productos">Productos/Servicios</Label>
          <Textarea
            id="productos"
            placeholder="Lista tus principales productos o servicios..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="propuesta">Propuesta de Valor</Label>
          <Textarea
            id="propuesta"
            placeholder="¿Qué te hace único? ¿Por qué deberían elegirte?"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hashtags">Hashtags Favoritos (separados por coma)</Label>
          <Input
            id="hashtags"
            placeholder="#marketing, #emprendimiento, #negocios"
          />
        </div>

        <div className="space-y-4">
          <Label>Horarios de Publicación</Label>
          <div className="space-y-3">
            {['Lunes', 'Miércoles', 'Viernes'].map((dia) => (
              <div key={dia} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium">{dia}</div>
                <Input type="time" defaultValue="14:00" className="w-32" />
                <Select defaultValue="simple">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Post Simple</SelectItem>
                    <SelectItem value="carrusel">Carrusel</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="historia">Historia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Guardar Configuración
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
