import http from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
const root = process.cwd();
const mime = {'.json':'application/json', '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.png':'image/png', '.jpg':'image/jpeg', '.mp4':'video/mp4', '.pdf':'application/pdf', '.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
 try {
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+sep)||pathname.split('/').some(p=>p.startsWith('.'))){res.writeHead(403).end();return;}
  const info=await stat(file);if(!info.isFile()){res.writeHead(404).end();return;}
  let start=0,end=info.size-1,status=200;
  const headers={'Content-Type':mime[extname(file)]||'application/octet-stream','Accept-Ranges':'bytes'};
  if(req.headers.range){
   const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}
   if(!match[1])start=Math.max(0,info.size-Number(match[2]));
   else {start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}
   status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
  }
  headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);
  if(req.method==='HEAD'||!info.size){res.end();return;}
  const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
 }catch{if(!res.headersSent)res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log(`RAYA → http://localhost:${process.env.PORT||3000}`));
