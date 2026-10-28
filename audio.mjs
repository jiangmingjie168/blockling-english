// Original pentatonic lullaby. No audio files, requests, microphones or third-party samples.
export class IslandMusic {
 constructor({Context=globalThis.AudioContext||globalThis.webkitAudioContext,setTimer=globalThis.setInterval,clearTimer=globalThis.clearInterval,onStatus=()=>{}}={}) {
  Object.assign(this,{Context,setTimer,clearTimer,onStatus});
  this.context=null;this.gain=null;this.timer=null;this.notes=new Set();
  this.enabled=true;this.running=false;this.unlocked=false;this.ducked=false;
  this.step=0;this.pending=null;this.error='';this.disposed=false;
 }
 audible(){return !this.disposed&&!this.error&&this.enabled&&this.running&&this.unlocked&&this.context?.state==='running';}
 async gesture(){
  if(this.disposed||!this.enabled)return;
  if(this.pending)return this.pending;
  if(this.unlocked&&!this.error&&this.context?.state==='running'){this.sync();return;}
  if(!this.Context){this.fail();return;}
  const attempt=(async()=>{
   try{
    this.error='';
    if(!this.context){
     this.context=new this.Context();
    }
    if(!this.gain){this.gain=this.context.createGain();
     this.gain.gain.value=0;this.gain.connect(this.context.destination);
     this.context.onstatechange=()=>this.sync();
    }
    await this.context.resume();
    if(this.disposed)return;
    if(this.context.state!=='running'){this.fail('Tap music to try again');return;}
    this.unlocked=true;this.sync();
   }catch{this.fail();}
  })();
  this.pending=attempt;
  try{await attempt;}finally{if(this.pending===attempt)this.pending=null;}
 }
 setEnabled(on){this.enabled=!!on;this.sync();}
 setRunning(on){this.running=!!on;this.sync();}
 duck(on){this.ducked=!!on;this.sync();}
 volume(){if(!this.gain)return;const at=this.context.currentTime;this.gain.gain.cancelScheduledValues(at);this.gain.gain.setTargetAtTime(this.audible()?(this.ducked?.009:.045):0,at,.12);}
 silence(){
  if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;
  for(const note of this.notes){try{note.stop();}catch{}try{note.onended?.();}catch{}}
  this.notes.clear();
 }
 fail(message='Music unavailable · play quietly'){
  this.error=message;this.unlocked=false;this.silence();
  try{this.volume();}catch{try{this.gain.disconnect();}catch{}this.gain=null;}
  this.onStatus(this.enabled?message:'Music off');
 }
 sync(){
  if(this.disposed)return;
  try{
   this.volume();
   if(this.audible()){
    if(this.timer===null){this.playStep();this.timer=this.setTimer(()=>{if(!this.audible()){this.sync();return;}try{this.playStep();}catch{this.fail();}},700);}
    this.onStatus(this.ducked?'Music soft · listening':'Music on · gentle melody');
   }else{
    this.silence();
    this.onStatus(!this.enabled?'Music off':this.error||(this.running?'Tap to start music':'Music paused'));
   }
  }catch{this.fail();}
 }
 note(freq,duration,level=1,type='sine'){
  if(!this.audible())return;
  const c=this.context,at=c.currentTime;let o,g;
  try{
   o=c.createOscillator();g=c.createGain();o.type=type;o.frequency.value=freq;
   g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(level*.23,at+.045);g.gain.exponentialRampToValueAtTime(.0001,at+duration);
   o.connect(g);g.connect(this.gain);this.notes.add(o);
   o.onended=()=>{this.notes.delete(o);o.disconnect();g.disconnect();};o.start(at);o.stop(at+duration+.04);
  }catch{if(o){this.notes.delete(o);try{o.stop();}catch{}try{o.disconnect();}catch{}}try{g?.disconnect();}catch{}throw Error('Audio unavailable');}
 }
 playStep(){const melody=[0,4,7,9,7,4,2,-1,0,2,4,7,4,2,0,-1,9,7,4,2,4,7,12,-1,9,7,4,2,0,-1,-1,-1],n=melody[this.step%32];if(n>=0)this.note(261.63*2**(n/12),1.5,.7);if(this.step%8===0){const root=[130.81,146.83,164.81,130.81][Math.floor(this.step/8)%4];this.note(root,4,.28,'triangle');this.note(root*1.5,3.6,.16);}this.step++;}
 feedback(){try{this.note(523.25,.25,.15);}catch{this.fail();}}
 dispose(){this.running=false;this.sync();this.disposed=true;this.unlocked=false;if(this.context)this.context.onstatechange=null;try{Promise.resolve(this.context?.close?.()).catch(()=>{});}catch{}}
}
