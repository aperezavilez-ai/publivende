import { Hono } from 'hono';
import { db } from '@/db';
import { posts, postNetworks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateAutopilotContent } from '@/lib/ai/autopilot';

const app = new Hono();

// GET /api/posts - Listar posts
app.get('/', async (c) => {
  const userId = c.get('userId'); // TODO: Get from auth middleware

  const allPosts = await db.query.posts.findMany({
    where: eq(posts.userId, userId),
    orderBy: [desc(posts.createdAt)],
    limit: 50,
    with: {
      postNetworks: true,
    },
  });

  return c.json({ posts: allPosts });
});

// POST /api/posts - Crear post
app.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const { contenido, redes, fechaProgramada, medios, contenidoPorRed } = body;

  const [post] = await db
    .insert(posts)
    .values({
      userId,
      contenido,
      estado: fechaProgramada ? 'programado' : 'borrador',
      fechaProgramada: fechaProgramada ? new Date(fechaProgramada) : undefined,
      medios: medios || [],
      contenidoPorRed: contenidoPorRed || {},
    })
    .returning();

  // Crear entradas para cada red social
  if (redes && redes.length > 0) {
    await db.insert(postNetworks).values(
      redes.map((red: string) => ({
        postId: post.id,
        connectionId: body.connections[red], // Connection ID por red
        red,
        estado: 'pendiente',
      }))
    );
  }

  return c.json({ post }, 201);
});

// POST /api/posts/generate - Generar con Autopilot
app.post('/generate', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const { tema, tipoContenido, recetaId } = body;

  try {
    const result = await generateAutopilotContent({
      userId,
      tema,
      tipoContenido,
      recetaId,
    });

    return c.json({ result });
  } catch (error) {
    return c.json({ error: 'Error generando contenido' }, 500);
  }
});

// GET /api/posts/:id - Obtener post específico
app.get('/:id', async (c) => {
  const postId = c.req.param('id');
  const userId = c.get('userId');

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      postNetworks: {
        with: {
          connection: true,
        },
      },
    },
  });

  if (!post || post.userId !== userId) {
    return c.json({ error: 'Post no encontrado' }, 404);
  }

  return c.json({ post });
});

// PATCH /api/posts/:id - Actualizar post
app.patch('/:id', async (c) => {
  const postId = c.req.param('id');
  const userId = c.get('userId');
  const body = await c.req.json();

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post || post.userId !== userId) {
    return c.json({ error: 'Post no encontrado' }, 404);
  }

  const [updatedPost] = await db
    .update(posts)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId))
    .returning();

  return c.json({ post: updatedPost });
});

// DELETE /api/posts/:id - Eliminar post
app.delete('/:id', async (c) => {
  const postId = c.req.param('id');
  const userId = c.get('userId');

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post || post.userId !== userId) {
    return c.json({ error: 'Post no encontrado' }, 404);
  }

  await db.delete(posts).where(eq(posts.id, postId));

  return c.json({ success: true });
});

export default app;
