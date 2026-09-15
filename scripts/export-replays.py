#!/usr/bin/env python3
"""Re-run frozen safe-reachability configurations; export unaltered step samples.
Build the two evaluators first; see assets/data/README.md. No outcome selection.
"""
import argparse, ast, concurrent.futures, csv, hashlib, json, math, re, subprocess, tempfile
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('--repo', type=Path, required=True)
p.add_argument('--build', type=Path, required=True)
p.add_argument('--out', type=Path, default=Path('assets/data'))
p.add_argument('--logs', type=Path)
a=p.parse_args(); a.repo=a.repo.resolve(); a.build=a.build.resolve(); a.out.mkdir(parents=True,exist_ok=True)
logs=a.logs or Path(tempfile.mkdtemp(prefix='raya-replays-'))
def constant(path,name):
 tree=ast.parse(path.read_text())
 node=next(n.value for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id==name for t in n.targets))
 return ast.literal_eval(node.func.value).split()
quad_base=constant(a.repo/'TinyMPC/examples/shared_recoverability/tools/train_learned_authority_rl.py','QUAD_BASE')
car_base=constant(a.repo/'prereg_audit/car_grid_corrected/run.py','BASE')
quad_policy='prereg_audit/learned_authority_rl_cegis_v3/quad/final_policy.csv'
car_policy='prereg_audit/no_mu_authority_car/limo/final_policy.csv'
learned='--no-oracle-use-learned 1 --no-oracle-use-separate-barrier 1 --disable-online-mu-estimator 1'.split()
quad_arms=[('nominal','vanilla',[]),('cbf','analytic_in_solver_cbf',[]),('posthoc','posthoc_learned',[]),('raya','saber_no_oracle', ['--authority-beta-track','1.0','--authority-beta-attitude','0.5','--authority-gate','rl_policy','--authority-policy-weights-file',str(a.repo/quad_policy),'--authority-policy-smoothing','0.7'])]
car_arms=[('nominal','vanilla',['--mu-assumed','1.0']),('cbf','analytic_in_solver_cbf',['--mu-assumed','1.0']),('posthoc','saber_posthoc',['--mu-assumed','1.0',*learned]),('raya','car_saber_no_oracle_adaptive',['--mu-assumed','0.8',*learned,*'--authority-beta-track 0.8 --authority-tau 0.5 --authority-deadband 0.5 --authority-gate rl_policy --authority-policy-smoothing 0.7 --authority-policy-feature-set no_mu'.split(),'--authority-policy-weights-file',str(a.repo/car_policy)])]
tasks=[]
for scenario in ['figure8','heavy']:
 for wind in range(6,13):
  for seed in range(5):
   for key,method,extra in quad_arms:
    args=[*quad_base,'--trajectory','figure8','--wind-scale',str(wind),'--seed',str(seed)]
    if scenario=='heavy':args+=['--wind-profile','default','--plant-mass-scale','1.2','--plant-drag-coeff','0.2']
    tasks.append(('quad',scenario,wind,seed,key,['--method',method,*args,*extra]))
for row in csv.DictReader((a.repo/'prereg_audit/car_grid_corrected/manifest.csv').open()):
 if row['family']!='strips' or int(row['placement_index']) not in [0,25,50,75]:continue
 for key,method,extra in car_arms:
  tasks.append(('car',row['cell'].split('_mu')[0],float(row['mu_actual']),int(row['placement_index']),key,['--method',method,'--seed',row['seed'],'--mu-actual',row['mu_actual'],*car_base,*extra,*json.loads(row['args_json'])]))
def run(task):
 robot,scenario,level,seed,key,args=task
 ident=f'{robot}-{scenario}-{level}-{seed}-{key}'
 path=logs/(ident+'.csv')
 exe=a.build/'examples'/('quadrotor_tracking_real_wind_demo' if robot=='quad' else 'car_safety_eval')
 cmd=[str(exe),*args,'--step-csv' if robot=='quad' else '--log-csv',str(path)]
 if path.exists() and (logs/(ident+'.txt')).exists():
  stdout=(logs/(ident+'.txt')).read_text()
 else:
  proc=subprocess.run(cmd,cwd=a.repo,capture_output=True,text=True,check=True,timeout=120)
  stdout=proc.stdout
  (logs/(ident+'.txt')).write_text(stdout)
 metrics={k:float(v) for k,v in re.findall(r'\b([A-Za-z_]+)[=:]\s*([-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)',stdout)}
 rows=list(csv.DictReader(path.open()))
 samples=[]; failure=None; reason=None
 for i,r in enumerate(rows):
  if robot=='quad':
   t=(int(r['step'])+1)*.05
   failed=int(r['combined_fail'])>0
   if failed and failure is None:
    failure=i;reason='Attitude / angular-rate limit' if int(r['attitude_fail']) else 'Floor limit' if int(r['floor_violations']) else 'Position limit'
   values=[t,float(r['px']),float(r['py']),float(r['pz']),float(r['roll']),float(r['authority_w'])]
  else:
   t=float(r['time'])+.1
   values=[t,float(r['x']),float(r['y']),0,float(r['theta']),float(r.get('authority_w',0))]
  assert all(math.isfinite(v) for v in values),ident
  samples.append([round(v,5) for v in values])
 if robot=='car' and metrics['success']==0:
  failure=len(samples)-1;reason='Severe slip' if metrics.get('severe_slip_steps',0) else 'Spinout' if metrics.get('spinout_steps',0) else 'Track departure' if metrics.get('track_departure_steps',0) else 'Tracking-tube failure'
 survived=int(metrics['survival_combined'] if robot=='quad' else metrics['success'])
 assert survived==int(failure is None), (ident,metrics,failure)
 return {'robot':robot,'scenario':scenario,'level':level,'seed':seed,'method':key,'samples':samples,'failureIndex':failure,'failureReason':reason,'survived':bool(survived),'command':[part.replace(str(a.repo),'${SAFE_REACHABILITY}').replace(str(a.build),'${SIM_BUILD}').replace(str(logs),'${LOGS}') for part in cmd],'rawSha256':hashlib.sha256(path.read_bytes()).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 runs=[]
 for r in pool.map(run,tasks):
  runs.append(r)
  if len(runs)%40==0:print(f'{len(runs)}/{len(tasks)} episodes',flush=True)
manifest={'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=a.repo,text=True).strip(),'selection':'Quad seeds 0–4; car placements 0,25,50,75. Selected before execution, independent of outcomes.','configurationNote':'Frozen CEGIS-v3 quad / strict no-mu car policies from supplied checkout. Quad configuration differs from attached paper. These are new code-based replays, not the original paper trajectory logs.','sampleColumns':['time_s','x_m','y_m','z_m','angle_rad','authority_weight'],'policies':{x:hashlib.sha256((a.repo/x).read_bytes()).hexdigest() for x in [quad_policy,car_policy]},'episodes':[{k:v for k,v in r.items() if k!='samples'} for r in runs]}
(a.out/'provenance.json').write_text(json.dumps(manifest,indent=2))
for robot in ['quad','car']:
 payload={'sampleColumns':manifest['sampleColumns'],'duration':14.05 if robot=='quad' else 40,'runs':[{k:v for k,v in r.items() if k not in ['command','rawSha256','robot']} for r in runs if r['robot']==robot]}
 (a.out/(robot+'-replays.json')).write_text(json.dumps(payload,separators=(',',':')))
print(f'Done. Full raw logs: {logs}',flush=True)
