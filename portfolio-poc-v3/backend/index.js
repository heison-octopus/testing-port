import express from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import api from './routes/api.js';
const app=express(),sessions=new Map();app.use(express.json());
// Synthetic local accounts only. These are test capabilities, not BHSS role policies.
const accounts={superAdmin:{role:'SuperAdmin (test label)',write:true},Admin:{role:'SchoolAdmin',write:true},teacher:{role:'Teacher',write:false,className:'1A',school:'Demo school'},superTeacher:{role:'SuperTeacher',write:false,className:'1A',school:'Demo school'},student:{role:'Student',write:false,className:'1A',school:'Demo school'},user:{role:'User (test label)',write:false},denied:{role:'Denied test account',denied:true}};
const signingKey=process.env.V3_JWT_SECRET || randomBytes(48).toString('hex');
const lifetimeSeconds=Number(process.env.V3_SESSION_TTL_SECONDS ?? 3600);
if(!Number.isSafeInteger(lifetimeSeconds)||lifetimeSeconds<1)throw new Error('V3_SESSION_TTL_SECONDS must be a positive integer');
const secure=process.env.V3_COOKIE_SECURE==='true';const cookieOptions={httpOnly:true,sameSite:'strict',secure,path:'/'};
function cookie(req){return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('v3_session='))?.slice(11);}
function claims(req){try{return jwt.verify(cookie(req)||'',signingKey,{algorithms:['HS256']});}catch{return null}}
function revoke(req){const payload=claims(req);if(payload?.jti)sessions.delete(payload.jti);}
function matches(password){const supplied=Buffer.from(typeof password==='string'?password:'');const expected=Buffer.from('123');return supplied.length===expected.length&&timingSafeEqual(supplied,expected);}
app.post('/api/session',(req,res)=>{revoke(req);res.clearCookie('v3_session',cookieOptions);const account=Object.hasOwn(accounts,req.body?.account||'')?accounts[req.body.account]:null;if(!account||!matches(req.body?.password))return res.status(401).json({error:'Invalid account ID or password'});const jti=randomBytes(32).toString('hex'),key=randomBytes(32).toString('hex');sessions.set(jti,{account:req.body.account,key});const token=jwt.sign({sub:req.body.account},signingKey,{algorithm:'HS256',jwtid:jti,expiresIn:lifetimeSeconds});res.cookie('v3_session',token,{...cookieOptions,maxAge:lifetimeSeconds*1000});res.json({account:req.body.account,role:account.role,school:account.school||null,className:account.className||null,key});});
app.get('/api/session',(req,res)=>{const payload=claims(req),session=payload&&sessions.get(payload.jti);if(!session||session.account!==payload.sub){res.clearCookie('v3_session',cookieOptions);return res.status(401).json({error:'Sign in required'});}const account=accounts[session.account];res.set('Cache-Control','no-store');res.json({account:session.account,role:account.role,school:account.school||null,className:account.className||null,key:session.key});});
app.use('/api',(req,res,next)=>{const payload=claims(req),session=payload&&sessions.get(payload.jti);if(!session||session.account!==payload.sub)return res.status(401).json({error:'Sign in required'});if(req.headers['x-request-key']!==session.key)return res.status(403).json({error:'Request key required'});req.sessionId=payload.jti;const account=accounts[session.account];if(req.method==='DELETE'&&req.path==='/session')return next();if(account.denied||(!account.write&&!['GET','HEAD'].includes(req.method)))return res.status(403).json({error:'Access denied'});next();});
app.delete('/api/session',(req,res)=>{sessions.delete(req.sessionId);res.clearCookie('v3_session',cookieOptions);res.status(204).end();});app.use('/api',api);app.use((err,req,res,next)=>res.status(400).json({error:err.code==='LIMIT_FILE_SIZE'?'CSV exceeds 1 MiB':'Invalid request'}));
app.listen(Number(process.env.PORT||3300),'127.0.0.1',()=>console.log('Stage 0 API ready'));
