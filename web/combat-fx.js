(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WendaoCombatFx=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
// Pure translation layer: combat feedback events -> floating text entries.
// No DOM, no timers, no state: the same input always yields the same output.
const KINDS=['hit','crit','dot','kill','heal','player'];
const MAX_ENTRIES=12;
const COMBO_WINDOW=2.4;

function compact(n){
  const value=Math.max(0,Math.round(Number(n)||0));
  if(value<10000)return String(value);
  if(value<100000000)return (value/10000).toFixed(value<100000?1:0).replace(/\.0$/,'')+'万';
  return (value/100000000).toFixed(1).replace(/\.0$/,'')+'亿';
}

function entry(event,index){
  const kind=KINDS.includes(event&&event.kind)?event.kind:'hit';
  const amount=compact(event&&event.amount);
  const overkill=compact(event&&event.overkill);
  if(kind==='kill')return {key:'k'+index,kind,text:event&&event.overkill>0?'击破 · 溢伤 '+overkill:'击破',tone:'kill',big:true,target:event&&event.target!==null?event.target:null};
  if(kind==='heal')return {key:'h'+index,kind,text:'+'+amount,tone:'heal',big:false,target:null};
  if(kind==='player'){
    const absorbed=compact(event&&event.absorbed);
    return {key:'p'+index,kind,text:event&&event.absorbed>0&&!(event.amount>0)?'护盾 -'+absorbed:'-'+amount,tone:'player',big:false,target:null};
  }
  if(kind==='crit')return {key:'c'+index,kind,text:'-'+amount,tone:'crit',big:true,target:event&&event.target!==null?event.target:null};
  if(kind==='dot')return {key:'d'+index,kind,text:'-'+amount,tone:'dot',big:false,target:event&&event.target!==null?event.target:null};
  return {key:'n'+index,kind,text:'-'+amount,tone:'normal',big:false,target:event&&event.target!==null?event.target:null};
}

// Returns the floats to spawn plus the current hit streak. Entries beyond
// MAX_ENTRIES are dropped so a long offline catch-up frame cannot flood the DOM.
function translate(events){
  const list=Array.isArray(events)?events:[];
  const entries=[];let streak=0;let lastHit=null;
  for(let index=0;index<list.length;index++){
    const event=list[index];
    if(!event||typeof event!=='object')continue;
    const kind=KINDS.includes(event.kind)?event.kind:'hit';
    if(kind==='hit'||kind==='crit'){
      const at=Number(event.t)||0;
      if(lastHit!==null&&at-lastHit<=COMBO_WINDOW)streak++;else streak=1;
      lastHit=at;
    }
    if(entries.length<MAX_ENTRIES)entries.push(entry(event,index));
  }
  return {entries,streak};
}

// Streak tiers are presentation only: they label the rhythm, never touch damage.
function streakLabel(streak){
  const n=Math.max(0,Math.floor(Number(streak)||0));
  if(n>=12)return {tier:3,label:n+' 连击 · 势如破竹'};
  if(n>=6)return {tier:2,label:n+' 连击 · 气机贯通'};
  if(n>=3)return {tier:1,label:n+' 连击'};
  return {tier:0,label:''};
}

return Object.freeze({translate,entry,compact,streakLabel,MAX_ENTRIES,COMBO_WINDOW,KINDS});
});
