#!/usr/bin/env python3
"""Read-only branch and evidence metadata for the NOREX atlas. No branch checkout."""
import json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"PLANNING/system-atlas/history.json"
def git(*args):
 return subprocess.check_output(["git",*args],cwd=ROOT,text=True,stderr=subprocess.DEVNULL).strip()
refs=git("for-each-ref","--format=%(refname:short)|%(objectname)|%(committerdate:iso8601-strict)|%(subject)","refs/heads","refs/remotes/origin").splitlines()
branches=[]
for raw in refs:
 name,sha,date,subject=raw.split("|",3)
 if name in ("origin/HEAD",) or name.startswith("origin/foundation/") or name.startswith("foundation/"):continue
 if re.search(r"(token|secret|password|credential)",name,re.I):continue
 base=git("merge-base","main",sha)
 ahead=git("rev-list","--count",base+".."+sha)
 behind=git("rev-list","--count",base+"..main")
 branches.append({"fork_point":base,"ahead":int(ahead),"behind":int(behind),"is_main":sha==git("rev-parse","main"),"name":name,"sha":sha,"date":date,"subject":subject[:160],"url":"https://github.com/devroadtosucces15-boop/Norex-United-FC/tree/"+sha})
# Only explicit textual evidence qualifies for lifecycle status.
evidence=[]
for rel in ["README.md","PLANNING/README.md","docs/README.md"]:
 p=ROOT/rel
 if not p.is_file():continue
 for i,line in enumerate(p.read_text(errors="replace").splitlines(),1):
  if re.search(r"\b(on.hold|paused|deprecated|archived|abandoned)\b",line,re.I):
   evidence.append({"path":rel,"line":i,"excerpt":line.strip()[:180],"status":"document-mention"})
out={"branches":branches,"lifecycle_evidence":evidence,"notice":"Branch existence does not imply active, archived, or on-hold status. Explicit text is a mention, not a verified project classification."}
OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n")
print("Historical branch refs:",len(branches),"lifecycle mentions:",len(evidence))
