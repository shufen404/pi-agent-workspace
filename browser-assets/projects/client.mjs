import {mount} from './app.mjs';
import {mountWorkspace,mountProjectRail,mountSpace} from './workspace.mjs';
const endpoint='/workbench/projects/api/',projectId=new URL(location.href).searchParams.get('project');
const space=new URL(location.href).searchParams.get('space');
const chatLink=document.getElementById('chat-mode-link');
let runtime={edition:'standalone',nativeChatPath:null};
function syncChatLink(){
 if(runtime.nativeChatPath==='/workbench')chatLink.href='/workbench?returnTo='+encodeURIComponent(location.href);
}
window.addEventListener('hashchange',syncChatLink);chatLink.addEventListener('click',syncChatLink);
const openProject=id=>location.assign('/workbench/projects?project='+encodeURIComponent(id)+'#project');
const pendingRequests=new Map();
async function request(path,payload){
 const response=await fetch(endpoint+path+(projectId?'?project='+encodeURIComponent(projectId):''),payload===undefined?undefined:{method:'POST',headers:{'Content-Type':'application/json','X-Project-Client':'pi-workspace'},body:JSON.stringify(payload)});let data;
 try{data=await response.json();}catch{throw new Error('项目服务响应异常，请重试；若持续出现，请重启工作台。');}
 if(!response.ok)throw new Error(data.error||'本地项目保存失败');return data;
}
async function execute(command){const key=JSON.stringify(command),requestId=pendingRequests.get(key)||crypto.randomUUID();pendingRequests.set(key,requestId);const data=await request(command.action==='chat'?'chat':'commands',{...command,requestId});pendingRequests.delete(key);return data.project;}
async function boot(){
 const main=document.getElementById('main');main.textContent='正在读取…';
 try{
  runtime=await request('runtime').catch(()=>({edition:'standalone',nativeChatPath:null}));syncChatLink();
  if(!runtime.nativeChatPath){chatLink.hidden=!projectId;const projectLink=document.getElementById('project-mode-link');if(projectLink)projectLink.href=projectId?'?project='+encodeURIComponent(projectId)+'#project':'/workbench/projects';}
  if(runtime.edition==='standalone'&&runtime.version){const version=document.querySelector('footer span:last-child');if(version)version.textContent='LOCAL '+runtime.version;}
  if(['learning','life'].includes(space)){mountSpace(document,{space});return;}
  if(!projectId){const data=await request('projects');mountWorkspace(document,window,{projects:data.projects,create:async payload=>(await request('projects/create',payload)).project,openProject:id=>location.assign('/workbench/projects?project='+encodeURIComponent(id)+'#project')});return;}
  const [data,channels,list]=await Promise.all([request('project'),request('channels'),request('projects')]);
  mountProjectRail(document,{projects:list.projects,currentId:projectId,openProject:id=>location.assign('/workbench/projects?project='+encodeURIComponent(id)+'#project'),newProject:()=>location.assign('/workbench/projects#new')});
  const example=data.project.distributedExample===true;
  mount(document,window,{initialProject:data.project,embeddedChat:!runtime.nativeChatPath,execute:example?undefined:execute,channels:example?{revision:0,channels:[]}:channels,manageChannels:example?undefined:(action,payload)=>request('channels/'+action,payload),createFromExample:async payload=>(await request('projects/create',payload)).project,openProject});
 }catch(e){main.replaceChildren();const p=document.createElement('p');p.textContent=e.message;const retry=document.createElement('button');retry.className='primary';retry.textContent='重新读取';retry.onclick=boot;main.append(p,retry);}
}
boot();
