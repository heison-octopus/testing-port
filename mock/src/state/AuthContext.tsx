import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setRequestKey, signIn as loginRequest, switchAccount as switchRequest, type User } from '../api/client';

type AuthValue={user:User|null;loading:boolean;login:(u:string,p:string)=>Promise<void>;logout:()=>Promise<void>;switchUser:(id:string)=>Promise<void>};
const AuthContext=createContext<AuthValue|null>(null);

export function AuthProvider({children}:{children:React.ReactNode}){
  const [user,setUser]=useState<User|null>(null);const [loading,setLoading]=useState(true);
  useEffect(()=>{api<{user:User}>('/auth/session').then(r=>setUser(r.user)).catch(()=>setUser(null)).finally(()=>setLoading(false));},[]);
  const value=useMemo<AuthValue>(()=>({user,loading,
    login:async(u,p)=>{const r=await loginRequest(u,p);setUser(r.user);},
    logout:async()=>{try{await api('/auth/logout',{method:'POST'});}finally{setRequestKey(null);setUser(null);}},
    switchUser:async(id)=>{const r=await switchRequest(id);setUser(r.user);}
  }),[user,loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('Auth context missing');return value;}
