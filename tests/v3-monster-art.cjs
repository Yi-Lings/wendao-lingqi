'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../web/data.js'),K=require('../web/core.js'),B=require('../web/combat.js'),M=require('../web/monster-art.js'),Layout=require('../web/art-layout.js');
const NOW=1700000000000;
function state(layer=10,realm=0){const s=K.createState(NOW);s.paths.magic.layer=layer;s.paths.magic.realm=realm;return s;}
function start(s,id,args={}){const r=B.handle(s,{type:'startDungeon',id,...args},NOW);assert.equal(r.ok,true,r.message);return B.battleView(s);}
function native(file){const bytes=fs.readFileSync(path.join(__dirname,'../web/assets',file));assert.equal(bytes.subarray(1,4).toString(),'PNG');return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};}
function signature(art){return [art.file,art.col,art.row].join(':');}

test('all new encounter atlases have verified native dimensions and isolated nonstretched crops',()=>{
 for(const [file,d] of Object.entries(M.definitions)){assert.deepEqual(native(file),{width:d.width,height:d.height});}
 const arts=[...Object.keys(C.monsters).map(M.speciesArt),...Object.keys(C.rivals).map(M.rivalArt),...C.bosses.map((_,i)=>M.bossArt(i))];
 for(const art of arts){assert.ok(art);const d=M.definitions[art.file];assert.ok(art.crop.every(Number.isFinite));assert.ok(art.crop[0]+art.crop[2]<=1&&art.crop[1]+art.crop[3]<=1);
  const g=Layout.geometry({width:150,height:190,imageWidth:d.width,imageHeight:d.height,...art,fit:'contain'});assert.ok(g);assert.ok(g.cellWidth*g.scale<=150.00001&&g.cellHeight*g.scale<=190.00001);assert.equal(g.width/d.width,g.height/d.height,'one uniform image scale must preserve proportions');
 }
});

test('original eight monster paintings are all retained with explicit matching species',()=>{
 const old=Object.values(C.monsters).filter(m=>m.art.file==='v3-monster-atlas.png');assert.equal(old.length,8);
 assert.equal(new Set(old.map(m=>signature(M.speciesArt(m.id)))).size,8);
 assert.deepEqual(old.map(m=>m.name),['青岚灵獠','晶甲石傀','镜湖灵鹿','紫霄雷隼','噬影幽狼','古甲执戈卫','赤莲噬灵花','星桥灵螭']);
 const used=new Set(Object.values(C.dungeons).filter(d=>d.type==='resource').flatMap(d=>d.enemySpecies));for(const m of old)assert.ok(used.has(m.id),m.name+' should remain encountered in game');
 for(let i=0;i<12;i++)assert.equal(M.bossArt(i).name,C.bosses[i].name);
});

test('new beetle, tablet, polluted spring, moth and guardian illustrations have real combat identities',()=>{
 const s=state(10);for(const id of ['resource_herb','resource_ore','resource_insight','resource_essence','resource_fate']){
  if(id==='resource_fate')s.paths.magic.realm=1;
  const view=start(s,id);for(const enemy of view.enemies){const art=M.enemyArt(enemy,view);assert.equal(art.kind,'monster');assert.equal(art.name,C.monsters[enemy.species].name);assert.equal(enemy.name,art.name);assert.ok(art.file);}
  const restored=K.validate(JSON.stringify(s));assert.equal(restored.ok,true,restored.error);assert.deepEqual(B.battleView(restored.state).enemies,view.enemies);s.battle=null;
 }
 assert.equal(M.speciesArt('siphon_beetle').file,'v7-encounters-atlas.png');assert.equal(M.speciesArt('tablet_spirit').col,1);assert.equal(M.speciesArt('spring_wraith').col,2);
});

test('all six tournament portraits depict named human rivals instead of inferred animals',()=>{
 const s=state();for(const id of ['arena_0','arena_1','arena_2','secret_0','secret_1','secret_2']){
  const d=C.dungeons[id];if(d.previous)s.progress.dungeonWins[d.previous]=1;
  const view=start(s,id),e=view.enemies[0],a=M.enemyArt(e,view);assert.equal(a.kind,'rival');assert.equal(a.file,'v7-rivals-atlas.png');assert.equal(e.rivalId,d.enemy.rivalId);
  assert.equal(signature(M.enemyArt({name:'雷羽隼、紫狼、火莲',rivalId:e.rivalId},{})),signature(a),'incidental name fragments must not select animal art');s.battle=null;
 }
 assert.equal(new Set(Object.keys(C.rivals).map(id=>signature(M.rivalArt(id)))).size,6);
 assert.equal(M.enemyArt({name:'骆景行'},{}),null,'unknown names must not fall back to an unrelated creature');
});

test('sect teaching, normal tower guardians and cave encounters use explicit species and humans',()=>{
 const s=state(10);for(const school of Object.keys(C.schools)){
  const view=start(s,'sect_'+school+'_0');const a=M.enemyArt(view.enemies[0],view);assert.equal(a.kind,school==='shadow'?'monster':'rival');s.battle=null;
 }
 const view=start(s,'tower',{floor:1});for(const e of view.enemies)assert.equal(M.enemyArt(e,view).kind,'monster');s.battle=null;
 for(const [id,expected] of [['cave_0','bronze_sentinel'],['cave_1','ember_golem'],['cave_2','mirror_phantom']]){
  s.paths.magic.realm=2;start(s,id);s.exploration.choices=[{id:'battle:fight',label:'回廊战斗'}];
  const r=B.handle(s,{type:'chooseCave',choice:'battle:fight'},NOW);assert.equal(r.ok,true,r.message);
  const cave=B.battleView(s);assert.equal(cave.enemies[0].species,expected);assert.equal(M.enemyArt(cave.enemies[0],cave).name,C.monsters[expected].name);s.battle=null;s.exploration=null;
 }
});

test('summoned roots, flowers, clones and guards retain their own portrait identity',()=>{
 for(const [role,species] of [['root','root_tendril'],['flower','flower'],['clone','mirror_phantom'],['guard','armor']]){
  const a=M.enemyArt({role,index:1},{id:'boss_6'});assert.equal(signature(a),signature(M.speciesArt(species)));assert.notEqual(a.kind,'boss');
 }
 const s=state(10,3),view=start(s,'boss_6');s.battle.auto=false;s.battle.player.maxHp=s.battle.player.hp=100000;B.advanceBattle(s,16);
 const roots=B.battleView(s).enemies.filter(e=>e.role==='root');assert.equal(roots.length,2);for(const root of roots)assert.equal(root.species,'root_tendril');
 const restored=K.validate(JSON.stringify(s));assert.equal(restored.ok,true,restored.error);assert.equal(M.enemyArt(B.battleView(restored.state).enemies.find(e=>e.role==='root'),view).name,'缚灵根须');
});
