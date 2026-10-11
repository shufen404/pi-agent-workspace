// Static-only feature: no credential/config/runtime imports and no execution API.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const assetRoot=new URL('../browser-assets/projects/',import.meta.url);
export const projectAssets=new Map([
 ['/workbench/projects/agent-console.mjs',['agent-console.mjs','text/javascript; charset=utf-8']],
 ['/workbench/projects',['index.html','text/html; charset=utf-8']],
 ['/workbench/projects/',['index.html','text/html; charset=utf-8']],
 ['/workbench/projects/style.css',['style.css','text/css; charset=utf-8']],
 ['/workbench/projects/app.mjs',['app.mjs','text/javascript; charset=utf-8']],
 ['/workbench/projects/channels-ui.mjs',['channels-ui.mjs','text/javascript; charset=utf-8']],
 ['/workbench/projects/workspace.mjs',['workspace.mjs','text/javascript; charset=utf-8']],
 ['/workbench/projects/client.mjs',['client.mjs','text/javascript; charset=utf-8']],
 ['/workbench/projects/model.mjs',['model.mjs','text/javascript; charset=utf-8']]
]);
export function readProjectAsset(pathname){const asset=projectAssets.get(pathname);return asset?{body:readFileSync(fileURLToPath(new URL(asset[0],assetRoot))),type:asset[1]}:null;}
export function registerProjectWorkspace(app){for(const path of projectAssets.keys())app.get(path,async(_req,reply)=>{const asset=readProjectAsset(path);return reply.header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff').type(asset.type).send(asset.body);});}
