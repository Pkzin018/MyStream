const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const ts=require('typescript');
const source=fs.readFileSync('artifacts/mystream/src/context/PlayerContext.tsx','utf8');
const start=source.indexOf('  // Persistent native handlers');
const fragment=source.slice(source.indexOf('  useEffect(',start),source.indexOf('  useEffect(()=>{',start));
function setup(){
 const listeners=new Map(),handlers=new Map(); let cleanup,resolve;
 const audio={currentTime:42,duration:100,error:null,src:'old',addEventListener:(e,f)=>{if(!listeners.has(e))listeners.set(e,new Set());listeners.get(e).add(f);},removeEventListener:(e,f)=>listeners.get(e)?.delete(f),load(){this.loads=(this.loads||0)+1;}};
 const ref=current=>({current});const errors=[];
 const ctx={accountReady:true,audioRef:ref(audio),playbackRef:ref({item:{tipo:'audio',storagePath:'user/song'},next(){ctx.nexts++;},previous(){}}),nexts:0,playbackGeneration:ref(0),recoveryAttempted:ref(false),desiredPlayback:ref(true),lastAudioTime:ref(42),resumePosition:ref(null),mountedRef:ref(true),debug(){},playAudio(){ctx.plays++;},plays:0,setTocando(){},toast:{error:m=>errors.push(m)},document:{addEventListener(){},removeEventListener(){}},navigator:{mediaSession:{setActionHandler:(a,h)=>handlers.set(a,h)}},supabase:{storage:{from:()=>({createSignedUrl:()=>new Promise(r=>{resolve=r;})})}},useEffect:f=>{cleanup=f();}};
 vm.runInNewContext(ts.transpile(fragment),ctx);
 return {ctx,audio,errors,handlers,cleanup:()=>cleanup(),emit:async(e)=>{for(const f of listeners.get(e)||[])await f({type:e});},resolve:()=>resolve({data:{signedUrl:'new'},error:null})};
}
(async()=>{
 const a=setup();await a.emit('ended');assert.equal(a.ctx.nexts,1);
 a.ctx.playbackRef.current.next=()=>{a.ctx.nexts+=10;};await a.emit('ended');assert.equal(a.ctx.nexts,11);
 a.audio.error={code:2};const pending=a.emit('error');a.resolve();await pending;assert.equal(a.audio.src,'new');assert.equal(a.audio.loads,1);
 a.audio.error=null;await a.emit('loadedmetadata');assert.equal(a.audio.currentTime,42);assert.equal(a.ctx.plays,1);
 await a.emit('error');assert.equal(a.errors.length,1);assert.equal(a.audio.loads,1,'retry must be bounded');
 const b=setup();b.audio.error={code:2};const stale=b.emit('error');b.ctx.playbackGeneration.current++;b.resolve();await stale;assert.equal(b.audio.src,'old','stale renewal must not replace next track');
 b.ctx.playbackRef.current.item={tipo:'yt'};b.handlers.get('play')();assert.equal(b.ctx.plays,0,'native audio handlers must not control YouTube');
 a.cleanup();await a.emit('ended');assert.equal(a.ctx.nexts,11);assert.equal(a.handlers.get('play'),null);
 console.log('PASS: latest queue callback, URL recovery/resume, bounded retry, stale renewal, YouTube guard, cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
