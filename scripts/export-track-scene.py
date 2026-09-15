"""Bake the original F1TENTH renderer's scene for the browser's shared camera."""
import argparse,sys,math,json,hashlib,subprocess
from pathlib import Path
from types import SimpleNamespace
p=argparse.ArgumentParser();p.add_argument('--repo',type=Path,required=True);p.add_argument('--out',type=Path,default=Path('assets/scene'));a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(a.repo/'visualizations/f1tenth'))
import render_figure8_raya_chase as scene
from PIL import Image
# Fixed overview camera keeps all four logged vehicles and their endpoints in view.
camera=scene.Camera(x=0,y=-7.8,yaw=math.pi/2,height=5.8,pitch=math.radians(32),focal=900,cx=550,cy=292)
scenario=SimpleNamespace(family='strips',args=('--patch-period','4','--patch-seed-offset','2.02'))
# The original scene distance-field road, ice schedule, scenery, and wall geometry.
plate=scene.paint_surface(scenario,150)
view=Image.new('RGBA',(1100,619),(0,0,0,255))
scene.draw_sky(view,camera);scene.draw_ground(view,camera);scene.warp_plate(view,camera,plate);scene.apply_fog(view,camera);scene.draw_hedge(view,camera)
view.convert('RGB').save(a.out/'f1tenth-circuit.jpg',quality=94)
scene.prepared_chase_car(240).save(a.out/'f1tenth-car.png')
geometry={'matrix':camera.matrix().tolist(),'focal':camera.focal,'carWidth':scene.CAR_WIDTH_M,'panels':scene.projected_barriers(camera),'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=a.repo,text=True).strip(),'sourceRenderer':'visualizations/f1tenth/render_figure8_raya_chase.py','camera':camera.__dict__,'scenario':{'period':4,'placement':50,'phase':2.02},'presentation':'Same road, ice, walls, background, and car artwork as the supplied chase video. Fixed overview camera and four simultaneous independent rollouts; no collision physics. Car art remains an upright billboard.'}
(a.out/'f1tenth-scene.json').write_text(json.dumps(geometry,separators=(',',':')))
print('Exported original scene and car artwork')
