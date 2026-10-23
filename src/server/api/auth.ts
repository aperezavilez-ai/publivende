import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';
import { authenticateUser, createUser } from '@/lib/auth';

const app = new Hono();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// POST /api/auth/register
app.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { email, nombre, password } = body;

    if (!email || !nombre || !password) {
      return c.json({ error: 'Todos los campos son requeridos' }, 400);
    }

    const user = await createUser({ email, nombre, password });

    const token = await sign(
      {
        sub: user.id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 días
      },
      JWT_SECRET
    );

    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 días
    });

    return c.json({ user, token });
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique constraint violation
      return c.json({ error: 'El email ya está registrado' }, 409);
    }
    return c.json({ error: 'Error creando usuario' }, 500);
  }
});

// POST /api/auth/login
app.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: 'Email y contraseña son requeridos' }, 400);
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      return c.json({ error: 'Credenciales inválidas' }, 401);
    }

    const token = await sign(
      {
        sub: user.id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      },
      JWT_SECRET
    );

    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return c.json({ user, token });
  } catch (error) {
    return c.json({ error: 'Error iniciando sesión' }, 500);
  }
});

// POST /api/auth/logout
app.post('/logout', async (c) => {
  setCookie(c, 'auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
  });

  return c.json({ success: true });
});

// GET /api/auth/me
app.get('/me', async (c) => {
  const userId = c.get('userId'); // Set by auth middleware

  if (!userId) {
    return c.json({ error: 'No autenticado' }, 401);
  }

  const { getUserById } = await import('@/lib/auth');
  const user = await getUserById(userId);

  if (!user) {
    return c.json({ error: 'Usuario no encontrado' }, 404);
  }

  return c.json({ user });
});

export default app;
