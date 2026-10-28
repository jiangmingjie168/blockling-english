// Browser speech lifecycle is separate from game progress; failure always releases ducking.
export class SpeechGuide {
 constructor({synth,Utterance,music,onStatus=()=>{},setTimer=globalThis.setTimeout,clearTimer=globalThis.clearTimeout}) {
  Object.assign(this,{synth,Utterance,music,onStatus,setTimer,clearTimer});
  this.current=null;this.timer=null;
 }
 cancel(){
  this.current=null;
  if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;
  try{this.synth?.cancel();}catch{}
  this.music.duck(false);
 }
 say(text,voice){
  this.cancel();
  if(!voice||!this.synth||!this.Utterance){this.onStatus('Text mode · no local English voice available.');return false;}
  const session={};this.current=session;
  const done=message=>{
   if(this.current!==session)return;
   this.current=null;
   if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;
   this.music.duck(false);this.onStatus(message);
  };
  try{
   const u=new this.Utterance(text);u.voice=voice;u.lang=voice.lang;u.rate=.82;u.pitch=1.04;
   this.music.duck(true);
   u.onstart=()=>{if(this.current===session)this.onStatus('Playing English · '+text);};
   u.onend=()=>done('Local English voice ready · tap Listen.');
   u.onerror=()=>done('Voice could not play. Read together.');
   // Install the watchdog first, including for implementations that finish synchronously.
   this.timer=this.setTimer(()=>{if(this.current!==session)return;this.cancel();this.onStatus('Voice timed out. Read together.');},12000);
   this.synth.speak(u);return true;
  }catch{
   if(this.current===session){this.cancel();this.onStatus('Voice unavailable. Read together.');}
   return false;
  }
 }
}
