#!/usr/bin/env python3
"""Loopback-only NOREX explorer server with allowlisted, read-only local previews."""
import json,mimetypes,os
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
HOME=Path.home()
BASE=HOME/".local/share/norex-atlas"
ROOTS={p.name:p for p in [HOME/"NOREX UNITED - DEEPSEEK",HOME/"norex_fc26",HOME/"norex_fc27",HOME/"norex_fc27_recon",HOME/"Pictures/NOREX-proposals"]}
TEXT={".md",".js",".mjs",".ts",".tsx",".jsx",".py",".json",".sql",".css",".html",".txt",".yml",".yaml",".sh",".xml",".toml",".csv",".log"}
IMAGES={".png",".jpg",".jpeg",".gif",".webp",".svg"}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(BASE),**kwargs)
 def do_GET(self):
  url=urlsplit(self.path)
  if url.path in ("/private-sources.json", "/private-sources.json/"):
   self.send_error(404,"Not found");return
  if url.path!="/__local_preview":return super().do_GET()
  rel=parse_qs(url.query).get("id",[""])[0]
  try:
   manifest=json.loads((BASE/"private-sources.json").read_text())
   if not any(n.get("id")=="local:"+rel for n in manifest["nodes"]):raise ValueError("Not indexed")
   folder,sep,tail=rel.partition("/")
   if not sep or folder not in ROOTS:raise ValueError("Unknown root")
   root=ROOTS[folder].resolve();target=(root/tail).resolve()
   if not target.is_relative_to(root) or not target.is_file() or target.is_symlink():raise ValueError("Invalid path")
   if target.suffix.lower() not in TEXT|IMAGES:raise ValueError("Unsupported preview format")
   if target.stat().st_size>1_000_000:raise ValueError("Preview size limit")
   body=target.read_bytes()
   if target.suffix.lower() in TEXT:
    body=body.decode("utf-8",errors="replace").encode("utf-8");mime="text/plain; charset=utf-8"
   else:mime=mimetypes.guess_type(target.name)[0] or "application/octet-stream"
   self.send_response(200);self.send_header("Content-Type",mime);self.send_header("Content-Length",str(len(body)));self.send_header("Cache-Control","no-store");self.send_header("X-Content-Type-Options","nosniff");self.send_header("Content-Security-Policy","default-src 'none'; sandbox");self.end_headers();self.wfile.write(body)
  except (OSError,ValueError,KeyError,UnicodeError):
   self.send_error(404,"Preview unavailable")
if __name__=="__main__":
 print("NOREX private explorer on http://127.0.0.1:8765/explorer.html",flush=True)
 ThreadingHTTPServer(("127.0.0.1",8765),Handler).serve_forever()
