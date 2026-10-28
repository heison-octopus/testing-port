// Versioned, replaceable contracts: processors return values and never write kernel records.
export const inputTemplates={
 'reflection-v1':{label:'Reflection',audience:'student',input:'long_text'},
 'short-reflection-v1':{label:'Short reflection',audience:'student',input:'short_text'},
 'questionnaire-scale-v1':{label:'Six-point questionnaire item',audience:'student',input:'scale'},
};
export const calculationProcessors={ 'max-confirmed-v1': observations => {
 const eligible=observations.filter(o=>o.confirmed && o.decision==='included' && o.proof_status==='accepted');
 return {level:eligible.length?Math.max(...eligible.map(o=>o.level)):null,observationIds:eligible.map(o=>o.id),proofIds:[...new Set(eligible.map(o=>o.proof_id))]};
}};
