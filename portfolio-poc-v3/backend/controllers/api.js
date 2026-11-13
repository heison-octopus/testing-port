import * as svc from '../services/inventory.js';
export function catalogue(req,res){res.json({stages:svc.stages,conflicts:svc.conflicts});}
export function records(req,res){res.json({records:svc.list()});}
export function template(req,res){res.type('text/csv').attachment('stage-inventory-template.csv').send(svc.template);}
export function processCsv(commit){return (req,res)=>{try {if(!req.file)return res.status(400).json({error:'CSV file required'});const result=(commit?svc.commit:svc.preview)(req.file.buffer.toString('utf8'));res.status(result.valid?200:422).json(result);}catch(e){res.status(400).json({error:e.message});}};}
