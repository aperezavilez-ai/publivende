import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import authRoutes from './api/auth';
import postsRoutes from './api/posts';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '/api/*',
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/posts', postsRoutes);

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './dist/client' }));
}

export default app;
