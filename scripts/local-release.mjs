// Standalone, loopback-only local edition. Never imports or starts the native Pi runtime.
import {existsSync,openSync,closeSync,writeFileSync,unlinkSync,realpathSync} from 'node:fs';
import {homedir} from 'node:os';
import {resolve,join,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {createPreviewServer} from './project-preview.mjs';
import {createProjectRegistry} from './project-registry.mjs';
import {createChannelStore} from './project-channels.mjs';
import {safeDirectory} from './project-store.mjs';
import {releaseExampleId} from '../browser-assets/projects/model.mjs';

export function defaultDataRoot(){return join(homedir(),'.pi-agent-workspace');}
export function createLocalApplication({dataRoot=defaultDataRoot()}={}){
 if(!isAbsolute(dataRoot))throw new Error('数据目录必须使用绝对路径');
 const root=realpathSync(safeDirectory(dataRoot));
 const registry=createProjectRegistry({root:join(root,'projects'),includeReleaseExample:true});
 // No matching against the author's .env, Pi model config, or any sibling app.
 const channels=createChannelStore({directory:join(root,'connections'),localMatchRoot:null});
 return {server:createPreviewServer({registry,channels,runtime:{edition:'standalone',nativeChatPath:null,version:'0.9.0-preview.2'}}),root,registry};
}
export function acquireDataLock(root){
 const lock=join(root,'.instance.lock');let fd;
 try{fd=openSync(lock,'wx',0o600);}catch(e){if(e.code==='EEXIST')throw new Error('此数据目录已被锁定。请先关闭另一启动窗口；若上次异常退出，请确认进程已停止后再删除数据目录中的 .instance.lock。');throw e;}
 try{writeFileSync(fd,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));}catch(e){closeSync(fd);unlinkSync(lock);throw e;}closeSync(fd);
 let released=false;return ()=>{if(!released){released=true;if(existsSync(lock))unlinkSync(lock);}};
}
function openBrowser(url){
 const command=process.platform==='darwin'?['open',url]:process.platform==='win32'?['cmd.exe','/c','start','',url]:['xdg-open',url];
 const child=spawn(command[0],command.slice(1),{stdio:'ignore',windowsHide:true});child.on('error',()=>console.log('请复制上面的地址到浏览器打开。'));child.unref();
}
export async function startLocalApplication({dataRoot=defaultDataRoot(),port=0,noOpen=false}={}){
 if(!Number.isInteger(port)||port<0||port>65535)throw new Error('端口必须为 0–65535 的整数');
 const {server,root,registry}=createLocalApplication({dataRoot});const release=acquireDataLock(root);
 server.once('close',release);
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});}catch(e){release();throw e;}
 const url=`http://127.0.0.1:${server.address().port}/workbench/projects?project=${releaseExampleId}#project`;
 console.log(`Pi Agent 工作空间 · 本地预览版\n打开：${url}\n数据：${root}\n按 Ctrl+C 停止。仅供本机访问，不是公网服务。`);
 if(!noOpen)openBrowser(url);
 return {server,root,registry,url};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(Number(process.versions.node.split('.')[0])<22){console.error('请先安装 Node.js 22 或更高版本。');process.exitCode=1;}
 else{
  try{
   const {server}=await startLocalApplication({dataRoot:process.env.PI_WORKSPACE_DATA_DIR||defaultDataRoot(),port:process.env.PI_LOCAL_PORT===undefined?0:Number(process.env.PI_LOCAL_PORT),noOpen:process.argv.includes('--no-open')});
   let closing=false;const stop=()=>{if(closing)return;closing=true;console.log('正在等待当前请求结束并关闭…');server.close();};
   process.once('SIGINT',stop);process.once('SIGTERM',stop);
  }catch(error){console.error(`无法启动：${error.message}`);process.exitCode=1;}
 }
}
