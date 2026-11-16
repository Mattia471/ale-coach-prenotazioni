// In-memory Supabase client used ONLY by the isolated test import map.
// No network, secrets, PostgreSQL or hosted Supabase.
import {state} from './state.ts';
type RecordValue=Record<string,unknown>;
export function createClient(_url:string,_key:string,_options:unknown){
 return {
  auth:{
   getUser:async(token:string)=>({
    data:{user:token==='qa-valid-client' ? {id:state.clientId}
              : token==='qa-other-client' ? {id:'33333333-3333-4333-8333-333333333333'}
              : null},
    error:token==='qa-valid-client'||token==='qa-other-client'?null:{message:'Invalid mock token'}
   })
  },
  from(table:string){
   const filters:RecordValue={};
   let updateValues:RecordValue|null=null;
   const matches=()=>Object.entries(filters).every(([name,value])=>state.booking[name]===value);
   const chain={
    select(_columns:string){return chain;},
    eq(name:string,value:unknown){filters[name]=value;return chain;},
    update(values:RecordValue){updateValues=values;return chain;},
    async single(){
     if(table!=='bookings')throw new Error('Unexpected mocked single table: '+table);
     return matches()
      ? {data:structuredClone(state.booking),error:null}
      : {data:null,error:{message:'Not found in isolated mock'}};
    },
    async maybeSingle(){
     if(table!=='bookings'||!updateValues)throw new Error('Unexpected mocked update');
     if(state.failDbUpdateOnce){
      state.failDbUpdateOnce=false;
      return {data:null,error:{message:'Synthetic DB failure after refund'}};
     }
     if(!matches())return {data:null,error:null};
     Object.assign(state.booking,updateValues);
     state.updates++;
     return {data:{id:state.bookingId},error:null};
    },
    async insert(row:RecordValue){
     if(table!=='notifications'||row.booking_id!==state.bookingId)
      throw new Error('Unexpected synthetic notification insert');
     state.notifications++;
     return {data:null,error:null};
    }
   };
   return chain;
  }
 };
}
