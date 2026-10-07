'use strict';
// This is an accelerated, deterministic engine campaign, not a real-time device playthrough.
// Game state is changed only by createState, act, advance, advanceBattle and validated save restore.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../web/engine.js');
const B = E.modules.combat;
const K = E.modules.core;
const C = E.catalog;
const S = require('../web/story.js');
const A = require('../web/ascension.js');
const {toMission,finishJourney}=require('./story-fixtures.cjs');
const {toTrial}=require('./ritual-fixtures.cjs');
const START = 1700000000000;
const HOUR = 3600000;
const CAPS = [5, 8, 11, 14, 17, 20];
const SLOT_CAPS = [5, 8, 12, 16, 20, 20];
const copy = x => JSON.parse(JSON.stringify(x));
const CAMPAIGN_METHOD={method:'accelerated legal engine actions; no real-time browser/device claim',offlineSamplingStepHours:168,waitHoursAreMinimum:false,limitation:'Repeated seven-day resource waits establish legal reachability, not an optimized schedule, minimum completion time or human flow.'};

class Campaign {
  constructor(route) {
    this.route = route;
    this.state = E.createState(START);
    this.now = START;
    this.counts = {actions:0, battles:0, wins:0, losses:0, combatSeconds:0, waitHours:0, saves:0, maxEquippedRarity:0, draws:0};
    this.steps = [];
    this.failures = [];
    this.processingStories=false;
    this.visitedRanks = new Set([0]);
    this.visitedCelestial=new Set();
    this.originalOtherPath = copy(this.state.paths[route === 'magic' ? 'body' : 'magic']);
    if (route !== this.state.route) this.act({type:'switchRoute', route});
  }
  act(a, optional=false) {
    assert.notEqual(a.type, 'draw', 'Zero-draw policy');
    if (a.type === 'forgeGear') assert.ok(a.rarity <= 3, 'Only blue/purple crafting');
    const r = E.act(this.state, a, this.now);
    this.counts.actions++;
    if (!optional) assert.ok(r.ok, JSON.stringify(a) + ': ' + r.message);
    this.recordRank();
    return r;
  }
  recordRank() { this.visitedRanks.add(K.pathRank(this.state, this.route));if(this.state.ascension?.stage==='ascended')this.visitedCelestial.add(this.state.ascension.realm*10+this.state.ascension.layer-1); }
  save() {
    const verified = E.validate(E.serialize(this.state));
    assert.ok(verified.ok, verified.error);
    assert.deepEqual(verified.state, JSON.parse(E.serialize(this.state)));
    this.state = verified.state;
    this.counts.saves++;
  }
  wait(hours) {
    // Coarse seven-day resource waits prove reachability, not minimum waiting.
    // Consecutive settlements each obey the game 24-hour cultivation and seven-day production caps.
    const ms = Math.round(hours * HOUR);
    this.now += ms;
    E.advance(this.state, this.now);
    this.counts.waitHours += hours;
    this.recordRank();
    this.save();
  }
  available(id) {
    const x = C.techniques[id] || C.treasures[id], p = this.state.paths[this.route];
    return x && x.realm <= p.realm && (x.realm < p.realm || x.layer <= p.layer);
  }
  prepare(realm, stronger=false) {
    const s = this.state;
    if (realm === 0) {
      for (const id of Object.keys(C.facilities)) while(this.state.facilities[id] < 3) this.act({type:'upgradeFacility',id});
      this.wait(168);
      for (const slot of Object.keys(C.slots)) {
        const r = this.act({type:'forgeGear',slot,set:this.route === 'body' ? 'body':'sword',rarity:3});
        this.act({type:'equipGear',uid:r.data.gear.uid});
      }
    } else {
      for (const slot of Object.keys(C.slots)) {
        const g = this.state.bag.find(x => x.uid === this.state.equipped[slot]);
        if (g.tier < realm) this.act({type:'recastGear',uid:g.uid});
      }
    }
    for (const slot of Object.keys(C.slots)) {
      while(this.state.slotLevels[slot] < SLOT_CAPS[realm]) {
        const r = this.act({type:'enhanceSlot',slot},true);
        if (!r.ok) { this.wait(168); continue; }
      }
    }
    this.configure();
    for (const id of [this.state.loadouts[this.route].heart, ...this.state.loadouts[this.route].skills, ...this.state.loadouts[this.route].secrets]) {
      while(this.state.techniques[id].level < CAPS[realm]) {
        const r = this.act({type:'upgradeTechnique',id},true);
        if (!r.ok) { this.wait(168); continue; }
      }
      if(this.state.techniques[id].level >= 5) this.act({type:'setTechniqueBranch',id,branch:1});
    }
    for (const id of this.state.loadouts[this.route].treasures.filter(Boolean)) {
      while(this.state.ownedTreasures[id].level < Math.min(10,2+realm*2)) {
        const r = this.act({type:'upgradeTreasure',id},true);
        if (!r.ok) { this.wait(168); continue; }
      }
    }
    for (const id of [realm >= 3 ? 'heal2':realm >= 1?'heal1':'heal0',
      realm >= 4 ? 'shield2':realm >= 1?'shield1':'shield0',
      realm >= 3 ? 'purify2':realm >= 1?'purify1':'purify0','break'+realm]) {
      if (!this.state.learnedRecipes.includes(id)) {
        let r=this.act({type:'researchRecipe',id},true),attempt=0;
        while(!r.ok&&attempt++<20){this.wait(168);r=this.act({type:'researchRecipe',id},true);}
        assert.ok(r.ok,'Research blocker '+id+': '+r.message);
      }
      const count = Math.max(0, 20 - this.state.pills[id]);
      if(count) {
        let r = this.act({type:'craftPill',id,count},true),attempt=0;
        while(!r.ok&&attempt++<20) { this.wait(168); r=this.act({type:'craftPill',id,count},true); }
        assert.ok(r.ok,'Craft blocker '+id+': '+r.message);
      }
    }
    this.claimReady();
    this.save();
  }
  configure(mode) {
    const s = this.state, u = K.unlocks(s), learned = id => !!s.techniques[id] && this.available(id);
    let heart = learned('sword_heart_0') ? 'sword_heart_0':'thunder_heart_0';
    let skills = ['thunder_skill_0','body_skill_1','array_skill_0'].filter(learned);
    if(u.skillSlots === 4 && learned('sword_skill_1')) skills=['sword_skill_1','sword_skill_0','array_skill_0','body_skill_1'];
    if(this.route === 'body' && learned('body_heart_1') && learned('body_skill_3')) {
      heart='body_heart_1'; skills=['body_skill_2','body_skill_0','body_skill_1','body_skill_3'].filter(learned);
    }
    if(mode === 'dots' && learned('shadow_skill_3')) {
      heart='shadow_heart_0'; skills=['shadow_skill_0','shadow_skill_1','body_skill_1','shadow_skill_3'];
    }
    const secretCandidates = this.route==='body' ? ['body_secret_1','body_secret_0'] : ['sword_secret_1','sword_secret_0'];
    const secrets=secretCandidates.filter(learned).slice(0,u.secretSlots);
    const treasures=[null,null,null], active=['t0','t5','t2'].find(id=>s.ownedTreasures[id]&&this.available(id));
    const passive=['t1','t4','t7','t6'].filter(id=>s.ownedTreasures[id]&&this.available(id));
    if(u.treasureSlots>=1) treasures[0]=active||null;
    for(let i=1;i<u.treasureSlots;i++) treasures[i]=passive[i-1]||null;
    const r=s.paths[this.route].realm;
    const pills=[r>=3?'heal2':r>=1?'heal1':'heal0',r>=4?'shield2':r>=1?'shield1':'shield0',r>=3?'purify2':r>=1?'purify1':'purify0'];
    this.act({type:'setLoadout',heart,skills:skills.slice(0,u.skillSlots),secrets,treasures,pills});
    this.act({type:'setBattleRules',healBelow:.65,reserveInterrupt:true,shieldBeforeBurst:true});
    for(const uid of Object.values(this.state.equipped)) {
      const g=this.state.bag.find(x=>x.uid===uid);
      if(g)this.counts.maxEquippedRarity=Math.max(this.counts.maxEquippedRarity,g.rarity);
    }
  }
  performStoryGoal(journey) {
    const goal=journey.mission.goal, needed=journey.mission.required-journey.mission.current;
    for(let n=0;n<needed;n++) {
      if(goal.key==='dungeonWins'||goal.key==='bossWins') {
        const id=goal.id||(goal.key==='bossWins'?'boss_0':'resource_herb');
        if(!E.previewDungeon(this.state,{id,difficulty:0}).allowed)return false;
        if(C.dungeons[id].type==='cave')this.completeCave(id);
        else this.clearWithRetry({id});
      } else if(goal.key==='crafted')this.act({type:'craftPill',id:'heal0',count:1});
      else if(goal.key==='pillsUsed')this.act({type:'usePill',id:'qi0'});
      else if(goal.key==='study') {
        const id=Object.keys(this.state.techniques).find(id=>this.available(id)&&this.state.techniques[id].level<20);
        assert(id,'At least one available technique can still be studied');
        let r=this.act({type:'upgradeTechnique',id},true);
        if(!r.ok){this.wait(168);r=this.act({type:'upgradeTechnique',id});}
      }else if(goal.key==='gearDrops') {
        const boss=Object.values(C.dungeons).find(d=>d.type==='boss'&&d.realm<=this.state.paths[this.route].realm&&E.previewDungeon(this.state,{id:d.id}).allowed);
        assert(boss,'gear mission has an accessible source');this.clearWithRetry({id:boss.id});
      }else if(goal.key==='forged')this.act({type:'forgeGear',slot:'weapon',set:this.route==='body'?'body':'sword',rarity:0});
      else if(goal.key==='gifts')this.act({type:'gift',companion:journey.episode.companion||'qinglan',item:'herb'});
      else if(goal.key==='manualWins'||goal.key==='kills')this.clearWithRetry({id:'resource_herb'});
      else if(goal.key==='tower')this.clearWithRetry({id:'tower',floor:this.state.progress.tower+1});
      else throw Error('Campaign needs a real activity for story goal '+JSON.stringify(goal));
    }
    assert(S.journeyView(this.state,journey.episode.id).mission.done,'actual story activity credits its declared goal');
    return true;
  }
  completeCave(id) {
    this.act({type:'startDungeon',id,difficulty:0});
    for(let guard=0;guard<40&&this.state.exploration;guard++) {
      if(this.state.battle) {
        for(let n=0;n<601&&this.state.battle;n++)B.advanceBattle(this.state,1);
        assert(!this.state.battle,'cave battle settles');assert(this.state.lastBattleResult.win,'actual cave encounter victory');
        this.counts.battles++;this.counts.wins++;this.counts.combatSeconds+=this.state.lastBattleResult.time;
      }else {
        const choices=this.state.exploration.choices;
        if(!choices.length){this.act({type:'finishCave'});break;}
        const pick=choices.find(x=>x.optionId==='fight')||choices.find(x=>x.optionId==='gather')||choices[0];
        this.act({type:'chooseCave',choice:pick.id});
      }
    }
    assert(!this.state.exploration,'complete real cave route');assert(this.state.lastBattleResult.win,'cave finished, not early exited');this.save();
  }
  claimReady() {
    if(this.processingStories||this.state.battle||this.state.exploration)return;
    this.processingStories=true;
    try {
      for(let pass=0;pass<30;pass++) {
        const view=E.view(this.state);let progressed=false;
        const candidates=view.sidequestProgress.filter(q=>!q.completed&&q.journey&&q.journey.accessible&&q.progress.every(p=>p.done));
        if(view.currentChapter&&view.currentJourney&&view.currentJourney.accessible)candidates.push({id:'chapter_'+view.currentChapter.id,chapter:true});
        for(const candidate of candidates) {
          let journey=toMission(this.state,candidate.id,'protect',this.now,a=>this.act(a)),blocked=false;
          for(let stage=0;stage<20&&!['ready','completed'].includes(journey.stage);stage++){
            if(journey.stage==='mission'&&!journey.mission.done&&!this.performStoryGoal(journey)){blocked=true;break;}
            if(journey.stage==='mission'&&journey.mission.done&&journey.mission.canReturn===false){blocked=true;break;}
            journey=finishJourney(this.state,candidate.id,this.now,a=>this.act(a));
          }
          if(blocked)continue;assert.equal(journey.stage,'ready','all sequential chapter missions completed through real activity');
          this.act(candidate.chapter?{type:'claimChapter',choice:'protect'}:{type:'claimSidequest',id:candidate.id});progressed=true;
          this.save();
        }
        if(!progressed)break;
      }
      for(const q of E.view(this.state).commissions.filter(x=>x.ready))this.act({type:'claimCommission',id:q.id});
    }finally{this.processingStories=false;}
  }
  combat(a, required=true) {
    const start=this.act({type:'startDungeon',difficulty:0,...a},!required);
    if(!start.ok)return false;
    this.counts.battles++;
    this.save();
    let savedMid=false, snapshot=null;
    for(let n=0;n<601&&this.state.battle;n++) {
      const b=this.state.battle, p=b.player;
      if(b.potionCooldown<=0) {
        const load=this.state.loadouts[this.route].pills;
        const heal=load.find(id=>C.recipes[id].kind==='heal');
        const clean=load.find(id=>C.recipes[id].kind==='purify');
        const guard=load.find(id=>C.recipes[id].kind==='shield');
        if(p.hp/p.maxHp<.48&&this.state.pills[heal]>0)this.act({type:'battlePill',id:heal});
        else if(p.statuses.some(x=>['charm','root','drain','thunder'].includes(x.id))&&this.state.pills[clean]>0)this.act({type:'battlePill',id:clean});
        else if(b.enemies.some(e=>e.casting)&&p.shield<p.maxHp*.1&&this.state.pills[guard]>0)this.act({type:'battlePill',id:guard});
      }
      if(b.time>=30&&!savedMid) { this.save(); savedMid=true; }
      snapshot={id:b.id,tier:b.tier,time:Math.round(b.time),player:{hp:Math.round(p.hp),maxHp:p.maxHp,attack:p.attack,defense:p.defense,mp:Math.round(p.mp)},enemies:b.enemies.filter(x=>x.hp>0).map(e=>({name:e.name,hp:Math.round(e.hp),maxHp:e.maxHp,shield:Math.round(e.shield)})),protect:b.protect};
      B.advanceBattle(this.state,1);
      this.recordRank();
    }
    assert.equal(this.state.battle,null,'Fight did not settle within 601 seconds');
    this.counts.combatSeconds+=this.state.lastBattleResult.time;
    const won=this.state.lastBattleResult.win;
    this.counts[won?'wins':'losses']++;
    this.save();
    if(!won) this.failures.push({...snapshot,reason:this.state.lastBattleResult.reason,log:this.state.battleReports?.at(-1)?.mechanismEvents});
    if(required) assert.ok(won,'Combat blocker: '+JSON.stringify(this.failures.at(-1)));
    this.claimReady();
    return won;
  }
  clearWithRetry(a) {
    if(this.combat(a,false))return;
    this.wait(168);
    this.prepare(this.state.paths[this.route].realm);
    if(this.combat(a,false))return;
    this.configure('dots');
    this.combat(a,true);
    this.configure();
  }
  fly() {
    for(let guard=0;guard<100&&this.state.ascension?.stage!=='ascended';guard++) {
      const v=A.view(this.state);
      if(v.stage==='preparation')this.act({type:'beginAscension'});
      else if(v.stage==='vow'&&!this.state.ascension.choice)this.act({type:'chooseAscension',choice:'promise'});
      else if(v.stage==='ready')this.act({type:'completeAscension'});
      else if(v.stage==='trial'&&this.state.ascension.line===v.trialLines.length-1&&!v.mission.done)this.clearWithRetry({id:'heaven_gate'});
      else {
        let r=this.act({type:'advanceAscension'},true);
        if(!r.ok&&v.stage==='condense'){this.wait(168);r=this.act({type:'advanceAscension'});}
        assert(r.ok,'Actual ascension scene progression: '+r.message);
      }
      this.save();
    }
    assert.equal(this.state.ascension.stage,'ascended','fresh real gate victory and complete return dialogue lead into the new realm');
    for(let realm=0;realm<3;realm++) {
      assert.equal(this.state.ascension.realm,realm);
      for(let layer=1;layer<=10;layer++) {
        assert.equal(this.state.ascension.layer,layer);let guard=0;
        while(this.state.ascension.xp<A.xpNeeded(this.state.ascension)) {
          assert(++guard<120,'ordinary immortal meditation/hunt can reach each layer');
          const r=this.act({type:'celestialMeditate',count:1},true);
          if(!r.ok){
            const hunt='immortal_hunt_'+realm;
            if(E.previewDungeon(this.state,{id:hunt}).allowed)this.clearWithRetry({id:hunt});
            else this.wait(168);
          }
        }
        if(layer<10)this.act({type:'advanceCelestial'});
        this.save();
      }
      this.clearWithRetry({id:'immortal_'+realm});
      let advanced=this.act({type:'celestialBreakthrough'},true),guard=0;
      while(!advanced.ok&&guard++<40){this.clearWithRetry({id:'immortal_hunt_'+realm});advanced=this.act({type:'celestialBreakthrough'},true);}
      assert(advanced.ok,'actual fresh immortal trial and resources support advancement: '+advanced.message);this.save();
    }
    assert.equal(this.visitedCelestial.size,30,'every immortal small layer was visited through its actual action');
    assert.equal(this.state.ascension.perfected,true,'third immortal realm is truly complete, not just a label');
    assert.equal(this.state.ascension.breakthroughs,3);
    const before=E.serialize(this.state),again=E.act(this.state,{type:'completeAscension'},this.now);assert.equal(again.ok,false);assert.equal(E.serialize(this.state),before,'flight is granted once');
  }
  run() {
    // The initial herb fight proves entry from the untouched starter save.
    this.combat({id:'resource_herb'});
    this.wait(168);
    this.act({type:'levelUp'});this.act({type:'levelUp'});
    while(this.state.paths[this.route].layer<10)this.act({type:'levelUp'});
    this.act({type:'joinSect',school:this.route==='body'?'body':'sword'});
    this.prepare(0);
    for(const school of Object.keys(C.schools))this.clearWithRetry({id:'sect_'+school+'_0'});
    this.prepare(0);
    // Claim three actual batches for the second chapter.
    this.act({type:'craftPill',id:'qi0',count:3});this.act({type:'usePill',id:'qi0'});
    for(let realm=0;realm<6;realm++) {
      if(realm>0) {this.wait(168);this.prepare(realm);}
      for(const id of ['resource_herb','resource_ore','resource_insight','resource_essence']) {
        if(E.previewDungeon(this.state,{id,tier:realm,difficulty:0}).allowed)this.clearWithRetry({id,tier:realm});
      }
      if(realm===1) {
        for(const school of Object.keys(C.schools))this.clearWithRetry({id:'sect_'+school+'_1'});
        this.prepare(realm);
      }
      for(const d of Object.values(C.dungeons).filter(d=>d.type==='boss'&&d.realm===realm))this.clearWithRetry({id:d.id});
      for(let floor=this.state.progress.tower+1;floor<=10*(realm+1);floor++)this.clearWithRetry({id:'tower',floor});
      // Reach each small layer separately through ordinary levelUp actions; autoSmall is disabled for the next realm.
      if(this.state.paths[this.route].layer<10)this.wait(24);
      while(this.state.paths[this.route].layer<10)this.act({type:'levelUp'});
      if(this.state.paths[this.route].xp<K.xpNeeded(this.state))this.wait(24);
      this.prepare(realm);
      toTrial(this.state,this.now,a=>this.act(a));
      this.clearWithRetry({id:'trial'});
      if(realm===5)this.act({type:'finishRitual'});
      this.steps.push({realm,realmLabel:K.realmLabel(this.state),hours:this.counts.waitHours,battles:this.counts.battles,tower:this.state.progress.tower,chapter:this.state.story.chapter,power:E.attributes(this.state).power});
      this.claimReady();
      if(realm<5) {
        this.act({type:'setAutoSmall',enabled:false});
        this.act({type:'breakthrough'});
        // Walk ordinary small layers so all 60 ranks are evidenced, including realm-start checkpoints.
        while(this.state.paths[this.route].layer<10) {
          if(this.state.paths[this.route].xp<K.xpNeeded(this.state))this.wait(24);
          this.act({type:'levelUp'});
        }
      }
    }
    this.claimReady();
    assert.equal(this.state.story.chapter,6,'All six chapters');
    this.act({type:'ending',choice:'guardian'});
    assert.deepEqual(this.state.paths[this.route==='magic'?'body':'magic'],this.originalOtherPath,'Secondary route remains at untouched rank zero');
    assert.equal(this.state.gacha.total,0);
    assert.equal(this.counts.maxEquippedRarity,3);
    assert.equal(this.state.progress.tower,60);
    assert.equal(Object.keys(this.state.progress.bossWins).length,12);
    assert.equal(this.state.progress.endingTrials[this.route],true);
    assert.equal(this.visitedRanks.size,60,'Every cultivation node reached');
    this.fly();
    assert.deepEqual(this.state.paths[this.route==='magic'?'body':'magic'],this.originalOtherPath,'flying preserves the untrained other path');
    assert.equal(this.state.gacha.total,0,'new realm still needs no draws');
    assert.equal(this.counts.maxEquippedRarity,3,'new realm still retains actual purple equipment');
    this.save();
    return this.summary();
  }
  summary() {
    return {route:this.route,startTimestamp:START,seed:START>>>0,...this.counts,simulatedHours:this.counts.waitHours,realm:K.realmLabel(this.state),secondaryRoute:this.state.paths[this.route==='magic'?'body':'magic'],visitedNodes:this.visitedRanks.size,immortalNodes:this.visitedCelestial.size,immortalRealm:this.state.ascension?A.view(this.state).realmLabel:null,ascended:this.state.ascension?.stage==='ascended',perfected:!!this.state.ascension?.perfected,tower:this.state.progress.tower,uniqueBosses:Object.keys(this.state.progress.bossWins).length,chapter:this.state.story.chapter,ending:this.state.story.ending?.id||this.state.story.ending?.title||null,draws:this.state.gacha.total,redGearEquipped:0,redTreasuresEquipped:this.state.loadouts[this.route].treasures.filter(id=>id&&C.treasures[id].rarity===5).length,steps:this.steps,failures:this.failures};
  }
}

test('zero-draw legal actions reach 120 mortal nodes, both endings, true flight and all 60 immortal nodes', {timeout:120000}, () => {
  fs.mkdirSync(path.join(__dirname,'../dist'),{recursive:true});
  const results=[];
  for(const route of ['magic','body']) {
    const campaign=new Campaign(route);
    try {results.push(campaign.run());}
    catch(error) {
      results.push({...campaign.summary(),status:'blocked',error:error.message});
      fs.writeFileSync(path.join(__dirname,'../dist/playthrough-v3-report.json'),JSON.stringify({...CAMPAIGN_METHOD,results},null,2));
      console.log('PLAYTHROUGH '+JSON.stringify(results.at(-1)));
      throw error;
    }
  }
  fs.writeFileSync(path.join(__dirname,'../dist/playthrough-v3-report.json'),JSON.stringify({...CAMPAIGN_METHOD,results},null,2));
  for(const r of results)console.log('PLAYTHROUGH '+JSON.stringify({...r,steps:undefined,failures:undefined}));
});
