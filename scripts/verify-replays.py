"""Check complete paired coverage and time/failure consistency of exported data."""
import itertools,json,math
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'assets/data'
manifest=json.loads((root/'provenance.json').read_text())
assert len(manifest['episodes'])==520
for robot,scenarios,levels,seeds,dt in [
 ('quad',['figure8','heavy'],range(6,13),range(5),.05),
 ('car',['strips_p3','strips_p4','strips_p5'],[.2,.25,.3,.35,.4],[0,25,50,75],.1)]:
 data=json.loads((root/f'{robot}-replays.json').read_text())
 keys={(r['scenario'],r['level'],r['seed'],r['method']) for r in data['runs']}
 expected=set(itertools.product(scenarios,levels,seeds,['nominal','cbf','posthoc','raya']))
 assert keys==expected and len(keys)==len(data['runs'])
 for r in data['runs']:
  assert r['samples'] and all(len(s)==6 and all(math.isfinite(v) for v in s) for s in r['samples'])
  assert all(abs(s[0]-(i+1)*dt)<1e-5 for i,s in enumerate(r['samples']))
  assert r['survived']==(r['failureIndex'] is None)
  if r['survived']:assert abs(r['samples'][-1][0]-data['duration'])<1e-5
  else:assert 0<=r['failureIndex']<len(r['samples']) and r['failureReason']
 print(f'{robot}: {len(data["runs"])} paired episodes, samples and failures verified')
