const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const code=html.match(/<script>([\s\S]*)<\/script>/)[1].replace(/\nstart\(\);\s*$/,'\n');
const els={};const el=k=>els[k]||(els[k]={innerHTML:'',classList:{add(){},remove(){}},dataset:{},focus(){},select(){},getBoundingClientRect:()=>({left:10,top:600,width:100,height:40}),set textContent(v){this._t=v}});
const ctx=vm.createContext({console,window:{scrollTo(){},addEventListener(){},innerHeight:800,scrollY:0},document:{querySelector:el,addEventListener(){},body:{dataset:{},classList:{toggle(){}}}},localStorage:{getItem(){return null},setItem(){}},navigator:{clipboard:{writeText:()=>Promise.resolve()}},setTimeout,clearTimeout});
vm.runInContext(code,ctx);
const run=c=>vm.runInContext(c,ctx);
let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
run(`S=defaults();S.onboarded=true;S.accounts=[{id:'a',name:'Нал',type:'cash',bal0:5000},{id:'b',name:'Карта',type:'card',bal0:90000}];S.tourSeen=true;NOW='2026-11-01';`);
['home','list','stats','wallet','plan','hero'].forEach(t=>{run(`UI.tab='${t}';render()`);chk('tab '+t,els['#app'].innerHTML.length>200)});
run(`UI.tab='home';render()`);run("openSheet('camp')");chk('quest card in camp',els['#layer'].innerHTML.includes('Путь новичка'));chk('home has quick log buttons',els['#app'].innerHTML.includes('data-act="add" data-v="exp"')&&els['#app'].innerHTML.includes('data-act="add" data-v="inc"'));
run(`addGoal({name:'Телефон',icon:'📱',target:60000,deadline:'2027-01-01'});addContrib(S.goals[0].id,15000);render()`);
run(`UI.tab='plan';render()`);chk('goal on plan',els['#app'].innerHTML.includes('Телефон'));run(`UI.tab='home';render()`);
chk('free money subtitle mentions reserve',els['#app'].innerHTML.includes('отложенное в целях'));
run(`UI.tab='plan';render()`);chk('plan goals',els['#app'].innerHTML.includes('Цели и копилки')&&els['#app'].innerHTML.includes('Телефон'));
const gid=run('S.goals[0].id');
for(const [k,pre] of [['goal',`UI.form={name:'',icon:'',target:'',deadline:'',err:''};`],['gdet',`UI.form={err:''};`],['contrib',`UI.form={amount:'',mode:'in',err:''};`],['buy',`UI.form={amount:'15000',acc:'a',cat:'other',err:''};`],['data',`UI.form={name:'x',import:'',err:''};`],['gear','']]){
  run(`${pre}UI.tourStep=0;openSheet('${k}',{id:'${gid}'})`);chk('sheet '+k,els['#layer'].innerHTML.includes('sheet'))}
const act=(a,v,ds)=>{ctx.__el={dataset:Object.assign({v},ds||{}),disabled:false};run(`act('${a}',__el)`)};
const L=()=>els['#tourlayer'].innerHTML;
run(`startTour()`);chk('tour step 1 card + mage',L().includes('class="dlg')&&L().includes('Маг Орвин')&&L().includes('<i>п</i>'));
const goTo=n=>{while(run('UI.tour')<n)act('tournext')};
chk('no spotlight, no bullet list',!L().includes('tv-spot')&&!L().includes('<li'));
goTo(9);chk('hero step: calm mode word',run('UI.tour')===9&&run('UI.tab')==='hero'&&L().includes('<b class="kb">'));chk('calm hint on hero step',L().replace(/<[^>]+>/g,'').includes('Спокойный режим'));
goTo(10);chk('tour switches to wallet tab',run('UI.tab')==='wallet');chk('spotlight on target, dialog on top',L().includes('tv-spot')&&L().includes('dlg top'));
act('tourprev');chk('prev works',run('UI.tour')===9);
goTo(11);chk('last step reached',run('UI.tour')===11);
act('tournext');chk('tour finished',run('UI.tour')===null&&L()===''&&run('S.tourSeen')===true&&run('UI.tab')==='home');
run(`UI.tab='home';render()`);
run(`UI.tab='home';render()`);

// actions
act('goalnew');ctx.UI=run('UI');run(`UI.form={name:'Отпуск',icon:'',target:'200000',deadline:'',err:''}`);act('goalsave');
chk('goal created via act',run('S.goals.length')===2);
act('contribopen',gid);run(`UI.form.amount='1000'`);act('contribsave');chk('contrib via act',run('goalSaved(S.goals[0])')===16000);
act('buyopen',gid);act('buysave');act('buysave');chk('buy via act closes goal',run('S.goals[0].closed')===true);
act('tour');chk('replay tour',run('UI.tour')===0);act('tourend');chk('tour skip',run('UI.tour')===null);
act('gear');chk('gear quest',run('S.quest.gear')===1);

// ---- 0.2.1 extras ----
run(`S=defaults();S.onboarded=true;S.accounts=[{id:'a',name:'Нал',type:'cash',bal0:1000}];S.tourSeen=true;NOW='2026-11-01';UI.tab='home';render()`);
run("openSheet('camp')");chk('camp has achievements button',els['#layer'].innerHTML.includes('data-act="ach"'));
chk('quest card has hide',els['#layer'].innerHTML.includes('questhide'));
act('questhide');chk('quest hidden',run('S.questHidden')===true&&!els['#app'].innerHTML.includes('Путь новичка'));
chk('no backup card with few records',!els['#app'].innerHTML.includes('Копия данных'));
run(`for(let i=0;i<6;i++)S.tx.push({id:'x'+i,type:'exp',amount:1,cat:'food',acc:'a',date:'2026-11-01',ts:i});render()`);
run(`UI.tab='hero';render()`);chk('backup card appears',els['#app'].innerHTML.includes('Копия данных'));run(`UI.tab='home';render()`);
act('copy');chk('copy sets lastBackup',run('S.lastBackup')==='2026-11-01');run('render()');
chk('backup card gone after copy',!els['#app'].innerHTML.includes('Копия данных'));
act('ach');chk('ach sheet',els['#layer'].innerHTML.includes('Открыто'));
run(`UI.tab='hero';render()`);chk('chronicle card',els['#app'].innerHTML.includes('Сокровищница героя')&&els['#app'].innerHTML.includes('Достижения:'));
// buy warning on insufficient funds + closed goal row
run(`S.goals=[];const g=addGoal({name:'Мопед',icon:'🛵',target:500000});addContrib(g.id,1500);`);
const gid2=run('S.goals[0].id');
act('buyopen',gid2);run(`UI.form.amount='400000'`);act('buysave');
chk('buy warns first',run('S.goals[0].closed')===false&&run('UI.form.err').includes('не хватит'));
act('buysave');chk('buy goes through on second click',run('S.goals[0].closed')===true);
run("UI.tab='plan';render()");chk('closed goal listed under Куплено',els['#app'].innerHTML.includes('Куплено')&&els['#app'].innerHTML.includes('Мопед'));
act('goalopen',gid2);chk('closed goal sheet',els['#layer'].innerHTML.includes('Убрать из списка'));
act('goaldel',gid2);act('goaldel',gid2);chk('closed goal removed',run('S.goals.length')===0);
chk('home scene has two flame frames',run('SCENES.home()').includes('class="f1"')&&run('SCENES.home()').includes('class="f2"'));

// ---- companion ----
run(`S=defaults();S.onboarded=true;S.accounts=[{id:'a',name:'Нал',type:'cash',bal0:1000}];S.tourSeen=true;NOW='2026-11-01';UI.tab='home';render()`);
run("openSheet('camp')");chk('pet card in camp',els['#layer'].innerHTML.includes('Компаньон')&&els['#layer'].innerHTML.includes('Желе')&&els['#layer'].innerHTML.includes('Покормить'));chk('pet NOT on home',!els['#app'].innerHTML.includes('id="t-pet"'));
act('feed');chk('feed uses food and sets mood',run('S.pet.food')===1&&run('S.pet.xp')===1&&run('petInfo().mood')==='happy');
act('feed');act('feed');chk('cannot feed without food',run('S.pet.food')===0&&run('S.pet.xp')===2);
run('renderSheet()');chk('feed button disabled with no food',els['#layer'].innerHTML.includes('data-act="feed" disabled'));
for(let st=0;st<4;st++){for(const m of ['happy','ok','hungry']){run(`petImg('slime',${st},'${m}')`);}}
chk('sprites render',run(`petImg('slime',3,'happy')`).startsWith('<img'));

// ---- sound settings ----
run(`S=defaults();S.onboarded=true;S.accounts=[{id:'a',name:'Нал',type:'cash',bal0:1}];S.tourSeen=true;UI.tab='home';render()`);
chk('music button on home scene',els['#app'].innerHTML.includes('data-act="music"'));
act('music');chk('music toggles on',run('S.sound.music')===true&&els['#app'].innerHTML.includes('mbtn on'));
act('music');chk('music toggles off',run('S.sound.music')===false);
act('data');chk('sound block in settings',els['#layer'].innerHTML.includes('Громкость')&&/data-act="sfxtoggle" role="switch" aria-checked="true"/.test(els['#layer'].innerHTML));
act('sfxtoggle');chk('sfx toggle',run('S.sound.sfx')===false&&/data-act="sfxtoggle" role="switch" aria-checked="false"/.test(els['#layer'].innerHTML));

// ---- calm mode + home order ----
run(`S=defaults();S.onboarded=true;S.accounts=[{id:'a',name:'Нал',type:'cash',bal0:5000}];S.tourSeen=true;UI.tab='home';render()`);
run(`S.tx.push({id:'z1',type:'exp',amount:1,cat:'food',acc:'a',date:today(),ts:1});render()`);let h=els['#app'].innerHTML;
chk('record buttons come before hero',h.indexOf('data-act="add"')<h.indexOf('class="card herostrip"'));chk('home is lean: no forecast, quest, goal, history',!/t-fc|Путь новичка|Ближайшая цель|data-act="imp"/.test(h));
chk('free money first',h.indexOf('id="t-free"')<h.indexOf('data-act="add"'));
run("openSheet('camp')");chk('pet and quest visible normally in camp',els['#layer'].innerHTML.includes('id="t-pet"')&&els['#layer'].innerHTML.includes('id="t-quest"'));run('closeSheet()');
act('data');act('calmtoggle');h=els['#app'].innerHTML;
chk('calm hides pet quest and next item',!h.includes('id="t-pet"')&&!h.includes('id="t-quest"')&&!h.includes('Следующая вещь')&&!h.includes('mbtn'));
chk('calm toggle in settings',/data-act="calmtoggle" role="switch" aria-checked="true"/.test(els['#layer'].innerHTML));
run(`UI.sheet=null;addTx({type:'exp',amount:10,cat:'food',acc:'a'});S.xp=xpAtLevel(5);gainXp(1,'t');`);run('commit()');
chk('calm swallows level-up window',run('UI.pendingLvl')===null&&run('UI.sheet')===null);
act('calmtoggle');chk('calm toggles off',run('S.calm')===false);
// yesterday chip
act('add');run(`UI.F.more=true;renderSheet()`);chk('yesterday chip shown',els['#layer'].innerHTML.includes('data-act="dayset"'));
act('dayset','1');chk('yesterday sets date',run('UI.F.date')===run(`addDays(today(),-1)`));
console.log(bad?bad+' FAILED':'UI OK');process.exit(bad?1:0);

