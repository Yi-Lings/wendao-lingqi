(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./data.js'):root.WendaoData);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.WendaoWayfarerReview=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
// A read-only preview. Choice and focus stay in the drawer, never in the save.
function view(s,event,id){
 const choice=event?.choices.find(c=>c.id===id);if(!choice)return null;
 const costs=[];
 for(const [key,value] of Object.entries(choice.cost)){
  if(typeof value==='number')costs.push({id:key,name:({stones:'灵石',jade:'灵玉',dust:'天道尘'})[key]||key,required:value,owned:s[key]||0});
  else for(const [material,required] of Object.entries(value))costs.push({id:material,name:C.materials[material]?.name||material,required,owned:s[key]?.[material]||0});
 }
 const missing=costs.filter(row=>row.owned<row.required).map(row=>({...row,shortage:row.required-row.owned}));
 const busy=!!(s.battle||s.exploration||s.joint||s.ritual&&s.ritual.phase!=='complete');
 return {choice,costs,missing,path:C.daoPaths[id],active:s.wanderings?.stance===id,canCommit:!!event.available&&!busy&&!missing.length,busy};
}
return Object.freeze({view});
});
