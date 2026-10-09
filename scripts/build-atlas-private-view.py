#!/usr/bin/env python3
"""Build a standalone local atlas by joining public source maps with private local metadata."""
import json
from pathlib import Path
from shutil import copy2
ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/"PLANNING/system-atlas"
PRIVATE=Path.home()/".local/share/norex-atlas"
PRIVATE.mkdir(parents=True,exist_ok=True)
public=json.loads((PUBLIC/"explorer.json").read_text())
local=json.loads((PRIVATE/"private-sources.json").read_text())
nodes=public["nodes"]+local["nodes"]
edges=public["edges"]+local["edges"]
roots={}
for node in local["nodes"]:
    name=node["path"].split("/")[0]
    rid="local-root:"+name
    if rid not in roots:
        roots[rid]={"id":rid,"label":name,"kind":"local-project","status":"private-local","path":name}
    edges.append({"source":rid,"target":node["id"],"kind":"contains"})
nodes+=list(roots.values())
out={"revision":public["revision"],"nodes":nodes,"edges":edges,"notice":"Locally combined view. Do not publish. Local filenames may be sensitive; links are not exported."}
(PRIVATE/"explorer.json").write_text(json.dumps(out,separators=(",",":")))
(PRIVATE/"explorer.json").chmod(0o600)
for name in ("explorer.html","explorer-extensions.js","explorer-architecture.js","history.json"):
    if (PUBLIC/name).exists():copy2(PUBLIC/name,PRIVATE/name)
print("Combined",len(nodes),"nodes,",len(edges),"edges in",PRIVATE)
