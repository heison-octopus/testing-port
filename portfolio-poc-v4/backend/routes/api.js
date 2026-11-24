import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes, randomUUID } from 'node:crypto';
import { AppError, ensure } from '../utils/errors.js';
import { controllers } from '../controllers/foundation.js';

export function api(service, { sessionTtl = 8 * 60 * 60 * 1000, accessTtl = 15 * 60 * 1000, rotationTtl = 60 * 60 * 1000 } = {}) {
  const router = Router(), sessions = new Map(), keys = new Map();
  let currentKey = null, rotatedAt = 0;
  const now = () => Date.now();
  const rotateKey = () => { const kid = randomUUID(); currentKey = kid; keys.set(kid, randomBytes(48).toString('base64url')); rotatedAt = now(); for (const [id, created] of keys) if (now() - created > 2 * sessionTtl) keys.delete(id); };
  rotateKey();
  const ensureKey = () => { if (now() - rotatedAt >= rotationTtl) rotateKey(); };
  const sign = (payload, ttl) => { ensureKey(); return jwt.sign({ ...payload, kid: currentKey }, keys.get(currentKey), { algorithm: 'HS256', expiresIn: Math.ceil(ttl / 1000), issuer: 'bhss-v4', audience: 'bhss-client' }); };
  const verify = token => { try { ensureKey(); const decoded = jwt.decode(token) || {}; const secret = keys.get(decoded.kid); ensure(secret, 401, 'Token key expired'); return jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'bhss-v4', audience: 'bhss-client' }); } catch (error) { if (error.status) throw error; throw new AppError(401, 'Invalid or expired JWT'); } };
  const cookie = (req, name) => req.headers.cookie?.split('; ').find(s => s.startsWith(`${name}=`))?.slice(name.length + 1);
  const setCookie = (res, name, value, age) => res.append('Set-Cookie', `${name}=${value}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${age}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  const setTokens = (res, session) => { const access = sign({ sub: session.userId, sid: session.id, typ: 'access' }, accessTtl); const refresh = sign({ sub: session.userId, sid: session.id, jti: session.refreshJti, typ: 'refresh' }, sessionTtl); setCookie(res, 'bhss_v4_access', access, Math.ceil(accessTtl / 1000)); setCookie(res, 'bhss_v4_refresh', refresh, Math.ceil(sessionTtl / 1000)); };
  const c = controllers(service);
  const attempts = new Map();
  router.post('/session', (req, res) => {
    const origin = req.headers.origin; ensure(!origin || new URL(origin).host === req.headers.host, 403, 'Origin mismatch');
    const ip = req.ip, record = attempts.get(ip) || { count: 0, until: now() }; if (now() > record.until) { record.count = 0; record.until = now() + 900000; } ensure(record.count < 5, 429, 'Too many sign-in attempts'); record.count++;
    const user = service.authenticate(req.body.identifier || req.body.email, req.body.password); attempts.delete(ip); const session = { id: randomUUID(), userId: user.id, key: randomBytes(32).toString('hex'), expires: now() + sessionTtl, refreshJti: randomUUID() }; sessions.set(session.id, session); setTokens(res, session); res.json({ ...service.scope(user), requestKey: session.key, tokenType: 'JWT', accessExpiresInMs: accessTtl, refreshExpiresInMs: sessionTtl, keyId: currentKey });
  });
  router.post('/session/refresh', (req, res) => { const token = cookie(req, 'bhss_v4_refresh'); ensure(token, 401, 'Refresh token required'); const claims = verify(token); ensure(claims.typ === 'refresh', 401, 'Refresh token required'); const session = sessions.get(claims.sid); ensure(session && session.refreshJti === claims.jti && session.expires > now(), 401, 'Session revoked'); session.refreshJti = randomUUID(); session.expires = now() + sessionTtl; setTokens(res, session); res.json({ ...service.scope(service.user(session.userId)), requestKey: session.key, tokenType: 'JWT', accessExpiresInMs: accessTtl, refreshExpiresInMs: sessionTtl, keyId: currentKey }); });
  router.use((req, res, next) => { const token = cookie(req, 'bhss_v4_access'); ensure(token, 401, 'Sign in required'); const claims = verify(token); ensure(claims.typ === 'access', 401, 'Access token required'); const session = sessions.get(claims.sid); ensure(session && session.expires > now() && session.userId === claims.sub, 401, 'Session revoked'); req.user = service.user(session.userId); req.session = session; req.claims = claims; if (!['GET', 'HEAD'].includes(req.method)) { ensure(req.headers['x-request-key'] === session.key, 403, 'Request key required'); const origin = req.headers.origin; ensure(!origin || new URL(origin).host === req.headers.host, 403, 'Origin mismatch'); } next(); });
  router.get('/session', (req, res) => res.json({ ...service.scope(req.user), requestKey: req.session.key, tokenType: 'JWT', accessExpiresInMs: accessTtl, refreshExpiresInMs: req.session.expires - now(), keyId: req.claims.kid }));
  router.delete('/session', (req, res) => { sessions.delete(req.session.id); setCookie(res, 'bhss_v4_access', '', 0); setCookie(res, 'bhss_v4_refresh', '', 0); res.status(204).end(); });
  router.get('/workspace', c.workspace);
  router.get('/activities', (req, res) => res.json(service.listActivities(req.user)));
  router.post('/assignments/import/preview', (req, res) => res.json(service.previewAssignmentImport(req.user, req.body)));
  router.post('/assignments/import/commit', (req, res) => res.status(201).json(service.commitAssignmentImport(req.user, req.body)));
  router.post('/people/import/preview', (req, res) => res.json(service.previewUserImport(req.user, req.body)));
  router.post('/people/import/commit', (req, res) => res.status(201).json(service.commitUserImport(req.user, req.body)));
  router.get('/people/export.csv', (req, res) => { const filtered = req.query.status || req.query.user_kind || req.query.q; const fileName = filtered ? 'users-filtered.csv' : 'users.csv'; res.type('text/csv').set('Content-Disposition', `attachment; filename="${fileName}"`).send(service.exportUsers(req.user, req.query)); });
  router.delete('/people/:id', (req, res) => { const result = service.disablePerson(req.user, req.params.id, req.body); for (const [id, session] of sessions) if (session.userId === req.params.id) sessions.delete(id); res.json(result); });
  router.get('/assignments/export.csv', (req, res) => { res.type('text/csv').set('Content-Disposition', 'attachment; filename="assignments.csv"').send(service.exportAssignments(req.user)); });
  router.post('/role-refresh/preview', (req, res) => res.json(service.previewRoleRefresh(req.user, req.body)));
  router.post('/role-refresh/commit', (req, res) => res.status(201).json(service.commitRoleRefresh(req.user, req.body)));
  router.post('/activities', (req, res) => res.status(201).json(service.createActivity(req.user, req.body)));
  router.get('/activities/:id', (req, res) => res.json(service.activity(req.user, req.params.id)));
  router.get('/activities/:id/participants', (req, res) => res.json(service.activityParticipants(req.user, req.params.id)));
  router.patch('/activities/:id', (req, res) => res.json(service.updateActivity(req.user, req.params.id, req.body)));
  router.delete('/activities/:id', (req, res) => res.json(service.removeActivity(req.user, req.params.id, req.body)));
  for (const [path, table, create] of [['people', 'users', 'createPerson'], ['roles', 'roles', 'createRole'], ['school-definitions', 'school_definitions', 'createDefinition'], ['assignments', 'assignments', 'assign'], ['record-links', 'record_links', 'link']]) { router.get(`/${path}`, c.list(table)); router.post(`/${path}`, c.create(create)); }
  router.get('/roles/:id/permissions', (req, res) => res.json(service.listRolePermissions(req.user, req.params.id)));
  router.patch('/roles/:id/permissions', (req, res) => res.json(service.updateRolePermissions(req.user, req.params.id, req.body)));
  router.get('/people/:id', c.person); router.patch('/assignments/:id', c.deassign); router.get('/audit/events', c.events); router.get('/audit/events/:id', c.snapshot);
  return router;
}
