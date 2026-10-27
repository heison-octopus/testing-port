import express from 'express';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import api from './routes/api.js';
import { previewsDir, rootDir } from './db.js';

export const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'1mb'}));
app.use(cookieParser());
app.use('/media/previews',express.static(previewsDir,{fallthrough:false,maxAge:'1h',dotfiles:'deny'}));
app.use('/api',api);

const dist=join(rootDir,'dist');
if(existsSync(dist)){
  app.use(express.static(dist));
  app.use((req,res,next)=>req.method==='GET'&&!req.path.startsWith('/api')?res.sendFile(join(dist,'index.html')):next());
}

app.use((err,req,res,next)=>{
  if(err?.code==='LIMIT_FILE_SIZE') return res.status(400).json({error:'The selected file is larger than the upload limit.',field:'file'});
  if(err?.code?.startsWith('SQLITE_CONSTRAINT')) return res.status(409).json({error:'This record conflicts with an existing identifier or relationship.'});
  console.error(err);
  res.status(err.status||500).json({error:err.status?err.message:'The service could not complete this request.'});
});
