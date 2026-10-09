#!/usr/bin/env python3
"""Augment NOREX Atlas with all tracked files, exact source anchors, and external references."""
import json, re, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"PLANNING"/"system-atlas"
data=json.loads((OUT/"inventory.json").read_text())
paths=subprocess.check_output(["git","ls-files","--cached","--others","--exclude-standard"],cwd=ROOT).decode().splitlines()
skip=("PLANNING/system-atlas/","site/",".norex/")
allowed={".md",".html",".htm",".css",".scss",".js",".mjs",".ts",".tsx",".jsx",".json",".sql",".py",".sh",".yml",".yaml",".toml",".txt",".csv",".xml",".svg"}
nodes=[]; links=[]; external={}
for rel in sorted(set(paths)):
    if rel.startswith(skip) or any(x in rel.split("/") for x in (".git","node_modules","__pycache__")):continue
    p=ROOT/rel
    if not p.is_file():continue
    ext=p.suffix.lower()
    node={"id":"file:"+rel,"label":p.name,"path":rel,"kind":ext.lstrip(".") or "file","status":"tracked","bytes":p.stat().st_size,"url":"https://github.com/devroadtosucces15-boop/Norex-United-FC/blob/main/"+"/".join(__import__("urllib.parse",fromlist=["quote"]).quote(x,safe="") for x in rel.split("/"))}
    nodes.append(node)
    if ext not in allowed or p.stat().st_size>1000000:continue
    try:source=p.read_text(encoding="utf-8")
    except (OSError,UnicodeError):continue
    for i,line in enumerate(source.splitlines(),1):
        if len(line)>3000:continue
        # Concrete HTML controls and source-level functions. No inferred runtime claims.
        if ext in (".html",".htm"):
            for match in re.finditer(r'<(button|form|input|a|select)\b[^>]{0,700}>',line,re.I):
                tag=match.group(0)
                name=re.search(r'(?:id|name|aria-label|href)=["\']([^"\']+)',tag,re.I)
                title=(name.group(1) if name else tag[:65])
                nid=f"control:{rel}:{i}:{match.start()}"
                nodes.append({"id":nid,"label":f"{match.group(1)}: {title}" if name else title,"path":rel,"line":i,"kind":"html-control","status":"source","url":node["url"]+f"#L{i}"})
                links.append({"source":node["id"],"target":nid,"kind":"contains"})
        if ext in (".js",".mjs",".ts",".tsx",".jsx",".py"):
            for m in re.finditer(r'(?:\bfunction\s+|\b(?:async\s+)?def\s+)([A-Za-z_$][\w$]*)\s*\(',line):
                nid=f"function:{rel}:{i}:{m.group(1)}"
                nodes.append({"id":nid,"label":m.group(1),"path":rel,"line":i,"kind":"function","status":"source","url":node["url"]+f"#L{i}"})
                links.append({"source":node["id"],"target":nid,"kind":"defines"})
        for m in re.finditer(r'https?://[^\s"\'<>\x60)]+',line):
            url=m.group(0).rstrip(".,;")
            if len(url)>250 or any(k in url.lower() for k in ("token=","key=","secret=","password=","access_token")):continue
            # Do not copy URL query parameters, which can contain credentials.
            url=url.split("?")[0].split("#")[0]
            if not url.startswith(("https://","http://")):continue
            external.setdefault(url,[]).append((node["id"],i))
for url,uses in sorted(external.items()):
    eid="external:"+url
    nodes.append({"id":eid,"label":url[:90],"kind":"external-reference","status":"referenced-not-verified","url":url})
    for src,line in uses[:20]:links.append({"source":src,"target":eid,"kind":"references","line":line})
for edge in data["edges"]:
    links.append({"source":"file:"+edge["source"],"target":"file:"+edge["target"],"kind":edge["kind"]})
for item in data["records"]:
    fid="file:"+item["path"]
    for name in item["tables"]:
        tid="table:"+name
        links.append({"source":fid,"target":tid,"kind":"mentions-table"})
    for endpoint in item["endpoints"]:
        aid="api:"+endpoint
        links.append({"source":fid,"target":aid,"kind":"mentions-api"})
nodes += [{"id":"table:"+t,"label":t,"kind":"table-reference","status":"unverified"} for t in sorted({x for r in data["records"] for x in r["tables"]})]
nodes += [{"id":"api:"+t,"label":t,"kind":"api-reference","status":"unverified"} for t in sorted({x for r in data["records"] for x in r["endpoints"]})]
out={"revision":data["revision"],"nodes":nodes,"edges":links,"notice":"Static references only. Archived, cached, ignored, external and runtime-only resources may not be present. No runtime health assertions."}
(OUT/"explorer.json").write_text(json.dumps(out,ensure_ascii=False,separators=(",",":")))
print("Explorer:",len(nodes),"nodes,",len(links),"edges,",len(external),"external URLs")
