const $ = selector => document.querySelector(selector);
const methods = [
  {id:'nominal',name:'Nominal MPC',short:'Nominal',color:'#f5b35b'},
  {id:'cbf',name:'In-solver CBF',short:'In-solver CBF',color:'#68bdf3'},
  {id:'posthoc',name:'Post hoc Learned Margin',short:'Post hoc',color:'#d69cf5'},
  {id:'raya',name:'RAYA',short:'RAYA',color:'#009E73'}
];
const methodHTML = method => method.id==='raya' ? '<span class="raya-name">RAYA</span>' : method.name;
const state = {robot:'quad',scenario:'figure8',level:10,seed:0,time:0,playing:false,speed:1};
const datasets = {};
let runs = [];
let camera = {x:0,y:0,scale:150};
const canvas = $('#recovery-scene'), ctx = canvas.getContext('2d');
const background = new Image(); background.src='assets/videos/quad-scene.jpg';
const clock = time => `${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')}`;
const duration = () => datasets[state.robot]?.duration || (state.robot==='quad'?14.05:40);
const failureTime = run => run.failureIndex===null ? Infinity : run.samples[run.failureIndex][0];
const sampleIndex = run => Math.max(0,Math.min(run.samples.length-1, Math.floor((state.time+0.000001)/(state.robot==='quad'?.05:.1))-1, run.failureIndex??Infinity));

$('#scene-legend').innerHTML=methods.map(m=>`<span><i style="background:${m.color}"></i>${methodHTML(m)}</span>`).join('');
$('#controller-status').innerHTML=methods.map(m=>`<div style="border-color:${m.color}"><span class="status-method">${methodHTML(m)}</span><strong id="status-${m.id}">Loading…</strong></div>`).join('');
function updateReplay(){
  const quad=state.robot==='quad';
  $('#disturbance-value').textContent=quad?`${state.level}×`:`μ = ${state.level.toFixed(2)}`;
  const slider=$('#disturbance');slider.style.setProperty('--amount',`${100*(Number(slider.value)-Number(slider.min))/(Number(slider.max)-Number(slider.min))}%`);
  $('#simulation-time').max=duration();$('#simulation-time').value=state.time;
  $('#simulation-clock').textContent=`${state.time.toFixed(1)} / ${duration().toFixed(1)} s`;
  $('#simulation-play').textContent=state.playing?'Pause replay':state.time>=duration()?'Replay':'Play replay';
  methods.forEach((method,i)=>{
    const run=runs[i],el=$(`#status-${method.id}`);
    if(!run){el.textContent='Loading…';return;}
    const failed=state.time+1e-6>=failureTime(run);
    const text=failed?`× Failed at ${failureTime(run).toFixed(2)} s`:state.time>=duration()?`✓ Completed ${duration().toFixed(1)} s`:'Tracking';
    if(el.textContent!==text)el.textContent=text;
    el.classList.toggle('is-lost',failed);
  });
}
function selectRuns(){
  runs=methods.map(m=>datasets[state.robot]?.runs.find(r=>r.method===m.id&&r.scenario===state.scenario&&r.level===state.level&&r.seed===state.seed));
  const ready=runs.every(Boolean);
  if(ready&&state.robot==='quad'){
    // Fit every wind level with the same map to the unobstructed wooden floor.
    const points=datasets.quad.runs.filter(r=>r.scenario==='figure8'&&r.seed===0).flatMap(r=>r.samples.slice(0,r.failureIndex===null?undefined:r.failureIndex+1));
    const xs=points.map(p=>p[1]),ys=points.map(p=>p[2]);
    const left=Math.min(-1,...xs),right=Math.max(1,...xs),bottom=Math.min(-.6,...ys),top=Math.max(.6,...ys);
    camera={x:(left+right)/2,y:(bottom+top)/2,scaleX:480/(right-left),scaleY:265/(top-bottom)};
  }
  $('#simulation-play').disabled=!ready;
  $('#simulation-error').hidden=ready;
  if(!ready){$('#simulation-error').textContent='These simulation samples could not load. Reload the page to try again.';state.playing=false;}
  if(ready){
    const survived=runs.filter(r=>r.survived).length;
    const rayaSurvives=runs[3].survived;
    const result=survived===4?'All four controllers complete this run.':survived===1&&rayaSurvives?'The three baselines fail; RAYA completes the full run.':survived===0?'All four reach their limits at this disturbance.':`${survived} of four controllers complete this run.`;
    $('#recovery-insight').innerHTML=result.replace(/RAYA/g,'<span class="raya-name">RAYA</span>');
  }
  updateReplay();
}
function setRobot(robot){
  state.robot=robot;state.time=0;state.playing=false;
  const quad=robot==='quad';state.scenario=quad?'figure8':'strips_p4';state.level=quad?10:.3;state.seed=quad?0:50;
  document.querySelectorAll('[data-robot]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.robot===robot));
  $('#disturbance-label').textContent=quad?'Wind strength':'Friction loss';
  const slider=$('#disturbance');slider.min=quad?6:0;slider.max=quad?12:4;slider.value=quad?10:2;
  $('#level-min').textContent=quad?'6× · gentler':'μ = 0.40 · more grip';$('#level-max').textContent=quad?'12× · stronger':'μ = 0.20 · less grip';
  $('#scene-title').textContent=quad?'How much wind can each controller withstand?':'Four controllers. One low-grip track.';
  $('#scene-subtitle').textContent=quad?'Simulation trajectories on the wooden flight area · selected seed 0.':'Logged trajectories in a shared rendered scene · selected placement 50.';
  $('#scene-watermark').textContent=quad?'SIMULATION DATA · HARDWARE BACKGROUND':'SIMULATION DATA · RENDERED TRACK';
  selectRuns();
}
document.querySelectorAll('[data-robot]').forEach(b=>b.addEventListener('click',()=>setRobot(b.dataset.robot)));
$('#disturbance').addEventListener('input',e=>{state.level=state.robot==='quad'?Number(e.target.value):Number((.4-.05*Number(e.target.value)).toFixed(2));selectRuns();});
$('#show-outcome').addEventListener('click',()=>{state.time=duration();state.playing=false;updateReplay();});
$('#simulation-time').addEventListener('input',e=>{state.time=Number(e.target.value);state.playing=false;updateReplay();});
$('#simulation-play').addEventListener('click',()=>{if(state.time>=duration())state.time=0;state.playing=!state.playing;updateReplay();});
$('#simulation-restart').addEventListener('click',()=>{state.time=0;state.playing=false;updateReplay();});
$('#simulation-speed').addEventListener('change',e=>{state.speed=Number(e.target.value);});
Promise.all(['quad','car'].map(async robot=>{
  const response=await fetch(`assets/data/${robot}-replays.json`);
  if(!response.ok)throw new Error('Missing simulation data');
  datasets[robot]=await response.json();
})).then(selectRuns).catch(()=>{$('#simulation-error').hidden=false;$('#simulation-error').textContent='Simulation data could not load. Reload the page to try again.';$('#simulation-play').disabled=true;});

function stroke(points,color,width=1,dashed=false){
  if(!points.length)return;
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashed?[6,7]:[]);ctx.stroke();ctx.setLineDash([]);
}
function drawDrone(x,y,color,angle){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  ctx.shadowColor='#0009';ctx.shadowBlur=5;
  ctx.strokeStyle='#172024';ctx.lineWidth=6;stroke([[-10,-8],[10,8]],'#172024',6);stroke([[-10,8],[10,-8]],'#172024',6);
  stroke([[-10,-8],[10,8]],color,3);stroke([[-10,8],[10,-8]],color,3);
  for(const a of [-1,1])for(const b of [-1,1]){ctx.beginPath();ctx.ellipse(a*11,b*8,8,5,0,0,Math.PI*2);ctx.fillStyle='#d6dfe280';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();}
  ctx.fillStyle=color;ctx.fillRect(-4,-5,8,10);ctx.restore();
}
function drawCar(x,y,color,angle){
  ctx.save();ctx.translate(x,y);ctx.rotate(-angle);
  ctx.fillStyle='#111';for(const a of [-1,1])for(const b of [-1,1])ctx.fillRect(a*9-4,b*9-2,8,4);
  ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-17,-8,34,16,4);ctx.fill();ctx.fillStyle='#25333b';ctx.fillRect(-3,-6,9,12);ctx.fillStyle='#ffffdc';ctx.fillRect(13,-6,3,4);ctx.fillRect(13,2,3,4);ctx.restore();
}
function render(){
  const bounds=canvas.getBoundingClientRect();if(!bounds.width)return;
  const dpr=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(bounds.width*dpr)||canvas.height!==Math.round(bounds.height*dpr)){canvas.width=Math.round(bounds.width*dpr);canvas.height=Math.round(bounds.height*dpr);}
  ctx.setTransform(canvas.width/1100,0,0,canvas.height/619,0,0);ctx.clearRect(0,0,1100,619);
  const quad=state.robot==='quad';
  if(!quad&&runs.every(Boolean)){
    window.renderTrackScene(ctx,{runs,methods,time:state.time,level:state.level,sampleIndex,failureTime});return;
  }
  if(quad&&background.complete&&background.naturalWidth){
    ctx.drawImage(background,0,0,1100,619);
    // Adjacent floor patch covers the original drone in the source frame.
    ctx.drawImage(background,background.width*.55,background.height*.575,background.width*.06,background.height*.08,525,355,66,50);
    ctx.fillStyle='#061a2040';ctx.fillRect(0,0,1100,619);
  }else{ctx.fillStyle='#1c2e29';ctx.fillRect(0,0,1100,619);for(let x=0;x<1100;x+=50)stroke([[x,0],[x,619]],'#ffffff06');for(let y=0;y<619;y+=50)stroke([[0,y],[1100,y]],'#ffffff06');}
  if(!runs.every(Boolean))return;
  // One shared spatial map for all four methods, fixed throughout the replay.
  // Quad view fits all four logged paths; no camera calibration is claimed.
  const project=p=>quad?[570+(p[1]-camera.x)*camera.scaleX,425-(p[2]-camera.y)*camera.scaleY]:[550+p[1]*93,310-p[2]*110];
  const ref=Array.from({length:240},(_,j)=>{const t=j/239*(quad?14.05:40);return project([t,quad?.9*Math.sin(.55*t):4*Math.sin(.15*t),quad?.45*Math.sin(1.1*t):1.5*Math.sin(.15*t)*Math.cos(.15*t),quad?1:0]);});
  if(!quad){stroke(ref,'#8b99904d',55);stroke(ref,'#101f1a',50);}
  stroke(ref,'#f5f5e5a0',1.5,true);
  const projected=runs.map((r,i)=>{
    const index=sampleIndex(r),point=r.samples[index],failed=state.time+1e-6>=failureTime(r);
    stroke(r.samples.slice(0,index+1).map(project),methods[i].color+'aa',2.2);
    return {point,index,failed,position:project(point),i};
  });
  // Failed rollouts hold at the first failed state; there is no invented fall.
  projected.sort((a,b)=>Number(b.failed)-Number(a.failed)).forEach(({point,position,failed,i})=>{
    const [x,y]=position;
    const color=methods[i].color;
    if(quad)drawDrone(x,y,color,point[4]);else drawCar(x,y,color,point[4]);
    if(failed){
      ctx.beginPath();ctx.arc(x,y,25,0,Math.PI*2);ctx.fillStyle='#b91c1c35';ctx.fill();
      for(const width of [9,5]){stroke([[x-15,y-15],[x+15,y+15]],width===9?'#fff':'#ed2424',width);stroke([[x+15,y-15],[x-15,y+15]],width===9?'#fff':'#ed2424',width);}
    }
    const labelX=i%2?975:125,labelY=i<2?330:480;
    stroke([[labelX,labelY+(i%2?-14:14)],[x,y]],color+'80',1);
    ctx.font='bold 15px sans-serif';const text=methods[i].short,width=ctx.measureText(text).width;
    ctx.fillStyle='#0c1d19e8';ctx.beginPath();ctx.roundRect(labelX-width/2-10,labelY-14,width+20,29,5);ctx.fill();ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,labelX,labelY+5);
  });
  ctx.textAlign='left';ctx.font='12px sans-serif';ctx.fillStyle='#ffffffd9';ctx.fillText(`${state.time.toFixed(2)} s`,1010,32);
}

// Each hardware condition has an independent transport. Clips begin at visually selected takeoff.
const trialGroups=[];
document.querySelectorAll('[data-trials]').forEach(element=>{
  const videos=[...element.querySelectorAll('video')],button=element.querySelector('[data-play]'),slider=element.querySelector('[data-time]'),output=element.querySelector('[data-clock]'),speed=element.querySelector('[data-speed]'),error=element.querySelector('.trial-error');
  const group={videos,playing:false,time:0,speed:1,generation:0};trialGroups.push(group);
  const length=()=>Math.max(0,...videos.map(v=>Number.isFinite(v.duration)?v.duration:0));
  const master=()=>videos.reduce((a,b)=>(b.duration||0)>(a.duration||0)?b:a);
  const update=()=>{slider.max=length()||1;slider.value=group.time;output.textContent=`${clock(group.time)} / ${clock(length())}`;button.textContent=group.playing?'Pause all':'Play all four';button.disabled=videos.some(v=>v.readyState<1);};
  group.pause=()=>{group.generation++;group.playing=false;videos.forEach(v=>v.pause());update();};
  const seek=time=>{group.time=Math.max(0,Math.min(length(),time));videos.forEach(v=>{if(v.readyState>=1)v.currentTime=Math.min(group.time,Math.max(0,v.duration-.04));});update();};
  const play=async()=>{
    trialGroups.forEach(g=>g.pause());state.playing=false;updateReplay();
    if(group.time>=length()-.1)seek(0);
    group.playing=true;error.hidden=true;const generation=++group.generation;update();
    try{await Promise.all(videos.map(v=>{v.playbackRate=group.speed;if(group.time>=v.duration-.05)return;return v.play();}));if(generation!==group.generation&&!group.playing)videos.forEach(v=>v.pause());}
    catch{group.pause();error.hidden=false;error.textContent='Playback could not start. Try again, or use each video’s controls.';}
  };
  button.addEventListener('click',()=>group.playing?group.pause():play());
  element.querySelector('[data-restart]').addEventListener('click',()=>{group.pause();seek(0);});
  slider.addEventListener('input',()=>{const time=Number(slider.value);group.pause();seek(time);});
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
document.addEventListener('visibilitychange',()=>{if(document.hidden){state.playing=false;trialGroups.forEach(g=>g.pause());document.querySelectorAll('video').forEach(v=>v.pause());updateReplay();}});
let previous=0,lastPaint=0;
function frame(now){
  const dt=Math.min(.1,(now-previous)/1000||0);previous=now;
  if(state.playing&&!document.hidden){state.time=Math.min(duration(),state.time+dt*state.speed);if(state.time>=duration())state.playing=false;}
  if(now-lastPaint>40){render();updateReplay();trialGroups.forEach(g=>g.tick());lastPaint=now;}
  requestAnimationFrame(frame);
}
setRobot('quad');
requestAnimationFrame(frame);
document.querySelectorAll('[data-placeholder-link]').forEach(link=>link.addEventListener('click',event=>event.preventDefault()));
