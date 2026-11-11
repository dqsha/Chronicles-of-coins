// 0.31: новая структура вкладок и лёгкая главная
const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const m=h.match(/<script>([\s\S]*?)<\/script>/);let bad=0;const chk=(n,c)=>{if(!c){bad++;console.log('FAIL',n)}else console.log('ok  ',n)};
const src=m[1].replace(/try\{start\(\)\}catch\(e\)\{showFatal\(e\)\}\s*$/,'');
const vm=require('vm');const els={};const mk=()=>({focus(){},innerHTML:'',classList:{add(){},remove(){},toggle(){}},dataset:{},style:{setProperty(){}},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}});
const ctx={console,setTimeout,clearTimeout,clearInterval,setInterval:()=>1,localStorage:{getItem(){return null},setItem(){}},document:{body:mk(),documentElement:mk(),getElementById:i=>els[i]||(els[i]=mk()),querySelector:s=>els[s]||(els[s]=mk()),querySelectorAll:()=>[],addEventListener(){},createElement:()=>mk()},window:{addEventListener(){},scrollTo(){},matchMedia:()=>({matches:false})},Date,Math,JSON,Intl,Image:function(){},navigator:{},performance:{now:()=>0},requestAnimationFrame(){},fetch:undefined};
ctx.window.document=ctx.document;ctx.self=ctx.window;vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);const app=()=>els['#app'].innerHTML,lay=()=>els['#layer'].innerHTML;
const act=(a,v)=>{ctx.__el={dataset:{v},disabled:false};run(`act('${a}',__el)`)};
const near=(a,b)=>Math.abs(a-b)<0.01;
run("S=defaults();S.onboarded=true;S.tourSeen=true;S.accounts=[{id:'a',name:'Карта',type:'card',bal0:100000}];NOW='2026-11-11'");
// новичок: только банк и кнопки
// 0.33: облик героя (раса + класс), оружие по классам, компаньоны
run("S.xp=xpAtLevel(12)");
chk('default look human warrior',run("JSON.stringify(heroLook())")==='{"race":"human","cls":"warrior"}');
chk('weapon names per class',run("GEAR.weapon.map(g=>g.n).join()").startsWith('Тренировочный меч')&&run("GEAR.weapon.length")===5);
act('setcls','mage');
chk('class changed, weapon override cleared',run("S.hero.cls")==='mage'&&run("GEAR.weapon[0].n")==='Посох ученика');
act('setrace','orc');
chk('race changed, class kept',run("S.hero.race==='orc'&&S.hero.cls==='mage'"));
const ha=run("heroArt(12)");
chk('heroArt uses race+class image',ha.includes('assets/hero/orc-mage.webp'));
chk('no weapon drawn on the hero image',!ha.includes('hero-wpn')&&!ha.includes('assets/weapon'));
chk('avatar uses portrait image',run("heroAvatar()").includes('assets/avatar/orc-mage.webp'));
run("UI.tab='hero';render()");
chk('hero tab: look button',app().includes('data-act="look"')&&app().includes('hero-img'));
act('look');chk('look sheet shows 4 races and 4 classes',lay().includes('data-act="setrace" data-v="goblin"')&&lay().includes('data-act="setcls" data-v="rogue"'));
act('gear');chk('inventory: 6 slots, 5 locked',(lay().match(/class="islot/g)||[]).length===6&&(lay().match(/islot lock/g)||[]).length===5&&lay().includes('в разработке'));
chk('inventory: 5 weapon rows + current in slot',(lay().match(/data-act="equip"/g)||[]).length===5&&lay().includes('Гримуар'));
act('close');
// корректность картинок: все файлы есть
const fsx=require('fs'),root=require('path').dirname(require('path').resolve(process.argv[2]))+'/../assets/';
let miss=[];['human','elf','orc','goblin'].forEach(r=>['warrior','mage','ranger','rogue'].forEach(c=>{if(!fsx.existsSync(root+'avatar/'+r+'-'+c+'.webp'))miss.push('av'+r+c)}));['human','elf','orc','goblin'].forEach(r=>['warrior','mage','ranger','rogue'].forEach(c=>{if(!fsx.existsSync(root+'hero/'+r+'-'+c+'.webp'))miss.push(r+c)}));
['warrior','mage','ranger','rogue'].forEach(c=>[1,2,3,4,5].forEach(i=>{if(!fsx.existsSync(root+'weapon/'+c+'-'+i+'.webp'))miss.push('w'+c+i)}));
['slime','cat','dragon','phoenix'].forEach(k=>[1,2,3,4].forEach(i=>{if(!fsx.existsSync(root+'pet/'+k+'-'+i+'.webp'))miss.push('p'+k+i)}));
chk('all sprites exist ('+miss.join(',')+')',miss.length===0);
// компаньоны
chk('default pet wolf',run("petKind()")==='wolf'&&run("petInfo().stageName")==='Волчонок');
run("S.xp=xpAtLevel(2)");chk('slime locked at L2',run("switchPet('slime')")===false&&run("petKind()")==='wolf');
run("S.xp=xpAtLevel(3);S.pet.food=5;S.pet.xp=9");
chk('slime unlocked at L3',run("switchPet('slime')")===true&&run("petKind()")==='slime');
chk('food carried over, new pet starts fresh',run("S.pet.food")===5&&run("S.pet.xp")===0&&run("S.pet.name")==='Желе');
chk('wolf progress stored',run("S.petBox.wolf.xp")===9);
chk('slime stage names',run("petInfo().stageName")==='Капля слайма');
run("S.pet.xp=30");chk('slime stage 3 = coin slime',run("petInfo().stageName")==='Слайм с монеткой'&&run("petImg('slime',2,'ok')").includes('assets/pet/slime-3.webp'));
run("switchPet('wolf')");chk('back to wolf restores xp 9',run("petKind()")==='wolf'&&run("S.pet.xp")===9&&run("S.petBox.slime.xp")===30);
run("S.xp=xpAtLevel(15)");
['cat','dragon','phoenix'].forEach(k=>chk('switch to '+k,run("switchPet('"+k+"')")===true&&run("petKind()")===k));
chk('wolf drawn by code',run("petImg('wolf',1,'ok')").startsWith('<svg'));
run("UI.tab='hero';render()");chk('pet card has companions button',app().includes('data-act="pets"')&&app().includes('pet-img'));
act('pets');chk('pets list shows 5',(lay().match(/data-act="petview"/g)||[]).length===5);
act('petview','dragon');chk('detail shows 4 stages',(lay().match(/class="pst"/g)||[]).length===4);
act('close');
// предупреждение о level-up: компаньон в списке открытий
chk('unlock list has companion',run("unlockedBetween(2,3)").some(x=>x.includes('Слайм')));
console.log(bad?'FAILED '+bad:'ALL OK');
