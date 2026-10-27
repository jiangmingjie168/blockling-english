export const SAVE_KEY = 'blockling-english-v1';
export const resources = [
  {id:'apple', x:2,y:3,type:'apple',word:'apple'},
  {id:'flower', x:1,y:5,type:'flower',word:'flower'},
  {id:'blue1', x:4,y:2,type:'blue',word:'blue block'},
  {id:'blue2', x:2,y:6,type:'blue',word:'blue block'},
  {id:'blue3', x:5,y:6,type:'blue',word:'blue block'}
];
export const bridgeCells = [{x:7,y:4},{x:8,y:4},{x:9,y:4}];
export const star = {x:11,y:4};
export const garden = {x:11,y:5};
export const buildCells = [{x:0,y:3},{x:0,y:4},{x:0,y:5},{x:1,y:6},{x:1,y:7},{x:2,y:7}];
export const trees = [{x:1,y:1},{x:4,y:1},{x:6,y:2},{x:0,y:2},{x:12,y:3}];
export const same = (a,b) => a.x===b.x && a.y===b.y;
export const distance = (a,b) => Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export function isLand(x,y) {
  return (x>=0&&x<=6&&y>=1&&y<=7 && !(x===0&&(y===1||y===7)) && !(x===6&&(y===1||y===7))) || (x>=10&&x<=12&&y>=3&&y<=6 && !(x===12&&y===6));
}
export function freshState() { return {version:1,started:false,player:{x:3,y:4},picked:[],bridge:[],built:[],arrived:false,jumped:false,planted:false,zh:false}; }
export function quest(s) { return !s.picked.includes('apple') ? 0 : s.bridge.length<3 ? 1 : !s.planted ? 2 : 3; }
export function blueCount(s) { return s.picked.filter(id=>id.startsWith('blue')).length-s.bridge.length; }
export function walkable(s,p) {
  return (isLand(p.x,p.y)||bridgeCells.some((c,i)=>same(c,p)&&s.bridge.includes(i))) && !trees.some(t=>same(t,p)) && !s.built.some(b=>same(b,p));
}
export function pathTo(s,target) {
  if (!walkable(s,target)) return null;
  const queue=[[s.player,[]]], seen=new Set([`${s.player.x},${s.player.y}`]);
  for(let i=0;i<queue.length;i++) {
    const [p,path]=queue[i];
    if(same(p,target)) return path;
    for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]) {
      const n={x:p.x+dx,y:p.y+dy}, key=`${n.x},${n.y}`;
      if(!seen.has(key)&&walkable(s,n)) {seen.add(key);queue.push([n,[...path,n]]);}
    }
  }
  return null;
}
function ok(message) {return {ok:true,message};}
function no(message) {return {ok:false,message};}
export function move(s,p) {
  if(!s.started||s.planted) return no('Our adventure is resting.');
  if(distance(s.player,p)!==1||!walkable(s,p)) return no('Stay on the grass. Tap a clear tile.');
  s.player={...p};
  if(quest(s)===2&&same(p,star)) s.arrived=true;
  return ok('');
}
export function collect(s,id) {
  const item=resources.find(r=>r.id===id);
  if(!s.started||s.planted) return no('Start your adventure first.');
  if(!item||distance(s.player,item)>0) return no('Walk closer.');
  if(item.type==='flower') return no('This is a flower. Find the apple!');
  if(s.picked.includes(id)) return no('Already in your bag.');
  if(item.type==='blue'&&quest(s)===0) return no('A blue block! First, find the apple.');
  s.picked.push(id);
  return ok(item.type==='apple' ? 'Apple! A little snack for our adventure.' : `${['','One','Two','Three'][s.picked.filter(i=>i.startsWith('blue')).length]} blue block${s.picked.filter(i=>i.startsWith('blue')).length>1?'s':''}!`);
}
export function placeBridge(s,index) {
  if(!s.started||quest(s)!==1) return no('First, find the apple.');
  if(s.bridge.includes(index)) return no('This part of the bridge is ready.');
  if(index!==s.bridge.length) return no('Build from the grass, one block at a time.');
  if(blueCount(s)<1) return no('Find a blue block first.');
  if(distance(s.player,bridgeCells[index])!==1) return no('Walk to the edge of the bridge.');
  s.bridge.push(index);
  return ok(s.bridge.length===3?'Three blue blocks. A bridge!':'Blue block placed!');
}
export function jump(s) {
  if(!s.started||s.planted) return no('Our adventure is resting.');
  if(quest(s)===2 && same(s.player,star)) {s.arrived=true;s.jumped=true;return ok('Jump! Now plant a seed.');}
  return ok('Jump!');
}
export function plant(s) {
  if(s.planted) return no('Your flower is already growing.');
  if(quest(s)!==2||!s.jumped) return no('Walk to the star. Then jump!');
  if(!same(s.player,garden)) return no('Walk to the little garden.');
  s.planted=true;return ok('A flower for the island. Thank you!');
}
export function build(s,p,color) {
  if(!s.started||s.planted) return no('Our adventure is resting.');
  if(!['coral','gold','mint'].includes(color)||!buildCells.some(c=>same(c,p))) return no('Build on the six sandy tiles.');
  if(distance(s.player,p)>1) return no('Walk beside a sandy tile first.');
  if(same(s.player,p)) return no('Step off this tile before building.');
  if(s.built.some(b=>same(b,p))) return no('There is already a block here. Use Pick up.');
  if(s.built.filter(b=>b.color===color).length>=2) return no('Both blocks are placed. Pick one up to move it.');
  s.built.push({...p,color});return ok(`${color==='coral'?'Red':color==='gold'?'Yellow':'Green'} block placed!`);
}
export function remove(s,p) {
  if(!s.started||s.planted) return no('Our adventure is resting.');
  const index=s.built.findIndex(b=>same(b,p));
  if(index<0) return no('Pick up a block from the sandy tiles.');
  if(distance(s.player,p)>1) return no('Walk beside the block first.');
  s.built.splice(index,1);return ok('Block back in your bag.');
}
export function restore(raw) {
  const s=JSON.parse(raw);
  if(!s||s.version!==1||typeof s.started!=='boolean'||!s.player||!Number.isInteger(s.player.x)||!Number.isInteger(s.player.y)||!Array.isArray(s.picked)||!Array.isArray(s.bridge)||!Array.isArray(s.built)) throw Error('Invalid save');
  if(!['arrived','jumped','planted','zh'].every(k=>typeof s[k]==='boolean')) throw Error('Invalid flags');
  if(s.picked.some(i=>!['apple','blue1','blue2','blue3'].includes(i))||new Set(s.picked).size!==s.picked.length) throw Error('Invalid collection');
  if(s.bridge.length>3||s.bridge.some((v,i)=>v!==i)||blueCount(s)<0) throw Error('Invalid bridge');
  if((s.picked.some(i=>i.startsWith('blue'))&&!s.picked.includes('apple')) || (s.arrived&&s.bridge.length!==3) || (s.jumped&&!s.arrived) || (s.planted&&!s.jumped)) throw Error('Invalid progress');
  if(s.built.length>6||s.built.some(b=>!buildCells.some(c=>same(c,b))||!['coral','gold','mint'].includes(b.color)) || new Set(s.built.map(b=>`${b.x},${b.y}`)).size!==s.built.length || ['coral','gold','mint'].some(c=>s.built.filter(b=>b.color===c).length>2)) throw Error('Invalid building');
  if(!walkable(s,s.player)) throw Error('Invalid position');
  if(!s.started&&(s.picked.length||s.bridge.length||s.built.length||s.arrived||s.jumped||s.planted)) throw Error('Invalid start');
  return {version:1,started:s.started,player:{x:s.player.x,y:s.player.y},picked:[...s.picked],bridge:[...s.bridge],built:s.built.map(b=>({x:b.x,y:b.y,color:b.color})),arrived:s.arrived,jumped:s.jumped,planted:s.planted,zh:s.zh};
}
