export interface Person { id:string;school_id:string;display_name:string;email:string;user_kind:'staff'|'student';row_version:number; }
export interface Assignment { id:string;assignment_kind:'role'|'membership'|'override';user_id:string;role_id:string|null;school_definition_id:string|null;effective_from:string;effective_until:string|null;status:string;row_version:number; }
export interface Session {user:Person;actions:string[];assignments:Assignment[];requestKey:string;policyHash:string;}
export interface Mutation<T> {record:T;event_id:string;}
