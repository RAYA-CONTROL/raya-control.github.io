/* Original F1TENTH chase-renderer assets, viewed through one shared camera. */
(() => {
  const background=new Image(),car=new Image();
  background.src='assets/scene/f1tenth-circuit.jpg';car.src='assets/scene/f1tenth-car.png';
  let scene=null;
  fetch('assets/scene/f1tenth-scene.json').then(r=>{if(!r.ok)throw Error('scene');return r.json();}).then(data=>scene=data).catch(()=>{scene=null;});
  function project(x,y){
    const m=scene.matrix,v=m.map(row=>row[0]*x+row[1]*y+row[2]);
    return [v[0]/v[2],v[1]/v[2],v[2]];
  }
  function line(ctx,points,color,width=2){
    if(!points.length)return;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  }
  window.renderTrackScene=(ctx,{runs,methods,time,level,sampleIndex,failureTime})=>{
    ctx.fillStyle='#324b29';ctx.fillRect(0,0,1100,619);
    if(!scene||!background.complete||!background.naturalWidth||!car.complete||!car.naturalWidth){ctx.fillStyle='white';ctx.font='18px sans-serif';ctx.fillText('Loading the original F1TENTH scene…',350,310);return;}
    ctx.drawImage(background,0,0,1100,619);
    // Correct canonical reference: y = 1.5 sin(0.15t) cos(0.15t).
    const reference=Array.from({length:250},(_,i)=>{const t=i/249*2*Math.PI;return project(4*Math.sin(t),1.5*Math.sin(t)*Math.cos(t));});
    ctx.setLineDash([4,7]);line(ctx,reference,'#ffffff8c',1.5);ctx.setLineDash([]);
    const vehicles=runs.map((run,i)=>{
      const index=sampleIndex(run),p=run.samples[index],screen=project(p[1],p[2]);
      line(ctx,run.samples.slice(0,index+1).map(s=>project(s[1],s[2])),methods[i].color+'c9',2.4);
      return {depth:screen[2],screen,method:methods[i],point:p,failed:time+1e-6>=failureTime(run),i};
    });
    // Original wall faces and all four cars share the same depth ordering.
    const objects=[...scene.panels.map(([depth,points,color])=>({depth,points,color})),...vehicles];
    objects.sort((a,b)=>b.depth-a.depth).forEach(object=>{
      if(object.points){ctx.beginPath();object.points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=`rgb(${object.color.join(',')})`;ctx.fill();return;}
      const {screen,method,failed}=object,[x,y,depth]=screen;
      const width=scene.focal*scene.carWidth/depth,height=width*car.height/car.width;
      ctx.save();ctx.shadowColor='#07110dcc';ctx.shadowBlur=8;ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(x,y,width*.57,width*.17,0,0,Math.PI*2);ctx.fill();ctx.restore();
      ctx.drawImage(car,x-width/2,y-height*.95,width,height);
      ctx.strokeStyle=method.color;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y+2,width*.63,width*.20,0,0,Math.PI*2);ctx.stroke();
      // Direction indicator uses the logged heading, not the billboard's artwork.
      const head=project(object.point[1]+Math.cos(object.point[4])*.5,object.point[2]+Math.sin(object.point[4])*.5);
      line(ctx,[[x,y],head],method.color,2);
      if(failed){
        const cy=y-height*.5;
        for(const strokeWidth of [10,6]){line(ctx,[[x-15,cy-15],[x+15,cy+15]],strokeWidth===10?'#fff':'#ed2424',strokeWidth);line(ctx,[[x+15,cy-15],[x-15,cy+15]],strokeWidth===10?'#fff':'#ed2424',strokeWidth);}
      }
    });
    // Separate callouts keep overlapping, data-faithful trajectories identifiable.
    vehicles.forEach(({screen,method,i,failed})=>{
      const x=135+i*276,y=i%2?541:133;
      line(ctx,[[x,y+(i%2?-17:17)],[screen[0],screen[1]]],method.color+'90',1);
      ctx.font='bold 16px sans-serif';const label=method.short,w=ctx.measureText(label).width+28;
      ctx.fillStyle='#0b211aee';ctx.beginPath();ctx.roundRect(x-w/2,y-17,w,34,5);ctx.fill();ctx.fillStyle=method.color;ctx.textAlign='center';ctx.fillText(label,x,y+5);
    });
    ctx.textAlign='left';ctx.font='13px sans-serif';ctx.fillStyle='#14291fe8';ctx.beginPath();ctx.roundRect(18,570,328,31,5);ctx.fill();ctx.fillStyle='#e5f1e9';ctx.fillText(`Grip μ = ${level.toFixed(2)}  ·  blue = low-grip intervals`,30,590);
    ctx.fillStyle='#10231f';ctx.font='bold 14px sans-serif';ctx.fillText(`${time.toFixed(1)} s`,1020,33);
  };
})();
