/* Interactive playback of paired fixed-wind trials; logged positions and altitude. */
(() => {
'use strict';
const $=selector=>document.querySelector(selector);
const quadMethods = [
 {id:'nominal',name:'Nominal MPC',color:'#3B3B3B'},
 {id:'sampling',name:'Sampling-based safety filter',color:'#777777'},
 {id:'posthoc_cbf',name:'Posthoc CBF',color:'#56B4E9'},
 {id:'cbf',name:'In-solver CBF',color:'#0072B2'},
 {id:'posthoc_hj',name:'Posthoc HJ',color:'#CC79A7'},
 {id:'hj',name:'In-solver HJ',color:'#7A5195'},
 {id:'posthoc',name:'Posthoc Learned Margin',color:'#F4A261'},
 {id:'margin',name:'In-solver Learned Margin',color:'#A64B00'},
 {id:'raya',name:'RAYA',color:'#009E73'}
];

const trialDuration=14.05;
const state={scenario:'figure8',level:12,time:0,playing:false,speed:2};
let quad,runs=[],last=0,lastPaint=0,camera={x:0,y:0,scale:45};
const canvas=$('#quad-film'),ctx=canvas.getContext('2d');
const video=$('#car-simulation');let carGeneration=0,carWantsPlay=false,evaluationCells=[];
const carMethods=[
 {id:'nominal',name:'Nominal MPC',color:'#bd8638'},
 {id:'margin',name:'In-solver Learned Margin',color:'#418dc5'},
 {id:'posthoc',name:'Post hoc Learned Margin',color:'#a878c3'},
 {id:'raya',name:'RAYA',color:'#009E73'}
];
const failureTime=r=>r.failureIndex===null?Infinity:r.samples[r.failureIndex][0];
const sampleIndex=r=>Math.max(0,Math.min(r.samples.length-1,Math.floor((state.time+1e-6)/.05)-1,r.failureIndex??Infinity));
const methodHTML=m=>m.id==='raya'?'<span class="raya-name">RAYA</span>':m.name;
$('#quad-legend').innerHTML=quadMethods.map((m,i)=>`<div class="film-legend-item"><span class="film-key" style="--method:${m.color}">${i+1}</span><div><strong>${methodHTML(m)}</strong><span class="visually-hidden" id="quad-status-${m.id}"></span></div></div>`).join('');
const activeCondition=()=>quad.conditions.find(c=>c.id===state.scenario);
function updateCamera(){
 const points=quad.runs.filter(r=>r.scenario===state.scenario).flatMap(r=>r.samples.slice(0,r.failureIndex===null?undefined:r.failureIndex+1));
 const xs=points.map(p=>p[1]),ys=points.map(p=>p[2]);camera.x=(Math.min(-1,...xs)+Math.max(1,...xs))/2;camera.y=(Math.min(-1,...ys)+Math.max(1,...ys))/2;
 const u=points.map(p=>(p[1]-camera.x)-.55*(p[2]-camera.y));camera.scale=Math.min(55,240/(Math.max(...u)-Math.min(...u)));
}
function selectWind(){
 const wind=state.level,condition=activeCondition(),seed=condition.seed;
 runs=quadMethods.map(m=>quad.runs.find(r=>r.scenario===state.scenario&&r.level===wind&&r.seed===seed&&r.method===m.id));
 if(!runs.every(Boolean))throw new Error('Missing paired simulation trial');
 $('#quad-mode').value=state.scenario;
 $('#quad-wind-value').textContent=`${wind}×`;
 $('#quad-wind').value=wind;
 $('#quad-wind').setAttribute('aria-valuetext',`${wind} times wind multiplier`);
 $('#quad-wind').style.setProperty('--amount',`${(wind-6)/6*100}%`);
}
function advancePlayback(dt){
 state.time=Math.min(trialDuration,state.time+dt*state.speed);
 if(state.time>=trialDuration)state.playing=false;
}
function updateQuad(){
 $('#quad-clock').textContent=`${state.time.toFixed(2)} / 14.05 s`;
 $('#quad-play').textContent=state.playing?'Pause':state.time>=trialDuration?'Play again':'Play';
 runs.forEach((r,i)=>{
  const el=$(`#quad-status-${quadMethods[i].id}`),failed=state.time+1e-6>=failureTime(r);
  const cell=evaluationCells.find(c=>c.robot==='quad'&&c.scenario===state.scenario&&c.level===state.level&&c.method===r.method);
  const average=cell?` · Average success ${Math.round(100*cell.survived/cell.total)}%`:'';
  const label=failed?`FAILURE at t = ${failureTime(r).toFixed(2)} s${average}`:state.time>=trialDuration?`SUCCESS${average}`:'';
  if(el.textContent!==label)el.textContent=label;

 });
}
function stroke(points,color,width=1,dashed=false){if(points.length<2)return;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashed?[5,6]:[]);ctx.stroke();ctx.setLineDash([]);}
function drone(x,y,color,failed){
 ctx.save();ctx.translate(x,y);ctx.scale(.65,.65);
 stroke([[-12,-10],[12,10]],'#32443b',6);stroke([[-12,10],[12,-10]],'#32443b',6);
 for(const dx of [-1,1])for(const dy of [-1,1]){
  ctx.beginPath();ctx.ellipse(dx*13,dy*11,10,7,0,0,Math.PI*2);ctx.fillStyle='#ffffffdf';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
  const angle=state.playing&&!failed?state.time*35+dx:dx*.7;
  stroke([[dx*13+Math.cos(angle)*8,dy*11+Math.sin(angle)*5],[dx*13-Math.cos(angle)*8,dy*11-Math.sin(angle)*5]],color,2);
 }
 ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-7,-9,14,18,4);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(-2,-6,4,3);
 if(failed){for(const [width,c] of [[9,'white'],[5,'#de293b']]){stroke([[-17,-17],[17,17]],c,width);stroke([[-17,17],[17,-17]],c,width);}}
 ctx.restore();
}
function draw(){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(!rect.width)return;
 // Two columns on mobile preserve readable simulated robots and labels.
 const columns=rect.width<600?2:3,rows=Math.ceil(9/columns),worldWidth=columns*320,worldHeight=rows*230;
 canvas.style.aspectRatio=`${worldWidth} / ${worldHeight}`;
 const width=Math.round(rect.width*dpr),height=Math.round(rect.width/worldWidth*worldHeight*dpr);
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 ctx.setTransform(width/worldWidth,0,0,height/worldHeight,0,0);ctx.clearRect(0,0,worldWidth,worldHeight);ctx.fillStyle='#f7faf8';ctx.fillRect(0,0,worldWidth,worldHeight);
 if(!quad||!runs.length)return;
 runs.forEach((run,i)=>{
  const method=quadMethods[i],left=(i%columns)*320,top=Math.floor(i/columns)*230;
  ctx.save();ctx.translate(left,top);ctx.beginPath();ctx.rect(8,8,304,214);ctx.clip();
  ctx.fillStyle='#eef4f0';ctx.fillRect(8,8,304,214);
  const project=(p,ground=false)=>{const x=p[1]-camera.x,y=p[2]-camera.y;return [160+(x-.55*y)*camera.scale,163+.32*(x+y)*camera.scale-(ground?0:p[3]*56)];};
  for(let x=-2;x<=2;x+=.5)stroke([project([0,x,-2,0]),project([0,x,2,0])],'#d3dfd6',.8);
  for(let y=-2;y<=2;y+=.5)stroke([project([0,-2,y,0]),project([0,2,y,0])],'#d3dfd6',.8);
  stroke(quad.references[state.scenario].map(p=>project(p)),'#91a397',1.1,true);
  const index=sampleIndex(run),point=run.samples[index],failed=state.time+1e-6>=failureTime(run);
  const [x,y]=project(point),[sx,sy]=project(point,true);
  ctx.beginPath();ctx.ellipse(sx,sy,12,4,0,0,Math.PI*2);ctx.fillStyle='#3a554329';ctx.fill();
  stroke([[sx,sy],[x,y]],'#a1b7a77f',.8,true);
  stroke(run.samples.slice(0,index+1).map(p=>project(p)),method.color,1.8);
  drone(x,y,method.color,failed);
  if(failed||state.time>=trialDuration){
   // Cover the full method view only once its recorded outcome is known.
   ctx.fillStyle=failed?'rgba(255,235,238,.86)':'rgba(225,247,239,.86)';ctx.fillRect(8,8,304,214);
   ctx.strokeStyle=failed?'#c32938':'#009E73';ctx.lineWidth=3;ctx.strokeRect(10,10,300,210);
   ctx.font='900 40px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=failed?'#c32938':'#009E73';
   ctx.fillText(failed?'FAILURE':'SUCCESS',160,103,280);
   if(failed){ctx.font='700 16px sans-serif';ctx.fillText(`at t = ${failureTime(run).toFixed(2)} s`,160,143);}
   ctx.textBaseline='alphabetic';
  }
  ctx.fillStyle=method.color;ctx.beginPath();ctx.arc(26,28,11,0,Math.PI*2);ctx.fill();ctx.font='bold 12px sans-serif';ctx.fillStyle='white';ctx.textAlign='center';ctx.fillText(String(i+1),26,32);
  ctx.font='bold 13px sans-serif';ctx.textAlign='left';ctx.fillStyle=method.id==='raya'?'#009E73':'#344f3e';
  const name=method.name==='Sampling-based safety filter'?'Sampling-based safety filter':method.name;ctx.fillText(name,45,33);
  const cell=evaluationCells.find(c=>c.robot==='quad'&&c.scenario===state.scenario&&c.level===state.level&&c.method===run.method);
  if(cell){
   const rate=Math.round(100*cell.survived/cell.total);
   ctx.fillStyle=failed?'rgba(255,255,255,.72)':state.time>=trialDuration?'rgba(255,255,255,.72)':'rgba(238,244,240,.92)';ctx.fillRect(9,184,302,37);
   ctx.font='700 13px sans-serif';ctx.textAlign='center';ctx.fillStyle='#344f3e';ctx.fillText(`Average success rate: ${rate}%`,160,207);
  }
  ctx.restore();
 });
}
function pauseQuad(){state.playing=false;updateQuad();}
function pauseCar(){carWantsPlay=false;carGeneration++;video.pause();$('#car-play').textContent=video.ended?'Play again':'Play';}
window.pauseSimulation=()=>{pauseQuad();pauseCar();};
$('#quad-play').addEventListener('click',()=>{
 if(!quad)return;if(state.playing){pauseQuad();return;}
 window.pauseHardware?.();pauseCar();
 if(state.time>=trialDuration)state.time=0;
 state.playing=true;updateQuad();
});
$('#quad-wind').addEventListener('input',e=>{
 if(!quad)return;
 state.level=Number(e.target.value);state.time=0;
 selectWind();updateQuad();draw();
});
$('#quad-mode').addEventListener('change',e=>{
 if(!quad)return;
 state.scenario=e.target.value;state.level=activeCondition().defaultLevel;state.time=0;
 updateCamera();selectWind();updateQuad();draw();
});
$('#quad-speed').addEventListener('change',e=>{state.speed=Number(e.target.value);});
async function playCar(){
 pauseQuad();window.pauseHardware?.();if(video.ended)video.currentTime=0;
 carWantsPlay=true;const generation=++carGeneration;video.playbackRate=Number($('#car-speed').value);
 try{await video.play();if(generation!==carGeneration)return;$('#car-play').textContent='Pause';$('#car-error').hidden=true;}
 catch(e){if(generation===carGeneration){carWantsPlay=false;$('#car-play').textContent='Play';$('#car-error').hidden=false;$('#car-error').textContent='Playback could not start. Press Play to try again.';}}
}
function updateCarMetrics(){
 const totals=carMethods.map(m=>{
  const cells=evaluationCells.filter(c=>c.robot==='car'&&c.scenario.startsWith('strips_')&&c.method===m.id);
  const total=cells.reduce((sum,c)=>sum+c.total,0),survived=cells.reduce((sum,c)=>sum+c.survived,0);
  if(total!==1500)throw new Error('Missing periodic-strip evaluation results');
  return 100*survived/total;
 });
 $('#car-metrics').innerHTML=carMethods.map((m,i)=>`<div class="simulation-metric" style="--method:${m.color}"><strong class="metric-name">${methodHTML(m)}</strong><span class="metric-count${m.id==='raya'?' raya-name':''}">${totals[i].toFixed(1)}<small>%</small></span></div>`).join('');
}
$('#car-play').addEventListener('click',()=>{if(carWantsPlay||!video.paused)pauseCar();else playCar();});
$('#car-speed').addEventListener('change',()=>{video.playbackRate=Number($('#car-speed').value);});
video.addEventListener('loadeddata',()=>{$('#car-play').disabled=false;video.playbackRate=Number($('#car-speed').value);if(carWantsPlay)playCar();});
video.addEventListener('ended',()=>{carWantsPlay=false;$('#car-play').textContent='Play again';});
video.addEventListener('error',()=>{carWantsPlay=false;$('#car-error').hidden=false;$('#car-error').textContent='This video could not load. Reload the page to retry.';$('#car-play').disabled=true;});
if(video.readyState>=2)$('#car-play').disabled=false;
fetch('assets/data/simulation-statistics.json').then(response=>{if(!response.ok)throw new Error('Missing evaluation data');return response.json();}).then(data=>{
 evaluationCells=data.cells;updateCarMetrics();
}).catch(()=>{$('#car-data-error').hidden=false;$('#car-data-error').textContent='Average survival rates could not load. Reload the page to retry.';});
fetch('assets/data/quad-replays.json').then(response=>{if(!response.ok)throw new Error('Missing replay data');return response.json();}).then(data=>{
 quad=data;
 $('#quad-mode').innerHTML=quad.conditions.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
 state.scenario=quad.conditions[0].id;state.level=quad.conditions[0].defaultLevel;
 updateCamera();selectWind();updateQuad();draw();$('#quad-play').disabled=false;$('#quad-wind').disabled=false;$('#quad-mode').disabled=false;
}).catch(()=>{$('#quad-error').hidden=false;$('#quad-error').textContent='Simulation recordings could not load. Reload the page to retry.';});
function frame(now){
 const dt=Math.min(.1,(now-last)/1000||0);last=now;
 if(state.playing&&!document.hidden)advancePlayback(dt);
 if(now-lastPaint>32){draw();if(quad)updateQuad();lastPaint=now;}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
