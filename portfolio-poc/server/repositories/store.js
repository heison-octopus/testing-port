import {all,get,run,db} from './database.js';
export const repo={all,get,run,transaction(fn){db.exec('BEGIN');try{const value=fn();db.exec('COMMIT');return value}catch(e){db.exec('ROLLBACK');throw e}},audit(user,action,target){run('INSERT INTO audit(school_id,actor_id,action,target,created_at) VALUES(?,?,?,?,?)',user.school_id,user.id,action,target,new Date().toISOString())}};
