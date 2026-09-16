"""Check paired coverage, sample integrity, and agreement with the paper ledgers."""
import itertools,json,math
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'assets/data'
manifest=json.loads((root/'provenance.json').read_text());stats=json.loads((root/'simulation-statistics.json').read_text())
assert len(manifest['episodes'])==83
assert all(r['survived']==r['canonicalSurvived'] for r in manifest['episodes'])
for robot,dt in [('quad',.05),('car',.1)]:
 data=json.loads((root/f'{robot}-replays.json').read_text())
 if robot=='quad':
  assert data['conditions']==[{'id':'figure8','name':'Figure-8','seed':90,'defaultLevel':11}]
  assert len(data['methodOrder'])==9
  assert all(r['survived'] for r in data['runs'] if r['method']=='raya' and r['level']<=11)
  assert all(not r['survived'] for r in data['runs'] if r['method']!='raya' and r['level']==11)
  expected={(c['id'],w,c['seed'],m) for c in data['conditions'] for w in range(6,13) for m in ['nominal','sampling','posthoc_cbf','cbf','posthoc_hj','hj','posthoc','margin','raya']}
 else:expected=set(itertools.product(['strips_p3'],[.2,.25,.3,.35,.4],[91090],['nominal','margin','posthoc','raya']))
 keys={(r['scenario'],r['level'],r['seed'],r['method']) for r in data['runs']}
 assert keys==expected and len(keys)==len(data['runs'])
 for r in data['runs']:
  assert r['samples'] and all(len(s)==6 and all(math.isfinite(v) for v in s) for s in r['samples'])
  assert all(abs(s[0]-(i+1)*dt)<1e-5 for i,s in enumerate(r['samples']))
  assert r['survived']==(r['failureIndex'] is None)==r['canonicalSurvived']
  if r['survived']:assert abs(r['samples'][-1][0]-data['duration'])<1e-5
  else:assert 0<=r['failureIndex']<len(r['samples']) and r['failureReason']
  cell=[c for c in stats['cells'] if (c['robot'],c['scenario'],c['level'],c['method'])==(robot,r['scenario'],r['level'],r['method'])]
  assert len(cell)==1 and cell[0]['total']==100
 for m,pct in stats['aggregates'][robot].items():
  cells=[c for c in stats['cells'] if c['robot']==robot and c['method']==m]
  assert round(100*sum(c['survived'] for c in cells)/sum(c['total'] for c in cells),2)==pct
 print(f'{robot}: {len(data["runs"])} paired episodes; samples, failure flags, per-cell counts and paper totals verified')
