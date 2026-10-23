import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Plus, Search, Edit, Trash2, Sparkles } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function ProductosDashboard() {
  const [searchTerm, setSearchTerm] = useState('');

  const productos = [
    {
      id: '1',
      nombre: 'Crema Hidratante Facial',
      precio: 29.99,
      stock: 45,
      categoria: 'Skincare',
      imagen: '/products/crema.jpg',
      ventas: 127,
    },
    {
      id: '2',
      nombre: 'Sérum Vitamina C',
      precio: 34.99,
      stock: 32,
      categoria: 'Skincare',
      imagen: '/products/serum.jpg',
      ventas: 98,
    },
    {
      id: '3',
      nombre: 'Mascarilla Facial Purificante',
      precio: 19.99,
      stock: 0,
      categoria: 'Tratamientos',
      imagen: '/products/mascarilla.jpg',
      ventas: 156,
    },
    {
      id: '4',
      nombre: 'Aceite Esencial de Lavanda',
      precio: 24.99,
      stock: 67,
      categoria: 'Aceites',
      imagen: '/products/aceite.jpg',
      ventas: 89,
    },
  ];

  const stats = {
    totalProductos: productos.length,
    productosActivos: productos.filter(p => p.stock > 0).length,
    ventasTotales: productos.reduce((acc, p) => acc + p.ventas, 0),
    ingresoTotal: productos.reduce((acc, p) => acc + (p.ventas * p.precio), 0),
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-8 w-8 text-primary" />
            Catálogo de Productos
          </h1>
          <p className="text-muted-foreground">
            Gestiona tus productos y genera contenido automático
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Sparkles className="mr-2 h-4 w-4" />
            Generar Posts
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProductos}</div>
            <p className="text-xs text-muted-foreground">
              {stats.productosActivos} en stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ventasTotales}</div>
            <p className="text-xs text-muted-foreground">unidades vendidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingreso Total</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.ingresoTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precio Promedio</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats.ingresoTotal / stats.ventasTotales).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">por producto</p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Todos los Productos</CardTitle>
              <CardDescription>Gestiona tu inventario y precios</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Ventas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.map((producto) => (
                <TableRow key={producto.id}>
                  <TableCell className="font-medium">{producto.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{producto.categoria}</Badge>
                  </TableCell>
                  <TableCell>${producto.precio}</TableCell>
                  <TableCell>
                    {producto.stock === 0 ? (
                      <Badge variant="destructive">Agotado</Badge>
                    ) : producto.stock < 20 ? (
                      <Badge variant="secondary">{producto.stock}</Badge>
                    ) : (
                      <span className="text-muted-foreground">{producto.stock}</span>
                    )}
                  </TableCell>
                  <TableCell>{producto.ventas}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
