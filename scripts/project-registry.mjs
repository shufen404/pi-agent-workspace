import {existsSync,readdirSync,lstatSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createProjectStore,defaultProjectDirectory,safeDirectory} from './project-store.mjs';
import {createWorkspaceProject,createReleaseExample,releaseExampleId} from '../browser-assets/projects/model.mjs';
const fail=(message,statusCode=400)=>{throw Object.assign(new Error(message),{statusCode});};
export function createProjectRegistry({root=dirname(defaultProjectDirectory),includeReleaseExample=false}={}){
 root=resolve(root);
 const valid=id=>id==='feedback-insight'||/^project-[a-f0-9-]{36}$/.test(id);
 function get(id){if(includeReleaseExample&&id===releaseExampleId)return {read:createReleaseExample,command(){fail('内置示例不可保存，请先复制为自己的项目',403);},async chat(){fail('内置示例不调用模型，请先复制为自己的项目',403);}};if(!valid(id))fail('项目标识无效');const dir=join(root,id);if(id!=='feedback-insight'&&!existsSync(join(dir,'.pi-project/state.json')))fail('项目不存在',404);safeDirectory(dir);return createProjectStore({directory:dir});}
 function list(){safeDirectory(root);if(!includeReleaseExample)get('feedback-insight').read();const records=readdirSync(root).filter(valid).filter(id=>lstatSync(join(root,id)).isDirectory()&&!lstatSync(join(root,id)).isSymbolicLink()).map(id=>{const p=get(id).read();return {id:p.id,title:p.title,description:p.description||'',isExample:p.isExample!==false,createdAt:p.createdAt||'',total:p.nodes.filter(n=>!n.archived).length,done:p.nodes.filter(n=>!n.archived&&n.completed).length};}).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));if(includeReleaseExample){const p=createReleaseExample();records.unshift({id:p.id,title:p.title,description:p.description,isExample:true,distributedExample:true,createdAt:'',total:p.nodes.length,done:0});}return records;}
 function create({requestId,title,description='',template='standard'}={}){
  if(typeof requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(requestId)||typeof title!=='string'||!title.trim()||title.trim().length>60||typeof description!=='string'||description.length>500||!['standard','blank',...(includeReleaseExample?['project-test']:[])].includes(template))fail('项目名称需为 1–60 字，简介最多 500 字');
  const id=`project-${requestId}`,directory=join(root,id),fingerprint=createHash('sha256').update(JSON.stringify({title:title.trim(),description,template})).digest('hex');
  if(existsSync(join(directory,'.pi-project/state.json'))){const p=get(id).read();if(p.creationFingerprint!==fingerprint)fail('重复创建请求内容不一致',409);return p;}
  if(list().length>=50)fail('当前最多支持 50 个项目');
  const p=createWorkspaceProject(title.trim(),description,template==='project-test'?'standard':template);p.id=id;p.creationFingerprint=fingerprint;p.createdAt=new Date().toISOString();
  return createProjectStore({directory,initialProject:p}).read();
 }
 return {get,list,create};
}
