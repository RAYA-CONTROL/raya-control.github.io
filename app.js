// Each hardware condition has an independent transport. Clips begin at visually selected takeoff.
const trialGroups=[];
const recoveryVideo=document.querySelector('#hardware-recovery');
recoveryVideo.addEventListener('play',()=>{trialGroups.forEach(g=>g.pause());window.pauseSimulation?.();});
document.querySelectorAll('[data-trials]').forEach(element=>{
  const videos=[...element.querySelectorAll('video')],button=element.querySelector('[data-play]'),speed=element.querySelector('[data-speed]'),error=element.querySelector('.trial-error');
  const group={videos,playing:false,time:0,speed:1,generation:0};trialGroups.push(group);
  const length=()=>Math.max(0,...videos.map(v=>Number.isFinite(v.duration)?v.duration:0));
  const master=()=>videos.reduce((a,b)=>(b.duration||0)>(a.duration||0)?b:a);
  const update=()=>{button.textContent=group.playing?'Pause all':'Play all four';button.disabled=videos.some(v=>v.readyState<1);};
  group.pause=()=>{group.generation++;group.playing=false;videos.forEach(v=>v.pause());update();};
  const seek=time=>{group.time=Math.max(0,Math.min(length(),time));videos.forEach(v=>{if(v.readyState>=1)v.currentTime=Math.min(group.time,Math.max(0,v.duration-.04));});update();};
  const play=async()=>{
    trialGroups.forEach(g=>g.pause());recoveryVideo.pause();window.pauseSimulation?.();
    if(group.time>=length()-.1)seek(0);
    group.playing=true;error.hidden=true;const generation=++group.generation;update();
    try{await Promise.all(videos.map(v=>{v.playbackRate=group.speed;if(group.time>=v.duration-.05)return;return v.play();}));if(generation!==group.generation&&!group.playing)videos.forEach(v=>v.pause());}
    catch{group.pause();error.hidden=false;error.textContent='Playback could not start. Try again, or use each video’s controls.';}
  };
  button.addEventListener('click',()=>group.playing?group.pause():play());
  speed.addEventListener('change',()=>{group.speed=Number(speed.value);videos.forEach(v=>v.playbackRate=group.speed);});
  videos.forEach(v=>{v.addEventListener('loadedmetadata',update);v.addEventListener('loadeddata',update);v.addEventListener('error',()=>{group.pause();error.hidden=false;error.textContent='A recording could not load. Reload the page to retry.';});});
  group.tick=()=>{
    if(!group.playing)return;
    const leader=master();group.time=leader.currentTime;
    videos.forEach(v=>{if(v===leader)return;if(group.time>=v.duration-.05){if(!v.paused)v.pause();if(Math.abs(v.currentTime-(v.duration-.04))>.1)v.currentTime=Math.max(0,v.duration-.04);}else if(Math.abs(v.currentTime-group.time)>.2)v.currentTime=group.time;});
    if(leader.ended){group.time=length();group.pause();}update();
  };
  update();
});
window.pauseHardware = () => {trialGroups.forEach(g => g.pause());recoveryVideo.pause();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){window.pauseHardware();window.pauseSimulation?.();document.querySelectorAll('video').forEach(v=>v.pause());}});
let lastPaint=0;
function frame(now){
 if(now-lastPaint>40){trialGroups.forEach(g=>g.tick());lastPaint=now;}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.querySelectorAll('[data-placeholder-link]').forEach(link=>link.addEventListener('click',event=>event.preventDefault()));
