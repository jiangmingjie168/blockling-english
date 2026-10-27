import {SAVE_KEY,restore,freshState} from './core.mjs';
export function readProgress(getStorage){
  try{const raw=getStorage().getItem(SAVE_KEY);return {state:raw?restore(raw):freshState(),warning:''};}
  catch{return {state:freshState(),warning:'Saved progress could not be read. A fresh island is ready.'};}
}
export function writeProgress(getStorage,state){
  try{getStorage().setItem(SAVE_KEY,JSON.stringify(state));return true;}catch{return false;}
}
export function probeEnglishVoice(synth,utteranceAvailable){
  if(!synth||!utteranceAvailable)return {voice:null,status:'Text mode · English voice is unavailable.',warning:true};
  try{
    const voices=synth.getVoices().filter(v=>/^en(?:[-_]|$)/i.test(v.lang)&&v.localService);
    const voice=voices.find(v=>v.lang==='en-US')||voices[0]||null;
    return {voice,status:voice?'Local English voice ready · tap Listen.':'Text mode · no local English voice found.',warning:!voice};
  }catch{return {voice:null,status:'Text mode · English voice is unavailable.',warning:true};}
}
