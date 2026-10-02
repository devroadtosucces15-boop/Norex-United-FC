import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const root=fileURLToPath(new URL(".",import.meta.url));
const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8"};
createServer(async(req,res)=>{try{const raw=req.url==="/"?"index.html":req.url.split("?")[0].slice(1);const safe=normalize(raw).replace(/^(\.\.(\/|\\|$))+/, "");const file=join(root,safe);if(!file.startsWith(root)) throw new Error("outside root");const body=await readFile(file);res.writeHead(200,{"content-type":types[extname(file)]||"application/octet-stream","cache-control":"no-store"});res.end(body)}catch{res.writeHead(404,{"content-type":"text/plain"});res.end("Not found")}}).listen(Number(process.env.PORT||4177),"127.0.0.1",()=>console.log("Norex Dev OS Shadow: http://127.0.0.1:"+(process.env.PORT||4177)));
