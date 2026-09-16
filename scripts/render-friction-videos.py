#!/usr/bin/env python3
"""Render actual logged friction variants with the supplied chase renderer."""
import argparse,csv,json,math,os,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--repo',type=Path,required=True);p.add_argument('--logs',type=Path,default=Path('/tmp/raya-paper-replays'));p.add_argument('--out',type=Path,default=Path('assets/videos'));p.add_argument('--mu',type=float,required=True);a=p.parse_args()
sys.path.insert(0,str(a.repo/'visualizations/f1tenth'));os.environ['IMAGEIO_FFMPEG_EXE']='/usr/local/bin/ffmpeg'
import render_story as base
import render_figure8_raya_chase as chase
import render_figure8_comparison as comparison
from types import SimpleNamespace
from PIL import Image,ImageDraw,ImageFont
import numpy as np
import imageio.v2 as imageio
base.font=lambda size,bold=False:ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf',size)
base.mono_font=lambda size,bold=False:ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',size)
comparison.WIDTH,comparison.HEIGHT=1280,720
comparison.PAD,comparison.GAP,comparison.TOP=10,8,8
comparison.CARD_W,comparison.CARD_H=626,344
comparison.PANEL_HEADER_H=43;comparison.VIEW_SIZE=(616,296);comparison.F_METHOD=base.font(25,True)
chase.GREEN='#009E73'
# Shared presentation label; detailed recorded causes remain in replay/provenance data.
chase.failure_caption=lambda run:'Tracking limit'
class WebComparison(comparison.Comparison):
 def frame(self,fraction,motion_seconds):
  im=super().frame(fraction,motion_seconds);d=ImageDraw.Draw(im)
  # Retain the source layout, but use the paper's exact method color.
  x=comparison.PAD+comparison.CARD_W+comparison.GAP;y=comparison.TOP+comparison.CARD_H+comparison.GAP
  d.rectangle((x+5,y+7,x+comparison.CARD_W-5,y+40),fill='#101A21')
  d.text((x+comparison.CARD_W/2,y+comparison.PANEL_HEADER_H/2),'RAYA',font=comparison.F_METHOD,fill='#009E73',anchor='mm')
  return im
runs=[]
for method,key,label,color in [('nominal','nominal','Nominal MPC','#bd8638'),('margin','limo_barrier','In-solver Learned Margin','#418dc5'),('posthoc','posthoc_limo','Post hoc Learned Margin','#a878c3'),('raya','limo_rl','RAYA','#009E73')]:
 name=f'car-strips_p3-{a.mu}-91090-{method}'
 trace=list(csv.DictReader((a.logs/(name+'.csv')).open()));summary=list(csv.DictReader((a.logs/(name+'-summary.csv')).open()))[-1]
 for row in trace:row['time']=str(float(row['time'])+.1)
 runs.append(base.RunData(key,label,color,trace,summary,{'success':summary['success']},0,100,'Per-cell counts are displayed below the video.'))
scenario=SimpleNamespace(family='strips',cell=f'strips_p3_mu{a.mu:g}',placement_index=90,args=('--friction-profile','strips','--patch-period','3','--patch-seed-offset','2.715','--patch-first-t','4.0','--mu-actual',str(a.mu)))
print('Building scene',a.mu,flush=True);scene=WebComparison.build(runs,scenario);scene.start_time=0;scene.end_time=40
out=a.out/f'f1tenth-friction-{a.mu:.2f}.mp4';out.parent.mkdir(exist_ok=True,parents=True)
scene.frame(0,40).convert('RGB').save(out.with_suffix('.jpg'),quality=88)
# Native simulation time: forty seconds at 15 fps, followed by a one-second hold.
fps=15;temp=out.with_name(out.stem+'.rendering.mp4')
with imageio.get_writer(temp,fps=fps,codec='libx264',quality=7,pixelformat='yuv420p',macro_block_size=1,ffmpeg_params=['-movflags','+faststart','-threads','2']) as writer:
 for i in range(fps*41):
  frame=scene.frame(min(1,i/(fps*40)),40).convert('RGB');writer.append_data(np.asarray(frame))
  if i%150==0:print(a.mu,i,'/615',flush=True)
temp.replace(out);print('Finished',out,flush=True)
