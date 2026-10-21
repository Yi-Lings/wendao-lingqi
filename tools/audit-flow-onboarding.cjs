#!/usr/bin/env node
'use strict';

// Read-only with respect to game files and player saves. All actions operate on
// fresh in-memory states; the only output is the explicitly named JSON report.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const Module = require('node:module');
const {createRequire} = Module;

const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const BASELINE = 'df0dd17575b0e310204716094afdbca93d7f4ae0';
const OUTPUT = path.join(ROOT, 'dist/v47-onboarding-audit.json');
const START = 1800000000000;
const DURATION_SECONDS = 20 * 60;
const STEP_SECONDS = 3;
const copy = value => JSON.parse(JSON.stringify(value));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, {cwd:ROOT, encoding:'utf8'});
const baselineSource = git('show', BASELINE + ':web/engine.js');
const currentSource = fs.readFileSync(path.join(WEB, 'engine.js'), 'utf8');

function compileBaseline(source) {
  // The virtual filename keeps ordinary sibling resolution in web/. Nothing is
  // checked out or written. Shared dependencies isolate the journey change.
  const filename = path.join(WEB, '.flow-audit-baseline-engine.js');
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(WEB);
  loaded.require = createRequire(path.join(WEB, 'engine.js'));
  loaded._compile(source, filename);
  return loaded.exports;
}

const engines = {baseline:compileBaseline(baselineSource), current:require('../web/engine.js')};
const SAFE_ACTIONS = new Set(['usePill', 'levelUp', 'setTraining']);

function inventory(s) {
  return {stones:s.stones, materials:copy(s.materials), pills:copy(s.pills)};
}

function snapshot(E, s) {
  return {
    route:s.route, path:copy(s.paths[s.route]), xpNeeded:E.modules.core.xpNeeded(s),
    training:s.training, generalResourceGroupUnlocked:E.modules.core.unlocks(s).resources,
    starterHerbDungeonAllowed:E.previewDungeon(s,{id:'resource_herb',tier:s.paths[s.route].realm,difficulty:0}).allowed,
    inventory:inventory(s), jobs:copy(s.alchemy.jobs), crafted:s.stats.crafted,
    storyChapter:s.story.chapter, formalBattleWins:copy(s.progress.dungeonWins),
    stateSha256:sha(E.serialize(s))
  };
}

function inventoryDelta(before, after) {
  const delta = {stones:after.stones-before.stones, materials:{}, pills:{}};
  for (const field of ['materials','pills']) for (const id of Object.keys(after[field])) {
    const value = after[field][id] - (before[field][id] || 0);
    if (value) delta[field][id] = value;
  }
  return delta;
}

function probeAction(E, s, action, now) {
  const probe = copy(s);
  const result = E.act(probe, action, now);
  return {allowed:!!result.ok, message:result.message, action:copy(action)};
}

function recommendation(E, s, now) {
  const original = E.serialize(s);
  const j = E.journey(s), goal = j.primary, t = goal.target;
  let access;
  if (t.kind === 'action') {
    access = SAFE_ACTIONS.has(t.type)
      ? {...probeAction(E,s,{type:t.type,...t.payload},now), kind:'public-action'}
      : {allowed:null, kind:'outside-policy', reason:'主建议动作不在本工具允许策略中'};
  } else if (t.kind === 'ui' && t.type === 'source') {
    const v = E.previewDungeon(s,{id:t.payload.id,tier:s.paths[s.route].realm,difficulty:0});
    access = {allowed:!!v.allowed, kind:'dungeon-preview', requirements:copy(v.requirements || []),
      reason:v.allowed?'挑战可进入；本策略不执行或自动结算战斗':'建议入口指向未满足条件的挑战'};
  } else if (t.kind === 'ui' && t.type === 'alchemy') {
    const job = (s.alchemy.jobs || []).find(x => x.id === t.payload?.jobId);
    if (job && job.status !== 'control') {
      access = {...probeAction(E,s,{type:'finishAlchemyJob',jobId:job.id},now),kind:'alchemy-finish'};
    } else if (job) {
      access = {allowed:true, kind:'manual-alchemy-control', reason:'需玩家手动完成控火，本策略不解控火题'};
    } else if (t.payload?.id) {
      const action = {type:'queuePill',id:t.payload.id,count:1};
      access = {...probeAction(E,s,action,now), kind:'alchemy-queue', cost:E.costs(s,'queuePill',action)};
    } else {
      access = {allowed:true, kind:'alchemy-menu', reason:'只打开丹方目录，没有指定可直接制作的丹方'};
    }
  } else {
    access = {allowed:null, kind:'outside-policy', reason:'界面/叙事建议需真人或浏览器验收，工具不代执行'};
  }
  assert.equal(E.serialize(s), original, '只读建议及可达性探测不得改变原状态');
  return {id:goal.id,title:goal.title,description:goal.description,label:goal.label,
    target:copy(t),etaSeconds:j.etaSeconds,trainingPerMinute:j.trainingPerMinute,access};
}

function apply(E, s, action, now, events) {
  const before = snapshot(E,s), declaredCost=action.type==='queuePill'?E.costs(s,'queuePill',action):null,
    result = E.act(s,action,now);
  assert.equal(result.ok,true,result.message);
  assert.equal(E.validate(s).ok,true,'公共动作后必须保持合法状态');
  const after = snapshot(E,s);
  events.push({kind:'action',atRuleSecond:(now-START)/1000,action:copy(action),message:result.message,
    actualInventoryDelta:inventoryDelta(before.inventory,after.inventory),
    pathBefore:before.path,pathAfter:after.path,
    declaredCost});
}

function commonPrefix(E) {
  const s = E.createState(START), events = [], stages = [];
  function capture(label) {
    stages.push({label,state:snapshot(E,s),recommendation:recommendation(E,s,START)});
  }
  capture('untouched-createState');
  apply(E,s,{type:'usePill',id:'qi0'},START,events);
  capture('after-genuine-starter-pill');
  // Advance only when the legal public action succeeds on an unmodified clone.
  // No resources, realm/layer values, timestamps or unlock flags are assigned.
  for (let n=0;n<9;n++) {
    if (!probeAction(E,s,{type:'levelUp'},START).allowed) break;
    apply(E,s,{type:'levelUp'},START,events);
    capture('after-legal-level-up-'+(n+1));
  }
  return {events,stages,finalState:snapshot(E,s)};
}

function ruleClock(E) {
  const s = E.createState(START), initial=snapshot(E,s), events=[], waits=[];
  let second=0, actionCount=0, blockedSeconds=0, manualAvailableSeconds=0,
      otherPolicyWaitSeconds=0, passiveXp=0, firstGeneralResourceGroupSecond=null;
  const passiveOutput={stones:0,materials:{}};
  const addOutput = summary => {
    passiveXp += summary.xp || 0;
    passiveOutput.stones += summary.stones || 0;
    for (const [id,count] of Object.entries(summary.materials || {}))
      passiveOutput.materials[id]=(passiveOutput.materials[id]||0)+count;
  };
  while (true) {
    if (E.modules.core.unlocks(s).resources && firstGeneralResourceGroupSecond===null)
      firstGeneralResourceGroupSecond=second;
    const rec=recommendation(E,s,START+second*1000), access=rec.access;
    const supported=access.allowed&&access.action&&
      (SAFE_ACTIONS.has(access.action.type)||['queuePill','finishAlchemyJob'].includes(access.action.type));
    if (supported) {
      assert(++actionCount<=1000,'策略动作超过防循环上限');
      apply(E,s,access.action,START+second*1000,events);
      continue;
    }
    if (second===DURATION_SECONDS) break;
    const duration=Math.min(STEP_SECONDS,DURATION_SECONDS-second);
    const reason=access.allowed===false?'recommended-target-unavailable':
      access.allowed===true?'manual-activity-available-outside-policy':'outside-policy-not-assessed';
    if (reason==='recommended-target-unavailable') blockedSeconds+=duration;
    else if (reason==='manual-activity-available-outside-policy') manualAvailableSeconds+=duration;
    else otherPolicyWaitSeconds+=duration;
    const last=waits[waits.length-1];
    if (last&&last.toRuleSecond===second&&last.goalId===rec.id&&last.reason===reason) {
      last.toRuleSecond+=duration;last.seconds+=duration;
    } else waits.push({fromRuleSecond:second,toRuleSecond:second+duration,seconds:duration,
      reason,goalId:rec.id,recommendation:rec});
    second+=duration;
    const result=E.advance(s,START+second*1000);
    assert.equal(result.ok,true);assert.equal(E.validate(s).ok,true);
    addOutput(result.summary);
  }
  const final=snapshot(E,s);
  assert.deepEqual(final.formalBattleWins,{},'工具不得自动处理正式战斗');
  assert.equal(final.storyChapter,0,'工具不得跳过叙事或填写进度');
  return {label:'20-minute rules-clock simulation; NOT a natural human playtest',
    ruleSeconds:second,clockStepSeconds:STEP_SECONDS,actionTimeModel:'zero time per public action; never interpret as human completion time',
    actionCount,firstGeneralResourceGroupUnlockRuleSecond:firstGeneralResourceGroupSecond,
    recommendedTargetUnavailableSeconds:blockedSeconds,
    manualActivityAvailableButUnexecutedSeconds:manualAvailableSeconds,
    otherPolicyWaitSeconds,passiveXp,passiveOutput,initial,final,
    netInventoryDelta:inventoryDelta(initial.inventory,final.inventory),
    lastRecommendation:recommendation(E,s,START+second*1000),events,waitIntervals:waits};
}

const common=Object.fromEntries(Object.entries(engines).map(([name,E])=>[name,commonPrefix(E)]));
assert.deepEqual(common.baseline.finalState,common.current.finalState,
  '同一初始状态与相同公共动作必须产生相同经济/进度');
const simulations=Object.fromEntries(Object.entries(engines).map(([name,E])=>[name,ruleClock(E)]));
const economicInputs=Object.fromEntries(['core.js','data.js','economy.js'].map(file=>{
  const bytes=fs.readFileSync(path.join(WEB,file));
  const old=execFileSync('git',['show',BASELINE+':web/'+file],{cwd:ROOT});
  return [file,{currentSha256:sha(bytes),baselineSha256:sha(old),unchanged:bytes.equals(old)}];
}));
const report={
  schemaVersion:1,generatedAt:new Date().toISOString(),tool:'tools/audit-flow-onboarding.cjs',
  baselineCommit:BASELINE,workspaceHead:git('rev-parse','HEAD').trim(),
  baselineEngineSha256:sha(baselineSource),currentEngineSha256:sha(currentSource),economicInputs,
  scope:{freshState:'Both runs start only with E.createState(1800000000000). No fixture stock, realm edits or injected rewards.',
    baselineLoading:'git show of baseline engine.js via Module._compile + createRequire; all sibling modules use current workspace bytes.',
    comparison:'Isolated engine/journey comparison, not an archived full-baseline application or browser playtest.',
    strategy:'Only primary recommendation: usePill, legal levelUp, setTraining, targeted alchemy queue of one pill, targeted finishAlchemyJob. All mutations use public E.act or E.advance.',
    exclusions:'No battle start/tick/auto-win, no story choices, no control-fire solver, no shopping, gifts, ticket claims, quests, donations, or hidden resource changes.',
    timing:'E.advance uses a 3-second synthetic rules clock for 20 minutes; permitted actions take zero modeled seconds.',
    interpretation:'Read-only diagnostic evidence of reachable recommendations and existing costs; not proof of human flow, fun, retention, real completion speed or long-term balance.'},
  samePublicPrefix:{statesEqual:true,...common},simulations,
  summary:{
    afterSameStarterActions:{baseline:common.baseline.stages.at(-1).recommendation,current:common.current.stages.at(-1).recommendation},
    baselineBlockedRuleSeconds:simulations.baseline.recommendedTargetUnavailableSeconds,
    currentBlockedRuleSeconds:simulations.current.recommendedTargetUnavailableSeconds,
    baselineGeneralResourceGroupUnlockRuleSecond:simulations.baseline.firstGeneralResourceGroupUnlockRuleSecond,
    currentGeneralResourceGroupUnlockRuleSecond:simulations.current.firstGeneralResourceGroupUnlockRuleSecond,
    baselineStarterHerbDungeonAllowed:simulations.baseline.initial.starterHerbDungeonAllowed,
    currentStarterHerbDungeonAllowed:simulations.current.initial.starterHerbDungeonAllowed,
    warning:'An available dungeon is intentionally left for the player. Remaining policy wait does not mean the game offers no action; zero-time action chains are not human pacing measurements.'}
};
fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
fs.writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output:path.relative(ROOT,OUTPUT),...report.summary},null,2));
