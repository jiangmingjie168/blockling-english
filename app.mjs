import {SAVE_KEY,resources,bridgeCells,star,garden,buildCells,trees,same,distance,isLand,freshState,quest,blueCount,walkable,pathTo,move,collect,placeBridge,jump,plant,build,remove,restore} from './core.mjs';
import {readProgress,writeProgress,probeEnglishVoice} from './platform.mjs';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let state=freshState(), storageOK=true, loadWarning='', mode='walk', color='coral', path=[], arrival=null, paused=false;
let visual={x:3,y:4}, stepAnimation=null, lastTime=0, jumpTime=0, toastUntil=0, metrics=null, frame=0;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const loaded=readProgress(()=>localStorage);state=loaded.state;loadWarning=loaded.warning;
visual={...state.player};
const canvas=$('#scene'), ctx=canvas.getContext('2d');
const stageInfo=[
  {chapter:'01 / LITTLE WORDS',title:'A tasty hello.',intro:'An apple for the journey.<br>Can you find one?',word:'apple',art:'🍎',instruction:'Find the apple.',zh:'找一找苹果。点击苹果，小伙伴会走过去拾取。',note:'Tap the grass to walk.<br>Tap an object to explore.'},
  {chapter:'02 / COLOURS & COUNTING',title:'A way across.',intro:'A tiny river. A big idea.<br>Let’s build a blue bridge.',word:'blue',art:'▰',instruction:'Find three blue blocks.',zh:'收集 3 个蓝色方块。然后点击河上的 + 号，依次搭桥。',note:'One, two, three.<br>Every block makes a path.'},
  {chapter:'03 / WORDS IN MOTION',title:'Ready, little feet?',intro:'There’s a garden over there.<br>Let’s help it bloom.',word:'walk',art:'↗',instruction:'Walk to the star.',zh:'沿着桥走到黄色星星，然后点击 Jump（或按空格）跳一跳。',note:'Walk. Jump. Plant.<br>You make this island bloom.'},
  {chapter:'ALL THREE ADVENTURES',title:'Hello, little flower.',intro:'Our island has a new friend.<br>And a lovely place to rest.',word:'flower',art:'✿',instruction:'Time for a little break.',zh:'任务完成了。看看远处、伸伸懒腰、喝口水，休息一下。',note:'A lovely place to stop.<br>See you next time, explorer.'}
];
function save(){
  storageOK=writeProgress(()=>localStorage,state);$('#save-state').textContent=storageOK?'Saved on this device':'Not saved · storage unavailable';$('#save-state').classList.toggle('warning',!storageOK);
  $('#parent-save').textContent=storageOK?'本机存档可用。关闭页面后，下次在同一浏览器继续。':'当前浏览器无法保存进度。关闭页面后可能丢失；可继续本次游戏。';
}
function notify(message){if(!message)return;$('#toast').textContent=message;$('#toast').classList.add('show');toastUntil=performance.now()+4200;}
function modalOpen(){return !!document.querySelector('dialog[open]');}
function halt(){path=[];arrival=null;stepAnimation=null;visual={...state.player};}
function showDialog(id){halt();const d=$(id);if(!d.open)d.showModal();}
function result(r){notify(r.message);save();update();return r.ok;}
function update(){
  const q=quest(state),info={...stageInfo[q]};
  if(q===1&&state.picked.filter(x=>x.startsWith('blue')).length===3){info.instruction='Place three blue blocks.';info.zh='点击桥上的 + 号。每次放一块，搭好 3 块蓝色方块。';}
  if(q===2&&state.arrived&&!state.jumped){info.word='jump';info.art='⌁';info.instruction='Jump on the star!';info.zh='站在黄色星星上，点击 Jump 或按空格跳一跳。';}
  if(q===2&&state.jumped){info.word='plant';info.art='✿';info.instruction='Plant a seed.';info.zh='点击星星旁边的花圃，走过去种下一颗种子。';}
  $('#chapter').textContent=info.chapter;$('#mission-title').textContent=info.title;$('#mission-intro').innerHTML=info.intro;
  $('#word').textContent=info.word;$('#word-art').textContent=info.art;$('#word-art').style.color=q===1?'#7eafc2':q===3?'#d8ad61':'';
  $('#instruction').textContent=info.instruction;$('#translation').textContent=info.zh;$('#translation').hidden=!state.zh;$('#zh').setAttribute('aria-pressed',String(state.zh));
  $('#buddy-note').innerHTML=info.note;
  for(let i=0;i<3;i++){$(`#step${i}`).className=i<q?'done':i===q?'current':'';$(`#step${i}`).textContent=i<q?'✓':i+1;}
  const checks=q===0?[[false,'Listen, then find an apple']]:q===1?[[state.picked.filter(x=>x.startsWith('blue')).length===3,`Blue blocks found · ${state.picked.filter(x=>x.startsWith('blue')).length} / 3`],[state.bridge.length===3,`Bridge blocks placed · ${state.bridge.length} / 3`]]:q===2?[[state.arrived,'Walk to the star'],[state.jumped,'Jump on the star'],[state.planted,'Plant a seed']]:[[true,'Find'],[true,'Build'],[true,'Grow']];
  $('#checklist').innerHTML=checks.map(([done,t])=>`<div class="check ${done?'done':''}"><span>${done?'✓':''}</span>${t}</div>`).join('');
  $('#blue-count').textContent=blueCount(state);
  $$('.tool[data-tool]').forEach(b=>{const active=b.dataset.tool===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('#palette').hidden=mode!=='build';
  $$('[data-color]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.color===color));b.querySelector('b').textContent=2-state.built.filter(x=>x.color===b.dataset.color).length;});
  $('#tool-hint').textContent=q===3?'Your island is resting. Take a stretch and a sip of water.':paused?'Paused · open Parents to resume.':({walk:'Tap to walk · Tap an object to collect · Arrow keys also work',bridge:'Tap the next + on the bridge · One blue block at a time',build:'Tap a sandy tile to build · Tap grass to walk closer',remove:'Tap a block on the sandy tiles to put it back in your bag'})[mode];
  $('#pause').textContent=paused?'Resume / 继续':'Take a break / 暂停';
  updateTargets();
}
function setMode(next){mode=next;halt();update();if(mode==='build')notify('Build on the six sandy tiles at the left edge.');}
function begin(){state.started=true;paused=false;$('#welcome').close();save();update();notify(loadWarning||'Hello, explorer! Tap the apple to walk over.');loadWarning='';}
function active(){return state.started&&!state.planted&&!paused&&!modalOpen();}
function goTo(target,fn=null){
  if(!active())return;
  halt();const route=pathTo(state,target);
  if(route===null){notify('There is no path yet. Try the grass or build the bridge.');return;}
  path=route;arrival=fn;
  if(!path.length){const action=arrival;arrival=null;if(action)action();}
}
function goBeside(target,fn){
  if(!active())return;
  let best=null;
  for(const [dx,dy] of [[-1,0],[0,-1],[1,0],[0,1]]){const p={x:target.x+dx,y:target.y+dy},route=pathTo(state,p);if(route!==null&&(!best||route.length<best.route.length))best={p,route};}
  if(!best){notify('There is no path yet. Build from the grassy edge.');return;}
  goTo(best.p,fn);
}
function interactResource(id){
  const r=resources.find(r=>r.id===id);if(!r)return;
  goTo(r,()=>{const before=quest(state);const changed=result(collect(state,id));if(changed&&quest(state)!==before){mode='walk';update();} });
}
function bridgeAction(i){
  if(!active())return;
  if(quest(state)!==1||i!==state.bridge.length||blueCount(state)<1){result(placeBridge(state,i));return;}
  mode='bridge';update();goBeside(bridgeCells[i],()=>{if(result(placeBridge(state,i))&&state.bridge.length===3){mode='walk';update();notify('The bridge is ready! Walk to the yellow star.');}});
}
function doJump(){if(!active())return;halt();jumpTime=performance.now();result(jump(state));}
function gardenAction(){
  if(!active())return;
  if(!state.jumped){notify('Walk to the star. Then jump!');return;}
  goTo(garden,()=>{if(result(plant(state))){mode='walk';update();showRest(true);}});
}
function performTile(p){
  if(!active())return;
  const bridgeIndex=bridgeCells.findIndex(c=>same(c,p));
  if(bridgeIndex>=0&&!state.bridge.includes(bridgeIndex)){bridgeAction(bridgeIndex);return;}
  if(same(p,star)&&quest(state)===2){goTo(star,()=>{notify('You are on the star. Jump!');save();update();});return;}
  if(same(p,garden)&&quest(state)===2&&state.jumped){gardenAction();return;}
  const r=resources.find(c=>same(c,p)&&!state.picked.includes(c.id));
  if(r){interactResource(r.id);return;}
  const inBuild=buildCells.some(c=>same(c,p));
  if(mode==='build'&&inBuild){goBeside(p,()=>result(build(state,p,color)));return;}
  if(mode==='remove'&&inBuild){goBeside(p,()=>result(remove(state,p)));return;}
  if(!walkable(state,p)){notify(mode==='build'?'Build on the sandy tiles. Tap grass to move.':'Stay on the grass. Tap a clear tile.');return;}
  goTo(p);
}
function direction(dir){
  if(!active())return;halt();const deltas={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]},[dx,dy]=deltas[dir];
  const p={x:state.player.x+dx,y:state.player.y+dy},r=move(state,p);if(r.ok){visual={...state.player};save();update();}else notify(r.message);
}
function interactNear(){
  if(!active())return;
  if(state.jumped&&distance(state.player,garden)<=1){gardenAction();return;}
  const r=resources.find(r=>!state.picked.includes(r.id)&&distance(state.player,r)<=1);
  if(r){interactResource(r.id);return;}
  const i=state.bridge.length;if(i<3&&distance(state.player,bridgeCells[i])<=1){bridgeAction(i);return;}
  notify('Tap an object on the island to explore.');
}
function showRest(complete){
  $('#rest-eyebrow').textContent=complete?'OUR ADVENTURE IS COMPLETE':'A LITTLE BREATHER';
  $('#rest-title').innerHTML=complete?'A little flower.<br>A lovely place to stop.':'The island can wait.';
  $('#rest-copy').innerHTML=complete?'You found an apple, built a bridge<br>and planted a flower. Thank you, explorer!':'Stretch your arms. Have a sip of water.<br>Your adventure will be here.';
  $('#rest-zh').textContent=complete?'这一轮完成啦。看看远处，伸伸懒腰，喝口水。下次再来。':'已暂停并保存。可以关闭页面，或点击下方按钮继续。';
  $('#word-recap').hidden=!complete;$('#rest-close').textContent=complete?'Rest here / 在这里休息 ☀':'Back to the island / 继续';
  showDialog('#rest-dialog');
}

// Speech uses only a voice the browser identifies as local, English and available.
let voice=null, speechTimer=null, speechToken=0;
function discoverVoice(){
  const found=probeEnglishVoice('speechSynthesis' in window?speechSynthesis:null,'SpeechSynthesisUtterance' in window);voice=found.voice;voiceStatus(found.status,found.warning);
}
function voiceStatus(text,warning=false){$('#voice-status').textContent=text;$('#voice-status').classList.toggle('warning',warning);$('#listen').title=text;}
function say(text){
  if(!voice){discoverVoice();if(!voice){notify(`Read together: “${text}” · No local English voice available.`);return;}}
  const token=++speechToken;clearTimeout(speechTimer);
  try{
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.voice=voice;u.lang=voice.lang;u.rate=.82;u.pitch=1.04;
    u.onstart=()=>{if(token===speechToken){clearTimeout(speechTimer);voiceStatus('Playing English · '+text);}};
    u.onend=()=>{if(token===speechToken){clearTimeout(speechTimer);voiceStatus('Local English voice ready · tap Listen.');}};
    u.onerror=()=>{if(token===speechToken){clearTimeout(speechTimer);voiceStatus('Voice could not play. Read the words together.',true);notify('Voice could not play. You can still read and play.');}};
    speechSynthesis.speak(u);speechTimer=setTimeout(()=>{if(token===speechToken){speechToken++;speechSynthesis.cancel();voiceStatus('Voice did not start. Read the words together.',true);notify('Voice did not start. You can still read and play.');}},4500);
  }catch{voiceStatus('Voice could not play. Read the words together.',true);notify('Voice unavailable. You can still read and play.');}
}
discoverVoice();if('speechSynthesis' in window)speechSynthesis.addEventListener('voiceschanged',discoverVoice);

$('#start').addEventListener('click',begin);
$('#welcome-zh').addEventListener('click',()=>{state.zh=true;$('#welcome-zh').textContent='点击 Let’s explore 开始。点击苹果，小伙伴会走过去。';save();update();});
$('#zh').addEventListener('click',()=>{state.zh=!state.zh;save();update();});
$('#listen').addEventListener('click',()=>say($('#instruction').textContent));
$$('[data-say]').forEach(b=>b.addEventListener('click',()=>say(b.dataset.say)));
$('#parents').addEventListener('click',()=>showDialog('#parents-dialog'));
$('#help').addEventListener('click',()=>showDialog('#help-dialog'));
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).close()));
$('#reset').addEventListener('click',()=>{$('#parents-dialog').close();showDialog('#reset-dialog');});
$('#cancel-reset').addEventListener('click',()=>{$('#reset-dialog').close();showDialog('#parents-dialog');});
$('#confirm-reset').addEventListener('click',()=>{halt();state=freshState();visual={...state.player};mode='walk';color='coral';paused=false;loadWarning='';$('#reset-dialog').close();save();update();showDialog('#welcome');});
$('#pause').addEventListener('click',()=>{$('#parents-dialog').close();if(paused){paused=false;update();}else{paused=true;save();update();showRest(state.planted);}});
$('#rest-close').addEventListener('click',()=>{$('#rest-dialog').close();if(!state.planted)paused=false;update();});
$('#welcome').addEventListener('cancel',e=>e.preventDefault());
$('#reset-dialog').addEventListener('cancel',()=>{setTimeout(()=>showDialog('#parents-dialog'),0);});
$('#rest-dialog').addEventListener('cancel',()=>{if(!state.planted)paused=false;update();});
$$('[data-tool]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.tool)));
$$('[data-color]').forEach(b=>b.addEventListener('click',()=>{color=b.dataset.color;update();}));
$('#jump').addEventListener('click',doJump);
$$('[data-dir]').forEach(b=>b.addEventListener('click',()=>direction(b.dataset.dir)));
window.addEventListener('keydown',e=>{
  if(!active()||e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  const dir={ArrowUp:'up',w:'up',W:'up',ArrowRight:'right',d:'right',D:'right',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left'}[e.key];
  if(dir){e.preventDefault();direction(dir);return;}
  if(e.code==='Space'&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();if(!e.repeat)doJump();}
  if(e.key.toLowerCase()==='e'&&!e.repeat)interactNear();
  if(['1','2','3','4'].includes(e.key)&&!e.repeat)setMode(['walk','bridge','build','remove'][Number(e.key)-1]);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){halt();save();if('speechSynthesis' in window)speechSynthesis.cancel();}});
window.addEventListener('pagehide',save);

// Hand-drawn isometric world. No textures, web fonts, libraries or network requests.
const palette={coral:['#f2b097','#cf816d','#dd947b'],gold:['#f2d994','#ccad62','#e0c276'],mint:['#b2d1aa','#7ca58c','#94b798'],blue:['#acd8e5','#6eacc3','#87bfd0']};
function project(x,y,z=0){const m=metrics;return {x:m.ox+(x-y)*m.hw,y:m.oy+(x+y)*m.hh-z*m.unit};}
function poly(points,fill,stroke=null,line=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
function cube(x,y,z,w,d,h,colors){
  const a=project(x,y,z+h),b=project(x+w,y,z+h),c=project(x+w,y+d,z+h),d1=project(x,y+d,z+h),bb=project(x+w,y,z),cc=project(x+w,y+d,z),dd=project(x,y+d,z);
  poly([d1,c,cc,dd],colors[1]);poly([b,c,cc,bb],colors[2]);poly([a,b,c,d1],colors[0]);
}
function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function line(a,b,color,width=1){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function tileDiamond(x,y,fill,stroke){poly([project(x,y),project(x+1,y),project(x+1,y+1),project(x,y+1)],fill,stroke,metrics.s);}
function drawTree(t){const s=metrics.s;const sh=project(t.x+.5,t.y+.5);ellipse(sh.x,sh.y+3*s,30*s,12*s,'#3f66471a');cube(t.x+.37,t.y+.4,0,.26,.24,1.15,['#b99267','#917a56','#a88960']);cube(t.x-.03,t.y-.03,.8,1.06,1.06,.84,['#b7cd86','#789e68','#91b779']);cube(t.x+.12,t.y+.12,1.64,.76,.76,.35,['#cadb9b','#93b379','#a9c583']);const p=project(t.x+.17,t.y+.72,1.48);ellipse(p.x,p.y,3*s,3*s,'#dce6ac');}
function drawApple(r,t){const s=metrics.s,p=project(r.x+.5,r.y+.5,.21+Math.sin(t/600)*.04);ellipse(p.x,p.y+13*s,14*s,5*s,'#46653722');cube(r.x+.25,r.y+.25,.12,.5,.5,.42,['#edaf80','#cf785e','#e1926c']);ellipse(p.x+4*s,p.y-7*s,7*s,4*s,'#93b675');line({x:p.x,y:p.y-6*s},{x:p.x+1*s,y:p.y-15*s},'#827b4b',2*s);ellipse(p.x-7*s,p.y-1*s,2*s,4*s,'#fbd6a8');}
function drawFlower(x,y,large=false){const s=metrics.s,p=project(x+.5,y+.5);line(p,{x:p.x,y:p.y-(large?40:24)*s},'#7e9c65',3*s);ellipse(p.x-5*s,p.y-10*s,7*s,3*s,'#a8be7d');ellipse(p.x+6*s,p.y-18*s,7*s,3*s,'#9db876');const cy=p.y-(large?40:25)*s,rad=(large?8:4)*s;for(let i=0;i<6;i++){const a=i*Math.PI/3;ellipse(p.x+Math.cos(a)*rad,cy+Math.sin(a)*rad,rad*.8,rad*.8,large?'#efd395':'#f7e6b9');}ellipse(p.x,cy,rad*.65,rad*.65,'#d4a45e');}
function drawStar(x,y){const p=project(x+.5,y+.5,.04),s=metrics.s;const points=[];for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=(i%2?7:16)*s;points.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.7});}poly(points,'#f1d28b','#dfbd71',s);}
function drawPlayer(t){
  const s=metrics.s;let z=0;if(jumpTime){const elapsed=(t-jumpTime)/600;if(elapsed<1)z=Math.sin(elapsed*Math.PI)*.85;else jumpTime=0;}
  const x=visual.x+.23,y=visual.y+.23;const p=project(x+.27,y+.27);ellipse(p.x,p.y+4*s,19*s,8*s,'#354e382b');
  cube(x+.03,y+.03,.03+z,.19,.25,.15,['#5e8470','#406451','#537963']);cube(x+.31,y+.31,.03+z,.19,.25,.15,['#5e8470','#406451','#537963']);
  cube(x,y,.15+z,.55,.55,.65,['#d2e3b1','#88af83','#a9c99a']);cube(x-.015,y-.015,.25+z,.58,.58,.12,['#e9ab85','#ca8a73','#e1a081']);
  const a=project(x+.55,y+.12,.56+z),b=project(x+.55,y+.40,.56+z);ellipse(a.x,a.y,2.4*s,3*s,'#3e6150');ellipse(b.x,b.y,2.4*s,3*s,'#3e6150');const mouth=project(x+.556,y+.29,.41+z);ctx.beginPath();ctx.arc(mouth.x,mouth.y,3*s,0,Math.PI);ctx.lineWidth=1.2*s;ctx.strokeStyle='#3e6150';ctx.stroke();
  const sprout=project(x+.22,y+.25,.81+z);line(sprout,{x:sprout.x,y:sprout.y-11*s},'#7c9d63',2*s);ellipse(sprout.x-4*s,sprout.y-10*s,6*s,3*s,'#93b776');ellipse(sprout.x+5*s,sprout.y-15*s,6*s,3*s,'#a8c484');
  if(!state.started){const pp=project(x+.3,y+.3,1.7);ctx.fillStyle='#58775c';ctx.font=`600 ${11*s}px Avenir, sans-serif`;ctx.textAlign='center';ctx.fillText('hello!',pp.x,pp.y);}
}
function drawCloud(x,y,k){ctx.save();ctx.globalAlpha=.55;ellipse(x,y,36*k,11*k,'#fffdf4');ellipse(x-20*k,y-7*k,17*k,12*k,'#fffdf4');ellipse(x+7*k,y-10*k,25*k,15*k,'#fffdf4');ctx.restore();}
function draw(t){
  if(!metrics||!ctx)return;const {w,h,s}=metrics;ctx.clearRect(0,0,w,h);
  const motion=reduceMotion?0:t/2000;drawCloud(w*.14+Math.sin(motion*.2)*8,h*.13,.8*s);drawCloud(w*.84+Math.sin(motion*.17)*9,h*.2,.85*s);drawCloud(w*.76,h*.82,.65*s);
  const water=[project(-1,.3,-1.55),project(13.8,.3,-1.55),project(13.8,8.7,-1.55),project(-1,8.7,-1.55)];
  ctx.save();ctx.lineJoin='round';ctx.strokeStyle='#dbe8da';ctx.lineWidth=25*s;poly(water,'#d3e3d9','#dbe8da',20*s);ctx.restore();
  for(let i=0;i<20;i++){const x=(i*2.17)%14-.4,y=(i*1.73)%8+.4;const p=project(x,y,-1.48);line({x:p.x-8*s,y:p.y},{x:p.x+8*s,y:p.y},'#eef3e7',s);}
  const tiles=[];for(let x=0;x<=12;x++)for(let y=1;y<=7;y++)if(isLand(x,y))tiles.push({x,y});
  state.bridge.forEach(i=>tiles.push({...bridgeCells[i],bridge:true}));tiles.sort((a,b)=>a.x+a.y-b.x-b.y||a.x-b.x);
  for(const p of tiles){
    if(p.bridge){cube(p.x,p.y,-.42,1,1,.42,palette.blue);const c=project(p.x+.5,p.y+.5,.015);ctx.fillStyle='#568c9c';ctx.font=`700 ${11*s}px Avenir, sans-serif`;ctx.textAlign='center';ctx.fillText(String(bridgeCells.findIndex(b=>same(b,p))+1),c.x,c.y+3*s);continue;}
    const sand=buildCells.some(b=>same(b,p));const soil=['#b7b991','#a6aa86','#b9b691'];const grass=['#c0d290','#bfd08e','#b6cb85','#c5d698'][(p.x*3+p.y)%4];
    const depth=1.25+((p.x*7+p.y*3)%4)*.13;cube(p.x,p.y,-depth,1,1,depth,soil);cube(p.x,p.y,-.14,1,1,.14,[sand?'#e4d9b3':grass,sand?'#cec69d':'#9fb67d',sand?'#d8cda6':'#b0c48b']);
    if(sand){const c=project(p.x+.5,p.y+.5,.01);ellipse(c.x,c.y,2*s,1*s,'#c9b98e');}
    else if((p.x*3+p.y)%5===0&&!trees.some(b=>same(b,p))){const c=project(p.x+.3,p.y+.4,.01);line(c,{x:c.x-2*s,y:c.y-4*s},'#8ba66c',s);line(c,{x:c.x+3*s,y:c.y-5*s},'#95ac72',s);}
  }
  bridgeCells.forEach((p,i)=>{if(!state.bridge.includes(i)){ctx.save();ctx.setLineDash([4*s,4*s]);tileDiamond(p.x,p.y,'#d4e4dc77','#91b7b3');ctx.restore();}});
  // Curved stone route, garden, and little shore details.
  for(const p of [{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:6,y:4},{x:10,y:4}]){const c=project(p.x+.5,p.y+.5,.01);ellipse(c.x,c.y,10*s,5*s,'#d3d9b0');ellipse(c.x+2*s,c.y-1*s,7*s,3*s,'#dde1bd');}
  drawStar(star.x,star.y);cube(garden.x+.16,garden.y+.16,.015,.68,.68,.12,['#9c9670','#8c8b68','#a19b74']);
  const objects=[...trees.map(p=>({...p,kind:'tree'})),...resources.filter(r=>!state.picked.includes(r.id)).map(p=>({...p,kind:p.type})),...state.built.map(p=>({...p,kind:'built'})),{...visual,kind:'player'}];
  if(state.planted)objects.push({...garden,kind:'grown'});
  objects.sort((a,b)=>(a.x+a.y)-(b.x+b.y)||a.x-b.x);
  for(const o of objects){if(o.kind==='tree')drawTree(o);if(o.kind==='player')drawPlayer(t);if(o.kind==='apple')drawApple(o,reduceMotion?0:t);if(o.kind==='flower')drawFlower(o.x,o.y);if(o.kind==='grown')drawFlower(o.x,o.y,true);
    if(o.kind==='blue'){const c=project(o.x+.5,o.y+.5);ellipse(c.x,c.y+2*s,19*s,7*s,'#536d5520');cube(o.x+.19,o.y+.19,.08,.62,.62,.6,palette.blue);const p=project(o.x+.49,o.y+.49,.75);ctx.fillStyle='#effafd';ctx.font=`800 ${12*s}px Avenir, sans-serif`;ctx.textAlign='center';ctx.fillText('✦',p.x,p.y+3*s);}
    if(o.kind==='built')cube(o.x+.07,o.y+.07,0,.86,.86,.64,palette[o.color]);
  }
  // Tiny handmade signs.
  const sign=project(.7,6.8,.12);line(sign,{x:sign.x,y:sign.y-22*s},'#ad9a71',3*s);ctx.fillStyle='#f3e8c7';ctx.fillRect(sign.x-22*s,sign.y-35*s,44*s,15*s);ctx.fillStyle='#9c8d65';ctx.font=`700 ${7*s}px Avenir, sans-serif`;ctx.textAlign='center';ctx.fillText('MAKE',sign.x,sign.y-25*s);
  if(paused){ctx.fillStyle='#eff2e57a';ctx.fillRect(0,0,w,h);ctx.fillStyle='#426e57';ctx.font=`700 ${24*s}px Avenir, sans-serif`;ctx.textAlign='center';ctx.fillText('A little break ☀',w/2,h/2);}
}
function targetButton(id,label,p,handler,plus=false,z=.3){
  const b=document.createElement('button');b.className='world-target'+(plus?' plus':'');b.id='target-'+id;b.setAttribute('aria-label',label);b.title=label;
  if(plus)b.textContent='+';const pos=project(p.x+.5,p.y+.5,z);b.style.left=pos.x+'px';b.style.top=pos.y+'px';b.addEventListener('click',handler);$('#targets').append(b);
}
function updateTargets(){
  if(!metrics)return;$('#targets').replaceChildren();if(!state.started||state.planted||paused)return;
  resources.filter(r=>!state.picked.includes(r.id)).forEach(r=>targetButton(r.id,r.type==='blue'?`Collect blue block ${r.id.slice(-1)}`:r.word==='apple'?'Find the apple':'Explore the flower',r,()=>interactResource(r.id),false,r.type==='flower'?.3:.45));
  bridgeCells.forEach((p,i)=>{if(i===state.bridge.length)targetButton('bridge'+i,`Place bridge block ${i+1}`,p,()=>bridgeAction(i),true,0);});
  if(quest(state)===2){if(!state.jumped)targetButton('star','Walk to the star',star,()=>performTile(star),false,0);else targetButton('garden','Plant a seed',garden,gardenAction,false,0);}
  if(mode==='build'||mode==='remove')buildCells.forEach((p,i)=>targetButton('sand'+i,`${mode==='build'?'Build on sandy tile':'Pick up from sandy tile'} ${i+1}`,p,()=>performTile(p),false,0));
}
function resize(){
  const rect=$('#world').getBoundingClientRect(),w=rect.width,h=rect.height,s=Math.min(w/800,h/520),ratio=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);
  metrics={w,h,s,hw:38*s,hh:19*s,unit:36*s,ox:w/2-22*s,oy:(h-19*18*s-65*s)/2+3*s};updateTargets();draw(performance.now());
}
canvas.addEventListener('pointerdown',e=>{
  if(!active())return;canvas.focus({preventScroll:true});const r=canvas.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;
  const u=(px-metrics.ox)/metrics.hw,v=(py-metrics.oy)/metrics.hh,p={x:Math.floor((u+v)/2),y:Math.floor((v-u)/2)};performTile(p);
});
new ResizeObserver(resize).observe($('#world'));
function tick(t){
  const dt=Math.min(t-lastTime,50);lastTime=t;
  if(active()){
    if(!stepAnimation&&path.length){stepAnimation={from:{...state.player},to:path.shift(),elapsed:0};}
    if(stepAnimation){stepAnimation.elapsed+=dt;const f=Math.min(stepAnimation.elapsed/(reduceMotion?75:160),1);visual={x:stepAnimation.from.x+(stepAnimation.to.x-stepAnimation.from.x)*f,y:stepAnimation.from.y+(stepAnimation.to.y-stepAnimation.from.y)*f};
      if(f===1){move(state,stepAnimation.to);stepAnimation=null;visual={...state.player};save();update();if(!path.length&&arrival){const action=arrival;arrival=null;action();}}}
  }
  if(toastUntil&&t>toastUntil){$('#toast').classList.remove('show');toastUntil=0;}
  if(!document.hidden&&(frame++%2===0||stepAnimation||jumpTime))draw(t);requestAnimationFrame(tick);
}
save();update();resize();requestAnimationFrame(tick);
if(!state.started)showDialog('#welcome');else if(state.planted)showRest(true);else if(loadWarning)notify(loadWarning);
