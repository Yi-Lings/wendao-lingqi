(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./engine.js'):root.IdleEngine);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WendaoPreview=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E){
'use strict';
// This is an isolated playtest fixture, not a claim about naturally earned progression.
// It creates a fresh state only; the caller owns preview URL gating and save isolation.
function createState(now){
  const at=now===undefined?Date.now():now,C=E.catalog,s=E.createState(at);
  function act(action){
    const result=E.act(s,action,at);
    if(!result.ok)throw Error('试玩准备失败（'+action.type+'）：'+(result.error||result.message));
    return result.data||{};
  }
  const available=item=>item.realm<s.paths.magic.realm||item.realm===s.paths.magic.realm&&(item.layer||1)<=s.paths.magic.layer;
  // Explicit preview supplies and unlocks avoid long waits while keeping engine rules.
  s.paths.magic={realm:2,layer:4,xp:0,reserve:0};
  s.paths.body={realm:1,layer:1,xp:0,reserve:0};
  s.stones=1200000;s.tickets=200;s.dust=1000;s.fragments.universal=1200;
  for(const id of Object.keys(C.materials))s.materials[id]=5000;
  s.progress.dungeonWins.resource_ore=3;
  s.sect.contribution=600;
  // Catalog treasures are preview supplies; equipment instances are forged below.
  for(const id of Object.keys(C.treasures))s.ownedTreasures[id]={level:1,count:2,awakening:0};
  for(const id of Object.keys(C.companions))s.companions[id].affinity=60;
  act({type:'rename',name:'试玩行者'});
  act({type:'setTraining',enabled:true});
  act({type:'setAutoSmall',enabled:false});
  act({type:'joinSect',school:'sword'});
  act({type:'claimSidequest',id:'world_forge'});
  act({type:'buyJade',packageId:'p128'});
  for(const t of Object.values(C.techniques))if(available(t)&&!s.techniques[t.id])act({type:'learnTechnique',id:t.id});
  for(const r of Object.values(C.recipes))if(available(r)){
    if(!s.learnedRecipes.includes(r.id))act({type:'researchRecipe',id:r.id});
    act({type:'craftPill',id:r.id,count:10});
  }
  for(const id of Object.keys(C.facilities))act({type:'upgradeFacility',id});
  for(const id of Object.keys(C.companions))act({type:'bond',companion:id});
  const worn=[
    {slot:'weapon',set:'sword',rarity:0},
    {slot:'armor',set:'sword',rarity:1},
    {slot:'head',set:'body',rarity:2},
    {slot:'bracer',set:'shadow',rarity:3},
    {slot:'boots',set:'elements',rarity:4},
    {slot:'charm',set:'thunder',rarity:5}
  ];
  for(const options of worn){
    const made=act(Object.assign({type:'forgeGear'},options)).gear;
    act({type:'equipGear',uid:made.uid});
  }
  const samples=[
    {slot:'weapon',set:'thunder',rarity:0},
    {slot:'armor',set:'sword',rarity:0},
    {slot:'armor',set:'body',rarity:0},
    ...Object.keys(C.schools).map(set=>({slot:'weapon',set,rarity:5})),
    {slot:'armor',set:'body',rarity:5},
    // Real forged samples let players try two distinct four-piece effects.
    {slot:'head',set:'sword',rarity:3},
    {slot:'bracer',set:'sword',rarity:3},
    {slot:'boots',set:'body',rarity:3}
  ];
  for(const options of samples)act(Object.assign({type:'forgeGear'},options));
  // Fill only missing set slots in this fresh isolated fixture. All equipment
  // still uses actual forge costs and UID allocation; current samples stay worn.
  for(const set of Object.keys(C.sets))for(const slot of Object.keys(C.slots)){
    if(!s.bag.some(g=>g.set===set&&g.slot===slot))act({type:'forgeGear',set,slot,rarity:2});
  }
  act({type:'setLoadout',
    heart:'sword_heart_1',
    skills:['sword_skill_3','thunder_skill_3','body_skill_1','array_skill_0'],
    secrets:['sword_secret_1','thunder_secret_1'],
    treasures:['t10','t1','t11'],
    pills:['heal1','shield1','purify1']
  });
  act({type:'setGachaTarget',target:'gear_sword_weapon'});
  // The first real ten-pull demonstrates saved rewards and separate red-card reveals.
  s.gacha.redPity=79;s.gacha.highPity=9;s.gacha.fateGuarantee=true;s.rngStreams.gacha=45;
  const verified=E.validate(s);
  if(!verified.ok)throw Error('试玩存档校验失败：'+verified.error);
  return verified.state;
}
return Object.freeze({createState});
});
