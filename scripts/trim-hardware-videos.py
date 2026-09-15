#!/usr/bin/env python3
"""Build web clips beginning at visually selected takeoff, from untouched originals."""
import argparse,concurrent.futures,json,subprocess,shutil,tempfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--sources',type=Path,required=True);p.add_argument('--ffmpeg',default='ffmpeg');p.add_argument('--ffprobe',default='ffprobe');a=p.parse_args()
root=Path(__file__).resolve().parents[1];dest=root/'assets/videos';temp=Path(tempfile.mkdtemp(prefix='raya-takeoff-'))
clips=[
 ('nominal-drag','nominal-drag-topdown-trajectory.mp4',4.30),
 ('cbf-drag','mpc-cbf-drag-topdown-trajectory.mp4',2.65),
 ('posthoc-drag','posthoc-drag-topdown-trajectory (1).mp4',9.45),
 ('raya-drag','raya-drag-topdown-trajectory.mp4',2.25),
 ('nominal-motor','nominal-motor-topdown-trajectory (1).mp4',1.40),
 ('cbf-motor','mpc-cbf-motor-topdown-trajectory.mp4',0.80),
 ('posthoc-motor','posthoc-motor-topdown-trajectory.mp4',2.40),
 ('raya-motor','raya-motor-loss-topdown-trajectory.mp4',12.60),
]
def duration(path):return float(subprocess.check_output([a.ffprobe,'-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(path)],text=True))
def convert(item):
 name,source,start=item;original=a.sources/source;target=temp/(name+'.mp4');poster=temp/(name+'-poster.jpg')
 subprocess.run([a.ffmpeg,'-v','error','-y','-ss',str(start),'-i',str(original),'-map','0:v:0','-vf','scale=1280:-2','-c:v','libx264','-preset','fast','-crf','24','-threads','2','-an','-movflags','+faststart',str(target)],check=True)
 # Poster is the actual first frame of the trimmed clip.
 subprocess.run([a.ffmpeg,'-v','error','-y','-i',str(target),'-frames:v','1','-vf','scale=800:-2',str(poster)],check=True)
 before,after=duration(original),duration(target)
 assert abs(after-(before-start))<.12,(name,before,after,start)
 print(f'{name}: removed {start:.2f} s; {after:.2f} s remains',flush=True)
 return {'asset':name+'.mp4','source':source,'trimStartSeconds':start,'sourceDurationSeconds':before,'outputDurationSeconds':after}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(convert,clips))
# Publish only after all eight encodes and duration checks pass.
for name,_,_ in clips:
 shutil.copy2(temp/(name+'.mp4'),dest/(name+'.mp4'))
 shutil.copy2(temp/(name+'-poster.jpg'),dest/(name+'-poster.jpg'))
(dest/'hardware-trims.json').write_text(json.dumps({'basis':'Opening waits removed at visually selected takeoff onset. Approximate video alignment, not sensor-timestamp synchronization. Entire remaining flight retained at original speed. Source files unchanged.','clips':results},indent=2)+'\n')
