import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Users, Clock, CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function WhatsAppDashboard() {
  const stats = {
    mensajesEnviados: 1234,
    conversacionesActivas: 45,
    tiempoRespuesta: '2.5 min',
    tasaRespuesta: 94,
  };

  const conversaciones = [
    {
      id: '1',
      contacto: 'María García',
      ultimoMensaje: 'Hola, quisiera información sobre sus productos',
      timestamp: '10:30 AM',
      noLeidos: 2,
      estado: 'activa',
    },
    {
      id: '2',
      contacto: 'Juan Pérez',
      ultimoMensaje: '¿Tienen envíos a domicilio?',
      timestamp: '9:45 AM',
      noLeidos: 0,
      estado: 'respondida',
    },
    {
      id: '3',
      contacto: 'Ana Martínez',
      ultimoMensaje: 'Muchas gracias por la información',
      timestamp: 'Ayer',
      noLeidos: 0,
      estado: 'cerrada',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-primary" />
            WhatsApp Business
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus conversaciones y automatiza respuestas
          </p>
        </div>
        <Button>
          <MessageCircle className="mr-2 h-4 w-4" />
          Nueva Conversación
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensajes Enviados</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mensajesEnviados.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversaciones Activas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversacionesActivas}</div>
            <p className="text-xs text-muted-foreground">requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo de Respuesta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tiempoRespuesta}</div>
            <p className="text-xs text-muted-foreground">promedio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Respuesta</CardTitle>
            <CheckCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasaRespuesta}%</div>
            <p className="text-xs text-muted-foreground">mensajes respondidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversations */}
      <Card>
        <CardHeader>
          <CardTitle>Conversaciones Recientes</CardTitle>
          <CardDescription>Administra tus chats de WhatsApp Business</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversaciones.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold">{conv.contacto}</h4>
                      <span className="text-xs text-muted-foreground">{conv.timestamp}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {conv.ultimoMensaje}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {conv.noLeidos > 0 && (
                    <Badge className="bg-green-600">{conv.noLeidos}</Badge>
                  )}
                  <Badge variant="outline">
                    {conv.estado === 'activa' ? '🟢' : conv.estado === 'respondida' ? '🔵' : '⚪'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Responses */}
      <Card>
        <CardHeader>
          <CardTitle>Respuestas Rápidas</CardTitle>
          <CardDescription>Plantillas para responder más rápido</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Button variant="outline" className="justify-start h-auto py-3">
              <div className="text-left">
                <div className="font-semibold">Saludo Inicial</div>
                <div className="text-xs text-muted-foreground">
                  ¡Hola! Gracias por contactarnos...
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3">
              <div className="text-left">
                <div className="font-semibold">Información de Productos</div>
                <div className="text-xs text-muted-foreground">
                  Te comparto información sobre...
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3">
              <div className="text-left">
                <div className="font-semibold">Horario de Atención</div>
                <div className="text-xs text-muted-foreground">
                  Nuestro horario es de lunes a viernes...
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3">
              <div className="text-left">
                <div className="font-semibold">Seguimiento de Pedido</div>
                <div className="text-xs text-muted-foreground">
                  Para revisar tu pedido necesito...
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
