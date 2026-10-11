// Isolated project records; optional read-only Pi Key matching, never starts or mutates Pi runtime.
import {createServer} from 'node:http';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readProjectAsset} from './project-workspace.mjs';
import {createProjectApi,projectApiPrefix,projectReadRoutes,projectWriteRoutes,projectBodyLimit,checkProjectRequest,projectApiError} from './project-api.mjs';
export function createPreviewServer(options={}){const execute=createProjectApi(options);return createServer(async(req,res)=>{
 const port=req.socket.localPort,hosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]),origins=new Set([...hosts].map(host=>`http://${host}`));
 const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 if(!hosts.has(req.headers.host)||(req.headers.origin!==undefined&&!origins.has(req.headers.origin))||req.headers['sec-fetch-site']==='cross-site')return json(403,{error:'Only same-origin localhost access is allowed.'});
 let path,url;try{url=new URL(req.url,'http://localhost');path=url.pathname;}catch{return json(400,{error:'Invalid URL'});}
 const route=path.startsWith(projectApiPrefix)?path.slice(projectApiPrefix.length):null;
 if([...projectReadRoutes,...projectWriteRoutes].includes(route)){
  try{
   checkProjectRequest({headers:req.headers,method:req.method,port,route});
   let command;
   if(projectWriteRoutes.includes(route)){
    const chunks=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>projectBodyLimit(route))return json(413,{error:'Request too large'});chunks.push(chunk);}
    try{command=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return json(400,{error:'Invalid JSON'});}
   }
   return json(200,await execute(route,url,command));
  }catch(e){return json(e.statusCode||500,projectApiError(e));}
 }
 if(route!==null)return json(404,{error:'Unknown project API route'});
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
 if(path==='/'){res.writeHead(302,{Location:'/workbench/projects'});res.end();return;}
 const asset=readProjectAsset(path);if(!asset){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':asset.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"});res.end(req.method==='HEAD'?undefined:asset.body);
 });}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const port=Number(process.env.PI_PROJECT_PREVIEW_PORT||8514),server=createPreviewServer();
 server.on('error',e=>{console.error(`Preview could not start: ${e.message}`);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log(`Pi project preview: http://127.0.0.1:${port}/workbench/projects`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
