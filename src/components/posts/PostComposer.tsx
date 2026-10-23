import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Image, Video, Calendar as CalendarIcon, Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const REDES_SOCIALES = [
  { id: 'facebook', nombre: 'Facebook', icon: '📘' },
  { id: 'instagram', nombre: 'Instagram', icon: '📷' },
  { id: 'twitter', nombre: 'Twitter', icon: '🐦' },
  { id: 'linkedin', nombre: 'LinkedIn', icon: '💼' },
  { id: 'tiktok', nombre: 'TikTok', icon: '🎵' },
];

export function PostComposer() {
  const [contenido, setContenido] = useState('');
  const [redesSeleccionadas, setRedesSeleccionadas] = useState<string[]>(['facebook', 'instagram']);
  const [fecha, setFecha] = useState<Date>();

  const handleToggleRed = (redId: string) => {
    setRedesSeleccionadas((prev) =>
      prev.includes(redId) ? prev.filter((id) => id !== redId) : [...prev, redId]
    );
  };

  const caracteresRestantes = 280 - contenido.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear Publicación</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Content Input */}
        <div className="space-y-2">
          <Label htmlFor="contenido">Contenido</Label>
          <Textarea
            id="contenido"
            placeholder="¿Qué quieres compartir?"
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            rows={6}
            className="resize-none"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{contenido.length} caracteres</span>
            <span className={cn(caracteresRestantes < 0 && 'text-red-600')}>
              {caracteresRestantes} restantes para Twitter
            </span>
          </div>
        </div>

        {/* Media Upload */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Image className="mr-2 h-4 w-4" />
            Agregar Imagen
          </Button>
          <Button variant="outline" size="sm">
            <Video className="mr-2 h-4 w-4" />
            Agregar Video
          </Button>
          <Button variant="outline" size="sm">
            <Sparkles className="mr-2 h-4 w-4" />
            Generar con IA
          </Button>
        </div>

        {/* Social Networks */}
        <div className="space-y-2">
          <Label>Publicar en:</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {REDES_SOCIALES.map((red) => (
              <div
                key={red.id}
                className={cn(
                  'flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors',
                  redesSeleccionadas.includes(red.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
                onClick={() => handleToggleRed(red.id)}
              >
                <Checkbox
                  id={red.id}
                  checked={redesSeleccionadas.includes(red.id)}
                  onCheckedChange={() => handleToggleRed(red.id)}
                />
                <label
                  htmlFor={red.id}
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <span className="text-lg">{red.icon}</span>
                  <span className="text-sm font-medium">{red.nombre}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-2">
          <Label>Programar (opcional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !fecha && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fecha ? format(fecha, 'PPP', { locale: es }) : 'Seleccionar fecha'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={fecha}
                onSelect={setFecha}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1">
            Guardar Borrador
          </Button>
          <Button className="flex-1">
            <Send className="mr-2 h-4 w-4" />
            {fecha ? 'Programar' : 'Publicar Ahora'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
