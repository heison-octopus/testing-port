import { createHash, randomBytes } from 'node:crypto';
import { db, id, now, verifySecret } from '../db.js';

const digest = value => createHash('sha256').update(value).digest('hex');

export function createSession(userId) {
  const token=randomBytes(32).toString('base64url');
  const requestKey=randomBytes(24).toString('base64url');
  const expires=new Date(Date.now()+8*60*60*1000).toISOString();
  db.prepare(`INSERT INTO sessions(id,token_hash,request_key_hash,user_id,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?,?,?)`)
    .run(id('SES'),digest(token),digest(requestKey),userId,expires,now(),now());
  return {token,requestKey,expires};
}

export function login(username,password){
  const user=db.prepare('SELECT * FROM users WHERE username=? AND is_active=1').get(username);
  if(!user || !verifySecret(password,user.password_hash)) return null;
  return {user,session:createSession(user.id)};
}

export function requireSession(req,res,next){
  const token=req.cookies?.bhss_session;
  const requestKey=req.get('X-Request-Key');
  if(!token || !requestKey) return res.status(401).json({error:'A valid session and request key are required.'});
  const session=db.prepare(`SELECT s.*,u.username,u.display_name,u.display_name_zh,u.role,u.is_active FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`).get(digest(token));
  if(!session || !session.is_active || session.expires_at<now() || session.request_key_hash!==digest(requestKey)) return res.status(401).json({error:'Session expired or request key is invalid.'});
  db.prepare('UPDATE sessions SET last_seen_at=? WHERE id=?').run(now(),session.id);
  req.auth={sessionId:session.id,user:{id:session.user_id,username:session.username,display_name:session.display_name,display_name_zh:session.display_name_zh,role:session.role}};
  next();
}

export function requireRoles(...roles){return (req,res,next)=>roles.includes(req.auth.user.role)?next():res.status(403).json({error:'This account does not have access to that action.'});}

export function clearSession(req){
  const token=req.cookies?.bhss_session;
  if(token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));
}
