'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const zlib=require('node:zlib');
const A=require('../web/equipment-art.js');
const I=require('../web/art-identity.js');
const C=require('../web/data.js');
const K=require('../web/core.js');
const Q=require('../web/economy.js');
const SETS=['sword','body','thunder','elements','shadow','array'];
const WEARABLES=['armor','head','bracer','boots','charm'];
const LEGACY_RED_WEAPONS={sword:0,shadow:4};
const SET_NAMES={sword:'青锋',body:'玄武',thunder:'雷霄',elements:'离火',shadow:'太虚',array:'回春'};

// Read generated pixels without modifying source artwork; identical crops would
// still be shared art even if their CSS coordinates or PNG metadata differ.
function pngPixels(file){
  const bytes=fs.readFileSync(path.join(__dirname,'../web/assets',file));
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),type=bytes[25],bpp=type===2?3:type===6?4:0;
  assert.equal(bytes[24],8,'8-bit artwork');assert(bpp,'RGB or RGBA artwork');assert.equal(bytes[28],0,'non-interlaced artwork');
  const chunks=[];
  for(let offset=8;offset<bytes.length;){
    const length=bytes.readUInt32BE(offset),kind=bytes.toString('ascii',offset+4,offset+8);
    if(kind==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+length));
    offset+=length+12;
  }
  const filtered=zlib.inflateSync(Buffer.concat(chunks)),stride=width*bpp,pixels=Buffer.alloc(stride*height);
  assert.equal(filtered.length,(stride+1)*height);
  for(let row=0;row<height;row++){
    const source=row*(stride+1),filter=filtered[source];assert(filter<=4);
    for(let column=0;column<stride;column++){
      const dest=row*stride+column,left=column>=bpp?pixels[dest-bpp]:0,up=row?pixels[dest-stride]:0,corner=row&&column>=bpp?pixels[dest-stride-bpp]:0;
      let predict=0;
      if(filter===1)predict=left;
      else if(filter===2)predict=up;
      else if(filter===3)predict=Math.floor((left+up)/2);
      else if(filter===4){const p=left+up-corner,a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-corner);predict=a<=b&&a<=c?left:b<=c?up:corner;}
      pixels[dest]=(filtered[source+1+column]+predict)&255;
    }
  }
  return {width,height,bpp,pixels};
}

test('weapon artwork selects all 36 rarity and weapon-family identities including suitable legacy red art',()=>{
  const cells=new Set();
  for(const [row,set] of SETS.entries())for(let rarity=0;rarity<6;rarity++){
    const art=A.gearArt({slot:'weapon',set,rarity});
    const legacy=rarity===5&&Object.hasOwn(LEGACY_RED_WEAPONS,set)||rarity===2&&set==='elements';
    const oldColumn=rarity===2?5:LEGACY_RED_WEAPONS[set];
    assert.deepEqual(art,{...I.gear({set,slot:'weapon',rarity},A.rewardLabel({category:'gear',set,slot:'weapon',rarity})),file:legacy?'v3-items-atlas.png':'v6-gear-quality-'+rarity+'.png',position:legacy?oldColumn*20+'% 0%':'0% '+row*20+'%',size:'600% 600%',rarity,slot:'weapon',set});
    cells.add(art.file+':'+art.position);
  }
  assert.equal(cells.size,36);
});

test('wearables use their own slot and rarity artwork rather than the weapon image',()=>{
  const cells=new Set();
  for(const [column,slot] of WEARABLES.entries())for(let rarity=0;rarity<6;rarity++)for(const [row,set] of SETS.entries()){
    const art=A.gearArt({slot,set,rarity});
    const legacy=rarity===4&&slot==='armor'&&set==='body';
    assert.equal(art.file,legacy?'v3-items-atlas.png':'v6-gear-quality-'+rarity+'.png');
    assert.equal(art.position,legacy?'20% 0%':(column+1)*20+'% '+row*20+'%');
    assert.equal(art.size,'600% 600%');
    assert.equal(art.slot,slot);assert.equal(art.set,set);assert.equal(art.rarity,rarity);
    cells.add(art.file+':'+art.position);
  }
  assert.equal(cells.size,180,'every school, wearable slot and quality has its own artwork');
});

test('armor art and lower quality names identify the school while keeping material names',()=>{
  for(const [row,set] of SETS.entries())for(let rarity=0;rarity<6;rarity++){
    const art=A.gearArt({set,slot:'armor',rarity});
    assert.equal(art.position,rarity===4&&set==='body'?'20% 0%':'20% '+row*20+'%');
    const name=A.rewardLabel({category:'gear',id:'gear_'+set+'_armor',rarity});
    assert.match(name,set==='body'?/甲$/u:/衣$/u);
  }
  assert.equal(A.rewardLabel({category:'gear',id:'gear_body_armor',rarity:0}),'玄武·粗布铁甲');
  assert.equal(A.rewardLabel({category:'gear',id:'gear_body_armor',rarity:1}),'玄武·精制皮甲');
  assert.equal(A.rewardLabel({category:'gear',id:'gear_sword_armor',rarity:1}),'青锋·青布衣');
});

test('legacy ornamental assets match their item name, shape and natural materials',()=>{
  const actual=[];
  for(const set of SETS)for(const slot of ['weapon',...WEARABLES])for(let rarity=0;rarity<6;rarity++){
    const art=A.gearArt({set,slot,rarity});
    if(art.file==='v3-items-atlas.png')actual.push({set,slot,rarity,position:art.position});
    else assert.equal(art.file,'v6-gear-quality-'+rarity+'.png','each quality has a dedicated complete set atlas');
  }
  assert.deepEqual(actual,[
    {set:'sword',slot:'weapon',rarity:5,position:'0% 0%'},
    {set:'body',slot:'armor',rarity:4,position:'20% 0%'},
    {set:'elements',slot:'weapon',rarity:2,position:'100% 0%'},
    {set:'shadow',slot:'weapon',rarity:5,position:'80% 0%'}
  ]);
  assert.equal(A.gearArt({set:'body',slot:'weapon',rarity:5}).file,'v6-gear-quality-5.png','a hammer cannot use the dragon-armor art');
  assert.equal(A.gearArt({set:'array',slot:'weapon',rarity:5}).file,'v6-gear-quality-5.png','a ruler cannot use the decorative fan art');
  assert.equal(A.gearArt({set:'body',slot:'armor',rarity:5}).file,'v6-gear-quality-5.png','玄武甲 has its own turtle-shell artwork');
  assert.equal(A.gearArt({set:'elements',slot:'weapon',rarity:5}).file,'v6-gear-quality-5.png','四象扇 depicts all four named elements');
  assert.equal(A.gearArt({set:'thunder',slot:'weapon',rarity:5}).file,'v6-gear-quality-5.png','the named staff must not use the legacy spear');
});

test('all 216 set-slot-quality identities map to distinct artwork, with no shared set icon',()=>{
  const cells=new Set();
  for(const set of SETS)for(const slot of ['weapon',...WEARABLES])for(let rarity=0;rarity<6;rarity++){
    const art=A.gearArt({set,slot,rarity}),key=art.file+':'+art.position;
    assert(!cells.has(key),'artwork reused for '+set+'/'+slot+'/'+rarity);
    cells.add(key);
  }
  assert.equal(cells.size,216);
});

test('all six newly generated set atlases exist as distinct square six-by-six PNG artwork',()=>{
  const hashes=new Set();
  for(let rarity=0;rarity<6;rarity++){
    const file='v6-gear-quality-'+rarity+'.png',bytes=fs.readFileSync(path.join(__dirname,'../web/assets',file));
    assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10],file+' is a PNG');
    const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
    assert.equal(width,height,file+' preserves square cells');
    assert(width>=1200,file+' has enough detail for all 36 cells');
    assert.equal(width%6,0,file+' has integral six-by-six cells');
    hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));
  }
  assert.equal(hashes.size,6,'quality atlases are separate generated artworks');
});

test('all 216 displayed equipment crops have different actual artwork pixels',()=>{
  const decoded=new Map(),hashes=new Set();
  for(const set of SETS)for(const slot of ['weapon',...WEARABLES])for(let rarity=0;rarity<6;rarity++){
    const art=A.gearArt({set,slot,rarity});
    if(!decoded.has(art.file))decoded.set(art.file,pngPixels(art.file));
    const {width,height,bpp,pixels}=decoded.get(art.file),[px,py]=art.position.split(' ').map(x=>Number.parseFloat(x)/20),cw=width/6,ch=height/6,hash=crypto.createHash('sha256');
    assert.equal(cw,Math.floor(cw));assert.equal(ch,Math.floor(ch));
    for(let y=py*ch;y<(py+1)*ch;y++)hash.update(pixels.subarray((y*width+px*cw)*bpp,(y*width+(px+1)*cw)*bpp));
    const digest=hash.digest('hex');assert(!hashes.has(digest),'copied artwork for '+set+'/'+slot+'/'+rarity);hashes.add(digest);
  }
  assert.equal(hashes.size,216);
});

test('all twenty-six previous artworks remain present and byte-for-byte unchanged',()=>{
  const hashes={
    'v3-boss-atlas.png':'44eab227875b14f222041928625a8248ece132fd435faf8bcc5c832b0f3fa636',
    'v3-cardback.png':'397176d5c979adf75f81d2d078da1d15ff2436a3acaf7961392b0902380dfff1',
    'v3-chapter-atlas.png':'0c92a9967915e9b8258da3407c98588b2c8ebcdeaad124c254b7bc1b04813b47',
    'v3-forge.png':'de6cbea983b22f9bac14a4dfb000e57ce474447e029f452b498e4377b2e1a36d',
    'v3-hero-expressions.png':'1c4250e6fabd351e983f2c8f630e02703ae02ad242b8aec436186591b44f9fd5',
    'v3-heroes.png':'22881ef1575d96a3a5ac799022fe98062c67e591c43bf80a4c8b5c7971c37cbd',
    'v3-items-atlas.png':'b529d1d02d1404da934121d5754c746ec410202c5bd7de86beb3775b975bc682',
    'v3-map-atlas-a.png':'8672f15e6e83a4d055afdc413603147b867c95b3309bcd0869c2838e1554eefa',
    'v3-map-atlas-b.png':'c3a2f19fe4af059e1b255069b23de45a33eb7c968bc6dd46032b9986b23a61d0',
    'v3-monster-atlas.png':'d0244da185015909077092ff246d70137c127149a20d408e37ab3c3e6f744b34',
    'v3-shop.png':'f6c1f2201bc03a6b20a8b8c85bfca0abc729b5507de6910181c0f6b22e38704f',
    'v3-skills-atlas.png':'82461241caa0be798fd123359c7ebfe2324bb81a78542900dabfca6a63746ac3',
    'v3-summon.png':'3a726730585736377cbf427a6ee4687beefa90138ef627403657011ab13a1adb',
    'v3-world.png':'60cc4021afe1793518d44ab67986bdd375439dd1031daccda2ef5408923c51a0',
    'v4-armor-atlas.png':'f898e51bd56db508a1f4013488abe0c0267dc7fc5fec648ffc86061e396bb591',
    'v4-basic-skills-atlas.png':'41feafd53aeebb207bb32a6610591deb7e109dcdbbc97a2d527bbf46e26937e2',
    'v4-pills-atlas.png':'b6fe16de1e065e3ecf324e0bd6e88d11063b5b36b8df5cb8227b65676dc15ee0',
    'v4-treasures-atlas.png':'38593628f1064dd44d56a656578e370fe47676236c31ed127d2c8c14a51d2816',
    'v4-utilities-atlas.png':'18cf3df94862623c8b84b9596c28c5e69c9523d670131adb0dafe9f5dd2d51f6',
    'v4-weapons-atlas.png':'d9ec3830e052e72a983fb62519ddad0799acedb08a608ea80ed95b3925bb217b',
    'v5-gear-quality-0.png':'9dadf69fea35d250a427c20533dc1d6a6020d6dc36fa34bd5f7fb085905d3c7b',
    'v5-gear-quality-1.png':'1a94c3b76a47a81a3b109551e952615dd42b266fb9775a7a1b8086d86600c1f4',
    'v5-gear-quality-2.png':'2c999b6ca8128d38e75163846a34fbbb9de83816c7aefd3f17c517481b3bf703',
    'v5-gear-quality-3.png':'2610b1033e58e645a6bff7a1987e1c31b3704932bf53136c5037dd08aa503197',
    'v5-gear-quality-4.png':'e9db9384e7ef286095dc8de41a621a4c3c593c6b1e0ddc6de83017302a80da95',
    'v5-gear-quality-5.png':'cf8742b5eddc0ab7228c073d8a4aeb569ab3841615c0bb89237c19c74360b9b7'
  };
  for(const [file,hash] of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../web/assets',file))).digest('hex'),hash,file+' retained');
});

test('common equipment has plain names and red equipment matches the existing target identity',()=>{
  const weapons=['铁剑','铁锤','铁枪','素扇','铁刀','铁尺'];
  const wearables=['粗布衣','布帽','铁护腕','旧布靴','绳结石佩'];
  for(const [i,set] of SETS.entries()){
    assert.equal(A.gearLabel({slot:'weapon',set,rarity:0,tier:0}),'凡品·'+weapons[i]+' 1阶');
    const names=new Set();
    for(let rarity=0;rarity<6;rarity++)names.add(A.rewardLabel({category:'gear',id:'gear_'+set+'_weapon',rarity}));
    assert.equal(names.size,6,'each rarity has a distinct weapon name for '+set);
    for(const [j,slot] of WEARABLES.entries())assert.equal(A.rewardLabel({category:'gear',id:'gear_'+set+'_'+slot,rarity:0}),SET_NAMES[set]+'·'+(set==='body'&&slot==='armor'?'粗布铁甲':wearables[j]));
    for(const slot of ['weapon',...WEARABLES]){
      const id='gear_'+set+'_'+slot;
      assert.equal(A.rewardLabel({category:'gear',id,rarity:5}),C.gearTargets[id].name);
      assert.equal(A.gearLabel({set,slot,rarity:5,tier:5,awakening:3}),'道品·'+C.gearTargets[id].name+' 6阶 觉醒3');
    }
  }
});

test('new rewards and old saved history use their stable identity rather than stale name snapshots',()=>{
  assert.equal(A.rewardLabel({category:'gear',id:'gear_sword_weapon',rarity:0,name:'道品·金光神剑 6阶'}),'铁剑');
  assert.equal(A.rewardLabel({category:'equipment',id:'gear_body_armor',rarity:5,name:'凡品·玄武·衣甲 1阶'}),'玄武甲');
  assert.equal(A.rewardLabel({category:'gear',itemId:'gear_thunder_weapon',rarity:5,name:'旧名称'}),'雷霄杖');
  assert.equal(A.rewardLabel({category:'gear',id:'gear_shadow_boots',rarity:5,name:'太虚武器'}),'夜行履');
  assert.equal(A.rewardLabel({category:'material',id:'ore',name:'灵矿×8'}),'灵矿×8','quantity-bearing non-gear names remain intact');
  assert.equal(A.rewardLabel({category:'treasure',id:'t0'}),C.treasures.t0.name);
});

test('missing or invalid presentation arguments fall back without invalid atlas coordinates or labels',()=>{
  for(const value of [undefined,null,[],{}, {rarity:-1,slot:'nope',set:'__proto__'}, {rarity:NaN,tier:Infinity,awakening:999}, {rarity:'bad',tier:'bad'}]){
    assert.deepEqual(A.gearArt(value),{...I.gear({rarity:0,slot:'weapon',set:'sword'},'铁剑'),file:'v6-gear-quality-0.png',position:'0% 0%',size:'600% 600%',rarity:0,slot:'weapon',set:'sword'});
    const label=A.gearLabel(value);
    assert.equal(label,'凡品·铁剑');
    assert(!/undefined|NaN|Infinity/.test(label));
  }
  assert.equal(A.gearLabel({set:'sword',slot:'weapon',rarity:'2',tier:'1'}),'玄品·灵纹剑 2阶');
  assert.equal(A.rewardLabel({category:'gear',id:'gear_bad_weapon',rarity:5,name:'不可信名称'}),'装备');
  assert.equal(A.rewardLabel(null),'机缘');
  assert.equal(A.rewardLabel({category:'gear',id:'gear_sword_weapon',rarity:null}),'铁剑');
});

test('rendering all qualities and slots leaves a valid save and every random stream unchanged',()=>{
  const s=K.createState(1700000000000);
  for(const set of SETS)for(const slot of ['weapon',...WEARABLES])for(let rarity=0;rarity<6;rarity++)Q.addGear(s,Q.createGear(s,{set,slot,rarity,tier:0}));
  assert.equal(K.validate(s).ok,true);
  const before=JSON.stringify(s),rewards=s.bag.map(g=>({category:'gear',id:'gear_'+g.set+'_'+g.slot,uid:g.uid,rarity:g.rarity,name:'旧品级名字'})),rewardBefore=JSON.stringify(rewards);
  for(const g of s.bag){A.gearArt(g);A.gearLabel(g);}
  for(const x of rewards)A.rewardLabel(x);
  assert.equal(JSON.stringify(s),before,'labels must never migrate or mutate equipment, UID, pity, or RNG');
  assert.equal(JSON.stringify(rewards),rewardBefore,'saved reward snapshots remain untouched');
  assert.equal(K.validate(JSON.stringify(s)).ok,true);
});
