import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { ensure } from '../utils/errors.js';
import { controllers } from '../controllers/foundation.js';
export function api(service, {
  sessionTtl = 3600000
} = {}) {
  const router = Router(),
    sessions = new Map(),
    c = controllers(service);
  const cookie = req => req.headers.cookie?.split('; ').find(s => s.startsWith('bhss_v4='))?.slice(8);
  const setCookie = (res, value, age) => res.setHeader('Set-Cookie', `bhss_v4=${value}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${age}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  const attempts = new Map();
  router.post('/session', (req, res) => {
    const origin = req.headers.origin;
    ensure(!origin || new URL(origin).host === req.headers.host, 403, 'Origin mismatch');
    const ip = req.ip;
    const now = Date.now();
    const attempt = attempts.get(ip) || {
      count: 0,
      until: now + 60000
    };
    if (now > attempt.until) {
      attempt.count = 0;
      attempt.until = now + 60000;
    }
    ensure(attempt.count < 20, 429, 'Too many sign-in attempts');
    attempt.count++;
    attempts.set(ip, attempt);
    const user = service.authenticate(req.body.email, req.body.password);
    attempts.delete(ip);
    const previous = cookie(req);
    if (previous) sessions.delete(previous);
    const token = randomBytes(32).toString('hex'),
      key = randomBytes(32).toString('hex');
    sessions.set(token, {
      userId: user.id,
      key,
      expires: now + sessionTtl
    });
    setCookie(res, token, Math.ceil(sessionTtl / 1000));
    res.json({
      ...service.scope(user),
      requestKey: key
    });
  });
  router.use((req, res, next) => {
    const token = cookie(req),
      session = sessions.get(token);
    if (session && session.expires <= Date.now()) sessions.delete(token);
    ensure(session && session.expires > Date.now(), 401, 'Sign in required');
    req.user = service.user(session.userId);
    req.session = session;
    req.token = token;
    if (!['GET', 'HEAD'].includes(req.method)) {
      ensure(req.headers['x-request-key'] === session.key, 403, 'Request key required');
      const origin = req.headers.origin;
      ensure(!origin || new URL(origin).host === req.headers.host, 403, 'Origin mismatch');
    }
    next();
  });
  router.get('/session', (req, res) => res.json({
    ...service.scope(req.user),
    requestKey: req.session.key
  }));
  router.delete('/session', (req, res) => {
    sessions.delete(req.token);
    setCookie(res, '', 0);
    res.status(204).end();
  });
  router.get('/workspace', c.workspace);
  for (const [path, table, create] of [['people', 'users', 'createPerson'], ['roles', 'roles', 'createRole'], ['school-definitions', 'school_definitions', 'createDefinition'], ['assignments', 'assignments', 'assign'], ['record-links', 'record_links', 'link']]) {
    router.get(`/${path}`, c.list(table));
    router.post(`/${path}`, c.create(create));
  }
  router.get('/people/:id', c.person);
  router.patch('/assignments/:id', c.deassign);
  router.get('/audit/events', c.events);
  router.get('/audit/events/:id', c.snapshot);
  return router;
}
