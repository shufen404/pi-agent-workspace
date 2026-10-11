// Dedicated project records. No Pi runtime, credential, or existing session imports.
import {readFileSync,writeFileSync,renameSync,mkdirSync,lstatSync,existsSync,unlinkSync} from 'node:fs';
import {resolve,dirname,join,parse} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {normalizeAttachments} from '../browser-assets/projects/agent-console.mjs';
import {createProject,act} from '../browser-assets/projects/model.mjs';
export const defaultProjectDirectory=fileURLToPath(new URL('../workspace/project-spaces/feedback-insight/',import.meta.url));
const error=(message,statusCode=400)=>Object.assign(new Error(message),{statusCode});
export function safeDirectory(path){
 const absolute=resolve(path);let current=parse(absolute).root;
 for(const part of absolute.slice(current.length).split('/').filter(Boolean)){current=join(current,part);if(!existsSync(current))mkdirSync(current,{mode:0o700});const stat=lstatSync(current);if(stat.isSymbolicLink()||!stat.isDirectory())throw error('项目存储目录不可为符号链接或普通文件',500);}
 return absolute;
}
export function createProjectStore({directory=defaultProjectDirectory,initialProject}={}){
 const root=resolve(directory),folder=join(root,'.pi-project'),file=join(folder,'state.json');
 function check(){safeDirectory(folder);if(existsSync(file)&&(!lstatSync(file).isFile()||lstatSync(file).isSymbolicLink()))throw error('项目记录文件不安全，停止读写',500);}
 function write(data){
  check();const text=JSON.stringify(data,null,2);if(Buffer.byteLength(text)>8*1024*1024)throw error('项目记录已达到 8 MB 上限，请先导出整理',413);
  const temp=join(folder,`.state-${randomUUID()}.tmp`);try{writeFileSync(temp,text,{mode:0o600,flag:'wx'});renameSync(temp,file);}finally{if(existsSync(temp))unlinkSync(temp);}
 }
 function load(){
  check();if(!existsSync(file)){
   const project=initialProject?structuredClone(initialProject):createProject();project.id=project.id||'feedback-insight';project.title=project.title||'用户反馈洞察看板 MVP';project.directory=root;project.revision=0;project.storage='local-file';
   for(const n of project.nodes)n.conversationId=`session-${randomUUID()}`;
   write({schema:1,project,requests:[]});
  }
  let data;try{data=JSON.parse(readFileSync(file,'utf8'));}catch{throw error('项目记录无法读取，已停止写入以保护原文件',500);}
  if(data.schema!==1||data.project?.directory!==root||!Array.isArray(data.project?.nodes)||!Number.isInteger(data.project?.revision)||!Array.isArray(data.requests))throw error('项目记录格式不兼容，未覆盖原文件',500);
  return data;
 }
 return {
  read(){return structuredClone(load().project);},
  async chat(command,reply){
   const {requestId,revision,id,payload={}}=command||{};
   if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(requestId)||!Number.isInteger(revision)||typeof id!=='string'||typeof payload.text!=='string'||(!payload.text.trim()&&!payload.attachments?.length)||payload.text.length>3000||payload.consent!==true)throw error('请填写消息并确认发送至所选渠道');
   let attachments;try{attachments=normalizeAttachments(payload.attachments);}catch(e){throw error(e.message);}
   const data=load(),digest=createHash('sha256').update(JSON.stringify({id,text:payload.text,channelId:payload.channelId,attachments})).digest('hex');data.chats??=[];
   const previous=data.chats.find(r=>r.id===requestId);
   if(previous){if(previous.digest!==digest)throw error('重复请求标识与内容不匹配',409);if(previous.status==='pending')throw error('请求仍在处理或结果不确定，未重复发送。请稍后刷新。',409);return structuredClone(data.project);}
   if(revision!==data.project.revision)throw error('项目已更新，请刷新后发送',409);
   const n=data.project.nodes.find(x=>x.id===id);if(!n||n.archived)throw error('节点不存在或已归档');
   if(!payload.channelId||data.project.bindings?.[n.owner]!==payload.channelId)throw error('区域渠道已改变，请刷新后发送',409);
   if(n.messages.length>=400)throw error('此节点对话已达上限');
   if(data.chats.filter(r=>r.status==='pending').length>=3)throw error('项目已有三个待处理请求，请稍后再试',409);
   const job={id:requestId,digest,status:'pending',nodeId:id,owner:n.owner,version:n.version,channelId:payload.channelId};data.chats.push(job);
   data.chats=[...data.chats.filter(r=>r.status==='pending'),...data.chats.filter(r=>r.status!=='pending').slice(-200)];
   n.run={status:'pending',startedAt:new Date().toISOString(),requestId};n.messages.push({role:'user',text:payload.text.trim(),attachments,owner:n.owner,version:n.version,requestId,createdAt:new Date().toISOString()});n.draft='';data.project.revision++;write(data);
   let result,failed=false;try{result=await reply(structuredClone(data.project),structuredClone(n));}catch{failed=true;result={text:'请求失败或结果不确定；未自动重试。请检查渠道，重新发送可能产生额外费用。'};}
   const latest=load(),target=latest.project.nodes.find(x=>x.id===id),record=latest.chats.find(r=>r.id===requestId);
   target.messages.push({role:'assistant',text:String(result.text).slice(0,30000),owner:job.owner,version:job.version,source:failed?'error':'api',channelId:job.channelId,model:result.model||'',requestId,usage:result.usage||null,latencyMs:Number.isFinite(result.latencyMs)?result.latencyMs:null,reasoningSummary:result.reasoningSummary||'',context:result.context||null,createdAt:new Date().toISOString()});record.status=failed?'failed':'complete';target.run={...target.run,status:record.status,finishedAt:new Date().toISOString()};
   latest.project.revision++;latest.project.updatedAt=new Date().toISOString();latest.project.events.push({title:failed?'模型请求失败':'收到模型回复',detail:'仅对话，不执行文件操作或自动批准任务。'});write(latest);return structuredClone(latest.project);
  },
  command(command){
   if(!command||typeof command!=='object'||Array.isArray(command))throw error('请求格式无效');
   if(Buffer.byteLength(JSON.stringify(command))>32768)throw error('Request too large',413);
   const {requestId,revision,id,action,payload={}}=command;
   if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(requestId)||!Number.isInteger(revision)||revision<0||typeof id!=='string'||id.length>80||!['add','edit','archive','restore','send','start','complete','approve','resolve','reopen','bind'].includes(action)||!payload||typeof payload!=='object'||Array.isArray(payload))throw error('节点操作格式无效');
   const data=load(),digest=createHash('sha256').update(JSON.stringify({id,action,payload})).digest('hex'),previous=data.requests.find(r=>r.id===requestId);
   if(previous){if(previous.digest!==digest)throw error('重复请求标识与内容不匹配',409);return structuredClone(data.project);}
   if(revision!==data.project.revision)throw error('另一个窗口已更新项目。请保留输入并刷新后重试，未覆盖对方修改。',409);
   if(action==='send'&&data.project.nodes.find(n=>n.id===id)?.messages.length>=400)throw error('此节点已达到 200 轮示例对话上限');
   let next;try{next=act(data.project,id,action,payload);}catch(e){throw error(e.message);}
   if(action==='add')next.nodes.find(n=>n.id===id).conversationId=`session-${randomUUID()}`;
   next.revision=data.project.revision+1;next.updatedAt=new Date().toISOString();
   data.project=next;data.requests.push({id:requestId,digest});data.requests=data.requests.slice(-200);write(data);return structuredClone(next);
  }
 };
}
