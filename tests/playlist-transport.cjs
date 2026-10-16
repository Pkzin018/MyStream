const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const source=fs.readFileSync('artifacts/mystream/src/context/PlayerContext.tsx','utf8');
const fragment=source.slice(source.indexOf('  const proximaMidia = useCallback'),source.indexOf('  const tocarItemInterno = useCallback'));
const tracks=['A','B','C'].map(nome=>({nome,tipo:'audio',url:nome,storagePath:nome}));
const ctx={stateRef:{current:{fila:tracks.slice(1),historico:[tracks[0]],configuracoes:{repeat:'none',shuffle:false}}},playbackRef:{current:{item:tracks[0]}},listaAtualRef:{current:tracks},sameTrack:(a,b)=>a.storagePath===b.storagePath,playItemRef:{current:item=>{ctx.playbackRef.current.item=item;}},replaceQueue:fila=>{ctx.stateRef.current.fila=fila;},audioRef:{current:{currentTime:50}},desiredPlayback:{current:false},playAudio(){ctx.played=true;},useCallback:f=>f};
vm.createContext(ctx);vm.runInContext(ts.transpile(fragment+'\nglobalThis.next=proximaMidia;globalThis.previous=anteriorMidia;'),ctx);
ctx.next();assert.equal(ctx.playbackRef.current.item.nome,'B');
ctx.next();assert.equal(ctx.playbackRef.current.item.nome,'C');
ctx.previous();assert.equal(ctx.playbackRef.current.item.nome,'B');
ctx.previous();assert.equal(ctx.playbackRef.current.item.nome,'A');
ctx.next();assert.equal(ctx.playbackRef.current.item.nome,'B','forward after back must not skip B');
ctx.next();ctx.next();assert.equal(ctx.playbackRef.current.item.nome,'C','end must not wrap without repeat');
ctx.stateRef.current.configuracoes.repeat='all';ctx.next();assert.equal(ctx.playbackRef.current.item.nome,'A');
ctx.previous();assert.equal(ctx.audioRef.current.currentTime,0);assert.equal(ctx.played,true);
// Test native source replacement ordering through the actual playback callback.
const playFragment=source.slice(source.indexOf('  const tocarItemInterno = useCallback'),source.indexOf('  playItemRef.current = tocarItemInterno;'));
const calls=[];Object.assign(ctx,{window:{dispatchEvent(){}},CustomEvent:class {},setItemAtual(){},setModoAudio(){},setTocando(){},setProgresso(){},setCurrentTime(){},setDuracao(){},dispatch(){},mudarCorDinamica(){},navigator:{},audioRef:{current:{set src(v){calls.push('src:'+v);},load(){calls.push('load');}}},playbackGeneration:{current:0},recoveryAttempted:{current:false},resumePosition:{current:null},lastAudioTime:{current:0},ytPlayerRef:{current:null},iniciarProgresso(){},playAudio(){calls.push('play');}});
ctx.stateRef.current.configuracoes.volume=1;vm.runInContext(ts.transpile(playFragment+'\nglobalThis.start=tocarItemInterno;'),ctx);ctx.start(tracks[0]);ctx.start(tracks[1]);ctx.start(tracks[0]);assert.deepEqual(calls,['src:A','load','play','src:B','load','play','src:A','load','play']);
console.log('PASS: A→B→C→B→A→B, queue restoration, repeat, native load/play order');
