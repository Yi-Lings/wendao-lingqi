'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const I=require('../web/art-identity.js'),A=require('../web/equipment-art.js'),G=require('../web/game-art.js'),C=require('../web/data.js');
test('Dao quality keeps six materially different element and shadow identities instead of red objects',()=>{
 const examples=[['elements','head','木灵冠','wood'],['elements','bracer','寒潮腕','water'],['elements','boots','地脉履','earth'],['elements','charm','五行佩','elements'],['array','weapon','星罗尺','star'],['shadow','armor','太虚衣','moon']];
 for(const [set,slot,name,palette] of examples){const art=A.gearArt({set,slot,rarity:5});assert.equal(art.name,name);assert.equal(art.palette,palette);assert.equal(art.rarity,5);assert.equal(I.decorate(art).attrs.includes('data-art-rarity="5"'),true);}
 assert.equal(G.treasure('t11').palette,'jade');assert.equal(G.treasure('t11').auraSecondary,I.gear({set:'array',slot:'weapon',rarity:5}).aura);
 assert.equal(G.pill('shield2').palette,'tortoise');assert.equal(G.pill('break4').palette,'lightning');assert.equal(G.pill('break5').palette,'lotus');
 assert.equal(A.gearArt({set:'array',slot:'bracer',rarity:5}).palette,'jade');
 assert.equal(A.gearArt({set:'shadow',slot:'head',rarity:5}).palette,'ghostfire');assert.equal(G.technique('shadow_skill_1').palette,'ghostfire');
 assert.equal(new Set(examples.map(([set,slot])=>A.gearArt({set,slot,rarity:5}).aura)).size,6);
});
test('common and modest crafted gear has no magical UI glow and follows cloth, iron and leather materials',()=>{
 for(const set of Object.keys(C.sets))for(const slot of Object.keys(C.slots))for(const rarity of [0,1]){const art=A.gearArt({set,slot,rarity});assert.equal(art.effect,'none');assert.equal(I.decorate(art).className,'named-item art-fx-none');}
 assert.equal(I.gear({set:'body',slot:'head',rarity:0}).palette,'cloth');
 assert.equal(I.gear({set:'array',slot:'weapon',rarity:0}).palette,'iron');
 assert.equal(I.gear({set:'sword',slot:'bracer',rarity:1}).palette,'leather');
 assert.equal(I.gear({set:'sword',slot:'boots',rarity:2}).palette,'cloud');
 assert.equal(I.gear({set:'thunder',slot:'charm',rarity:2}).palette,'jade');
 assert.equal(I.gear({set:'body',slot:'weapon',rarity:3}).palette,'earth');
 assert.equal(I.gear({set:'sword',slot:'weapon',rarity:3}).palette,'violet');
});
test('semantic CSS decoration only emits controlled palette metadata and safe hex values',()=>{
 const d=I.decorate({identity:'x" onload="alert(1)',effect:'url(javascript:x)',palette:'__proto__',aura:'red;background:url(x)',auraSecondary:'"',rarity:999});
 assert.deepEqual(d,{className:'named-item art-fx-none',attrs:'data-art-identity="item" data-art-palette="iron" data-art-effect="none" data-art-rarity="0"',style:'--item-aura:#a6aeb6;--item-aura-secondary:#a6aeb6;'});
 for(const value of [null,undefined,{},[],{rarity:'bad',set:'constructor',slot:'toString'}])assert.equal(I.gear(value).identity,'gear-sword-weapon-0');
 assert.equal(I.technique('__proto__'),null);assert.equal(I.pill('constructor'),null);
});
test('name-based effects remain still in inventories and respect reduced motion without applying colour filters',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../web/item-art.css'),'utf8');
 assert.match(css,/filter:\s*none/);assert.doesNotMatch(css,/hue-rotate|saturate\(|sepia\(|mix-blend-mode|infinite/);
 assert.match(css,/prefers-reduced-motion:\s*reduce/);assert.match(css,/animation:\s*none\s*!important/);
 assert.match(css,/\.named-item\.art-fx-none::before[^}]*content:\s*none/s);
 const before=JSON.stringify(C);for(const t of Object.values(C.techniques))I.technique(t);assert.equal(JSON.stringify(C),before);
});
