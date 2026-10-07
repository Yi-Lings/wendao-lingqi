(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./data.js'):root.WendaoData);
  if(node)module.exports=api;else root.WendaoBreakthroughRitual=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const copy=x=>JSON.parse(JSON.stringify(x));
const CAP=C.limits&&C.limits.number||1e12,MAX_TIME=8640000000000000;
const routes=['body','magic'],phases=['breath','array','heart','trial','complete'];
const breathIds=['inhale','hold','exhale'],heartIds=['protect','truth','promise'];
const runes={wood:'木',fire:'火',earth:'土',metal:'金',water:'水',wind:'风'};
const texts=[
  {
    title:'石室初灯',subtitle:'让第一座道基承得住你想守护的人',
    introduction:['夜雨沿着洞府石檐落下。你把药瓶放在掌心，瓶壁还留着丹炉的余温。一路修来，灵息已满，却始终在经脉尽头寻找出口。','月衡没有替你按下阵盘。他把一盏小灯放在门外：“境界不是谁给你的许可。先听见自己的呼吸，再决定为何越过这道门。”','你亲手置好灵莲与玄铁，服下丹药。灯影收拢，纷杂的灵息第一次有了可以落脚的地方。'],
    breath:['吸气时，想象山雨渗入石缝。不要追逐灵息，只让它经过胸腹。','把这一息留在丹田。门外的雨声仍在，你不必把整个世界推开。','缓缓吐息，将游离的真元送入脚下阵纹。灯焰不再左右摇摆。'],
    sequence:['wood','water','earth'],hint:'药圃青木先醒，雨水沿脉而行，最后归于厚土。按石室留下的次序接通三枚阵纹。',
    array:['你轻触木纹，莲瓣舒展，经脉不再刺痛。','水纹亮起，雨声与灵息接在了一起。','土纹落定，一圈温暖的光托住将成的道基。'],
    dilemma:'闭眼之后，你回到上山那天。山路另一头有人呼救，而洞府里的灯正召你向前。此刻两条路都是真实的，你要把什么留在道基之中？',
    choices:[['protect','把救人的灯带上','力量先要能承住他人的重量。','你没有假装自己救得了所有人，只把那盏灯提到山路口。呼救的人循光而来，泥水漫过你的鞋面。','心境中的石室多了一扇朝外的门。你记住：强大可以是一条让人走回来、而非只能让自己走出去的路。'],['truth','先认清两条路','宁可慢一步，也不把疑问交给旁人回答。','你蹲下观察泥地上的脚印，发现呼救声来自倒塌山壁之后。洞府的灯并没有催促，它只是照亮了被雨水掩住的小径。','你把第一道疑问写在心里。今后的力量不替你决定是非，它只让你有余力把事情看清。'],['promise','回应曾给出的约定','记得来处，也为自己的选择负责。','你想起临行时答应替村口老人捎回的药。背篓已经湿透，你先把药包裹好，才重新站到洞府前。','道基不是割断牵挂的高台。你在阵心留下那句约定，允许自己走远，也记得为何回来。']]
  },
  {
    title:'湖上凝光',subtitle:'让散乱的灵力与未说出口的话一同归心',
    introduction:['镜湖无风，水面映出数十个正在修炼的你。每一道倒影都比你更快一步，仿佛只要伸手，便能借走他们的圆满。','你把丹药与护阵材料安置在湖心石台上。素衍递来旧罗盘，针尖却指向你的胸口：“凝成的若只是别人想要的模样，再圆的金丹也会裂。”','石台边的水纹缓缓展开。你需要收回散落在比较、期待与惧怕中的灵力，让它们归于同一颗心。'],
    breath:['吸入一口清凉湖气，辨认胸口真正属于自己的灵力。','暂留此息，不跟随水中倒影的节奏。','吐出追赶的念头，让灵息沿石台缓慢回环。'],
    sequence:['water','fire','metal'],hint:'镜湖之水洗去浮影，炉心之火炼出真形，最后以金纹收束。不要先封住尚未明白的心。',
    array:['水纹清亮，最模糊的倒影先被洗去。','火纹在水下燃起，你听见真元凝聚的低鸣。','金纹合拢，散落的灵光终于围住一颗稳定的心。'],
    dilemma:'湖中的倒影递来一枚完美的金丹。代价是忘记一次曾令你迟疑的失败。那段记忆并不光彩，却有一个人曾在你失手后扶你站起。',
    choices:[['protect','留下扶你的人','珍惜一度支撑自己的手。','你向倒影摇头。那个人的手并不强壮，却在最狼狈的时候接住过你。湖心的光因此有了温度。','归心之后，你不再把曾被帮助当作软弱。这份记忆会陪你走过接下来的灵压。'],['truth','保留失败的全貌','圆满要能容得下自己的裂隙。','你把失误从头到尾重新看了一遍。不是所有痛处都值得美化，但每一次判断都属于你真实走过的路。','倒影中的金丹失去诱惑。真正凝成的光并非无瑕，却因为不必藏起裂隙而更加稳定。'],['promise','兑现那次重来的约定','把未完成的事带进新的境界。','你记起当时说过的“下次我会准备得更好”。你没有向湖水索求完美，只将那次重来的机会握在手里。','灵息绕过旧伤，重新汇到掌心。你选择让约定成为动力，而不是永远不能失手的枷锁。']]
  },
  {
    title:'雾中照影',subtitle:'看清心魔借来的声音，再把自己的名字说完整',
    introduction:['雾海残墟的石阶在识海中一层层展开。每经过一道残碑，你都听见自己的声音在另一边重复：“只要再强一点，就不会失去。”','凝婴所需的丹药在舌下缓缓化开。青岚为你系好护阵绳，绳尾留在石阶之外：“这回不用急着证明什么。认出谁在说话，认出你自己。”','你盘坐在石阶中央。未成形的灵婴像一簇微光，映出你曾经回避的疲惫、执念与愿望。'],
    breath:['吸气，把微光接回识海，不追逐每一道回声。','停住这一息，听清那句“不会失去”里藏着谁的惧怕。','吐息时，将自己的名字轻轻说完。'],
    sequence:['metal','wood','water'],hint:'先以金镜辨真，再以青木护住初生的灵识，最后让水纹带走借来的回声。',
    array:['金镜亮起，重复你声音的影子多了一道裂纹。','木纹托住微光，它不必马上长成别人眼中的强者。','水纹穿过石阶，所有回声都离你远了一步。'],
    dilemma:'心魔换成一位同行者的模样。它说可以永远留下，只要你让它替你作出每一个不会后悔的决定。你看见那张熟悉的脸，却也看见它从不询问你的意愿。',
    choices:[['protect','为彼此留下退路','守护也包括不将同行的人握在手里。','你松开护阵绳，让它仍能引路，却不再捆住任何人。那张熟悉的脸有了自己的沉默。','你明白陪伴可以共同选择，也可以各自前行。灵婴在识海中睁开眼，第一次不再追逐离开的背影。'],['truth','辨认真实的声音','不以安慰替代一个人的意愿。','你问了一个只有真实同行者才会回答的问题。影子没有回答，只重复“我会永远留下”。','你向它道别。告别并没有抹去记忆，只让真实的人从你最深的恐惧中被释放出来。'],['promise','守住自己的选择','愿意承受选择的重量，也接受别人的不同。','你承认自己会后悔，也会迟疑，但不把今后的决定交给一张熟悉的脸。护阵绳在掌心微微发热。','微光终于稳定。你给初生的灵婴一个名字，那名字与任何人的期待都无关。']]
  },
  {
    title:'地脉长灯',subtitle:'把神识铺成道路，而不是把世界收进掌心',
    introduction:['赤霄地脉在神识下宛如一座正在呼吸的城。旧盟留下的供能阵仍索取着灵息，每一处明亮阵眼背后，都有一道不为人知的疲惫。','化神丹在阵台上泛出清光。你亲手铺设护阵莲，给矿石留下可以退出阵心的位置。力量越大，越不能把退出视作背叛。','远处传来求援的灯讯。你可以看见整座阵网，却还需要决定：要让所有灯听从一个人，还是让每一盏灯都能自己亮起。'],
    breath:['吸气，让神识触到最近的一盏灯，先认出一个具体的人。','停息，承认自己的感知仍有边界。','吐息，把连接铺向地脉，而不强迫每一盏灯回应。'],
    sequence:['earth','wood','fire'],hint:'厚土承住地脉，青木连起归途，最后让灯火沿路亮起。火纹不能先于可归的路。',
    array:['土纹缓缓抬起阵台，脆弱的地脉得到支撑。','木纹伸出细枝，每一道连接都有可以离开的门。','火纹逐灯亮起，光从未被要求燃尽自己。'],
    dilemma:'阵网深处出现一扇旧盟铁门。只要把门锁上，城中的灯便不会再断；但守阵人的疲惫也会永远留在门后。有人称这是为了所有人的安宁。',
    choices:[['protect','先打开守阵人的门','让正在承受代价的人也能被看见。','你把铁门推开。阵网骤然变暗，守阵人却第一次看见了屋外的晨光。你与他们一同托住摇晃的阵台。','安宁不再只是城上方的灯火，也包括门后的人能安心休息。神识因此有了边界，也有了方向。'],['truth','公开阵网的代价','使选择建立在看得见的事实之上。','你将供能记录投向每一盏灯。有人惊惧，有人沉默，也有人带着备用阵材走来。','旧盟的秘密失去藏身之处。你不替所有人选择，却把判断所需的光交还给他们。'],['promise','重绘可以轮换的阵','让共同承担成为可以兑现的安排。','你沿地脉写下新的阵式：每一个位置都能换手，每一盏灯都有熄下休整的时刻。','第一轮交接开始时，灯火微弱却稳定。你记住这次约定：强者也要为后来者留下能接得住的位置。']]
  },
  {
    title:'天隙雷息',subtitle:'渡过雷火之前，先给来不及道别的人留一条归途',
    introduction:['星桥的裂口悬在夜空之上。雷声尚未落下，你先看见许多曾经赶路的人：有人离开，有人守着残灯，也有人再没有回来。','渡厄丹化成一圈温润的灵息，护阵材料按你亲手画下的线路安置。今天的劫火不会因为准备而消失，但你的每一次应对都能有来由。','素衍将最后一枚归途标记放在桥头：“撑不住可以回来。渡劫不该把退路也劈碎。”你把这句话留在最靠近心口的位置。'],
    breath:['吸气，先听见雷声之间的空隙，而不把每一次轰鸣都当作命令。','停息，确认护阵的位置，也确认自己随时可以回头。','吐息，让雷意从掌缘泄开，不把所有重量留在心口。'],
    sequence:['wind','water','earth'],hint:'风纹辨来雷，水纹分去灼热，厚土最后承住落点。先看清来处，才能给雷火一条离开的路。',
    array:['风纹轻鸣，第一道雷的走向清晰浮现。','水纹接住劫火，热意沿阵缘远去。','土纹护住桥头，归途标记在风中依旧明亮。'],
    dilemma:'劫云许你一次机会：抹去一个离开者的身影，便能从此不再为失去而痛。裂隙另一侧，旧日的路标仍被那个人亲手修补过。',
    choices:[['protect','让路标继续照亮人','将曾被给予的温柔传给仍在路上的人。','你没有抓住云中的身影，而是扶正桥头路标。下一位赶路的人看见它，停下脚步躲过一道落雷。','失去仍然会痛，但它不只留下缺口。你把收到过的光继续往前传，护阵在掌心渐渐安定。'],['truth','保留无法改写的过去','不以遗忘换取一个完美的自己。','你正视那段没有结局的道别。并非每个离开都能被解释，也并非每份伤痛都需要立即放下。','劫云的许诺散开了。你没有变得毫无惧怕，只是终于可以带着真实的自己走向雷火。'],['promise','为后来者守住归途','以能够兑现的行动纪念曾经同行。','你在裂口两端补上新的归途标记。无需谁回来证明它有用，只要下一个人能平安走过。','雷声落下之前，你再次检查每一条退路。这份约定并不叫你永远撑住，它让你知道什么时候应当护盾、什么时候应当返回。']]
  },
  {
    title:'长明问道',subtitle:'最后一盏灯，不为再高一层的境界而亮',
    introduction:['长明凌渊是人界六境的最后一座山，云海之外仍有待亲自开启的天门。你站在归途桥上，六境走过的灯火在水中排成一条很长的路。','道心丹与最后一组护阵材料安置完毕。此刻的静坐是人界终境的道心自证。跨越天门之前，你有时间回望：这些力量，究竟让谁的生活发生过改变。','桥头没有催你入阵的人。你可以继续走，也可以停下。但若要自证大道，这一次应由你亲口回答，之后再面对最后的天隙回响。'],
    breath:['吸气，将一路听过的名字留在心中，不要求他们都与你同路。','停息，看看仍未完成的事情，允许自己不是答案的全部。','吐息，把一路所得还给可以继续生长的世界。'],
    sequence:['fire','metal','wood'],hint:'灯火照亮走过的路，金镜看清现在的你，青木最后留给后来的人。终阵不以封闭结束，而以生长结束。',
    array:['火纹照出六境的灯火，每一盏都来自不同的人。','金纹映出你现在的模样，荣耀与疲惫都没有被抹去。','木纹越过桥头，在新的晨光中伸出第一枚嫩芽。'],
    dilemma:'桥中央有一块空白碑。它可以刻下你的名字，也可以刻下通向后来者的路线。碑的容量有限，而你已不需要它替你证明境界。',
    choices:[['protect','留下守护的方法','使后来的人能够互相照看。','你刻下如何护阵、如何求援、如何在撑不住时退出。名字留在同行者的记忆里，石碑留给真正需要它的人。','这是你选择的长明：灯可以换手，道路仍向每一个愿意归来的人敞开。'],['truth','留下仍需追问的问题','让未知继续成为自由求索的方向。','你刻下沿途没有被回答的疑问，也写明已知的代价与局限。后来者无须把你当作不可质疑的结论。','这是你选择的问道：真相不因一个人的圆满而结束，下一束光仍有照向别处的自由。'],['promise','留下可以重走的路','使一次个人的旅程成为可传授的经验。','你将丹方、阵序、失手后的调整一一刻在碑上。最难的几处，你写下当时怎样接受帮助，再怎样重新出发。','这是你选择的传承：后来者可以从这里起步，也可以走出与你不同的路。']]
  }
];
function no(message){return {ok:false,message,error:message};}
function yes(message,data){return {ok:true,message,data:data||{}};}
function integer(n,min,max,label){if(!Number.isSafeInteger(n)||n<min||n>max)throw Error('破境存档无效：'+label);return n;}
function object(o,label){if(!o||typeof o!=='object'||Array.isArray(o))throw Error('破境存档无效：'+label);return o;}
function key(route,realm){return route+':'+realm;}
function full(s,route){const p=s.paths[route],needed=Math.round(C.layerXp[9]*C.realmXpFactors[p.realm]);return p.layer===10&&p.xp>=needed;}
function reservation(realm){return {pills:{['break'+realm]:1},materials:{lotus:3+realm*2,ore:3+realm*3}};}
function won(s,route,realm){return !!(s.progress.trialWins[key(route,realm)]||(realm===5&&s.progress.endingTrials[route]));}
function legacyReady(s,route){const p=s.paths[route];return !!(s.ritualLegacyWins&&s.ritualLegacyWins[key(route,p.realm)]&&won(s,route,p.realm));}
function normalize(s){
  if(s.ritual===undefined)s.ritual=null;
  if(s.ritualLegacyWins===undefined){
    s.ritualLegacyWins={};
    const wins=s.progress&&s.progress.trialWins||{};
    for(const [id,value] of Object.entries(wins)){
      const match=/^(body|magic):([0-5])$/.exec(id);
      if(match&&value===true&&s.paths&&s.paths[match[1]]&&Number(match[2])<=s.paths[match[1]].realm)s.ritualLegacyWins[id]=true;
    }
    for(const route of routes)if(s.progress&&s.progress.endingTrials&&s.progress.endingTrials[route]===true&&s.paths[route].realm===5)s.ritualLegacyWins[key(route,5)]=true;
  }
  if(s.ritualHistory===undefined)s.ritualHistory=[];
  return s;
}
function validate(s){
  object(s.ritualLegacyWins,'旧试炼记录');
  if(Object.keys(s.ritualLegacyWins).length>12)throw Error('旧试炼记录过多');
  for(const [id,value] of Object.entries(s.ritualLegacyWins)){
    const m=/^(body|magic):([0-5])$/.exec(id);
    if(!m||value!==true||Number(m[2])>s.paths[m[1]].realm||!won(s,m[1],Number(m[2])))throw Error('旧试炼兼容记录与实际进度不符');
  }
  if(!Array.isArray(s.ritualHistory)||s.ritualHistory.length>12)throw Error('破境回忆列表无效');
  const seen=new Set();
  for(const h of s.ritualHistory){
    object(h,'破境回忆');if(Object.keys(h).length!==4||Object.keys(h).some(k=>!['route','realm','choice','at'].includes(k)))throw Error('破境回忆字段无效');
    if(!routes.includes(h.route)||!heartIds.includes(h.choice))throw Error('破境回忆选择无效');
    integer(h.realm,0,5,'回忆境界');integer(h.at,0,MAX_TIME,'回忆时间');
    const id=key(h.route,h.realm);if(seen.has(id)||h.realm>s.paths[h.route].realm||!won(s,h.route,h.realm))throw Error('破境回忆与试炼记录不符');seen.add(id);
  }
  if(s.ritual===null)return s;
  const r=object(s.ritual,'破境仪式'),fields=['version','route','realm','phase','startedAt','reserved','breathStep','arrayStep','heartChoice','heartRead','completedAt'];
  if(Object.keys(r).length!==fields.length||Object.keys(r).some(k=>!fields.includes(k)))throw Error('破境仪式字段无效');
  if(r.version!==1||!routes.includes(r.route)||!phases.includes(r.phase))throw Error('破境仪式阶段无效');
  integer(r.realm,0,5,'仪式境界');integer(r.startedAt,0,MAX_TIME,'仪式开始时间');integer(r.breathStep,0,3,'调息进度');integer(r.arrayStep,0,3,'布阵进度');
  if(r.phase!=='complete'&&r.route!==s.route)throw Error('未完成的破境仪式必须属于当前修炼路线');
  if(s.paths[r.route].realm!==r.realm||s.paths[r.route].layer!==10)throw Error('破境仪式与当前境界不符');
  object(r.reserved,'预留材料');if(Object.keys(r.reserved).length!==2||!own(r.reserved,'pills')||!own(r.reserved,'materials'))throw Error('破境预留材料字段无效');
  object(r.reserved.pills,'预留丹药');object(r.reserved.materials,'预留护阵材料');
  const required=reservation(r.realm);
  if(Object.keys(r.reserved.pills).length!==1||r.reserved.pills['break'+r.realm]!==1||Object.keys(r.reserved.materials).length!==2||r.reserved.materials.lotus!==required.materials.lotus||r.reserved.materials.ore!==required.materials.ore)throw Error('破境预留材料与境界不符');
  if(r.heartChoice!==null&&!heartIds.includes(r.heartChoice)||typeof r.heartRead!=='boolean')throw Error('破境道心选择无效');
  if(r.phase==='breath'&&(r.breathStep>=3||r.arrayStep!==0||r.heartChoice!==null||r.heartRead))throw Error('调息阶段进度不符');
  if(r.phase==='array'&&(r.breathStep!==3||r.arrayStep>=3||r.heartChoice!==null||r.heartRead))throw Error('布阵阶段进度不符');
  if(r.phase==='heart'&&(r.breathStep!==3||r.arrayStep!==3||r.heartRead))throw Error('道心阶段进度不符');
  if(['trial','complete'].includes(r.phase)&&(r.breathStep!==3||r.arrayStep!==3||r.heartChoice===null||!r.heartRead))throw Error('未经准备不能进入劫境');
  if(r.phase==='complete'){
    integer(r.completedAt,r.startedAt,MAX_TIME,'圆满时间');
    if(r.realm!==5||!won(s,r.route,5)||!s.progress.endingTrials[r.route]||!seen.has(key(r.route,5)))throw Error('终境圆满缺少真实试炼与回忆');
  }else if(r.completedAt!==null)throw Error('未完成仪式不能记录圆满时间');
  return s;
}
function remember(s,now){
  const r=s.ritual;if(!r||!r.heartRead||!r.heartChoice||!won(s,r.route,r.realm))return false;
  if(s.ritualHistory.some(h=>h.route===r.route&&h.realm===r.realm))return false;
  s.ritualHistory.push({route:r.route,realm:r.realm,choice:r.heartChoice,at:now});return true;
}
function guide(s,route){
  const realm=s.paths[route].realm,pill=C.recipes['break'+realm],reserved=!!(s.ritual&&s.ritual.route===route&&s.ritual.realm===realm),cost=reservation(realm);
  const names=Object.fromEntries(Object.entries(C.materials).map(([id,m])=>[id,m.name]));
  const source={herb:{id:'resource_herb',name:C.dungeons.resource_herb.name,description:'同境资源挑战稳定产出灵草；药圃持续产出，集市可用灵玉或天道尘购买。'},lotus:{id:'resource_herb',name:C.dungeons.resource_herb.name,description:'灵草秘境稳定产出灵莲；流光灵泉也可获得，药圃持续产出，集市可直接补给。'},ore:{id:'resource_ore',name:C.dungeons.resource_ore.name,description:'首境三层开放，资源挑战稳定产出矿石；洞府设施持续产出，集市可直接补给。'},insight:{id:'resource_insight',name:C.dungeons.resource_insight.name,description:'首境五层开放，资源挑战稳定产出参悟砂；藏经阁持续产出，集市可直接补给。'}};
  const requirements=[{kind:'pill',id:pill.id,name:pill.name,required:1,owned:s.pills[pill.id]||0,reserved,deficit:reserved?0:Math.max(0,1-(s.pills[pill.id]||0)),source:{id:'furnace',name:'洞府药炉',description:'当前境界可以确定研究丹方，随后炼制；无需先通过突破试炼，也无需随机抽取。'}}];
  for(const [id,q] of Object.entries(cost.materials))requirements.push({kind:'material',id,name:names[id],required:q,owned:s.materials[id]||0,reserved,deficit:reserved?0:Math.max(0,q-(s.materials[id]||0)),source:copy(source[id])});
  const learned=(s.learnedRecipes||[]).includes(pill.id),needCraft=!reserved&&(s.pills[pill.id]||0)<1;
  const craftingMaterials=[];
  for(const [id,q] of Object.entries(pill.materials)){
    const research=!learned&&pill.researchCost.materials[id]||0,total=(needCraft?q:0)+(!learned&&needCraft?research:0)+(cost.materials[id]||0);
    craftingMaterials.push({kind:'material',id,name:names[id]||C.materials[id].name,required:total,owned:s.materials[id]||0,deficit:reserved?0:Math.max(0,total-(s.materials[id]||0)),source:copy(source[id]),recipeRequired:q,researchRequired:research,ritualRequired:cost.materials[id]||0});
  }
  return {mandatoryPill:{id:pill.id,name:pill.name,count:1,owned:s.pills[pill.id]||0,reserved,learned,source:'furnace',researchCost:copy(pill.researchCost),craftCost:{stones:pill.stones,materials:copy(pill.materials)}},requirements,craftingMaterials,materialGuide:[
    {type:'research',id:pill.id,title:'研究'+pill.name+'丹方',description:learned?'已学会丹方，可以直接进入药炉炼制。':'在当前境界的药炉花费'+pill.researchCost.stones+'灵石与'+pill.researchCost.materials.insight+'参悟砂确定研究。无需通关本境试炼。'},
    {type:'craft',id:pill.id,title:'亲手炼制必需丹药',description:'药炉可直接炼制或排入炼丹队列。基础丹药产量确定；控火节奏提高额外成丹，不会吞掉基础产量。下列为丹方基础用料，升级药炉后的实际优惠以炼制页为准。'},
    {type:'dungeon',id:'resource_herb',title:'巡护'+source.herb.name,description:source.herb.description},
    {type:'dungeon',id:'resource_ore',title:'探索'+source.ore.name,description:source.ore.description},
    {type:'dungeon',id:'resource_insight',title:'参悟'+source.insight.name,description:source.insight.description},
    {type:'market',id:'resource-market',title:'集市补给',description:'灵玉或天道尘可直接购买常规材料；先核对实际缺口，无需随机抽取突破丹。'}
  ]};
}
function view(s,route){
  route=route||s.route;if(!routes.includes(route))return null;
  const p=s.paths[route],text=texts[p.realm],r=s.ritual&&s.ritual.route===route&&s.ritual.realm===p.realm?s.ritual:null;
  const busy=!!(s.battle||s.exploration),trialWon=won(s,route,p.realm),legacy=legacyReady(s,route),preparation=guide(s,route);
  let stage=r?r.phase:legacy?'ready':'preparation';if(stage==='trial'&&trialWon)stage='ready';
  const choices=[],narration=[],cue={title:'入静之前',text:'准备好必需丹药与护阵材料，圆满修为后再入静。',expected:null};
  let step=0,steps=3;
  if(stage==='breath'){
    step=r.breathStep;cue.title=['引息','守息','归息'][step];cue.text=text.breath[step];cue.expected=breathIds[step];
    [['inhale','吸气','引外界灵息入体'],['hold','留息','稳住丹田的这一息'],['exhale','吐息','将灵息送入护阵']].forEach(v=>choices.push({id:v[0],label:v[1],description:v[2]}));narration.push(...text.introduction);
  }else if(stage==='array'){
    step=r.arrayStep;cue.title='接通第'+(step+1)+'枚阵纹';cue.text=text.hint;cue.expected=text.sequence[step];narration.push(step?text.array[step-1]:'调息已稳，脚下三枚阵纹仍在等你亲手接通。',text.hint);
    Object.entries(runes).forEach(([id,name])=>choices.push({id,label:name+'纹',description:'循护阵留下的线索触碰'+name+'纹'}));
  }else if(stage==='heart'){
    step=r.heartChoice?1:0;steps=2;cue.title=r.heartChoice?'听见自己的回答':'照见道心';cue.text=r.heartChoice?'静读这次选择在心境中留下的变化。确认之后，带着这个回答进入劫境。':text.dilemma;
    if(r.heartChoice){const c=text.choices.find(c=>c[0]===r.heartChoice);narration.push(c[3],c[4]);}else{narration.push(text.dilemma);text.choices.forEach(c=>choices.push({id:c[0],label:c[1],description:c[2]}));}
  }else if(stage==='trial'){
    step=3;cue.title='携心入劫';cue.text='调息、护阵与道心准备已完成。现在面对'+C.trials[p.realm].name+'；失败不掉境界，已预留的材料不会再次扣除。';narration.push('阵纹亮起，你的回答仍回响在识海之中。劫境不是另一头等你击倒的普通怪物，而是这一路准备的最后检验。',C.trials[p.realm].description);
  }else if(stage==='ready'){
    step=3;cue.title=p.realm===5?'让最后一息落定':'将新境界安放在心中';cue.text=legacy?'此前真实完成的试炼已保留，可直接承接旧进度。':p.realm===5?'最后的天隙回响已散去。先读完眼前的灯火，再亲自结束自证大道。':'劫境已过，灵息不再冲撞经脉。护阵材料与丹药已在入静时支付，凝定新境不会再次扣费。';
    narration.push(p.realm===5?'风停在长明桥头。没有新境界的名号从天上落下来，只有你刻下的那几行字，在晨光里变得清晰。':'阵心缓缓收拢。你听见门外仍有人走过，洞府的灯还亮着。新的力量不让世界变得遥远，只让你终于能够稳稳站在其中。');
    if(r&&r.heartChoice)narration.push(text.choices.find(c=>c[0]===r.heartChoice)[4]);
  }else if(stage==='complete'){
    step=3;cue.title='大道自证，长明有归';cue.text='终境圆满已经保存。你可以回到主线，继续完成属于自己的终章。';narration.push('你熄下阵台上的试炼灯，桥头为后来人留下的灯仍亮着。自证大道不再催促你更高，而是陪你走完尚未完成的故事。',text.choices.find(c=>c[0]===r.heartChoice)[4]);
  }else narration.push(...text.introduction.slice(0,2));
  const fullCultivation=full(s,route),available=preparation.requirements.every(x=>x.deficit===0),archivedOther=!!(s.ritual&&s.ritual.phase==='complete'&&s.ritual.route!==route),otherRitual=!!(s.ritual&&!r&&!archivedOther);
  const chapterMemory=s.story&&s.story.chapter>0?'你已经走过'+s.story.chapter+'段主线。这次入静将把那些真实经历与自己的回答一同留在破境回忆中。':'初入山门的经历仍在心中。尚未完成主线也可以循自己的修炼路线准备破境。';
  return Object.assign({route,realm:p.realm,currentLabel:C.routes[route].realmNames[p.realm],targetLabel:C.routes[route].realmNames[Math.min(5,p.realm+1)],stage,title:text.title,subtitle:route==='body'?'以'+C.routes.body.realmNames[p.realm]+'之躯承住下一段道途 · '+text.subtitle:text.subtitle,introduction:text.introduction.slice(),narration,step,steps,totalSteps:9,choices,cue,sequence:stage==='breath'?breathIds.slice():text.sequence.slice(),sequenceLabels:stage==='breath'?['吸气','留息','吐息']:text.sequence.map(x=>runes[x]+'纹'),terminal:p.realm===5,fullCultivation,busy,otherRitual,canBegin:(!s.ritual||archivedOther)&&route===s.route&&!legacy&&!busy&&fullCultivation&&available,canTrial:!!r&&r.phase==='trial'&&!busy&&fullCultivation,canFinish:p.realm===5&&!busy&&trialWon&&!!r&&r.phase==='trial',canBreakthrough:p.realm<5&&!busy&&fullCultivation&&trialWon&&(legacy||!!r&&r.phase==='trial'),legacyReady:legacy,legacyCost:legacy?(p.realm===5?{}:Object.assign({stones:(s.pills['break'+p.realm]||0)>0?0:50*Math.pow(p.realm+1,2),materials:copy(reservation(p.realm).materials)},(s.pills['break'+p.realm]||0)>0?{pills:{['break'+p.realm]:1}}:{})):null,trialWon,heartChoice:r&&r.heartChoice||null,canContinue:!!r&&r.phase==='heart'&&!!r.heartChoice&&!busy,reservedCost:r?copy(r.reserved):null,chapterMemory,history:(s.ritualHistory||[]).filter(h=>h.route===route).map(h=>({realm:h.realm,choice:h.choice,at:h.at,title:texts[h.realm].title,answer:texts[h.realm].choices.find(c=>c[0]===h.choice)[4]}))},preparation);
}
function handle(s,a,now){
  if(!a||!['beginRitual','ritualBreath','ritualRune','ritualResolve','ritualHeart','continueRitual','cancelRitual','finishRitual'].includes(a.type))return null;
  const route=a.route||s.route;if(!routes.includes(route))return no('修炼路线无效');
  if(!Number.isSafeInteger(now)||now<0||now>MAX_TIME)return no('破境时间无效');
  if(route!==s.route)return no('先转修到该路线，再亲自准备这场破境入静');
  if(s.battle||s.exploration)return no('先完成当前历练，再回到护阵中入静');
  const p=s.paths[route];
  if(a.type==='beginRitual'){
    if(s.ritual&&!(s.ritual.phase==='complete'&&s.ritual.route!==route))return no('已有一场破境入静，继续完成或退出后再准备');
    if(legacyReady(s,route))return no('此前真实试炼已完成，可直接承接旧突破进度');
    if(!full(s,route))return no('先将当前路线修至十层圆满，修为填满后再准备入静');
    const cost=reservation(p.realm),pill=C.recipes['break'+p.realm];
    if((s.pills[pill.id]||0)<1)return no('入静必须准备'+pill.name+'，可在同境药炉确定研究并炼制；突破准备页提供材料去处');
    for(const [id,q] of Object.entries(cost.materials))if((s.materials[id]||0)<q)return no('护阵材料不足：'+(id==='lotus'?'灵莲':'玄铁')+'需'+q+'份，可巡护秘境或在集市直接补给');
    s.pills[pill.id]--;for(const [id,q] of Object.entries(cost.materials))s.materials[id]-=q;
    s.ritual={version:1,route,realm:p.realm,phase:'breath',startedAt:now,reserved:cost,breathStep:0,arrayStep:0,heartChoice:null,heartRead:false,completedAt:null};
    return yes('亲手布好护阵，'+pill.name+'药力缓缓化开。先引息，不必急着入劫。',{phase:'breath',cost:copy(cost),narration:texts[p.realm].introduction.slice()});
  }
  const r=s.ritual;if(!r||r.route!==route||r.realm!==p.realm)return no('当前路线没有正在进行的破境入静');
  if(a.type==='cancelRitual'){
    if(r.phase==='complete')return no('大道自证已经完成，入静材料不再退回');
    const list=[...Object.entries(r.reserved.pills).map(([id,q])=>[s.pills,id,q]),...Object.entries(r.reserved.materials).map(([id,q])=>[s.materials,id,q])];
    if(list.some(([o,id,q])=>!Number.isSafeInteger(o[id])||o[id]+q>CAP))return no('材料存储已满，先使用一些材料再退出；预留材料会完整保留');
    for(const [o,id,q] of list)o[id]+=q;s.ritual=null;
    return yes('你缓缓收阵，尚未凝定新境。预留丹药与护阵材料已完整退回。',{refund:copy(r.reserved)});
  }
  if(a.type==='ritualBreath'){
    if(r.phase!=='breath'||!breathIds.includes(a.choice))return no('请循当前调息提示引息、留息或吐息');
    if(a.choice!==breathIds[r.breathStep]){r.breathStep=0;return yes('灵息稍乱，灯焰仍在。重新从吸气开始，不损失丹药或护阵材料。',{correct:false,phase:r.phase});}
    r.breathStep++;if(r.breathStep===3)r.phase='array';
    return yes(texts[r.realm].breath[r.breathStep-1],{correct:true,phase:r.phase,step:r.breathStep});
  }
  if(a.type==='ritualRune'){
    if(r.phase!=='array'||!own(runes,a.choice))return no('请根据石室线索选择当前护阵的阵纹');
    if(a.choice!==texts[r.realm].sequence[r.arrayStep]){r.arrayStep=0;return yes('两道阵纹尚未接通。重新辨认线索即可，护阵材料没有额外消耗。',{correct:false,phase:r.phase});}
    r.arrayStep++;if(r.arrayStep===3)r.phase='heart';return yes(texts[r.realm].array[r.arrayStep-1],{correct:true,phase:r.phase,step:r.arrayStep});
  }
  if(a.type==='ritualResolve'||a.type==='ritualHeart'){
    if(r.phase!=='heart'||r.heartChoice!==null||!heartIds.includes(a.choice))return no('请面对当前心境，选择一份自己愿意承受的回答');
    r.heartChoice=a.choice;const c=texts[r.realm].choices.find(c=>c[0]===a.choice);
    return yes('你作出回答，但没有急着越过它。先看清这份选择在心境中留下的变化。',{phase:'heart',choice:a.choice,narration:[c[3],c[4]]});
  }
  if(a.type==='continueRitual'){
    if(r.phase!=='heart'||r.heartChoice===null)return no('调息、布阵与道心回答都完成后，再携心进入劫境');
    r.heartRead=true;r.phase='trial';return yes('你将这份回答留在阵心。准备已定，可以亲自面对本境劫境。',{phase:'trial',choice:r.heartChoice});
  }
  if(a.type==='finishRitual'){
    if(r.realm!==5||r.phase!=='trial'||!won(s,route,5)||!s.progress.endingTrials[route])return no('自证大道需要读过道心、完成真实终境试炼后，再亲自落定最后一息');
    remember(s,now);r.phase='complete';r.completedAt=now;
    return yes('大道自证，长明有归。你的回答与终境圆满已留下回忆，可以回到主线完成终章。',{phase:'complete',choice:r.heartChoice,narration:view(s,route).narration});
  }
  return null;
}
return {handle,view,validate,normalize,remember};
});
