import express from 'express';
import { randomBytes } from 'node:crypto';
import { identityRepository } from './repositories/identityRepository.js';
import { identityService } from './services/identityService.js';
import { HttpError } from './services/access.js';
import { api } from './routes/api.js';

const app = express();
const sessions = new Map();
const cookieName = 'bhss_playground_v2';

app.use(express.json({ limit: '96kb' }));

app.get('/api/v2/demo/users', (_req, res) => res.json(identityService.demoUsers()));
app.post('/api/v2/demo/session', (req, res, next) => {
  try {
    const user = identityRepository.user(req.body.userId);
    if (!user) throw new HttpError(400, 'Unknown demo account');
    const token = randomBytes(32).toString('hex'), key = randomBytes(24).toString('hex');
    sessions.set(token, { user, key });
    identityRepository.audit(user.school_id, user.user_id, 'session.started', 'session', token.slice(0, 12));
    res.setHeader('Set-Cookie', `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/`);
    res.json({ key });
  } catch (error) { next(error); }
});

app.use('/api/v2', (req, _res, next) => {
  const token = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  const session = sessions.get(token);
  if (!session) return next(new HttpError(401, 'Sign in required'));
  if (req.headers['x-request-key'] !== session.key) return next(new HttpError(403, 'Invalid request key'));
  req.user = session.user;
  req.sessionToken = token;
  next();
});

app.post('/api/v2/logout', (req, res) => {
  sessions.delete(req.sessionToken);
  identityRepository.audit(req.user.school_id, req.user.user_id, 'session.ended', 'session', req.sessionToken.slice(0, 12));
  res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
  res.json({ ok: true });
});

app.use('/api/v2', api);
app.use('/api/v2', (_req, res) => res.status(404).json({ error: 'API route not found' }));
app.use((error, _req, res, _next) => {
  if (!(error instanceof HttpError)) console.error(error);
  res.status(error.status || 500).json({ error: error.status ? error.message : 'Unexpected server error' });
});

const port = Number(process.env.PORT || 3200);
app.listen(port, '127.0.0.1', () => console.log(`Playground v2 API: http://127.0.0.1:${port}/api/v2`));
