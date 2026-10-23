import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PostComposer } from '@/components/posts/PostComposer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function CalendarioView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showComposer, setShowComposer] = useState(false);

  // Mock scheduled posts
  const scheduledPosts = [
    {
      id: '1',
      date: '2024-01-16',
      time: '10:00',
      contenido: '🌟 Nuevo producto disponible! No te lo pierdas...',
      redes: ['facebook', 'instagram'],
    },
    {
      id: '2',
      date: '2024-01-16',
      time: '15:30',
      contenido: '📊 Estadísticas del mes: Resultados increíbles...',
      redes: ['linkedin'],
    },
    {
      id: '3',
      date: '2024-01-17',
      time: '12:00',
      contenido: '🎁 Sorteo especial para nuestros seguidores...',
      redes: ['instagram', 'tiktok'],
    },
  ];

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const getPostsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return scheduledPosts.filter((post) => post.date === dateStr);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Calendario de Contenido
          </h1>
          <p className="text-muted-foreground">
            Planifica y programa tus publicaciones
          </p>
        </div>
        <Dialog open={showComposer} onOpenChange={setShowComposer}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Publicación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Publicación</DialogTitle>
            </DialogHeader>
            <PostComposer />
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar */}
      <Card className="p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setCurrentDate(newDate);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setMonth(newDate.getMonth() + 1);
              setCurrentDate(newDate);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day Headers */}
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
            <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {/* Empty cells for days before month start */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const posts = getPostsForDay(day);
            const isToday =
              day === new Date().getDate() &&
              currentDate.getMonth() === new Date().getMonth() &&
              currentDate.getFullYear() === new Date().getFullYear();

            return (
              <div
                key={day}
                className={`aspect-square border rounded-lg p-2 ${
                  isToday ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="font-semibold text-sm mb-1">{day}</div>
                <div className="space-y-1">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded truncate cursor-pointer hover:bg-primary/20"
                      title={post.contenido}
                    >
                      {post.time} {post.redes[0] === 'facebook' ? '📘' : '📷'}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
