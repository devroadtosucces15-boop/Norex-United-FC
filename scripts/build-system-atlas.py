#!/usr/bin/env python3
"""NOREX living logic atlas: deterministic, read-only static source inventory."""
import json, re, subprocess
from pathlib import Path
from collections import defaultdict
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "PLANNING" / "system-atlas"
OUT.mkdir(parents=True, exist_ok=True)
EXT = {".js", ".mjs", ".ts", ".json", ".sql", ".yml", ".yaml", ".py"}
FOLDERS = {"bot", "web", "scripts", "tests", "data", ".github"}
files = sorted(p for folder in FOLDERS for p in (ROOT / folder).rglob("*")
               if p.is_file() and p.suffix in EXT and not any(x in p.parts for x in
               ("node_modules", ".git", "__pycache__", "system-atlas")))
files += [ROOT / "config.json", ROOT / "package.json"]
files = sorted(set(files))
records = []
for p in files:
    rel = p.relative_to(ROOT).as_posix()
    try: src = p.read_text(encoding="utf-8")
    except (UnicodeError, OSError): continue
    imports = re.findall(r"""(?:from\s*|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]""", src)
    endpoints = sorted(set(re.findall(r"""['"](/api/[a-zA-Z0-9_/:.\-]+)['"]""", src)))
    sqltables = sorted(set(re.findall(r"""\b(?:FROM|JOIN|INTO|UPDATE|TABLE(?:\s+IF\s+NOT\s+EXISTS)?)\s+([\w]+)""", src, re.I)))
    functions = re.findall(r"""(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(""", src)
    functions += re.findall(r"""\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>""", src)
    records.append(dict(path=rel, layer=rel.split("/")[0], lines=src.count("\n")+1,
                        imports=imports, endpoints=endpoints, tables=sqltables, functions=sorted(set(functions))))
index = {r["path"]:r for r in records}
edges = []
for r in records:
    base = (ROOT / r["path"]).parent
    for target in r["imports"]:
        if not target.startswith("."): continue
        path = (base / target).resolve()
        choices = [path, Path(str(path)+".js"), Path(str(path)+".mjs"), Path(str(path)+".json"), path/"index.js"]
        match = next((q.relative_to(ROOT).as_posix() for q in choices if q.is_relative_to(ROOT) and q.relative_to(ROOT).as_posix() in index), None)
        if match: edges.append((r["path"], match, "imports"))
tables = defaultdict(set); endpoints = defaultdict(set)
for r in records:
    for t in r["tables"]: tables[t].add(r["path"])
    for ep in r["endpoints"]: endpoints[ep].add(r["path"])
def label(v): return v.replace('"', "'").replace("<", "").replace(">", "")[:58]
def graph(name, nodes, links, direction="LR"):
    ids = {n: "n"+str(i) for i,n in enumerate(sorted(nodes))}
    lines = ["flowchart "+direction]
    for n,k in ids.items(): lines.append(f'  {k}["{label(n)}"]')
    for a,b in sorted(set(links)):
        if a in ids and b in ids: lines.append(f"  {ids[a]} --> {ids[b]}")
    return "\n".join(lines)
layers = sorted(set(r["layer"] for r in records))
layer_links = [(index[a]["layer"],index[b]["layer"]) for a,b,_ in edges if index[a]["layer"] != index[b]["layer"]]
(OUT/"00-system-layers.md").write_text("# NOREX system layers\n\nGenerated from local source imports. Arrows mean **depends on**, not runtime calls.\n\n```mermaid\n"+graph("layers",layers,layer_links)+"\n```\n")
for layer in layers:
    local = [r["path"] for r in records if r["layer"]==layer]
    internal = [(a,b) for a,b,_ in edges if a in local and b in local]
    if len(local)>170: local = sorted(local, key=lambda x: -len([e for e in internal if x in e]))[:170]
    (OUT/f"layer-{layer.lstrip('.')}.md").write_text(f"# {layer} module dependencies\n\nSource-level imports; isolated files appear without arrows.\n\n```mermaid\n"+graph(layer,local,internal)+"\n```\n")
for name,group in [("api",endpoints),("database",tables)]:
    ranked = sorted(group.items(),key=lambda kv:(-len(kv[1]),kv[0]))[:100]
    nodes=set(); links=[]
    for item, paths in ranked:
        n=("API " if name=="api" else "TABLE ")+item
        nodes.add(n)
        for path in sorted(paths)[:12]: nodes.add(path); links.append((path,n))
    (OUT/f"map-{name}.md").write_text(f"# {name.upper()} source connections\n\nStatic source references; this does not prove runtime invocation or SQL lineage. Top 100 by reference count.\n\n```mermaid\n"+graph(name,nodes,links)+"\n```\n")
try: revision = subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip()
except Exception: revision = "unknown"
summary = dict(revision=revision, files=len(records), imports=len(edges), api_paths=len(endpoints), tables=len(tables), records=records, edges=[dict(source=a,target=b,kind=k) for a,b,k in edges])
(OUT/"inventory.json").write_text(json.dumps(summary,indent=2,ensure_ascii=False)+"\n")
lines=["# NOREX Living System Atlas","","> Automatically regenerated from the repository. This is a **static evidence map**, not a complete runtime trace.", "",f"Source revision: `{revision}`", "",f"Indexed **{len(records)} files**, **{len(edges)} resolved module imports**, **{len(endpoints)} API path literals**, **{len(tables)} SQL table references**.","","## Navigate", "", "- [Interactive Explorer](explorer.html) (serve this directory over HTTP)", "- [System layers](00-system-layers.md)", "- [API references](map-api.md)", "- [Database references](map-database.md)"]
lines += [f"- [{layer} dependency graph](layer-{layer.lstrip('.')}.md)" for layer in layers]
lines += ["","## Evidence and limits","","- Every node is tied to a repository path; inspect `inventory.json` for functions, endpoints, tables and dependencies.","- Imports are statically resolved; dynamic imports, data-dependent dispatch, indirect queries and generated code may be absent.","- SQL references are extracted from source, not from live database schemas or execution traces.","- This index does not claim that a function executes, a formula is correct, or a production integration is healthy.","- For business rules and calculations, use the indexed function names as entry points for deeper traced process diagrams.","","## Refresh","","Run `python3 scripts/build-system-atlas.py` locally, or let the GitHub Actions atlas workflow update on changes."]
(OUT/"README.md").write_text("\n".join(lines)+"\n")
print(f"Atlas: {len(records)} files, {len(edges)} imports, {len(endpoints)} API references, {len(tables)} table names")
