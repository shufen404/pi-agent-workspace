// Shared by the embedded app and the optional preview; one data store and API policy.
import {fileURLToPath} from 'node:url';
import {createProjectRegistry} from './project-registry.mjs';
import {createChannelStore} from './project-channels.mjs';
export const projectApiPrefix='/workbench/projects/api/';
export const projectReadRoutes=['runtime','project','projects','channels'];
export const projectWriteRoutes=['commands','projects/create','channels/save','channels/remove','channels/verify','channels/detect','channels/discover','chat'];
const fail=(message,statusCode)=>{throw Object.assign(new Error(message),{statusCode});};
export const projectBodyLimit=route=>route==='chat'?3*1024*1024:32768;
export function checkProjectRequest({headers,method,port,route}){
 const hosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
 const origins=new Set([...hosts].map(host=>`http://${host}`));
 if(!hosts.has(headers.host)||(headers.origin!==undefined&&!origins.has(headers.origin))||headers['sec-fetch-site']==='cross-site')fail('Only same-origin localhost access is allowed.',403);
 const write=projectWriteRoutes.includes(route);
 if(!(write?method==='POST':method==='GET'||method==='HEAD'))fail(write?'POST only':'GET only',405);
 if(write&&(!origins.has(headers.origin)||headers.origin!==`http://${headers.host}`||headers['x-project-client']!=='pi-workspace'||!/^application\/json(?:;|$)/i.test(headers['content-type']||'')))fail('Requires same-origin JSON project client',403);
}
export function createProjectApi({runtime={edition:'preview',nativeChatPath:null},store,registry=createProjectRegistry(),channels=createChannelStore({localMatchRoot:fileURLToPath(new URL('../',import.meta.url))})}={}){
 return async function execute(route,url,command){
  if(route==='runtime')return {edition:runtime.edition,nativeChatPath:runtime.nativeChatPath,version:runtime.version};
  const selectedStore=()=>store||registry.get(url.searchParams.get('project')||'feedback-insight');
  if(route==='project')return {project:selectedStore().read()};
  if(route==='projects')return {projects:registry.list()};
  if(route==='channels')return channels.read();
  if(!command||typeof command!=='object'||Array.isArray(command))fail('Invalid command',400);
  if(route==='projects/create')return {project:registry.create(command)};
  if(['channels/detect','channels/discover','channels/save','channels/remove'].includes(route))return channels[route.split('/')[1]](command);
  if(route==='channels/verify'){
   if(command.revision!==channels.read().revision)fail('渠道已更新，请重新打开设置',409);
   return channels.verify(command);
  }
  if(route==='chat'){
   if(command.payload?.channelRevision!==channels.read().revision)fail('渠道配置已改变，请刷新后重新确认发送',409);
   if(!channels.has(command.payload?.channelId))fail('请先配置区域 API 渠道',400);
   return {project:await selectedStore().chat(command,(project,node)=>channels.reply(command.payload.channelId,project,node))};
  }
  if(route!=='commands')fail('Not found',404);
  if(command.action==='bind'&&command.payload?.channelId&&!channels.has(command.payload.channelId))fail('请选择已保存的 API 渠道',400);
  return {project:selectedStore().command(command)};
 };
}
export const projectApiError=e=>({error:e.statusCode?e.message:'本地读写失败；请保留输入后重试，未覆盖原文件。'});
export function registerProjectApi(app,{port=8504,...options}={}){
 const execute=createProjectApi({runtime:{edition:'desktop',nativeChatPath:'/workbench'},...options});
 // Encapsulation prevents the upstream SPA fallback/parser from swallowing API errors.
 app.register(async api=>{
  api.setErrorHandler((error,_req,reply)=>reply.code(error.statusCode||500).send(projectApiError(error)));
  for(const route of [...projectReadRoutes,...projectWriteRoutes]){
   const write=projectWriteRoutes.includes(route);
   api.route({method:['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'],url:projectApiPrefix+route,bodyLimit:projectBodyLimit(route),
    onRequest:async(req,reply)=>{
     reply.header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff');
     checkProjectRequest({headers:req.headers,method:req.method,port,route});
    },
    handler:async(req,reply)=>{
     const result=await execute(route,new URL(req.raw.url,'http://localhost'),write?req.body:undefined);
     return req.method==='HEAD'?reply.type('application/json').send():result;
    }
   });
  }
  api.all(projectApiPrefix+'*',async(_req,reply)=>reply.code(404).send({error:'Unknown project API route'}));
 });
}
