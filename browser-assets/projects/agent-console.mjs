export const ATTACHMENT_LIMIT=2*1024*1024;
const textExtensions=/\.(txt|md|csv|json|js|mjs|ts|tsx|jsx|py|html|css|yaml|yml|xml|log|sql)$/i;
export function normalizeAttachments(input=[]){
 if(!Array.isArray(input)||input.length>4)throw Error('每条消息最多 4 个附件');let total=0;
 return input.map(item=>{
  if(!item||typeof item.name!=='string'||!item.name.trim()||item.name.length>160)throw Error('附件名称无效');
  const name=item.name.replace(/[\x00-\x1f/\\]/g,'_');
  if(item.kind==='text'){
   if(!textExtensions.test(name)||typeof item.text!=='string'||item.text.includes('\0')||item.text.includes('\ufffd'))throw Error('仅支持 UTF-8 文本与代码文件；PDF/Office 请先转成文本');
   const size=new TextEncoder().encode(item.text).length;if(size>65536)throw Error('文本附件不得超过 64 KB');total+=size;if(total>ATTACHMENT_LIMIT)throw Error('附件合计不得超过 2 MB');return {kind:'text',name,text:item.text,size};
  }
  if(item.kind!=='image'||typeof item.dataUrl!=='string')throw Error('附件格式不支持');
  const m=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(item.dataUrl);if(!m||m[2].length%4)throw Error('图片格式无效');
  let binary;try{binary=atob(m[2]);}catch{throw Error('图片编码无效');}
  const mime=m[1],valid=mime==='image/png'?binary.startsWith('\x89PNG\r\n\x1a\n'):mime==='image/jpeg'?binary.startsWith('\xff\xd8\xff'):binary.startsWith('RIFF')&&binary.slice(8,12)==='WEBP';
  if(!valid||binary.length>1024*1024)throw Error('仅支持有效的 PNG/JPEG/WebP 图片，单张不超过 1 MB');total+=binary.length;if(total>ATTACHMENT_LIMIT)throw Error('附件合计不得超过 2 MB');
  return {kind:'image',name,mime,dataUrl:item.dataUrl,size:binary.length};
 });
}
export async function readAttachments(files){
 const items=[];for(const file of files){
  if(file.size>1024*1024)throw Error(file.name+' 超过 1 MB，请压缩后添加');
  if(/^image\//.test(file.type)){
   const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));items.push({kind:'image',name:file.name,dataUrl:`data:${file.type};base64,${btoa(binary)}`});
  }else items.push({kind:'text',name:file.name,text:await file.text()});
 }return normalizeAttachments(items);
}
export function usageSummary(messages=[]){
 const replies=messages.filter(m=>m.source==='api'),known=replies.filter(m=>m.usage&&Number.isFinite(m.usage.input)&&Number.isFinite(m.usage.output));
 return {replies:replies.length,known:known.length,input:known.reduce((n,m)=>n+m.usage.input,0),output:known.reduce((n,m)=>n+m.usage.output,0),total:known.reduce((n,m)=>n+(Number.isFinite(m.usage.total)?m.usage.total:m.usage.input+m.usage.output),0)};
}
