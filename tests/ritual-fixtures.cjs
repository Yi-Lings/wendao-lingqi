'use strict';
// Public action driver for the preparation -> breath -> array -> heart flow.
// `stockRitualFixture` is an explicitly rich unit/UI fixture. The full campaign
// uses `toTrial` with its own actually-produced inventory and never calls stock.
const assert=require('node:assert/strict');
const E=require('../web/engine.js');
const R=require('../web/breakthrough-ritual.js');
const NOW=1791244800000;
const dispatchFor=(s,now)=>a=>{const r=E.act(s,a,now);assert(r.ok,JSON.stringify(a)+': '+r.message);return r;};
function stockRitualFixture(s){s.stones=1000000;for(const id of Object.keys(s.materials))s.materials[id]=10000;return s;}
function ritualView(s){return R.view(s,s.route);}
function toTrial(s,now=NOW,dispatch=dispatchFor(s,now)){
 let v=ritualView(s);
 if(v.stage==='preparation'){
  const id=v.mandatoryPill.id;
  if(!s.learnedRecipes.includes(id))dispatch({type:'researchRecipe',id});
  if(s.pills[id]<(v.mandatoryPill.count||1))dispatch({type:'craftPill',id,count:(v.mandatoryPill.count||1)-s.pills[id]});
  dispatch({type:'beginRitual',route:s.route});
 }
 for(let guard=0;guard<20;guard++){
  v=ritualView(s);
  if(['trial','ready','complete'].includes(v.stage))return v;
  if(v.stage==='breath')dispatch({type:'ritualBreath',choice:v.cue.expected});
  else if(v.stage==='array')dispatch({type:'ritualRune',choice:v.cue.expected});
  else if(v.stage==='heart'){
   if(!v.heartChoice)dispatch({type:'ritualResolve',choice:v.choices[0].id});
   else dispatch({type:'continueRitual'});
  }else throw Error('Unexpected ritual stage '+v.stage);
 }
 throw Error('The ritual did not reach its actual trial');
}
module.exports={stockRitualFixture,toTrial,ritualView};
