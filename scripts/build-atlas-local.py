#!/usr/bin/env python3
"""Private, metadata-only supplemental atlas of local sources. NEVER publish this output."""
import json, subprocess, re
from pathlib import Path
HOME=Path.home()
ROOT=Path(__file__).resolve().parents[1]
OUT=HOME/".local/share/norex-atlas/private-sources.json"
TARGETS=[HOME/"NOREX UNITED - DEEPSEEK", HOME/"norex_fc26",HOME/"norex_fc27",HOME/"norex_fc27_recon",HOME/"Pictures/NOREX-proposals"]
SKIP={".git",".norex",".claude",".gemini","node_modules",".env","secrets","credentials","venv",".venv",".next","dist","build","__pycache__"}
LIMIT=12000
nodes=[]
for base in TARGETS:
    if not base.is_dir():continue
    for path in base.rglob("*"):
        if len(nodes)>=LIMIT:break
        if any(x in SKIP for x in path.relative_to(base).parts):continue
        if not path.is_file() or path.is_symlink():continue
        try:size=path.stat().st_size
        except OSError:continue
        rel=path.relative_to(base).as_posix()
        if re.search(r'(?i)(^|[/_.-])(token|password|secret|private.key|credentials|\.env)([/_.-]|$)',rel):continue
        nodes.append(dict(id="local:"+base.name+"/"+rel,label=path.name,kind="local-file",status="local-unverified",path=base.name+"/"+rel,bytes=size))
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps({"scope":"private-local-only","nodes":nodes,"edges":[],"notice":"Local file metadata only; not uploaded or synchronized to GitHub."},separators=(",",":")))
OUT.chmod(0o600)
print("Wrote PRIVATE local inventory:",len(nodes),"nodes at",OUT)
