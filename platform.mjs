import {SAVE_KEY,LEGACY_KEY,PREFS_KEY,restore,migrateLegacy,freshState} from './core.mjs';
export function readProgress(getStorage){
 try{const store=getStorage(),raw=store.getItem(SAVE_KEY);if(raw!==null&&raw!==undefined)return {state:restore(raw),warning:'',canSave:true,migrated:false};const old=store.getItem(LEGACY_KEY);if(old!==null&&old!==undefined)return {state:migrateLegacy(old),warning:'Your old island is safe. A new garden is waiting! / 旧存档已保留，新花园已解锁。',canSave:true,migrated:true};return {state:freshState(),warning:'',canSave:true,migrated:false};}
 catch{return {state:freshState(),warning:'Saved progress could not be read. It has not been erased. Parents can choose a reset. / 原存档未覆盖。',canSave:false,migrated:false};}
}
export function writeProgress(getStorage,state){try{getStorage().setItem(SAVE_KEY,JSON.stringify(state));return true;}catch{return false;}}
export function readMusic(getStorage){try{return getStorage().getItem(PREFS_KEY)!=='off';}catch{return true;}}
export function writeMusic(getStorage,on){try{getStorage().setItem(PREFS_KEY,on?'on':'off');return true;}catch{return false;}}
export function probeEnglishVoice(synth,utteranceAvailable){if(!synth||!utteranceAvailable)return {voice:null,status:'Text mode · English voice is unavailable.',warning:true};try{const voices=synth.getVoices().filter(v=>/^en(?:[-_]|$)/i.test(v.lang)&&v.localService);const voice=voices.find(v=>v.lang==='en-US')||voices[0]||null;return {voice,status:voice?'Local English voice ready · tap Listen.':'Text mode · no local English voice found.',warning:!voice};}catch{return {voice:null,status:'Text mode · English voice is unavailable.',warning:true};}}
