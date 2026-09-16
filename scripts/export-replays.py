#!/usr/bin/env python3
"""Export paired replays and full-evaluation counts from the final paper configs."""
import argparse, ast, concurrent.futures, csv, hashlib, json, math, re, subprocess
from collections import defaultdict
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--repo',type=Path,required=True);p.add_argument('--build',type=Path,required=True);p.add_argument('--quad-build',type=Path);p.add_argument('--out',type=Path,default=Path('assets/data'));p.add_argument('--logs',type=Path,default=Path('/tmp/raya-paper-replays'));a=p.parse_args()
a.repo=a.repo.resolve();a.build=a.build.resolve();a.out.mkdir(parents=True,exist_ok=True);a.logs.mkdir(parents=True,exist_ok=True)
def read(path):return list(csv.DictReader((a.repo/path).open()))
def const(path,name):
 tree=ast.parse((a.repo/path).read_text());node=next(n.value for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id==name for t in n.targets));return ast.literal_eval(node.func.value).split()
helper='TinyMPC/examples/shared_recoverability/tools/train_learned_authority_rl.py'
qb=const(helper,'QUAD_BASE');cb=const('prereg_audit/car_grid_corrected/run.py','BASE')
policies=['prereg_audit/learned_authority_rl_cegis_v3/quad/final_policy.csv','prereg_audit/no_mu_authority_car/limo/final_policy.csv']
conditions=[('figure8','Figure-8',97,12),('circle','Circle',0,11),('line_y','Y-line',7,10),('star','Star',7,10),('turbulent','OOD-A turb-wind',31,9),('heavy','OOD-C heavy-plant',7,10)]
family_ids={f:k for k,f,_,_ in conditions};ledger=[]
for r in read('Tier 1/results/canonical_new_episodes.csv'):
 method={'Nominal MPC':'nominal','Stage-1 in-solver':'margin','Posthoc one-step':'posthoc'}.get(r['arm'])
 if r['platform']=='quad' and method:ledger.append(('quad',family_ids[r['family']],float(r['disturbance']),int(r['seed']),method,int(r['success'])))
for r in read('Tier 1/results/t1_3_stage1_scheduler_episodes.csv'):
 ledger.append((r['platform'],family_ids[r['family']] if r['platform']=='quad' else r['cell'].split('_mu')[0],float(r['disturbance']) if r['platform']=='quad' else float(r['cell'].split('_mu')[1]),int(r['seed']),'raya',int(r['success'])))
for r in read('Tier 1/results/t1_3_stage1_car_margin_episodes.csv'):
 ledger.append(('car',r['cell'].split('_mu')[0],float(r['cell'].split('_mu')[1]),int(r['seed']),'margin',int(r['success'])))
for r in read('prereg_audit/car_grid_corrected/episodes.csv'):
 if r['arm'] in ['nominal','posthoc_limo']:ledger.append(('car',r['cell'].split('_mu')[0],float(r['mu_actual']),int(r['seed']),'nominal' if r['arm']=='nominal' else 'posthoc',int(r['success'])))
for source,method_ids in [
 ('new_results_allmethods_quad_episodes.csv',{'cbfqp':'posthoc_cbf','mpccbf':'cbf'}),
 ('prereg_audit/hj_rpcbf/quad_episodes.csv',{'rpcbf_filter':'sampling','hj_filter':'posthoc_hj'}),
 ('prereg_audit/hj_rpcbf/quad_hjmpc_episodes.csv',{'hj_mpc':'hj'})]:
 for r in read(source):
  if r['method'] in method_ids:ledger.append(('quad',family_ids[r['split']],float(r['wind']),int(r['seed']),method_ids[r['method']],int(r['surv'])))
lookup={tuple(r[:5]):r[5] for r in ledger};assert len(lookup)==49800
cells=defaultdict(list);aggregates=defaultdict(list)
for robot,scenario,level,seed,method,success in ledger:cells[robot,scenario,level,method].append(success);aggregates[robot,method].append(success)
expected={'quad':{'nominal':34.24,'margin':37.48,'posthoc':34.45,'raya':40.83},'car':{'nominal':35.93,'margin':40.57,'posthoc':39.43,'raya':48.73}}
for (robot,method),vals in aggregates.items():
 if method in expected[robot]:assert round(sum(vals)/len(vals)*100,2)==expected[robot][method],(robot,method)
 else:
  assert len(vals)==4200
  expected[robot][method]=round(sum(vals)/len(vals)*100,2)
stats={'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=a.repo,text=True).strip(),'aggregates':expected,'cells':[{'robot':k[0],'scenario':k[1],'level':k[2],'method':k[3],'survived':sum(v),'total':len(v)} for k,v in cells.items()]}
assert all(x['total']==100 for x in stats['cells'])
(a.out/'simulation-statistics.json').write_text(json.dumps(stats,indent=2))
learned='--no-oracle-use-learned 1 --no-oracle-use-separate-barrier 1 --disable-online-mu-estimator 1'.split()
qa=[('nominal','vanilla',[]),('margin','saber_no_oracle',['--barrier-active-horizon','1']),('posthoc','posthoc_learned',['--posthoc-nominal-infeasible-fallback']),('raya','saber_no_oracle',('--barrier-active-horizon 1 --authority-beta-track 1.0 --authority-beta-attitude 0.5 --authority-gate rl_policy --authority-policy-smoothing 0.7'.split()+['--authority-policy-weights-file',str(a.repo/policies[0])]))]
frozen=json.loads((a.repo/'prereg_audit/hj_rpcbf/frozen_configs.json').read_text())
def baseline_flags(key):return [v.replace('/home/imahajan/safe-reachability',str(a.repo)) for v in frozen[key]['flags']]
qa += [('sampling','rpcbf_filter',baseline_flags('quad_rpcbf')),('posthoc_cbf','posthoc_filter',[]),('cbf','analytic_in_solver_cbf',[]),('posthoc_hj','hj_filter',baseline_flags('quad_hj')),('hj','hj_mpc',baseline_flags('quad_hj_mpc'))]
quad_order=['nominal','sampling','posthoc_cbf','cbf','posthoc_hj','hj','posthoc','margin','raya']
qa.sort(key=lambda arm:quad_order.index(arm[0]))
ca=[('nominal','vanilla',['--mu-assumed','1.0']),('margin','car_saber_no_oracle_adaptive',['--mu-assumed','0.8',*learned,'--robust-active-horizon','1']),('posthoc','saber_posthoc',['--mu-assumed','1.0',*learned]),('raya','car_saber_no_oracle_adaptive',['--mu-assumed','0.8',*learned,*'--robust-active-horizon 1 --authority-beta-track 0.8 --authority-tau 0.5 --authority-deadband 0.5 --authority-gate rl_policy --authority-policy-smoothing 0.7 --authority-policy-feature-set no_mu'.split(),'--authority-policy-weights-file',str(a.repo/policies[1])])]
tasks=[]
for scenario,family,seed,wind_default in conditions[:1]:
 for wind in range(6,13):
  for key,method,extra in qa:
   args=[*qb,'--trajectory',scenario if scenario not in ['heavy','turbulent'] else 'figure8','--wind-scale',str(wind),'--seed',str(seed)]
   if scenario=='heavy':args+='--wind-profile default --plant-mass-scale 1.2 --plant-drag-coeff 0.2'.split()
   if scenario=='turbulent':args+='--wind-profile shift_turb --plant-mass-scale 1.0 --plant-drag-coeff 0.0'.split()
   tasks.append(('quad',scenario,wind,seed,key,['--method',method,*args,*extra]))
for mu in [.2,.25,.3,.35,.4]:
 for key,method,extra in ca:tasks.append(('car','strips_p3',mu,91090,key,['--method',method,*cb,'--seed','91090','--mu-actual',str(mu),*'--friction-profile strips --patch-period 3 --patch-seed-offset 2.715 --patch-first-t 4.0'.split(),*extra]))
def run(task):
 robot,scenario,level,seed,key,args=task;ident=f'{robot}-{scenario}-{level}-{seed}-{key}';path=a.logs/(ident+'.csv');out=a.logs/(ident+'.txt');summary=a.logs/(ident+'-summary.csv')
 exe=(a.quad_build.resolve() if robot=='quad' and a.quad_build else a.build)/'examples'/('quadrotor_tracking_real_wind_demo' if robot=='quad' else 'car_safety_eval');cmd=[str(exe),*args,'--step-csv' if robot=='quad' else '--log-csv',str(path)]
 if robot=='car':cmd+=['--summary-csv',str(summary)]
 if not path.exists() or not out.exists():
  proc=subprocess.run(cmd,cwd=a.repo,capture_output=True,text=True,check=True,timeout=180);out.write_text(proc.stdout)
 metrics={k:float(v) for k,v in re.findall(r'\b([A-Za-z_]+)[=:]\s*([-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)',out.read_text())};rows=list(csv.DictReader(path.open()));samples=[];failure=None;reason=None
 for i,r in enumerate(rows):
  if robot=='quad':
   if int(r['combined_fail']) and failure is None:failure=i;reason='Attitude / angular-rate limit' if int(r['attitude_fail']) else 'Floor limit' if int(r['floor_violations']) else 'Position limit'
   vals=[(int(r['step'])+1)*.05,*[float(r[x]) for x in ['px','py','pz','roll','authority_w']]]
  else:vals=[float(r['time'])+.1,float(r['x']),float(r['y']),0,float(r['theta']),float(r.get('authority_w',0))]
  assert all(math.isfinite(v) for v in vals);samples.append([round(v,5) for v in vals])
 survived=int(metrics['survival_combined'] if robot=='quad' else metrics['success'])
 if robot=='car' and not survived:failure=len(samples)-1;reason='Severe slip' if metrics.get('severe_slip_steps',0) else 'Spinout' if metrics.get('spinout_steps',0) else 'Track departure' if metrics.get('track_departure_steps',0) else 'Tracking limit'
 assert survived==int(failure is None)
 canonical=lookup[robot,scenario,float(level),seed,key]
 if survived!=canonical:print('OUTCOME MISMATCH',ident,survived,canonical,flush=True)
 return {'robot':robot,'scenario':scenario,'level':level,'seed':seed,'method':key,'samples':samples,'failureIndex':failure,'failureReason':reason,'survived':bool(survived),'canonicalSurvived':bool(canonical),'command':[v.replace(str(a.quad_build.resolve()) if a.quad_build else str(a.build),'${QUAD_BUILD}').replace(str(a.repo),'${SAFE_REACHABILITY}').replace(str(a.build),'${SIM_BUILD}').replace(str(a.logs),'${LOGS}') for v in cmd],'rawSha256':hashlib.sha256(path.read_bytes()).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 runs=[]
 for r in pool.map(run,tasks):
  runs.append(r)
  if len(runs)%20==0:print(f'{len(runs)}/{len(tasks)}',flush=True)
assert all(r['survived']==r['canonicalSurvived'] for r in runs),'Rerun/ledger mismatch: inspect before publishing.'
manifest={'sourceCommit':stats['sourceCommit'],'selection':'Figure-8 seed 97 fixed across seven displayed wind values from 6-12 for all nine methods. RAYA completes every trial; the sampling-based safety filter fails at 10 and 11, and all eight baselines fail at 12. Car placement 90 is fixed across five friction values. Demonstrations are outcome-selected. Quadrotor counts use all 100 trials at each setting.','configurationNote':'Nine quad methods from Figure 2A, with frozen HJ and RPCBF configurations; final stage-1 learned-margin and scheduler; quad posthoc nominal-infeasibility fallback; canonical car posthoc.','sampleColumns':['time_s','x_m','y_m','z_m','angle_rad','authority_weight'],'policies':{p:hashlib.sha256((a.repo/p).read_bytes()).hexdigest() for p in policies},'episodes':[{k:v for k,v in r.items() if k!='samples'} for r in runs]}
manifest['baselineTables']={str(path.relative_to(a.repo)):hashlib.sha256(path.read_bytes()).hexdigest() for path in (a.repo/'baselines_hj_rpcbf/tables').glob('*quad*') if path.is_file()}
manifest['builds']={'quad':'GCC 14.2.0 / libstdc++, x86_64 macOS; standard-library wind RNG matches evaluation records.','car':'AppleClang 16.0.0 / libc++, arm64 macOS.'}
manifest['validation']='All 83 replay success/failure outcomes agree with the corresponding canonical episode records. Full-evaluation cell counts reproduce the existing aggregate paper values and all nine quadrotor methods.'
(a.out/'provenance.json').write_text(json.dumps(manifest,indent=2))
# Y-line uses the source's tabulated reference, rather than a guessed curve.
h=(a.repo/'TinyMPC/examples/trajectory_data/quadrotor_20hz_y_axis_line.hpp').read_text();match=re.search(r'Xref_data\s*\[.*?\]\s*=\s*\{(.*?)\}',h,re.S);refnums=[float(x) for x in re.findall(r'[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?',match.group(1))]
reference={}
for scenario,*_ in conditions[:1]:
 points=[]
 for k in range(282):
  t=k*.05
  if scenario=='line_y':x,y,z=refnums[k*12:k*12+3]
  elif scenario=='circle':x,y,z=.8*math.cos(.45*t),.8*math.sin(.45*t),1
  elif scenario=='star':angle=.35*t;radius=.625+.275*math.cos(5*angle);x,y,z=radius*math.cos(angle),radius*math.sin(angle),1
  else:x,y,z=.9*math.sin(.55*t),.45*math.sin(1.1*t),1
  points.append([round(t,5),round(x,5),round(y,5),round(z,5)])
 reference[scenario]=points
for robot in ['quad','car']:
 payload={'sampleColumns':manifest['sampleColumns'],'duration':14.05 if robot=='quad' else 40,'runs':[{k:v for k,v in r.items() if k not in ['command','rawSha256','robot']} for r in runs if r['robot']==robot]}
 if robot=='quad':payload.update(conditions=[{'id':k,'name':{'turbulent':'Turbulent Wind','heavy':'Heavy Plant'}.get(k,f),'seed':s,'defaultLevel':w} for k,f,s,w in conditions[:1]],references=reference,methodOrder=quad_order)
 (a.out/(robot+'-replays.json')).write_text(json.dumps(payload,separators=(',',':')))
assert all(r['survived']==r['canonicalSurvived'] for r in runs),'Rerun/ledger mismatch: inspect before publishing.'
print('All 83 outcomes match their evaluation records.',flush=True)
