(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WendaoStoryScenes=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
// Narrative is separate from reward definitions. Only the story engine advances saves.
const line=(speaker,text,expression=0)=>({speaker,text,expression});
const clue=(id,label,text,speaker,x,y)=>({id,label,text,speaker,x,y});
const map=n=>({file:'v3-map-atlas-'+(n<6?'a':'b')+'.png',cols:3,rows:2,col:n%3,row:Math.floor(n%6/3)});
const chapterArt=n=>({file:'v3-chapter-atlas.png',cols:3,rows:2,col:n%3,row:Math.floor(n/3)});
const mission=(key,id,label)=>({key,...(id?{id}:{}),count:1,label,nav:{page:'adventure',modal:'dungeon',payload:{id}}});
const herb=label=>mission('dungeonWins','resource_herb',label);
const ore=label=>mission('dungeonWins','resource_ore',label);
const insight=label=>mission('dungeonWins','resource_insight',label);
const boss=(n,label)=>mission('bossWins','boss_'+n,label);
const cave=(n,label)=>mission('dungeonWins','cave_'+n,label);
const craft=label=>({key:'crafted',count:1,label,nav:{page:'cave',modal:'alchemy'}});
const forge=label=>({key:'forged',count:1,label,nav:{page:'cave',modal:'forge'}});
const branch=(id,label,reply,goal)=>({id,label,reply,goal});
const episodes={};
function add(e){episodes[e.id]=e;}

add({id:'chapter_0',kind:'chapter',chapter:0,title:'荒山入道',subtitle:'雪夜青岚 · 荒山入道',location:'青岚山麓 · 雪夜药圃',stakes:'村人的体温正在流失。找到药材，也要查清山中为何没有一声钟响。',cast:['qinglan'],art:chapterArt(0),
  intro:[line('narrator','雪把村口的脚印填平了。灶里柴火烧得通红，床上的孩子却连呼出的白气都没有。'),line('qinglan','他不是染了风寒。你摸这片钟：屋里越冷，它反而越烫。',1),line('player','镇山钟不是护住村子的么？'),line('qinglan','三日前，山顶最后一次响钟。随后是药圃枯萎，接着轮到人。跟紧我，别踩雪下的黑线。',2)],
  clues:[clue('warm_shard','仍在发烫的钟片','裂口沾着黑泥，内侧有一枚倒写的「息」字。每过三次呼吸，铜片便向山上轻轻一挣。','qinglan',28,64),clue('bent_herbs','倒向山顶的枯草','草叶没有冻裂，却全朝山顶弯折。泥土底下的细纹，与钟片裂口上的纹路正好接续。','narrator',72,56)],
  choices:[branch('protect','先取救命药，留下山路标记',[line('player','先把还能用的药带回去。阵纹留下拓印，别让孩子等。'),line('qinglan','我留一盏灯给回村的路。你负责药圃里的汲灵虫，我来搬开倒木。',1),line('narrator','青岚撕下袖边裹住钟片，热意渐渐烫红她的指节。')],herb('通关青岚灵圃，取回新鲜药材')),
    branch('seek','追到纹路源头，再取一份活药',[line('player','只送药，他们明晚还会冷。我要带回能证明汲灵方向的活株。'),line('qinglan','可以。我先把他们移到地窖，那里离阵线远。你回来前，我会守着。',2),line('narrator','她把未点燃的引路灯交给你；灯绳的一端还缠在她腕上。')],herb('通关青岚灵圃，取得带阵纹的活药株'))],
  outro:{protect:[line('narrator','药汤咽下去，孩子第一次哭出了声音。你把手背贴在他额头上，终于碰到了暖意。'),line('qinglan','你看，这片叶子的根还在跳。药圃里的纹路没有断，只是被人接去了别处。',1),line('narrator','拓印边缘被融雪浸坏；青岚凭巡山记忆补出一段，终点竟是宗门的旧丹房。'),line('player','天亮后去丹房。这次，把药锅也带上。')],seek:[line('narrator','活株在灯下抽出一道细光，光沿钟片裂口偏向宗门。草根上封着一层极薄的炉灰。'),line('qinglan','地窖里的人还撑得住。先把这株煎了，炉灰我另收。',1),line('narrator','孩子醒来时抓住了你的袖口。床旁的老妇没有问你发现了什么，只问明天还有没有药。'),line('player','有。也会有一个说法。')]},summary:'雪夜救治留下第一份证据：镇山钟与宗门旧丹炉，被同一条倒转的阵纹相连。'});

add({id:'chapter_1',kind:'chapter',chapter:1,title:'宗门立身',subtitle:'炉火疑云 · 宗门立身',location:'宗门后院 · 封炉丹房',stakes:'陆月衡被指为改炉之人。门外等着药，封条里却藏着另一种笔迹。',cast:['yueheng','qinglan'],art:chapterArt(1),
  intro:[line('narrator','丹房门上压了三层封条。门槛外排着空药碗，雨水滴进碗底，发出空空的响。'),line('yueheng','他们说我把炉火调得太急。我确实动过火门——否则这一炉药会全坏。',2),line('qinglan','指控书没有落款，倒有旧盟的火漆。这是医者的字么？'),line('player','先看炉腹和药簿。炉子不会因为谁声大，就烧出另一种灰。')],
  clues:[clue('backwards_valve','反装的铜火门','新螺钉埋在旧灰下面，火门内侧刻着汲灵纹。正常开炉时，它会从丹房外的村落抽取灵息。','yueheng',30,58),clue('erased_register','刮去姓名的药簿','同一页上，月衡记了救治时辰；器台修缮人的姓名却被刮掉，只剩「旧盟代验」四字。','qinglan',73,65)],
  choices:[branch('protect','先用净炉成丹，让求药的人离开阵线',[line('player','封住旧炉，换干净的炉子。先把这一列药碗填满。'),line('yueheng','我来验每一份材料。药不能再让人暖一时、冷一夜。',1),line('qinglan','我盯着后门。若有人来取药簿，这回不会只留下火漆。',2)],craft('实际炼成一炉丹药，完成净炉试药')),
    branch('seek','查山君的供炉链，带回修缮者的证物',[line('player','有人在替旧炉送灵息。山君身上的铜环，和这火门是同一批料。'),line('qinglan','它昨夜沿运输石阶上山。我带你找那条路。',2),line('yueheng','去之前把解毒药带上。药碗由我照看，证物别再经过旧盟的人。')],boss(0,'击败青甲山君，截断供炉链并带回铜环'))],
  outro:{protect:[line('narrator','新丹没有寻常的焦甜气，只留一点草木涩味。门外的药碗渐渐被带走，门槛终于露出来。'),line('yueheng','脉象稳了。是旧炉在抽人，与你送来的药无关。',1),line('narrator','求药的老匠留下一张收据：上月更换火门，验收人签着「莫无迁」。签名被一只茶碗压住过半。'),line('qinglan','他可以说是假收据，但不能让这些人一齐没有来过。')],seek:[line('narrator','山君的铜环断在脚边。环内封着运输签，修缮日期比月衡进丹房早了七日。'),line('yueheng','这不是我洗清自己就够了。其他药房若也换了火门，那里的人怎么办？',2),line('qinglan','签背上的三颗星，和雾海古府的门纹相同。',1),line('player','把证物留给宗门，我们去找原始的炉图。')]},summary:'月衡的嫌疑洗清；旧炉不是事故，莫无迁与旧盟的修缮记录将调查引向雾海。'});

add({id:'chapter_2',kind:'chapter',chapter:2,title:'古府疑云',subtitle:'雾海问心 · 古府疑云',location:'雾海残墟 · 寒鸦档案室',stakes:'旧钟曾救过一座城。档案证明它怎样被改造，但保管档案的人仍困在灵阵中。',cast:['suyan','yueheng'],art:chapterArt(2),
  intro:[line('narrator','雾里有水声，却看不到河。石门开了一寸，一张薄纸从门缝伸出，上面只有一个画歪的出口。'),line('suyan','我临摹过这座古府。原图有七个退阵口，这里却只剩六个。',2),line('yueheng','门后有人活着，呼吸很轻。先别念门楣上的咒文。'),line('player','旧盟的档案和这个人，都得从阵里出来。')],
  clues:[clue('cut_exit','被凿平的第七阵口','石槽中残留旧铜。早年的钟阵允许供能者自行退阵，后来有人用封死的回路替掉了这一格。','suyan',24,58),clue('winter_records','覆霜的供能名册','第一页记着灾年自愿添灯的人；后半册只列户数，不列姓名。「不足之数，取邻里补之」盖着莫无迁的印。','narrator',73,60)],
  choices:[branch('protect','先打破寒鸦封阵，救出抄档人',[line('player','先放他出来。死人留下的证据，不能回答后来的人。'),line('yueheng','他的手冻在纸上了，我会尽量保住纸，也保住手。',2),line('suyan','阵口一开，原档就会化霜。我要抄最快的那几行，你替我争时间。',1)],boss(4,'击败寒鸦真人，打开抄档人的封阵')),
    branch('seek','先固定原档，再击破寒鸦阵心',[line('player','让原档留住印痕。旧盟会否认口述，我们需要完整的改阵日期。'),line('suyan','我钉住纸脊。你去断阵心，别用火烘那些字。',2),line('yueheng','我替抄档人稳住呼吸。他可以等这一阵，不能等一夜。')],boss(4,'击败寒鸦真人，解除原档的寒阵封印'))],
  outro:{protect:[line('narrator','抄档人跌进月衡怀里，指尖仍攥着门缝里的那张纸。半册原档在融霜中散成了墨水。'),line('suyan','日期我只抄到一半。但他记得是谁带走了第七阵口。',2),line('narrator','抄档人先望向出口，确认外面还有路，才低声说：「莫无迁说，退路会让供能的人心散。」'),line('player','那就让他亲眼看看，留下退路的人也会回来。')],seek:[line('narrator','纸脊裂开时，素衍手心也被钉针划破。原印和日期完整留下，抄档人的右手却再也伸不直。'),line('yueheng','他活着。以后写字要慢一些——这不是档案里能省掉的一行。',2),line('suyan','「封退阵口」在前，「灵息不足」在后。灾难不是理由，灾难是这样来的。',2),line('player','把他的名字补回名册。证据不能只剩莫无迁的名字。')]},summary:'镇山钟原是众人协力的护脉器。旧盟封死退阵口，把互助改成汲取；证据与救援各有代价。'});

add({id:'chapter_3',kind:'chapter',chapter:3,title:'劫火人间',subtitle:'裂镜旧盟 · 劫火人间',location:'赤霄地脉 · 被根须缚住的市街',stakes:'缚灵树王同时牵住街巷和钟心。断哪一段，决定今夜谁能先看到天亮。',cast:['qinglan','yueheng','suyan'],art:chapterArt(3),
  intro:[line('narrator','井里冒出的不是水，是细碎火星。街上每扇门都被树根顶住，屋里有人用碗敲窗。'),line('qinglan','东巷有四户，最里头是一间私塾。我能引他们出来，但根须一直在重新合拢。',2),line('suyan','西面主根里包着钟心。先毁它，整城的汲灵都会停；东巷的火墙却会在阵压松开时倒塌。',2),line('yueheng','两条路我都能接人。选一条，我们把另一条的险处说清楚。')],
  clues:[clue('school_window','敲碗的私塾窗','窗沿刻着孩子们的身高。根须上每多亮一道火纹，最高那道刻痕就往下陷一分。','qinglan',29,59),clue('trapped_bellheart','主根中的钟心','钟心外裹着灵息网，网结以城里各户门牌编号。直接截主根会使全城失去阵护，连河堤也暂时无遮拦。','suyan',70,52)],
  choices:[branch('protect','先开东巷，再夺钟心',[line('player','孩子走不出这道门，我们先把门打开。河堤的阵压暂时别动。'),line('qinglan','我沿你打出的缺口带人。别回头找我，盯住它下一次缠根。',2),line('suyan','我守住主根分流。钟心外层的印文可能会烧掉，我先拓最里面一圈。')],boss(6,'击败缚灵树王，为东巷打开缺口')),
    branch('seek','先断主根，让整座城停止供能',[line('player','根须每一息都在长。先取钟心，我来承担断阵后的缺口。'),line('qinglan','好，东巷的人交给我。钟心一动就喊我，不要让我猜。',2),line('yueheng','我把药铺的屏风拆下来挡落火。我们不是没有准备地赌这一场。')],boss(6,'击败缚灵树王，切断钟心主根'))],
  outro:{protect:[line('narrator','最后一个孩子爬过门槛，回头把点名簿抱进怀里。街上的火势慢慢低了下去。'),line('qinglan','一共二十三个。你不必记得他们的脸，但我想记下这个数。',1),line('suyan','钟心外圈焦了，莫无迁下一处阵站的坐标只剩半幅。我得沿星桥重新测。',2),line('narrator','天亮时，私塾先生把完整的名单钉在废门上，第一行不是功德，而是「今日都在」。')],seek:[line('narrator','钟心从主根里落下来，全城窗上的灵光同时熄灭。火墙垮下时，青岚护着人冲出东巷。'),line('qinglan','人都出来了。点名簿和那间屋子没了，先生说，他会重新记一遍。',2),line('suyan','钟心坐标完整。下一站是星桥熔炉，这座城不会再被拿来填那个炉子。',1),line('player','等这条街重建，先把私塾的门修好。')]},summary:'夺回钟心，断开城镇供能。守住东巷或保全阵站坐标，留下不同的人情与证据。'});

add({id:'chapter_4',kind:'chapter',chapter:4,title:'天道裂隙',subtitle:'星桥追凶 · 天道裂隙',location:'星桥断面 · 熔炉与月蚀双阵',stakes:'莫无迁已把凌渊闭合写成一次献城。毁掉熔炉能护住城；揭穿幻阵，才知道城被献给了谁。',cast:['suyan','qinglan','yueheng'],art:chapterArt(4),
  intro:[line('narrator','断桥下方是一片没有星的黑。远处熔炉吐出红光，月蚀阵却把那红光照成了平静的城灯。'),line('suyan','那不是两座城。月蚀灵狐把供能图藏在幻影后面，让人以为自己只是在添一盏灯。',2),line('qinglan','桥头留下了一封信：「舍一城，可救百城。」落款只有莫无迁的印。'),line('yueheng','被他写进「一城」的人，没有一个在信上签名。')],
  clues:[clue('sacrifice_route','炉底的献城导轨','导轨上的数字仍在变化，每一格对应一条街。炉心一旦闭锁，汲灵会延续至所有数字归零。','narrator',28,59),clue('false_lanterns','不会被风吹动的城灯','灯火全部以相同节律摇晃。月影后藏着真实的阵图：封住凌渊的力量有一部分正回流到旧盟的私库。','suyan',72,55)],
  choices:[branch('protect','先毁熔炉，让献城数字停下',[line('player','先让那些数字不再变小。私库的去向，之后再追。'),line('qinglan','我守住断桥。你若打落炉心，记得留出自己能跳回来的台阶。',1),line('suyan','我给台阶编号。莫无迁想把我们也写成一个数字，别让他得逞。',2)],boss(8,'击败熔炉傀儡，停止献城导轨')),
    branch('seek','先破月蚀，公开力量真正的去向',[line('player','让守桥的人看见真实阵图。旧盟不能一边献城，一边给私库添锁。'),line('suyan','我负责稳住图。幻阵会拿熟悉的人声骗你，别按声音找出口。',2),line('yueheng','我留下真灯作标记。灯旁有药香，假的没有。')],boss(9,'击败月蚀灵狐，取得真实供能阵图'))],
  outro:{protect:[line('narrator','炉里的数字停在了未归零的地方。城中一盏盏灯从虚影变回了真正的窗火。'),line('qinglan','桥那头有人在敲锅，他们看到我们了。',1),line('suyan','私库连线被烧断，莫无迁逃向天隙。但炉心上留着最后一片钟的坐标。',2),line('player','路先通，人先过。我们追最后一个坐标。')],seek:[line('narrator','月影裂成碎片，供能图悬在断桥上。看守桥门的旧盟弟子一言不发，先摘掉了胸前的印。'),line('suyan','他以为在替父母守城。图里的回流却去了莫无迁的私库。',2),line('yueheng','炉火烧坏了几间空屋，城里的人已经退开。现在他们知道该撤离哪条街。',1),line('qinglan','没有人再替莫无迁守这座桥了。走，他还欠这城一个回答。')]},summary:'星桥重开。熔炉被截断或幻阵被公开，莫无迁的献城计划失去支撑，最后钟片仍在天隙。'});

add({id:'chapter_5',kind:'chapter',chapter:5,title:'自证大道',subtitle:'长明之约 · 自证大道',location:'长明凌渊 · 镇山钟的最后一道缝',stakes:'最后钟片封在劫兽阵心。钟将复原，旧的封阵方式也将重新生效，除非你亲手改写它。',cast:['qinglan','yueheng','suyan'],art:chapterArt(5),
  intro:[line('narrator','最后一片钟悬在裂隙中央，边缘亮得像刚出炉的铜。莫无迁的影子被雷光拉得很长。'),line('narrator','「若每个人都能停手，谁来撑过下一场灾年？」他问。身后天隙劫兽慢慢睁开第二只眼。'),line('suyan','旧阵能闭合，但第七阵口仍是死的。钟一响，供能名册又会开始添新户数。',2),line('qinglan','先把钟片拿下来。要怎么响这一声，我们站稳后再决定。',1),line('yueheng','我带来了第一夜用过的药锅。那孩子现在能自己端起来了。')],
  clues:[clue('seventh_socket','仍被封住的第七阵口','古府的出口槽与此处吻合。补回原铜，钟可在城镇危急时暂时护阵，但需要有人常驻监守。','suyan',27,60),clue('blank_register','新供能名册的空白页','莫无迁把整片山河预先画进册中。拆掉总册、改成各地分阵，需要把阵法交给更多尚未学会的人。','narrator',72,57)],
  choices:[branch('protect','先复原退阵口，亲守第一次合钟',[line('player','先让城里的人熬过今夜。第七阵口打开，我留下守这一声钟。'),line('qinglan','我与你轮班。天亮之后再把守钟的办法交给后来的人。',1),line('suyan','阵口交给我。你牵住劫兽，我不能在铜合上的一刻被打断。',2)],boss(11,'击败天隙劫兽，取回钟片并修复退阵口')),
    branch('seek','先拆总册，以分阵重接山河',[line('player','名册不能再归一个人锁着。拆掉它，我们把会响的钟交回各地。'),line('suyan','我分开回路。会有一段没有钟声的空隙，需要你挡住劫兽。',2),line('yueheng','各地的医馆可以传阵图。别只写最好的材料，也写缺了一样时怎么办。',1)],boss(11,'击败天隙劫兽，取回钟片并解除总册锁印'))],
  outro:{protect:[line('narrator','第一声钟响很轻。你没有觉得身体被抽空，只有铜架震得掌心发麻。第七阵口亮着，门外的人可以自行退开。'),line('qinglan','名单按轮班重写，不按户数写。今夜轮到我们，明夜还可以换人。',1),line('narrator','莫无迁靠在残壁下，第一次听完一声不靠锁印支撑的钟。山下的灯，直到天亮都没有灭。'),line('yueheng','药锅该还了。去守山、去远游、或去教后来的人，都记得先吃一顿热饭。')],seek:[line('narrator','总册散开后，山河安静了片刻。随后，第一座医馆的铜铃响了，再是渡口、书院、山门，声音并不整齐。'),line('suyan','有几处阵图画错了，但它们自己修好了。原来不必所有钟都按同一拍响。',1),line('narrator','莫无迁望着那些不整齐的灯，握印的手终于松开。没有一盏灯等他的许可才亮。'),line('qinglan','山下有一张空座。下一程要去哪里，坐下来慢慢说。')]},summary:'镇山钟复原，汲灵旧约被终止。合钟守夜或拆册分阵，决定新秩序的第一步；归途仍由你选择。'});

add({id:'qinglan_0',kind:'sidequest',questId:'qinglan_0',title:'钟片微光',location:'青岚山麓 · 融雪石阶',stakes:'青岚熟悉每一道山路，却不愿再碰那块烧过她手的钟片。',cast:['qinglan'],art:map(0),
  intro:[line('narrator','雪停后，青岚把钟片放在一只旧酒盏里。盏底的裂纹被铜片照成细细的金线。'),line('qinglan','我第一次拾到它时，以为是巡山人丢下的护符。那晚，我把它放在村口灯下。',2),line('player','你在想，是不是自己把阵线带进了村里。'),line('qinglan','我想知道。别只安慰我，帮我查。')],
  clues:[clue('burned_lantern','灯架上的旧烫痕','烫痕只在靠山的一面，灯架脚下却没有阵线。钟片从山里带着汲灵纹来，并非青岚放下后才生出。','narrator',27,64),clue('pulse_in_water','酒盏中的三次微光','向酒盏添水，微光仍每三息偏向药圃。铜片是在回应原阵，不是给村口另起一阵。','qinglan',73,58)],
  choices:[branch('protect','先巡护药圃，确认没有新的受困者',[line('player','先把你走过的路再走一遍。有没有人受困，比这盏灯更需要先看清。'),line('qinglan','我带路。上次走得太急，连脚印都没认全。',1),line('narrator','她终于从酒盏里取出钟片，用干净布包好。')],herb('通关青岚灵圃，巡查残留阵线')),
    branch('seek','取矿石测钟片，分清旧纹与新痕',[line('player','用不带药圃灵息的矿石作对照。如果也共振，就不是你搬动钟片的缘故。'),line('qinglan','沉星矿洞的石脉最稳。我知道一条避开落石的路。'),line('narrator','她把昨夜的巡山图展开，第一次没有遮住村口那一段。')],ore('通关沉星矿洞，带回共振对照矿石'))],
  outro:{protect:[line('narrator','巡过的泥沟里没有新阵线。药圃守着的老人认出钟片，说他年轻时见过完整的镇山钟。'),line('qinglan','原来这不是我带来的灾。我还是会把那一晚记在巡山簿里。',1),line('player','也记下你把人救出来的那一段。')],seek:[line('narrator','新矿石靠近钟片，同样每三息微震。反向汲灵纹早已嵌进铜的内部。'),line('qinglan','这回我能把原因说清，不必只对村人说「对不起」。',1),line('narrator','她在巡山簿旁画了一只酒盏，标注了第一次测得的微光。')]},summary:'钟片原本属于护脉旧钟。青岚把愧疚变成可核对的巡山记录。'});

add({id:'qinglan_1',kind:'sidequest',questId:'qinglan_1',title:'山门旧愿',location:'青岚山麓 · 山君巡界碑',stakes:'青岚曾答应老师守满十年。她不知道，这句话是不是已经替自己决定了下一程。',cast:['qinglan'],art:map(1),
  intro:[line('narrator','巡界碑下压着一封没寄出的信。信角被青岚反复折过，收信人只有「师父」。'),line('qinglan','他说等村路安全，就带我看海。后来他没回来，我也一直没有离开。',2),line('player','这条路是谁一个人守出来的？'),line('qinglan','碑上只刻了师父的名。但砌碑的人、轮夜的人，我都记得。')],
  clues:[clue('shortened_oath','碑背的半句旧愿','正面写「守山十年」，背面被青苔盖着「待新路通，交后人守」。旧愿本来就留着交接的一句。','qinglan',29,56),clue('two_patrols','重叠的巡山脚印','新弟子的靴印早已覆盖旧路，却在山君出没的一段绕开。要交接，就得先把最危险的路一起走通。','narrator',72,65)],
  choices:[branch('protect','先替新巡山人清出安全交接路',[line('player','先把他们绕开的路清通。交接不是把危险留给后来的人。'),line('qinglan','我走前面，你盯山君侧面。今天巡山簿上要写两个人的名字。',1),line('narrator','她把未寄的信收进口袋，换了一条结实的剑穗。')],boss(0,'击败青甲山君，清通巡山交接路线')),
    branch('seek','再查一次山君巢，补全老师最后的路线',[line('player','交接前，把老师最后走的那段路核实。他可能早就到了要交棒的时候。'),line('qinglan','山君搬走过碑边的石匣。我每次路过都想取，却总先去查看村路。',2),line('narrator','这次她把石匣的位置明确画进了地图。')],boss(0,'击败青甲山君，取回巡界石匣的路线记录'))],
  outro:{protect:[line('narrator','新巡山人沿路插上木牌。青岚发现，有一条绕河的小路比她原先选的更平缓。'),line('qinglan','他们已经会改路了。师父当年等的，也许就是这一日。',1),line('narrator','信终于封好，留在碑背那半句旧愿下。')],seek:[line('narrator','石匣里是一张海岸图，背面写着下一轮巡山人的姓名。最末一行留给青岚选出的人。'),line('qinglan','他不是让我把十年活成一辈子。',1),line('narrator','她把海岸图放进巡山簿，第一次认真问你：海风会不会也像山风这样冷。')]},summary:'老师的旧愿包含交接。青岚开始准备离山，而非以离开为失职。'});

add({id:'qinglan_2',kind:'sidequest',questId:'qinglan_2',title:'并肩而行',location:'镜湖云府 · 双人巡路亭',stakes:'巡山簿能教一条路线，却不能替下一名同行者决定何时停步。',cast:['qinglan'],art:map(2),
  intro:[line('narrator','湖面雨点很密。青岚把两份路线摊开，左边标着取药的近路，右边绕过一处临水断崖。'),line('qinglan','从前有人跟着我走，我只会说「再快一些」。后来才知道，有人根本怕水。',2),line('player','那就别只画最快的一条。'),line('qinglan','陪我核一次。你想结契，或只作巡山伙伴，都不用在这两张图上作答。')],
  clues:[clue('scratched_names','簿页边缘的刮痕','页边记着受伤与落队，却没记谁提出停下。不能只让迟到者留下姓名，让决定继续走的人不留字。','narrator',27,62),clue('dry_shelter','风雨中的备用石亭','亭顶没有漏雨，水桶却是空的。这条较慢的路能容人歇脚，只缺可持续补给的安排。','qinglan',71,59)],
  choices:[branch('protect','先补石亭药材，让慢路也能安心走',[line('player','我们先把慢路备齐。不应只有赶得上的人才有药。'),line('qinglan','药圃那边我熟。今天按你的步子走。',1),line('narrator','她在两张图上都添了一个可以停步的亭形。')],herb('通关青岚灵圃，为备用石亭取药')),
    branch('seek','核对旧碑，把每次停步的理由写清',[line('player','先修日志。下一个人得知道断崖何时涨水，谁又曾要求绕路。'),line('qinglan','静悟石林的旧碑记过湖汛。我和你一起校日期。'),line('narrator','她把「落队」二字划去，留下一行等调查后再写的空白。')],insight('通关静悟石林，核对巡山日志中的水位记载'))],
  outro:{protect:[line('narrator','备用石亭第一次放上有盖的药箱。走近路和走慢路的人，在亭下喝了同一壶茶。'),line('qinglan','以后我要走快时，会先问你。你想慢些，直接说就好。',1),line('narrator','她没有把手伸向契书，而是把两张图都交给你保管。')],seek:[line('narrator','旧碑的水位线证明，当年那场「迟到」躲过了一次崖塌。青岚把提出绕路的人补回了日志。'),line('qinglan','有些提醒不是拖累，是我当时没听进去。',2),line('player','下次我们都可以先说一句「等等」。')]},summary:'日志留下了同行者的判断，也留下了可歇脚的路线；关系选择独立于任务完成。'});

add({id:'qinglan_3',kind:'sidequest',questId:'qinglan_3',title:'云外之路',location:'赤霄地脉 · 新巡山人的第一夜',stakes:'青岚要离山前，还有一条被树王根须遮掉的交接路线。',cast:['qinglan'],art:map(6),
  intro:[line('narrator','青岚的行囊比巡山药箱还小。袋口露出那张旧海岸图，她却仍在听山风里有没有求救声。'),line('qinglan','新巡山人问我，云外第一站去哪里。我说还没想好，其实我想了很久。',1),line('player','还差什么没交接？'),line('qinglan','树根封住的北线。让他们自己走通，或我带着最后一程，都得先见到路。')],
  clues:[clue('unfinished_page','最后一页守山札记','这一页没有写胜招，只写了树根收缩的时机、撤回的信号和药箱的位置。青岚正在把经验改成别人用得了的步骤。','qinglan',26,61),clue('borrowed_pack','被反复检查的行囊','行囊底多放了一份守山符。那是她怕自己离开后赶不及回来，也怕新人因此总等她回来。','narrator',73,57)],
  choices:[branch('protect','陪她清北线，完成最后一次护路',[line('player','今天一起把北线清通。以后接到消息，我们也可以一起回来。'),line('qinglan','这句可以写在札记最后，不必刻在碑上。',1),line('narrator','她把守山符放到亭中，带走了行囊里的海岸图。')],boss(6,'击败缚灵树王，清通北线交接路')),
    branch('seek','验证札记，让后来人能按记录破阵',[line('player','照札记走一遍，只用你写下的信号。看看哪里还需补一句。'),line('qinglan','若我下意识换了路线，你就提醒我。我想把凭习惯做的事也说明白。',2),line('narrator','你们约好撤回手势，把未写完的札记带到根须前。')],boss(6,'击败缚灵树王，验证守山札记的破阵步骤'))],
  outro:{protect:[line('narrator','北线木牌点起新灯。青岚走过那道灯时没有再回头数屋顶，只问你海边有没有茶铺。'),line('qinglan','我会回来，但不是因为没人替我守。',1),line('narrator','她在路口留了到海边的第一封信，约定到下一站再寄。')],seek:[line('narrator','札记多了三处补注：何时退、何时止血、看不到树王时不要追。新人照着走完了北线。'),line('qinglan','现在这条路不用猜我在想什么了。',1),line('narrator','她把完整札记留下，只带走空白的旅行簿。第一页写着：云外第一日。')]},summary:'青岚把守山经验留给后来的人，带着自己的海岸图走出山门。'});

add({id:'yueheng_0',kind:'sidequest',questId:'yueheng_0',title:'一炉温药',location:'宗门丹房 · 第一只药碗',stakes:'采药人还在发抖。他的药方没有错，错的是火候表上的一个数字。',cast:['yueheng'],art:map(0),
  intro:[line('narrator','月衡把一只缺口碗移到炉边，却没有倒药。床上的采药人说不冷，盖着的两层被却都在抖。'),line('yueheng','他喝过药。现在不能凭「不见好」就再加一份。',2),line('player','你在等什么？'),line('yueheng','等弄清哪一页错了。人不会按丹书里整齐的数字发热。')],
  clues:[clue('smudged_heat','被药渍覆盖的火候表','原本的「文火」被药渍盖住，像成了「武火」。照错字煎出的药性偏急，才使脉象更躁。','yueheng',28,62),clue('split_bowl','缺口碗的刻线','碗沿有一道用量刻线。采药人把两次份量一次喝下，因为抄方时漏了「分服」两个字。','narrator',72,57)],
  choices:[branch('protect','先炼一炉温和药，稳住今晚的脉象',[line('player','先按你确认过的配比开炉。刻线和用量一起重写。'),line('yueheng','你看火，我备药。这一炉宁可慢些，也不要用猛火追时间。',1),line('narrator','他把缺口碗放在你看得见的地方，当作分服的提醒。')],craft('实际炼成一炉丹药，完成采药人的温药准备')),
    branch('seek','再炼一炉对照药，校清错字的影响',[line('player','留两份样本，把不同火候的药息分清。以后不能再让人猜字。'),line('yueheng','对照样本只用来验药，不给病人试。病人的那份按净方煎。',2),line('narrator','他将校正过的字用深墨描清，在纸边画了一只小火。')],craft('实际炼成一炉丹药，核对净方的药性'))],
  outro:{protect:[line('narrator','采药人的手不再发抖。他尝了一口，说这次药很苦，然后把碗稳稳端住了。'),line('yueheng','能说出苦味，便比刚才好些。你记火候，我记脉象。',1),line('narrator','丹方旁多出第一条共同批注：缺「分服」二字，不可照旧抄用。')],seek:[line('narrator','净方药息稳定，对照样本的急息正好对应旧药渣。月衡把两个样本封好，写上时辰。'),line('yueheng','有了这个，错的不再只是他的用药习惯。是我们的抄方也该改。',2),line('narrator','采药人摸着新刻线问还要喝几次，这次你们给了能听懂的答案。')]},summary:'一次用药差错被具体拆开；月衡在方页上留下你的观察和清楚的分服说明。'});

add({id:'yueheng_1',kind:'sidequest',questId:'yueheng_1',title:'疑方求证',location:'镜湖云府 · 被退回的药箱',stakes:'一箱被退回的丹药仍写着月衡的名字。查出责任，和让缺药的人有药，是两件都要做的事。',cast:['yueheng','qinglan'],art:map(3),
  intro:[line('narrator','药箱上贴着「月衡所制，暂勿服用」。月衡拆掉自己的名字，又把纸条原样放回去。'),line('yueheng','配方是我的，炉子不是我改的。可收箱的人只看得到这个名字。',2),line('qinglan','有几箱经过山君巡界石阶。搬箱的人说，炉旁没有封签。'),line('player','那就从没封签的地方重新核。')],
  clues:[clue('mixed_ash','药箱底的两种炉灰','一层草灰、一层铜屑。铜屑来自汲灵火门，而月衡的净炉没有这种金属。','yueheng',29,59),clue('missing_seal','断了一半的运输封签','封签编号与山君铜环相连。药品在半路被换炉重炼，责名却沿用原方作者。','qinglan',71,64)],
  choices:[branch('protect','先成一炉替代药，把停药的缺口补上',[line('player','药箱暂时扣下。我们先补能用的药，让收箱的人别为证据空等。'),line('yueheng','每份另写新封签，不只写我的名，也写炉号与时辰。',1),line('narrator','他从桌下拿出一沓空纸，第一次把验炉人也列进记录。')],craft('实际炼成一炉丹药，提供清楚封签的替代药')),
    branch('seek','截住山君运输道，找到换炉封签',[line('player','先查封签编号。让人把一箱药换掉，却留下别人的名，这条链得停。'),line('qinglan','我跟你走石阶。月衡，你把药渣留好，别让人说样本是新的。',2),line('yueheng','箱子与旧签都不动。我等你带回能接上的另一半。')],boss(0,'击败青甲山君，核实换炉运输封签'))],
  outro:{protect:[line('narrator','替代药送出后，退箱人又回来，把原来的污签亲手交还。箱内保存了完整的铜屑样本。'),line('yueheng','他先拿到药，才敢说是哪位管事逼他贴签。',2),line('narrator','记录写下了管事的名字，却没有再把一整炉的责任缩成一名医者。')],seek:[line('narrator','两半封签合拢，编号指向旧盟验炉台。新日期压着旧方号，换炉是事先安排的。'),line('yueheng','我会把缺药的名单补齐。证物证明我没有改炉，也提醒我不能只管写完一张方。',1),line('narrator','他洗净指尖的墨，把新的封签规程贴在了所有炉前。')]},summary:'药方作者与篡改丹炉的责任被分开；每炉加入了可追查的封签和验炉记录。'});

add({id:'yueheng_2',kind:'sidequest',questId:'yueheng_2',title:'共守灯火',location:'镜湖医舍 · 雨夜轮值桌',stakes:'月衡仍在接下一只药碗，但他的字已开始写歪。今晚需要有人替他接班。',cast:['yueheng'],art:map(2),
  intro:[line('narrator','灯芯已换过两次。月衡把最后一份方写完，发现笔尖落在自己另一只手上。'),line('yueheng','还有三个人等药。等他们拿到，我就歇。',2),line('player','你上一炉也是这样说。谁来验你现在写的方？'),line('yueheng','……你说得对。桌边还有一把椅子，坐下帮我看看。')],
  clues:[clue('repeated_dose','重复写下的用量','同一人的记录被写了两次，剂量却不同。月衡已不能只凭记忆判断，必须重新核对。','narrator',29,64),clue('unlit_shiftlamp','没有点亮的交班灯','灯架挂着轮值牌，背面写着可替班的人。月衡一直没点灯，怕让别人觉得自己做不完。','yueheng',71,56)],
  choices:[branch('protect','代他炼完这一炉，点亮交班灯',[line('player','我来完成这炉，你把病历交给下一班。今晚不用证明自己还能撑。'),line('yueheng','炉息若变了就喊我；不是让我回来接班，只是让我告诉你怎么辨。',1),line('narrator','他第一次把椅背放在离丹炉更远的位置。')],craft('实际炼成一炉丹药，完成雨夜交班')),
    branch('seek','先补备用药材，把缺药原因写进轮值表',[line('player','等药的人多，不该只靠你多熬一夜。先补备用药，明日一起改排班。'),line('yueheng','我把病历逐项核完，便把灯点起来。你回来时，椅子应该换人坐了。',1),line('narrator','他在轮值牌上补了自己常漏写的结束时辰。')],herb('通关青岚灵圃，补齐医舍备用药材'))],
  outro:{protect:[line('narrator','你回来时，月衡睡着了。下一班医者在灯下给你留出一只空碗，示意把新药放下。'),line('yueheng','醒来才知道，少看一夜炉火，药也不会少一分温。',1),line('narrator','共同病历上写着交班人的姓名，没有要求你们先在契书上签字。')],seek:[line('narrator','备用药上了架，轮值表第一次列出耗材和替班人数。两个人的小字挨在一起，改掉一整列空白。'),line('yueheng','有人愿意接灯，先得看得见灯。是我之前把它藏得太低。',2),line('narrator','他把灯架挪到门口，约你明晚在不值班的时辰喝茶。')]},summary:'医舍有了真实的交班和备用药安排；同行或结契，都不成为相互照料的前提。'});

add({id:'yueheng_3',kind:'sidequest',questId:'yueheng_3',title:'医道长明',location:'长明书院 · 丹典试读桌',stakes:'丹典写得越精深，山下的人越不敢用。月衡想知道，是书写错了，还是读者被漏掉了。',cast:['yueheng'],art:map(8),
  intro:[line('narrator','试读桌旁摆着三本批注过的丹典。一位村医在「灵火精炼」旁画了一个大圈，写着：没有灵火。'),line('yueheng','我写了最稳的炼法，却忘了他们未必有最好的炉。',2),line('player','第一页先教什么？'),line('yueheng','先教什么时候不该开炉。然后才教怎样把能用的药做出来。')],
  clues:[clue('ordinary_stove','读者带来的普通炉样','炉壁薄，火息不稳，没有丹典设想的恒温条件。低阶净方能完成，但高级配方不能照抄比例。','yueheng',29,61),clue('blank_substitutes','空着的替代材料栏','稀有灵莲的替代栏一片空白。读者并非不会查，而是书没有告诉他们缺材料时应停下或改方。','narrator',72,56)],
  choices:[branch('protect','先做基础净方，让普通炉也有可用的一页',[line('player','基础方先写清，今天就能教会来试读的人。高阶的部分标注别碰。'),line('yueheng','我写每一步看得到的征象，不再只写炉息几分。',1),line('narrator','他把丹典第一页的名词改成了火色、药香和停止的时机。')],craft('实际炼成一炉丹药，核对基础净方的步骤')),
    branch('seek','先核替代药材，写明不能等量代换的原因',[line('player','最危险的是读者自己补空白。我们先把能替与不能替分开。'),line('yueheng','只作校验，不让人拿身体试错。旧圃的药性记录可以与新样本对照。',2),line('narrator','他在空白栏写下醒目的「缺此材料时请换净方」，再带你去取样。')],herb('通关青岚灵圃，取丹典替代材料的核验样本'))],
  outro:{protect:[line('narrator','村医照着新版步骤复述了一遍，在最后一句前停住：闻到焦铜气就熄火，不要补料。'),line('yueheng','你能记住何时停，比记住我的名更要紧。',1),line('narrator','丹典封面写着编者与试读者名单，最下面还有一栏留给下一版的勘误。')],seek:[line('narrator','替代栏不再空着。有些条目写「可换」，有些只写「不可强炼，请用下一页净方」。'),line('yueheng','一本书不能替人备齐所有药，但可以少逼人猜一次。',1),line('narrator','新丹典送到书院时，第一页夹着读者那张画着大圈的原批注。')]},summary:'丹典加入普通炉步骤、替代材料与停止条件，医道不再只适用于最完善的丹房。'});

add({id:'suyan_0',kind:'sidequest',questId:'suyan_0',title:'星图初识',location:'沉星矿洞外 · 倒转的罗盘',stakes:'素衍的新罗盘总指向同一片黑暗。她需要一个可复测的地面坐标。',cast:['suyan'],art:map(1),
  intro:[line('narrator','素衍把罗盘转了一圈，针又慢慢回到黑色山缝。她在图上画下第八个问号。'),line('suyan','如果只看这枚针，我会说星位错了。可天上的星没动。',2),line('player','先找地面上不会移动的东西？'),line('suyan','普通矿石就好。贵重灵宝太容易把自己的灵息当成方向。')],
  clues:[clue('double_needle','罗盘上的第二道针影','盘针指天时正确，接近地面便多一道影。干扰来自地脉里被倒接的回路，而不是星空。','suyan',29,57),clue('chalk_anchor','矿洞口的白粉标点','矿工留下的丈量点经过多年仍相合。这些不起眼的标点，可以校出罗盘偏了多少。','narrator',72,63)],
  choices:[branch('protect','先标出可返回的路，再取矿样',[line('player','先沿矿工标点补返程线。针不准时，人至少能沿白线回来。'),line('suyan','我画线，你查前面的洞壁。若标点断了，我们就不再往深处追。',1),line('narrator','她在星图角落添上一小格，写的是「脚下」。')],ore('通关沉星矿洞，采集返程线上的对照矿样')),
    branch('seek','深入查同一矿脉，测出针影偏差',[line('player','同一矿脉的几处样本放一起，才能辨出哪一段回路倒了。'),line('suyan','我给每块石标位置。别只带最亮的，那会把微弱的偏差盖掉。',2),line('narrator','她把问号留在图上，没有急着给偏差起一个玄妙的名字。')],ore('通关沉星矿洞，取同矿脉的校准样本'))],
  outro:{protect:[line('narrator','白线接回洞口，罗盘偏转时也没有让你们迷路。矿样在图上围出一条可走的弧。'),line('suyan','星图第一条线，原来该是回来的线。',1),line('narrator','她保留了所有问号，另把返程路线用深墨描清。')],seek:[line('narrator','几份矿样沿编号排开，针影只在第三处出现。素衍把那一小段倒接回路圈了起来。'),line('suyan','不是整片星空错了，只是有人改了我们脚下的一段路。',1),line('narrator','第八个问号旁，多了一个可以重复验证的答案。')]},summary:'罗盘的异常来自地脉回路；素衍用普通矿石建立了可验证、可返回的星图。'});

add({id:'suyan_1',kind:'sidequest',questId:'suyan_1',title:'缺失一页',location:'云隐古府 · 被拆开的阵书',stakes:'阵书缺了一页，恰好也是退阵步骤。是谁抽走它，和怎样补回它，需要不同的证据。',cast:['suyan'],art:map(1),
  intro:[line('narrator','书匣盖得很紧，匣底却落着一根断线。素衍用指腹摸过书脊，没有马上翻页。'),line('suyan','不是虫蛀。这里少了整整一张，线是从外面割断的。',2),line('player','缺的是什么？'),line('suyan','前页是合阵，后页是供能。它们之间本该有退阵，不是空白。')],
  clues:[clue('cut_stitch','整齐的断线','切口朝外，割线时书是被锁在匣中的。持匣钥匙的人可以抽掉那页，而不翻动其余内容。','suyan',28,60),clue('exit_rubbing','石台边的反向拓印','书页虽被抽走，旧学徒临摹的退阵图还压在石台下。图缺了一角，能补回步骤，却不能证明是谁抽页。','narrator',72,56)],
  choices:[branch('protect','先补退阵拓印，让困在古府的人能出',[line('player','先拼出可用的出口。持钥匙的人不能用缺页把后来者困住。'),line('suyan','我校拓印，你带我走完古府回路。途中每一个退阵口都要看。',1),line('narrator','她把旧学徒的署名留下，没有把拓印当成自己的新图。')],cave(0,'完整通关云隐古府，核对退阵拓印')),
    branch('seek','沿书匣流转查钥匙，带回割页记录',[line('player','书匣经过哪里，古府应该留着开锁记号。查完再让人带走原匣。'),line('suyan','钥匙孔和封印都是同一道星纹。我把每次重封的位置记下来。',2),line('narrator','她在星图上另添一条细线，记录书匣，而非只记录出口。')],cave(0,'完整通关云隐古府，追查阵书的开封记录'))],
  outro:{protect:[line('narrator','退阵拓印补上了最后一角。出口亮起时，一名困在古府的学徒先跑回来，替仍在里面的人点灯。'),line('suyan','把门打开，人未必就会散。有时候，他们只是需要知道门在。',1),line('narrator','阵书的新页注明原拓印者与校验人，留着那道被割断的旧线。')],seek:[line('narrator','重封记号接成了书匣的路线，最后一次开锁旁刻着旧盟验图印。退阵页正是在那一次被抽走。'),line('suyan','这不是知识失传，是有人拿着钥匙决定谁能知道出口。',2),line('narrator','她把割页记录与补图一齐摹成两份，不让它们再只剩一个书匣。')]},summary:'退阵页被主动删除。补图与割页记录以不同方式被保留，并开始复制给后来者。'});

add({id:'suyan_2',kind:'sidequest',questId:'suyan_2',title:'自由回环',location:'雾海残墟 · 新回路试阵台',stakes:'素衍的新阵已经有出口，但出口打开后，余下的人能否站稳，还没有被证明。',cast:['suyan','yueheng'],art:map(5),
  intro:[line('narrator','试阵台上七盏小灯围成一圈。一盏被素衍拿走，其余六盏突然亮得刺眼。'),line('suyan','有出口还不够。退掉一个人，余下的人若要替他承担全部，也算不得真的能退。',2),line('yueheng','先降负荷，再看哪一段需要缓冲。不要让阵里的人来替我们试极限。'),line('player','我们先用能重复验证的回路，找出缺口。')],
  clues:[clue('bright_six','过亮的六盏小灯','退阵者原先承担的灵压被平均推给余下六人。回路能退，却没有为退阵预留减载。','suyan',29,57),clue('empty_buffer','尚未填入的缓冲格','缓冲格不能无限补灵息；它只需在减载的一瞬托住回路，让其余人有时间停手或重分配。','yueheng',72,62)],
  choices:[branch('protect','先测缓冲材料，让回路能稳稳减载',[line('player','先让退阵后的几息不伤人。缓冲够用就停，别又造一个会吞灵息的盒子。'),line('suyan','我给缓冲设上限。取回矿样后按低负荷再测。',1),line('narrator','她把原来无限循环的线擦去，改成一段会自行止住的短线。')],ore('通关沉星矿洞，取得缓冲格的验证矿样')),
    branch('seek','重查旧碑规则，找出可公开的减载步骤',[line('player','不能只有你知道什么时候抽灯。把顺序写到离开的人也看得懂。'),line('suyan','静悟石林留着早期减载刻文。我核完后用同一套编号重写。',2),line('yueheng','记得写失败时怎样停。那一行往往比成功时更要紧。')],insight('通关静悟石林，核对可公开的减载步骤'))],
  outro:{protect:[line('narrator','一盏灯移开，缓冲先亮，随后六盏一起变暗一些，却没有一盏骤然熄灭。'),line('suyan','现在真能停了。不是谁欠了谁一口灵息。',1),line('narrator','试阵记录不要求共修或结契，只写明负荷、上限与离开的步骤。')],seek:[line('narrator','你按新版编号移灯，素衍全程没有提示。回路减载后安静下来，灯仍照得到每个人脚下。'),line('suyan','这个阵不需要猜你愿不愿，也不需要猜你会不会。步骤就在这里。',1),line('narrator','公开的阵图多了一页最醒目的停阵说明。')]},summary:'新回环加入缓冲上限与减载步骤，阵中人无需以身体补偿别人退出的负荷。'});

add({id:'suyan_3',kind:'sidequest',questId:'suyan_3',title:'星桥归途',location:'长明凌渊 · 最后一盏渡口灯',stakes:'天隙之前的路标能指向前方，却没有标出伤者如何回来。',cast:['suyan','qinglan'],art:map(10),
  intro:[line('narrator','渡口风很大，路标上的金粉被吹成一层薄雾。素衍放下笔，看着桥背面没写字的一角。'),line('suyan','我们总把最快抵达天隙的路线画得最亮。回来时，他们可能带着伤，还可能认不清星位。',2),line('qinglan','玄河守将一直压着旧渡口。要留灯，得先让灯下能站人。'),line('player','这一张图画给回来的脚步，不画给最快的剑。')],
  clues:[clue('outgoing_arrows','全部朝前的金色箭头','箭头在去程视角很清晰，转身后却被桥柱挡住。原图没有考虑回程的视线。','suyan',28,58),clue('buried_ferry','泥沙中的旧渡口','旧石阶仍稳，能容担架绕过高桥。守将封锁了阶口，使所有人只能走危险的直线。','qinglan',73,63)],
  choices:[branch('protect','先开旧渡口，为伤者留一条缓路',[line('player','先清石阶。这条路不必最快，只要担架也过得去。'),line('qinglan','我盯守将的封锁卫兵。你让阶口别再合上。',2),line('suyan','灯的位置我已经量好，战后先把最低那一盏点起来。')],boss(10,'击败玄河守将，重开可供伤者通过的渡口')),
    branch('seek','核清封锁阵，把双向路标接回旧渡口',[line('player','把桥背面的路标也补上。封锁阵留下的假出口，要逐个划掉。'),line('suyan','我记下每次封锁亮起的位置。守将倒下后才能定最后一条真线。',2),line('qinglan','撤回信号按老办法，别让真假箭头把我们带散。')],boss(10,'击败玄河守将，核对双向星桥路标'))],
  outro:{protect:[line('narrator','第一副担架从旧石阶回来，灯光恰好落在抬架人脚下。素衍蹲在旁边，记下他们转弯所需的宽度。'),line('suyan','空白的一角终于画满了。我下一张图，不会等到了桥头才想起它。',1),line('narrator','她把归途图留在渡口，自己的行囊里只收了一枚普通罗盘。')],seek:[line('narrator','新路标的两面都亮着。你从高桥回望，能一眼看见旧渡口，而不是一片金粉。'),line('suyan','星图画完不是封存，是交到真正走路的人手里。',1),line('narrator','她在图角留下修订日期与空白边，等下一个过桥的人添上自己的路。')]},summary:'归途图补上伤者渡口和双向路标；素衍把星图交给行路的人，准备下一次自己的旅程。'});

add({id:'world_forge',kind:'sidequest',questId:'world_forge',title:'器道修复',location:'镜湖云府 · 六印古器台',stakes:'六套蓝图被锁在器台里。只修亮一枚印，仍会让另外五门的弟子无器可用。',cast:['qinglan','suyan'],art:map(3),
  intro:[line('narrator','古器台上六枚印记只亮了一枚。台旁断裂的模具里，有剑，也有护腕和布甲扣。'),line('suyan','旧图不是不能做六套。有人把共享回路切成了单门钥印。',2),line('qinglan','守台人说他只会修剑模，其余只能等。但等在外头的，不都用剑。'),line('player','先看哪里断，再决定从哪一枚修起。')],
  clues:[clue('sixway_channel','断开的六向铜槽','六条槽本应接向同一器台，现只有一条通电。缺口可以用普通玄铁重接，无需稀有红装作献材。','suyan',27,59),clue('unused_molds','没有报废的其余模具','五套模具尺寸完整，停用的原因是权限锁印，而非材料损坏。恢复蓝图不会要求换宗门。','narrator',73,62)],
  choices:[branch('protect','先取玄铁补铜槽，让器台能开炉',[line('player','先把共享回路接好。谁带着材料来，都应看得到自己的模具。'),line('qinglan','沉星矿洞的玄铁够用。别把「修台」写成非得寻一件神物。',1),line('narrator','器台旁的材料单只写下可重复获取的矿料。')],ore('通关沉星矿洞，取回修复六向槽的玄铁')),
    branch('seek','先造一件新器，验证蓝图不靠单门锁印',[line('player','用现有蓝图完成一次实造。找出器台到底在哪一步卡住，再拆那道锁。'),line('suyan','我记每一枚印的回应。你选熟悉的套装，不必为了测台换流派。',2),line('narrator','六套模具摆到台面上，锁印的位置被一一标出。')],forge('实际打造一件装备，验证器台蓝图回路'))],
  outro:{protect:[line('narrator','玄铁补入缺口，六枚印按不同颜色亮起。器台没有变成金光四射的神物，只是能让六门都开炉了。'),line('suyan','蓝图复制好了。原台损坏时，也还有第二份。',1),line('narrator','守台人在材料单上写下各套装的配方，空着的五行终于有了字。')],seek:[line('narrator','新器出炉，单门锁印短暂亮起又熄下。素衍沿记录断开锁线，六份蓝图同时被读出。'),line('qinglan','我原以为修器台就是修一件大东西。现在看，是别再让人等错一扇门。',1),line('narrator','六门蓝图被拓成公开的副本，器台旁留着这次实造记录。')]},summary:'六套永久蓝图恢复，器台依靠可获取材料修复，不再由单门钥印决定谁能开炉。'});

add({id:'world_sect',kind:'sidequest',questId:'world_sect',title:'六门问道',location:'宗门学舍 · 六张旁听席',stakes:'学舍有六张席，却有五张被盖住。讲义被拿来划出身，而非讲如何应对敌人。',cast:['qinglan','yueheng'],art:map(0),
  intro:[line('narrator','学舍门前摆着六张旁听席，五张覆着灰布。守门弟子先看你的腰牌，再看你手中的笔。'),line('qinglan','我可以替你开口，但不想让下一位来的人还得找我。'),line('yueheng','先把问道得到的经验摆上桌。知道一门有什么用，比争谁有资格坐下更好。',1),line('player','让讲义回答问题，不让腰牌替人回答。')],
  clues:[clue('shared_margin','六门同注的页边','剑诀旁写着阵修的护盾时机，丹方旁记着体修的耗息。最有用的批注早已不分单一流派。','yueheng',29,62),clue('covered_seats','灰布下的备用笔','旁听席有笔、有纸，只少一道准入记录。开放它们不需要让来者永久改换宗门。','narrator',72,56)],
  choices:[branch('protect','先试护路讲义，让新弟子能跟上',[line('player','先带一套基础应对走完灵圃。讲清遇到蓄力时怎么护住自己。'),line('qinglan','我把不同流派的可用办法都写在旁边，不让剑修的习惯成为唯一答案。',1),line('narrator','灰布被卷到角落，一张旁听席先摆上了新讲义。')],herb('通关青岚灵圃，验证面向新弟子的护路讲义')),
    branch('seek','先核旧碑批注，把六门共有的经验整理出来',[line('player','讲义上的异门批注得保留名字。去核它们的出处，再公开抄本。'),line('yueheng','静悟石林的守碑灵会逼人换应对。正好看哪些批注真能用。'),line('narrator','你在纸上分出「出处」「条件」「例外」三栏，没有把它们抄成一串招式名。')],insight('通关静悟石林，核对六门批注的实际应对'))],
  outro:{protect:[line('narrator','新讲义写下蓄力的可见征兆，六张旁听席渐渐都有人坐。有人仍不会使剑，却能说出何时开盾。'),line('qinglan','这回不需要我替每个人向门口解释了。',1),line('narrator','学舍把旁听记录改成学习内容，而非新的终身门籍。')],seek:[line('narrator','抄本留下了六门批注者的名字，也留下不适用的条件。原本盖住的席边，摆好了完整副本。'),line('yueheng','旁听不是把六门混成一门。是让人知道遇到难处，还能向哪一页找。',1),line('narrator','守门弟子开始问来者想学什么，先前那摞腰牌登记被放进了空匣。')]},summary:'六门经验以可验证的讲义公开，旁听与自选流派不再被永久门籍限制。'});

add({id:'world_tower',kind:'sidequest',questId:'world_tower',title:'雷霄余响',location:'问道塔外 · 雷痕拓碑',stakes:'雷术记录只留了最亮的一瞬，真正保住人的打断时机被遗漏了。',cast:['suyan','qinglan'],art:map(4),
  intro:[line('narrator','塔外拓碑上全是如树枝的雷痕，最深一道被圈成「必胜」。素衍在圈旁点了三个细小记号。'),line('suyan','他们记下了落雷，却没记前面那三息的蓄力。'),line('qinglan','学招的人看着最亮那一下出剑，往往已经迟了。',2),line('player','把出手前看得见的征兆也写下来。')],
  clues:[clue('three_small_marks','深雷痕前的三枚小点','小点按间隔排列，对应蓄力、雷印与落雷。辨认这三息，才能选打断或护盾，而非只追求伤害。','suyan',29,57),clue('scorched_copy','边缘烧焦的拓本','拓本只展示成功爆发，烧焦页边却记着一次失败与净化。失败记录正好说明不能连续硬接雷印。','qinglan',72,62)],
  choices:[branch('protect','再战雷渊玄蛟，补出护盾与打断窗口',[line('player','先把能活着回来的应对写清。落雷前的三息，一个也别省。'),line('qinglan','我记录前摇，你盯雷印。招式未必照原来次序再来。',2),line('narrator','新拓本留出整页给前摇，而不只留给胜利的一击。')],boss(2,'击败雷渊玄蛟，验证雷印与打断应对')),
    branch('seek','重核守碑余响，拆开被合写的雷术顺序',[line('player','先让记录不把三种雷术写成一种。余响里一定留着不同的间隔。'),line('suyan','静悟石林能验证辨识节律的办法。我给每个间隔单独编号。',2),line('narrator','最亮的一道雷痕不再写「必胜」，而是写上了出现的条件。')],insight('通关静悟石林，核对雷术余响的辨识记录'))],
  outro:{protect:[line('narrator','新记录没有只写如何击倒玄蛟，还画出了雷印叠起时怎样停攻、净化和开盾。'),line('qinglan','这些字没有最亮那道雷好看，但能让抄书的人活得久些。',1),line('narrator','烧焦拓本的失败批注也被收进完整雷术抄本。')],seek:[line('narrator','素衍把余响分成三列。间隔、前摇与雷印各自有了记录，再也不是一句「雷来则击」。'),line('suyan','招名可以相同，条件不能省。把这几行读懂，才算听完了余响。',1),line('narrator','塔外的「必胜」圈旁，多出一条明确的例外说明。')]},summary:'雷术留下前摇、雷印、打断与失败记录，雷霄传承不再只有招式名和亮光。'});

add({id:'world_garden',kind:'sidequest',questId:'world_garden',title:'旧圃新生',location:'青岚灵圃 · 没有长叶的畦',stakes:'旧阵停了，药圃仍有一畦不长叶。原因若只归成灵气不足，它还会被错误加料。',cast:['yueheng','qinglan'],art:map(0),
  intro:[line('narrator','药圃大半已经返青，最里面一畦却只有嫩根，没有叶。园人把最后一袋灵肥提了过来。'),line('yueheng','先别倒。根都朝同一边伸，可能不是缺料。',2),line('qinglan','旧汲灵纹从那道沟经过。我巡了八次，虫清干净了，沟却一直没改。'),line('player','先看泥里还留下什么。')],
  clues:[clue('oneway_roots','全部朝沟底伸的嫩根','根仍被残留铜线吸引。汲灵不再运转，旧铜线却在错误分配地脉，施更多肥只会加重偏差。','yueheng',28,63),clue('unused_channel','被封住的灌水支沟','支沟石口被旧盟的验圃牌挡住。打开支沟，药圃才有两处可轮换养息的畦。','qinglan',72,58)],
  choices:[branch('protect','再巡一遍药圃，清通支沟让新根能长',[line('player','先开支沟，不再往同一条沟里加料。药材回来后分畦养。'),line('qinglan','我取走验圃牌。下次巡山簿上要记沟水，不只记清了多少虫。',1),line('narrator','园人把灵肥袋放下，先拿起了清沟的小铲。')],herb('通关青岚灵圃，完成分畦巡护与取样')),
    branch('seek','先炼一炉作药性对照，核清残铜的影响',[line('player','把旧畦和新畦的药性分开记。不能只看叶色就说恢复了。'),line('yueheng','旧样只作校验，成药用净畦材料。我把记录交给园人自己读。',2),line('narrator','两份根样摆到透明小碟里，标签写清了取样的沟与畦。')],craft('实际炼成一炉丹药，核对净畦药性'))],
  outro:{protect:[line('narrator','清通的水没有立刻把整片园子染绿，却让新根开始向两边伸。园人没有再急着倒下最后一袋肥。'),line('qinglan','这次等它长，不是等下一次来人修阵。路已经修好了。',1),line('narrator','药圃牌写下轮畦与用水的方法，往后无需按特定时辰赶来。')],seek:[line('narrator','净畦样本药息稳定，旧畦根样仍带微弱铜气。药圃的恢复记录第一次列出可取药与暂缓取药的范围。'),line('yueheng','不是说这片园子好了，就让每一株都立刻入炉。',1),line('narrator','园人把对照记录留在小棚里，下一次采药的人也能自行查看。')]},summary:'药圃重新分畦、清沟，恢复以可检验的土壤与药性为依据，不靠定时登录等待。'});

add({id:'world_relic',kind:'sidequest',questId:'world_relic',title:'失落传承',location:'星桥裂隙 · 三府书匣架',stakes:'旧经已经取回，公开时仍可能只剩一份难懂的新抄本。',cast:['suyan','yueheng'],art:map(5),
  intro:[line('narrator','三座古府的书匣并排放好，锁纹各不相同。新抄本很整齐，旁边原本上的批注却一条也没有抄进去。'),line('suyan','只抄正文，会把他们试过的退路全丢掉。'),line('yueheng','这页丹方后有一句「材料缺时勿强炼」。若不抄，后来者会以为它是无用杂记。',2),line('player','公开不是把匣打开就够。先核哪些内容被漏了。')],
  clues:[clue('three_locks','同经不同锁的书匣','三府各有同经的一部分；单一势力封存任一书匣，都会让读者失去必要的前置说明。','suyan',27,58),clue('ignored_margins','未被抄进的旧批注','页边记着失败、替代法和撤出条件。正文只留下成功招式，删去页边便会把有条件的经验说成万能。','yueheng',73,63)],
  choices:[branch('protect','先核归途批注，保证公开经卷不会困住人',[line('player','先把撤出、停止与准备不足时的办法抄全。新读者得有用得上的第一步。'),line('suyan','我们再走星桥裂隙，把每个书匣旁的退路与原注相对。',1),line('narrator','新抄本的第一页不再是招式名，而是如何判断自己是否准备好了。')],cave(2,'完整通关星桥裂隙，核对旧经中的归途批注')),
    branch('seek','先核原本出处，保留三府不同版本',[line('player','不要合抄成一本没有来历的经。差异和作者，都留给后来的人判断。'),line('suyan','星桥那份最后的页码我还没见过。核完，就能把断开的三段接起来。',2),line('narrator','书匣架多出版本牌，记录每一段来自哪里、缺了什么。')],cave(2,'完整通关星桥裂隙，核验旧经出处与版本'))],
  outro:{protect:[line('narrator','新抄本在每卷开头标出准备、停止和返回办法。第一次借经的人没有被要求先记住整串招名。'),line('yueheng','现在他知道自己还缺哪一项，也知道可以下次再来。',1),line('narrator','三府旧经与实用批注同时公开，书匣的锁被留在展架上当作旧例。')],seek:[line('narrator','三份版本并排展出，差异不再被抹平。素衍把未确定的一行标成待核，留给后来者继续查。'),line('suyan','我能证明到哪里，就写到哪里。公开也可以带着未解的问题。',1),line('narrator','原本与副本分开保存，任何一把钥匙都不再能封死整段传承。')]},summary:'旧经连同归途、失败批注和出处公开保存，传承不再由一个锁匣决定。'});

add({id:'world_escort',kind:'sidequest',questId:'world_escort',title:'河桥长明',location:'玄河旧桥 · 阵心护送队',stakes:'阵心就在桥头。守将堵住了去路，队伍里最慢的人仍站在阵心旁。',cast:['qinglan','suyan','yueheng'],art:map(10),
  intro:[line('narrator','护送车轮卡在桥缝里。队伍已把推车人的名字写成点名表，最末一人用左手签得歪歪扭扭。'),line('qinglan','他伤了右臂，却还不肯松手。他怕一松，自己就被留在桥这边。',2),line('suyan','阵心不怕慢，怕封锁合上后被一齐锁住。'),line('player','先决定怎样开桥，点名表上的人一个也别当成货物。')],
  clues:[clue('escort_names','被汗水洇开的点名表','点名表既记录人，也记录药、备用轮轴和撤回信号。若只盯阵心，就会漏掉队伍赖以返回的准备。','yueheng',29,62),clue('closing_bridge','交替合拢的桥锁','守将先攻击护送队，再合拢封锁。对准前摇打断和转火，可以让队伍在间隙中移动，而非硬顶两段伤害。','suyan',71,55)],
  choices:[branch('protect','先护住车旁的人，再清桥锁',[line('player','先保队伍站得住。阵心过桥前，点名表也要再核一次。'),line('qinglan','我挡封锁先锋，你盯守将的蓄力。不要把所有护盾都用在同一瞬。',2),line('yueheng','后方医者跟着车走，伤者不再留在桥头等。')],boss(10,'击败玄河守将，为阵心队打开安全通道')),
    branch('seek','先打断封锁主阵，让整条河桥可反复通行',[line('player','这次不能只开一道供一辆车过的缝。把主阵断开，后续队伍也得有路。'),line('suyan','我标出封锁回流。你牵住守将，回路熄灭后我再接桥灯。',2),line('qinglan','点名表由我拿着。车走得慢也没关系，别把后面的人带丢。')],boss(10,'击败玄河守将，解除河桥封锁主阵'))],
  outro:{protect:[line('narrator','护送车过桥时停了一次，等最后一名伤者跟上。点名表上的每个名字都被重新勾过。'),line('yueheng','药箱里还剩药，留给下一队。不必让每一次过桥都成为一次透支。',1),line('narrator','桥灯重新亮起，阵心抵达，队伍没有把慢下来的人留在黑里。')],seek:[line('narrator','封锁主阵退去，后续两支队伍也从旧桥通过。素衍把桥灯接成双向，归路不再靠人喊。'),line('qinglan','最后一名也签回来了。这张表可以折起来，不必一直攥在掌心。',1),line('narrator','河桥长明，桥头留着点名、补给与撤回信号，下一队不必再从零猜起。')]},summary:'阵心与护送队平安返回，河桥封锁解除，点名与补给准备留给后来者。'});

// Main chapters are playable three-stage journeys. The first goal remains an alias
// for clients that show an episode preview; completion always uses all three goals.
function chapterJourney(id,extraIntro,stages){
  const e=episodes['chapter_'+id];e.intro.push(...extraIntro);
  for(const b of e.choices){const stage=stages[b.id];b.goals=stage.goals;b.goal=stage.goals[0];b.interludes=stage.interludes;
    if(stage.reply)b.reply=stage.reply;else b.reply.push(line('player',stage.lastReply));
    if(stage.outro)e.outro[b.id]=stage.outro;
  }
}

chapterJourney(0,[line('narrator','村口木牌上贴着三日后的山门试武帖：「胜者可入藏书阁，败者不得领护山差。」雨雪把无名散修四个字洇得格外重。'),line('qinglan','守门执事顾寒舟昨日问过我，你有没有师承。我说，看过他做事，再问他的来历。',2),line('player','那就等他看。眼下先不让这村子的灯灭。')],{
  protect:{goals:[herb('通关青岚灵圃，取回救治药材'),craft('实际炼成一炉丹药，完成雪夜温药'),mission('dungeonWins','arena_0','赢下山门斗技初试，取得入场资格')],lastReply:'人救下来以后，我会去那张试武帖前。没人记得我的名字，就让他们记得这次。',interludes:[
    [line('narrator','你踏回村口时，药叶还湿着。青岚先把药篮接过去，才问你有没有伤到。'),line('qinglan','孩子还在地窖里等，药不能再过旧炉。月衡给我留过一份净方。',2),line('player','我来开自己的炉。先把用量和火候摆清楚。'),line('narrator','村里的铁匠将小炉支在石板上。炉身不华美，底部仍刻着他学徒时的名字。'),line('qinglan','你说凡铁也能守住人，我信。现在该让他们亲眼看了。',1)],
    [line('narrator','药汤送进去，孩子抓着母亲的袖口睡着了。床边终于有人肯把冻僵的手伸离火盆。'),line('narrator','天亮后，顾寒舟踩着未化的雪来验护山差，先扫了一眼你脚下的旧炉。'),line('narrator','「凡炉炼药，尚可凑数。斗技可没有沈巡使替你挡剑。」他把初试牌放在案角。'),line('qinglan','昨夜谁拿药、谁守灯，他不肯问。你若去初试，就让他把眼睛看向台上。',2),line('player','牌我接了。炉子先留在这，今晚有人还会需要。')]
  ],outro:[line('narrator','初试台上最后一道阵光散去，你站在原地，手里的兵器仍带着护山路上的旧痕。'),line('narrator','顾寒舟翻开报名册，终于没有把你记在「巡使随从」那一栏。他问了你的名字，一笔一划写全。'),line('qinglan','你不是借我的名进来的。昨夜救人，今日登台，都是你自己走出的路。',1),line('narrator','入场木牌递来时，钟片在衣襟里微微发烫。山门内，还有一座需要你去查的旧丹炉。')]},
  seek:{goals:[herb('通关青岚灵圃，带回汲灵纹活株'),craft('实际炼成一炉丹药，核对净方与炉灰'),mission('dungeonWins','arena_0','赢下山门斗技初试，取得查炉入场资格')],lastReply:'证物要带进山门，就得先过他们守着的那道台。我不借身份，自己去赢。',interludes:[
    [line('narrator','活株把钟片的裂痕照成了一条完整线。根上铜灰不像自然掉落，而是从炉门细缝中喷出。'),line('qinglan','我想拿它进丹房，顾执事会先问你有没有入门名册。我们先把净方验出来。',2),line('player','证物封好。用干净的材料再成一炉，别把调查和病人的药混在一起。'),line('narrator','你把两份样本分到不同碟中。村里的铁匠照着你的记录给炉底刻了编号。'),line('qinglan','若有人还说全是猜测，我们就连编号与时辰一起带去。',1)],
    [line('narrator','净方药息平稳，病人喝后渐渐回暖。你把铜灰封在小纸匣里，走向山门初试台。'),line('narrator','顾寒舟拦在台前，目光落在你的旧衣与纸匣：「旁听客不能查宗门丹房。胜过一场，再说话。」'),line('qinglan','他给的是试台规矩。赢了以后，查炉的规矩也得摆出来。',2),line('player','我听见了。先登台，证据等我下台。'),line('narrator','台边几位弟子笑着让开。第一声开试钟响时，他们才发现你没有往青岚身后退。')]
  ],outro:[line('narrator','初试胜负落定，台边先前的笑声停了。顾寒舟接过纸匣，比开试前慢了许多。'),line('narrator','「你的入场资格，按胜绩登记。」他将「无名随客」四字划去，重新写下你的名字。'),line('qinglan','现在可以问他，哪一条规矩不许持证查炉了。',1),line('player','赢的是一场，查的是一整条汲灵回路。我们进山门。')]}
});

// The original chapter name and rewards remain; the rise through the sect is now
// witnessed through three actual arena victories, rather than a choice button.
Object.assign(episodes.chapter_1,{location:'宗门斗技场 · 三轮登名台',stakes:'骆景行凭内门出身占着头名，顾寒舟只认胜绩。你要靠三场真正的对决，取得公开查炉的席位。',intro:[
  line('narrator','斗技场里挂满各门旗，登记案却把散修排在最末。你走近时，骆景行正将自己的名牌摆在头席。'),line('narrator','「外门试武，三轮淘汰。」顾寒舟指了指你手里的木牌，「初试赢了，只说明你有资格再上一次台。」'),line('qinglan','他是内门最熟悉这座台的人。台上不认谁陪你来，盯住他亮招前的手势。',2),line('narrator','骆景行把护腕扣紧：「拿了一场入场胜，就想翻宗门药簿？台上的剑不会陪你讲村里的故事。」'),line('yueheng','台下的药我验过了，没有改炉的痕迹。你按自己的节奏，别为那句话把所有真元都用光。'),line('player','那就让他看见，我不止会讲。'),line('narrator','一位白发老修士坐在最远的石阶上，没有带门旗，只带一杯凉茶。他对记名弟子说：「胜负后，把每个人的名写清。」')],clues:[
  clue('old_matchmarks','台沿重叠的旧战痕','深痕前都有一段浅刻，说明高爆发并非突然出现。真正可抓的窗口藏在蓄力前摇里，而非兵器有多华丽。','qinglan',28,61),
  clue('sealed_prize','首席封签与查炉名额','胜者除了领常规奖赏，还获得长老公开验炉时的旁席。名额记在首席封签上，顾寒舟不能凭出身另换一人。','yueheng',73,57)]});
chapterJourney(1,[],{
  protect:{goals:[mission('dungeonWins','arena_0','赢下斗技初试，稳住入场名次'),mission('dungeonWins','arena_1','赢下斗技复试，闯入决胜轮'),mission('dungeonWins','arena_2','赢下斗技决胜，夺得宗门斗技头名')],reply:[line('player','我先打稳每一轮，不为他一句话乱了节奏。'),line('qinglan','那就把眼睛留在前摇上。出身给不了他第二次开盾的时间。',1),line('yueheng','上一轮结束再准备下一轮。别把三场当成一口气。'),line('narrator','你把入场木牌放进登记案，第一次有人给你留出一条通往试台的路。')],interludes:[
    [line('narrator','初试再次取胜，记名弟子把你的牌从队尾移到了台前。有人低声问起你是哪一门的，却无人能答。'),line('narrator','骆景行看了一眼战痕：「普通守台阵罢了。复试会逼你在护盾和爆发间作选择。」'),line('qinglan','他开始看你的招了。这比他先前看你的旧衣更有用。',1),line('player','我也看清了，不能见到破绽就把真元全押出去。'),line('narrator','顾寒舟给复试牌盖上印，墨比第一枚更浓。他仍没夸你，却没再省去名字。')],
    [line('narrator','复试阵灭下时，台旁掌声先是零散，随后连了起来。原来坐在远处的老修士把茶盏放到膝边。'),line('yueheng','气血能续，真元也够。你这回知道在第二段蓄力前留一手了。',1),line('narrator','骆景行收起笑意，把头席名牌翻面：「决胜轮，我按对手与你打。」'),line('player','从第一轮起，我就一直在按对手与你打。'),line('qinglan','最后一场没有人替你收招。把前两场赢来的节奏留住。',2),line('narrator','顾寒舟亲自举起决胜旗，声音越过整座斗技场。')]
  ],outro:[line('narrator','决胜台安静了一息，随后开试钟变成了登名钟。你的名牌越过所有内门牌，落在首席。'),line('narrator','骆景行看着断去的阵光，先抱拳：「先前看低你，是我错。下一次，我还会来挑战。」'),line('narrator','顾寒舟当众揭开首席封签：「此届斗技头名，按三轮胜绩记名。验炉旁席，归胜者。」白发老修士点了点头，终于喝完那杯凉茶。'),line('yueheng','药碗之外，终于有一张桌愿意听我们拿出的证据。你赢来的位置，不只是让名字写得更高。',1)]},
  seek:{goals:[mission('dungeonWins','arena_0','赢下斗技初试，辨清试台应对'),mission('dungeonWins','arena_1','赢下斗技复试，突破骆景行的压阵'),mission('dungeonWins','arena_2','赢下斗技决胜，取得公开验炉席位')],reply:[line('player','我不抢第一下。先看清他惯用的蓄力、护盾和收招，再让他付出判断错我的代价。'),line('qinglan','看清之后就出手，别为了多看一招硬接。',2),line('yueheng','你的纸匣我收着。最后一场下台，它会在验炉桌上等你。'),line('narrator','你没有回骆景行的嘲笑，而是走到能看清整座台沿的位置。')],interludes:[
    [line('narrator','初试结束，你把阵光亮起的次序记在台沿浅痕旁。围观弟子第一次议论的不是来历，而是你的应对。'),line('narrator','骆景行扫过记录：「光靠记招，过不了会变的阵。复试不会照你那几行字再来。」'),line('player','字不是让我照抄，是提醒我什么时候重新看。'),line('qinglan','他说得越多，越在意你看见了什么。别被话带着走。',1),line('narrator','复试门开，台上第二层阵光的节律果然与初试不同。')],
    [line('narrator','复试获胜，顾寒舟从记录里挑出两段关键应对，交给了看台上负责验炉的长老。'),line('yueheng','他把你的查验记录也拿走了。原来胜绩能让人先愿意读一行字。',2),line('narrator','骆景行站到决胜台前，声音低下来：「最后一轮，不留手。你若能看懂，就来破。」'),line('player','我来这里，不是等你留手。'),line('qinglan','这才是他真的把你当成对手。最后一场，按你自己看见的时机出剑。',1),line('narrator','老修士起身换到离试台最近的石阶，杯中的茶已经彻底凉了。')]
  ],outro:[line('narrator','决胜阵熄灭，你赢下的第三道胜印落在首席封签上。围观弟子开始复述你抢到的那个打断窗口。'),line('narrator','骆景行抱拳时没有再提你的旧衣：「我先前把你看成陪跑的人。下回，先看你的招。」'),line('narrator','顾寒舟将纸匣与头名牌同时放到验炉桌：「赢来的旁席，任何人不得替换。」长老展开铜灰记录，第一次念出莫无迁的验炉签名。'),line('qinglan','先登台，再让他们看证据。你两件都做到了。',1)]}
});

Object.assign(episodes.chapter_2,{location:'雾海秘境 · 三关争魁道',stakes:'秘境首席能取原档；旧盟只愿你看到抄本。骆景行也入了这次秘境，争的却未必是同一件东西。',intro:[
  line('narrator','雾海秘境开放时，宗门弟子把上一届首席的旗立在门边。你那枚斗技胜印，被验门人翻看了三次。'),line('narrator','骆景行比你早到半步，却没有挡门：「台上输了，路上未必还输。三关走完，我在原档台等你。」'),line('suyan','第一关破雾，第二关灵泉夺印，第三关古殿争席。首席取原档，后来的只准拿已经删过的抄本。',2),line('player','那就不是为一面旗争。原档里的退阵页，必须有人看见。'),line('yueheng','里面还有抄档人的求援痕。到第三关时，别只记住首席的位置。'),line('narrator','顾寒舟亲自给你检过入境牌，将「散修」一栏改成了「斗技首席」。远处的老修士笑了一声：「这回，名在前头了。」'),line('suyan','你先别被头名催着跑。雾里最短的线，不一定通向真正的门。',1)],clues:[
  clue('false_fastline','越走越亮的近路','近路的灵光与钟片同拍，正诱人向汲灵支阵靠近。真入口旁只有矿工与学徒留下的普通刻痕。','suyan',26,59),
  clue('firstseat_rules','原档台的争魁旧例','三关胜绩必须分别登记，不能把第一关的胜利算成整场争魁。首席的原档权写在旧例中，旧盟不能再用抄本替代。','narrator',73,62)]});
chapterJourney(2,[],{
  protect:{goals:[mission('dungeonWins','secret_0','通关破雾争先关，开启安全归路'),mission('dungeonWins','secret_1','通关灵泉夺印关，打通抄档人撤出路线'),mission('dungeonWins','secret_2','通关秘境争魁终关，夺取原档首席')],reply:[line('player','争首席，也先给后面的人留一条能回去的路。别人掉进支阵，不会让我的胜绩更重。'),line('suyan','我把普通刻痕接成返程线。你去清守关的那一段。',1),line('yueheng','若见到求援痕，记清位置，别急着只追旗。'),line('narrator','你把首席胜印扣紧，沿着不发亮的刻痕走进雾中。')],interludes:[
    [line('narrator','破雾关通了，守碑阵师许照收起阵旗，返程刻痕露出一段被苔掩住的石阶。三名走错近路的弟子沿着石阶追上来。'),line('narrator','骆景行从另一头赶到，肩边带着一道新裂口：「那道光是假的，你已经知道？」'),line('player','知道。返程线在脚下，不在最亮的地方。'),line('suyan','季凌川守着灵泉夺印阵，雷息会把路截成两段。先接退阵口，不然下一场赢了也带不走人。',2),line('narrator','骆景行没再抢先，他把自己的路牌插在了归路入口。')],
    [line('narrator','季凌川的雷旗落下，灵泉关的两段回路重接，石门后有纸片晃了一下。抄档人的手已经冻得无法把求援字写全。'),line('yueheng','他还活着。第三关开后我留在门内接人，你们到原档台去。',2),line('narrator','骆景行拿着第二道关印站在殿前，横剑行礼：「最后一轮，我按守殿旧约与你争。你若能赢，就别拿回一份没字的抄本。」'),line('player','等我拿下第三胜印，你我一起把里面的人带出来。'),line('suyan','原阵的第七出口就在档台下面。最后一关，既是首席，也是把它打开的机会。',2),line('narrator','古殿争席阵亮起，骆景行握稳青钢剑：「破雾开天剑，不再因你没有师承而收一分力。」')]
  ],outro:[line('narrator','第三道关印盖定，原档台的首席锁为你打开。抄档人沿重接的退路出来，紧攥着那张未写完的求援纸。'),line('suyan','原档融霜坏了一角，但他的口述补上了日期。莫无迁亲手撤掉第七阵口，先封路，后说灵息不足。',2),line('narrator','回到境门时，争魁旗被升到你的名下。骆景行收起败阵后留下的剑，替你挡开殿门余光：「这一回，三关归你。」'),line('player','把抄档人的名字也写进去。首席取回的不能只有一面旗。')]},
  seek:{goals:[mission('dungeonWins','secret_0','通关破雾争先关，识破汲灵近路'),mission('dungeonWins','secret_1','通关灵泉夺印关，校出真正的原档入口'),mission('dungeonWins','secret_2','通关秘境争魁终关，保全原档与胜印')],reply:[line('player','先辨真路，再抢关印。旧盟越催人去看那条亮线，我越要查它漏掉哪一个出口。'),line('suyan','我带着先前矿样的编号。每一处回流都能和图上的位置相对。',2),line('yueheng','抄档人的求援线也要记在图上，不要让它被胜旗盖住。'),line('narrator','你没有沿人最多的近路跑，而是在第一道普通刻痕旁取下雾中的铜屑。')],interludes:[
    [line('narrator','许照的守碑阵退散，第一关胜印亮起，你把铜屑封到图边。所谓近路把来者的灵息引到一道废炉，并不通向第二关。'),line('narrator','骆景行从假路折返，呼吸比来时更重：「有人改过门纹。往年不是这样。」'),line('player','改路的人不想首席拿到完整档案。他知道赶着争旗的人最容易不看脚下。'),line('suyan','灵泉夺印阵有被磨掉的出口编号。我来对图，你去破季凌川守着的那段雷息。',2),line('narrator','骆景行看了一眼你的证物袋，第一次问的不是胜负，而是有没有一份副图。')],
    [line('narrator','季凌川的雷息止住，第二关回路解开，素衍把第七出口的位置补回图中。原档台的锁与药圃假路，使用同一道旧盟印。'),line('suyan','证据接上了。第三关原档还封在寒阵里，先固定纸脊，再取首席锁印。',2),line('yueheng','我留在出口照看抄档人。你们破阵时喊一声，我按时接人。'),line('narrator','骆景行把副图交给追来的弟子：「别再去亮线。没看清这图的，就先站在这里。」'),line('player','首席锁我来开。旧盟留下的字，不许只给我们看抄本。'),line('narrator','最后一枚关牌浮上古殿台。骆景行将副图交给守门人，横剑行礼：「最后一轮，先破我这一剑，再开原档锁。」')]
  ],outro:[line('narrator','终关胜印落定，原档的印痕、日期与改阵顺序完整留下。抄档人被月衡带出，冻伤的右手需要慢慢恢复。'),line('suyan','不是古钟先失效，而是出口先被撤。莫无迁的说法，终于有原档能反驳。',2),line('narrator','秘境旗在门前升起，顾寒舟当众登记你连破三关的首席。骆景行递回副图：「我会再争一次，但这图，你该先留下。」'),line('player','给每个人一份。胜印归我，证据不只归首席。')]}
});

chapterJourney(3,[line('narrator','城门上新挂着你的斗技与秘境两枚首席印。有人说首席来了就会有救，有人还在问，首席凭什么比他们的命更急。'),line('player','印不能替人开门。我来断这些根，也把门后的名字记住。'),line('narrator','顾寒舟带着护城弟子赶到，向你拱手请命。他没再给你分一条陪行的路，而是在等你的部署。')],{
  protect:{goals:[boss(6,'击败缚灵树王，为东巷打开缺口'),herb('通关青岚灵圃，补齐劫火后的救治药材'),boss(7,'击败阵心影卫，夺回钟心外圈')],lastReply:'顾执事带人守河堤，我清树根。今日谁都不靠一个首席名号等救。',interludes:[
    [line('narrator','树王的根须退去，青岚带着私塾的人从缺口出来。最小的孩子没有鞋，先生把他抱在怀里。'),line('qinglan','二十三个，都在。药铺那边烧了棚子，药材不够。',2),line('yueheng','先补净药，别把被炉灰浸过的旧药再煎。我在井边设诊，药一到就能用。'),line('narrator','顾寒舟脱下外袍垫在孩子脚下，叫护城弟子去分担抬人。他看向你时，没有再问师承。'),line('player','我去补药。钟心封印的事，等这里稳住就接着查。')],
    [line('narrator','新药送进临时诊棚，敲窗求救的声音渐渐停下。素衍从焦黑的主根里挑出一片还能读的铜边。'),line('suyan','钟心不在树王身上，外圈被阵心影卫带去西线了。坐标烧掉一半，但影卫的回流还在。',2),line('qinglan','人可以留给护城弟子了。我们去西线，别让莫无迁借钟心再起一次火。'),line('player','让顾执事把每户的药留足。西线最后一道守阵，我亲自破。'),line('narrator','两枚首席印映在焦铜上，城里的人不再只望着它们，而是开始按新部署动起来。')]
  ]},
  seek:{goals:[boss(6,'击败缚灵树王，切断钟心主根'),boss(7,'击败阵心影卫，截住钟心转运'),craft('实际炼成一炉丹药，完成城镇应急净药')],lastReply:'断主根后城防会空一阵。顾执事守河堤，青岚守东巷，我清出钟心转运路。',interludes:[
    [line('narrator','树王倒下，全城汲灵同时停止。钟心从断根里落入影卫开启的暗阵，西线亮起一道移形痕。'),line('suyan','它在转运钟心，阵不会开很久。只要截住，下一处炉站的坐标就还完整。',2),line('qinglan','东巷人已撤出，私塾的屋顶没保住。我留下两人帮先生，你可以追。',2),line('narrator','顾寒舟在河堤挡住第一波失衡阵压，朝你举起空下的一只手，示意城防仍有人接着。'),line('player','我去截影卫。钟心到手后，先用它把城防补稳。')],
    [line('narrator','影卫退散，钟心坐标完整留在你手中。莫无迁的下一站不是救灾阵，竟是通往私库的星桥熔炉。'),line('suyan','这不是不得不舍一城。他把夺来的力量先分给了自己的锁库。',2),line('yueheng','证据带好。城里的人还在诊棚等净药，我不能让旧灰再伤他们一次。'),line('player','下一站不会让他提前合炉。这一站，先让人喝上能用的药。'),line('narrator','你把钟心放在众人看得见的台上，转身检查炉火。两种工作，终于不再被旧盟写成只能选一种。')]
  ]}
});

chapterJourney(4,[line('narrator','旧盟守桥弟子已经认出你的胜印，却仍握着放行令不松手：「莫盟主说，你只会凭一两场得意误事。」'),line('player','我得意的不是赢过谁，是这座城还在。我会让你看到炉里每一个数字去了哪里。'),line('narrator','骆景行从侧桥赶来，臂上贴着你们医舍的新封签。他将一箱护桥药放下：「这回不争先，我来接后路。」')],{
  protect:{goals:[boss(8,'击败熔炉傀儡，停止献城导轨'),boss(9,'击败月蚀灵狐，揭开供能幻图'),boss(10,'击败玄河守将，打开通向天隙的河桥')],lastReply:'先停献城炉，再让守桥的人看真实阵图。三道守阵，今天一道也不替他留。',interludes:[
    [line('narrator','熔炉傀儡倒下，献城数字停住。桥上的弟子仍看到一片虚假的城灯，误以为炉火只是被你打坏了。'),line('narrator','莫无迁的传音从月影里落下：「首席连活人的灯都敢毁，谁还敢信他的护城？」'),line('qinglan','灯底全是同一拍。他敢说，就敢让真正的城窗露出来。',2),line('suyan','月蚀阵是他最后的遮幕。破掉后，把回流线投到桥上，人人都能看。'),line('player','让这些守桥的人自己看。我不替莫无迁删图。')],
    [line('narrator','月蚀阵破，私库回流显现。守桥弟子低头看了看自己的放行令，终于把令牌放到了桥边。'),line('narrator','骆景行望着图里的旧盟私库，沉声说：「我以前以为，站得高的人知道得多。原来只是先看到了别人不许看的图。」'),line('yueheng','他们已经放人了，玄河守将却没有收锁。它接的是莫无迁的私印，不是这群弟子的令。',2),line('qinglan','最后一条河桥。清开后，诊棚和阵心队都能过。'),line('player','我去断守将的锁。今天过桥，不再验旧盟的身份。')]
  ]},
  seek:{goals:[boss(9,'击败月蚀灵狐，公开真实供能阵图'),boss(8,'击败熔炉傀儡，截断旧盟私库回流'),boss(10,'击败玄河守将，解除最后的身份桥锁')],lastReply:'先让他们看见真实的力量去向，再拆那座炉。莫无迁不能只靠一句救百城继续拿别人供能。',interludes:[
    [line('narrator','月影撕开后，真实供能图悬在桥上。没有人喝彩，守桥弟子只把手里的令牌握得更紧。'),line('narrator','莫无迁的传音说：「私库是为下一次灾难备力。」一名弟子却问，他父亲的街为何已归零。'),line('suyan','私库回流还在烧。图已经看清，下一步得让它停，不是留在这里争一句谁更有理。',2),line('qinglan','有弟子开始放行了。我接住退下的人，你去拆炉。'),line('player','把图留着。炉一拆，哪道线止住，他们都看得到。')],
    [line('narrator','傀儡炉心崩开，回流线在众人眼前断了。守桥弟子把旧盟印摘下，贴到真实阵图的私库那一格。'),line('narrator','骆景行望向远处：「争台、争旗，我还会争。但我不替人用一座城垫脚。」'),line('yueheng','后方药队要过河了，玄河守将仍按私印攻击。它不认这里已经没有人愿意供能。',2),line('suyan','守将是最后一道强锁。它倒下，星桥才真的通到天隙。'),line('player','那就把最后一道也断开。莫无迁的印，守不住他自己写下的借口。')]
  ]}
});

chapterJourney(5,[line('narrator','山下递来的不是求救帖，是各城新写的轮值表。曾在斗技台旁看低你的人，也在自己的名字后盖了一枚护阵印。'),line('narrator','骆景行站在外圈：「下一次还要与你争头名。今日这一阵，你来破心，我守你背后。」'),line('player','一路上的胜印不是走到这里就能停的理由。先赢下这一场，再给后来人一条不必重复这一场的路。')],{
  protect:{goals:[boss(11,'击败天隙劫兽，取回最后钟片'),forge('实际打造一件装备，完成新护阵器的实造验证'),boss(11,'再次击败天隙劫兽，验证合钟护阵能撑住雷隙')],lastReply:'钟片要拿，新的护阵也得实造、实战。不让后来的守钟人只收到一句「照旧阵做」。',interludes:[
    [line('narrator','第一场劫雷止住，最后钟片落下。莫无迁失去私印支撑，仍扶着残壁问你能守几个灾年。'),line('player','一个人守不了。所以新护阵不是只给我用。'),line('suyan','铜槽原理已经核过，还要用能重复取得的材料做一件护阵器。不能让新约只靠这一片不可复制的钟。',2),line('qinglan','各城都有人接班。先做出他们也能做的东西，再试它最险的一段。',1),line('narrator','旧六印器台的蓝图被展开在钟架旁，来自山脚的凡铁也被放上验料桌。')],
    [line('narrator','新器出炉，没有献上一件稀世红装，也没有把谁的灵息锁进炉底。素衍把制法抄给外圈各城的阵师。'),line('suyan','接下来要试雷隙。缓冲到限时，钟会减载，不会偷偷向城里补数。',2),line('yueheng','若一段撑不住，我们就按停阵步骤重来。让失败可返回，比把成功吹得太大更有用。'),line('narrator','莫无迁望着外圈的轮值人，第一次没有人等他发令才举起护阵灯。天隙余雷重新凝成劫兽。'),line('player','最后一次验证，我仍站最前。轮值的人看清每一步，不必猜我用了什么秘法。')]
  ]},
  seek:{goals:[boss(11,'击败天隙劫兽，解除总册锁印'),ore('通关沉星矿洞，取得分阵可重复使用的基材'),boss(11,'再次击败天隙劫兽，验证公开分阵的雷隙应对')],lastReply:'拆掉总册只是第一步。我还要用普通材料和公开步骤，证明各地不必再等一枚私印。',interludes:[
    [line('narrator','总册锁印碎开，莫无迁叫它最后一道能保证闭阵的手段。你把碎印放到退阵口旁，两样东西并列。'),line('player','一个能让人走，一个只许人等你的命令。下一场雷，试前一个。'),line('suyan','分阵图已经能画，基材却不能只用天隙灵铜。各地有矿、有炉，未必有这片钟。',2),line('yueheng','回沉星矿洞取普通材料。丹典写过的替代原则，这次也写进阵图。'),line('narrator','你把一枚秘境首席印压住空白图页，图上第一行写的不是封印咒，而是材料来源。')],
    [line('narrator','普通矿料接入分阵后，第一座灯台亮起，各城阵师按编号依次校验。光亮不整齐，却都能自行熄下。'),line('suyan','每处回路都保留本地退阵口，缓冲满了就减载。中央无权把缺数写进邻城。',2),line('narrator','骆景行拿着公开图站在外圈，照图改掉自己的一个错误：「原来不是得拜在谁门下，才看得懂最后一步。」'),line('qinglan','余雷还会再来。让每个接图的人看见，错了该停，稳了该怎样继续。',1),line('player','我迎这一场。分阵能不能走到最后，用实际的胜负回答。')]
  ]}
});

// Later world arcs can be accepted before old accumulated conditions are met,
// but never before their region is narratively accessible.
for(const [id,rank] of Object.entries({world_forge:10,world_sect:4,world_tower:20,world_garden:2,world_relic:26,world_escort:50}))episodes[id].unlockRank=rank;

function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
return freeze({episodes});
});
