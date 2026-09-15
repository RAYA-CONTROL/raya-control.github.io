const $ = (s) => document.querySelector(s);
const methods = [
 {name:'Nominal MPC', detail:'Track the original plan', color:'#7c8174', threshold:32},
 {name:'Post hoc Learned Margin', detail:'Correct after planning', color:'#c38e64', threshold:37},
 {name:'In-solver Learned Margin', detail:'Plan with recoverability', color:'#7890a0', threshold:48},
 {name:'RAYA', detail:'Plan + let priorities yield', color:'#009E73', threshold:65},
];
const state = {platform:'drone', intensity:38, paused:matchMedia('(prefers-reduced-motion: reduce)').matches, time:0, sweep:false};
const cards = methods.map((m,i)=>{
 const el=document.createElement('article');el.className='method-card'+(i===3?' raya':'');el.style.setProperty('--method',m.color);
 el.innerHTML=`<div class="method-header"><div class="method-name"><span class="dot"></span>${i===3?'<span class="raya-name">RAYA</span>':m.name}${i===3?'<b>OURS</b>':''}</div><p>${m.detail}</p></div><canvas aria-label="${m.name} illustrative robot trajectories"></canvas><div class="method-status"><span><strong class="count">12 / 12</strong> in control</span><span class="status-label">Tracking</span></div>`;
 $('#method-grid').append(el);return {el,canvas:el.querySelector('canvas'),ctx:el.querySelector('canvas').getContext('2d'),m,i};
});
function survivors(i){let threshold=methods[i].threshold+(state.platform==='car'?(i===3?3:-3):0);return Math.max(0,Math.min(12,12-Math.floor(Math.max(0,state.intensity-threshold)/2.6)));}
function update(){
 $('#intensity').value=state.intensity;$('#disturbance').value=state.intensity;
 $('#disturbance').style.background=`linear-gradient(to right,var(--green) ${state.intensity}%,#dce3d5 ${state.intensity}%)`;
 $('#regime').textContent=state.intensity<30?'Within the comfort zone':state.intensity<55?'Building pressure':state.intensity<82?'Recovery matters':'Beyond the envelope';
 cards.forEach(({el,i})=>{const n=survivors(i);el.querySelector('.count').textContent=`${n} / 12`;const label=el.querySelector('.status-label');label.textContent=n===0?'Control lost':n<12?'Losing control':i===3&&state.intensity>35?'Yielding':'Tracking';label.classList.toggle('loss',n<12);});
 const text=state.intensity<30?'With room to spare, all four methods follow the task. Add more disturbance to reveal the difference.':state.intensity<55?'The original plan starts spending the authority needed for recovery. RAYA begins to let tracking yield.':state.intensity<82?'As other methods lose control, RAYA trades tracking precision for recovery. Watch the green robots give the path more room.':'Control authority is finite. Even RAYA cannot recover once the disturbance overwhelms the platform.';
 $('#insight').innerHTML=text.replace(/\bRAYA\b/g, '<span class="raya-name">RAYA</span>');$('#pause').textContent=state.paused?'▶':'Ⅱ';$('#pause').setAttribute('aria-label',state.paused?'Resume animation':'Pause animation');
 $('#sweep').textContent=state.sweep?'Stop sweep ■':'Run disturbance sweep ↗';
}
$('#disturbance').addEventListener('input',e=>{state.intensity=Number(e.target.value);state.sweep=false;update();});
const tabs=[...document.querySelectorAll('[data-platform]')];
tabs.forEach(btn=>btn.addEventListener('click',()=>{
 state.platform=btn.dataset.platform;state.time=0;
 tabs.forEach(b=>{const selected=b===btn;b.classList.toggle('active',selected);b.setAttribute('aria-selected',selected);b.tabIndex=selected?0:-1;});
 $('#demo-panel').setAttribute('aria-labelledby',btn.id);
 $('#disturbance-label').textContent=state.platform==='drone'?'Disturbance intensity':'Grip-loss intensity';
 $('#disturbance-subtitle').textContent=state.platform==='drone'?'Downward gusts · shared across controllers':'Slippery patches · shared across controllers';update();
}));
$('.tabs').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const index=e.key==='Home'?0:e.key==='End'?1:1-tabs.indexOf(document.activeElement);tabs[index].focus();tabs[index].click();}});
$('#pause').addEventListener('click',()=>{state.paused=!state.paused;update();});
$('#reset').addEventListener('click',()=>{state.time=0;state.intensity=38;state.sweep=false;update();});
$('#sweep').addEventListener('click',()=>{state.sweep=!state.sweep;if(state.sweep){state.intensity=0;state.paused=false;}update();});
function prepare(canvas){const rect=canvas.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);return {ctx,w:rect.width,h:rect.height};}
function path(ctx,points,color,width=1,dash=[]){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}
function drone(ctx,x,y,size,color,tilt=0,dead=false){ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.strokeStyle=color;ctx.fillStyle=dead?'#ac9b83':color;ctx.lineWidth=size*.2;ctx.beginPath();ctx.moveTo(-size,-size*.43);ctx.lineTo(size,size*.43);ctx.moveTo(-size,size*.43);ctx.lineTo(size,-size*.43);ctx.stroke();for(const a of [-1,1])for(const b of [-1,1]){ctx.beginPath();ctx.ellipse(a*size,b*size*.43,size*.65,size*.23,0,0,Math.PI*2);ctx.strokeStyle=dead?'#b6a890':color;ctx.lineWidth=size*.1;ctx.stroke();}ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-size*.36,-size*.29,size*.72,size*.58,size*.17);ctx.fill();ctx.fillStyle='#eef4df';ctx.fillRect(-size*.12,-size*.16,size*.24,size*.11);ctx.restore();}
function car(ctx,x,y,size,color,angle){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#394239';for(const p of [-1,1]){ctx.fillRect(-size*.65,p*size*.48-2,size*.4,4);ctx.fillRect(size*.25,p*size*.48-2,size*.4,4);}ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-size,-size*.42,size*2,size*.84,3);ctx.fill();ctx.fillStyle='#eaf1e1';ctx.fillRect(-size*.18,-size*.3,size*.55,size*.6);ctx.fillStyle='#f6edd5';ctx.fillRect(size*.8,-size*.28,2,size*.14);ctx.fillRect(size*.8,size*.13,2,size*.14);ctx.restore();}
function scene({canvas,m,i}){
 const {ctx,w,h}=prepare(canvas);if(!w)return;const t=state.time,n=survivors(i),pressure=state.intensity/100;
 if(state.platform==='drone'){
  const ground=h*.79;ctx.fillStyle=i===3?'#e2ead8':'#e9ecdf';ctx.beginPath();ctx.moveTo(0,ground-17);ctx.lineTo(w,ground-45);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
  for(let j=0;j<8;j++)path(ctx,[[0,ground+j*14],[w,ground-28+j*14]],'#ced8c155');for(let j=-3;j<10;j++)path(ctx,[[w*.5,ground-55],[j*w/5,h]],'#ced8c155');
  ctx.font='7px "DM Sans",sans-serif';ctx.fillStyle='#94a087';ctx.fillText('ILLUSTRATIVE FLIGHTS',12,h-12);
  for(let j=0;j<22;j++){const x=((j*43+t*(35+pressure*100))%(w+50))-25,y=13+(j*31)%(h*.66);path(ctx,[[x,y],[x+9+pressure*12,y+pressure*5]],`rgba(129,151,113,${.12+pressure*.23})`);}
  path(ctx,Array.from({length:61},(_,k)=>{const a=k/60*Math.PI*2;return [w/2+Math.sin(a)*w*.36,h*.43+Math.sin(2*a)*h*.12];}),'#b2bca0',1,[3,4]);
  for(let j=0;j<12;j++){
   const a=t*.55+j/12*Math.PI*2,failed=j>=n;let x=w/2+Math.sin(a)*w*.34,y=h*.43+Math.sin(2*a)*h*.12;
   if(i===3&&!failed){x+=Math.sin(a)*pressure*7;y-=pressure*14;}
   if(failed){const severity=Math.min(1,(state.intensity-(m.threshold+(12-j)*2.8)+10)/18);y+=(ground-y)*Math.max(.15,severity);x+=Math.sin(j*3)*8;}
   const tilt=failed?.9+Math.sin(j)*.5:Math.cos(a)*.12+pressure*Math.sin(t*4+j)*.09;
   ctx.fillStyle='#3448270b';ctx.beginPath();ctx.ellipse(x,ground+6,6,2,0,0,Math.PI*2);ctx.fill();
   if(failed){ctx.globalAlpha=.5;path(ctx,[[x-5,y-20],[x,y-6]],'#b29070',1,[2,3]);}drone(ctx,x,y,w<180?4.3:5.5,failed?'#a2957c':m.color,tilt,failed);ctx.globalAlpha=1;
  }
 } else {
  ctx.fillStyle='#e5ebdc';ctx.fillRect(0,0,w,h);
  const route=(a,offset=0)=>[w/2+Math.cos(a)*(w*.32+offset),h*.48+Math.sin(a)*(h*.32+offset)];
  const pts=Array.from({length:100},(_,k)=>route(k/99*Math.PI*2));path(ctx,pts,'#ced7c3',38);path(ctx,pts,'#f8faf1',1,[5,5]);
  ctx.fillStyle=`rgba(168,185,183,${.28+pressure*.35})`;ctx.beginPath();ctx.ellipse(w*.77,h*.52,17+pressure*10,30+pressure*27,-.35,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#7b8b79';ctx.font='7px "DM Sans",sans-serif';ctx.fillText('LOW-GRIP PATCH',w*.48,h-12);
  for(let j=0;j<12;j++){const failed=j>=n,a=t*.43+j/12*Math.PI*2;let [x,y]=route(a,i===3&&!failed?-pressure*4:0);if(failed){[x,y]=route(j*.57,21+(j%3)*6);x=Math.max(12,Math.min(w-12,x));y=Math.max(13,Math.min(h-25,y));}car(ctx,x,y,w<180?5:6.5,failed?'#a99883':m.color,failed?j*1.7:Math.atan2(Math.cos(a)*h*.32,-Math.sin(a)*w*.32));}
 }
}
let last=0,sweepProgress=0,accum=0;
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;if(!state.paused&&!document.hidden){state.time+=dt;if(state.sweep){sweepProgress+=dt*8;if(sweepProgress>=1){state.intensity=Math.min(100,state.intensity+Math.floor(sweepProgress));sweepProgress%=1;if(state.intensity===100)state.sweep=false;update();}}}accum+=dt;if(accum>.032){cards.forEach(scene);accum=0;}requestAnimationFrame(frame);}
update();requestAnimationFrame(frame);

// Resource URLs will be supplied later; empty placeholders must not reload the page.
document.querySelectorAll('[data-placeholder-link]').forEach(link => link.addEventListener('click', event => event.preventDefault()));
