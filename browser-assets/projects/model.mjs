// All project records below are local, synthetic fixtures. No model/network calls.
export const agents = {
 planner:{name:'规划整合区',shortName:'规划整合',letter:'规',label:'目标 · 计划 · 整合',description:'把想法拆成可执行的进程，搭建框架，整合成果。',color:'green'},
 executor:{name:'开发与执行区',shortName:'开发执行',letter:'执',label:'任务 · 开发 · 交付',description:'进入具体任务，完成数据处理、页面开发与修改。',color:'blue'},
 reviewer:{name:'审查区',shortName:'审查',letter:'审',label:'证据 · 复核 · 审查',description:'读取目标、成果和证据，指出问题，给出审查结论。',color:'purple'}
};
export const scenarios={working:'协作进行中',rework:'复验失败 · 返工',evidence:'终审证据不足'};
export const statusLabels={done:'已完成',active:'进行中',ready:'可开始',waiting:'等待前序',blocked:'有阻塞',archived:'已归档'};
export const definitions=[
 {id:'idea',title:'需求澄清与初步计划',owner:'planner',depends:[],goal:'将分散的用户反馈整理成看板，明确本轮目标、非目标和初步验收标准。',deliverable:'需求边界与初步计划',row:0,col:0},
 {id:'precheck',title:'方案可行性初审',owner:'reviewer',depends:['idea'],goal:'审查范围、实现风险和证据需求；不把模型置信度当作项目成功率。',deliverable:'初审意见与风险清单',row:0,col:1},
 {id:'confirm',title:'与你确认总计划',owner:'planner',depends:['precheck'],goal:'你与规划 Agent 核对范围，确认总计划后才进入框架与执行。',deliverable:'经你确认的总计划',human:true,row:0,col:2},
 {id:'architecture',title:'页面框架与任务拆解',owner:'planner',depends:['confirm'],goal:'定义数据字段、页面结构、接口约定，将数据处理与页面开发拆为并行任务。',deliverable:'页面框架与数据契约',row:0,col:3},
 {id:'data',title:'反馈数据整理与分类',owner:'executor',depends:['architecture'],goal:'按既定契约整理 24 条模拟反馈，保留来源、分类与原始编号，供看板使用。',deliverable:'分类数据集 fixture-v1',row:1,col:1},
 {id:'demo',title:'筛选与图表 Demo 开发',owner:'executor',depends:['architecture'],goal:'依照数据契约开发来源筛选、主题图表和反馈明细，三者使用同一数据口径。',deliverable:'可交互的反馈看板 Demo',row:1,col:2},
 {id:'integrate',title:'整合成果并独立复验',owner:'planner',depends:['data','demo'],goal:'合并数据与页面，独立检查筛选后计数、图表和明细一致；失败不得交付。',deliverable:'整合版本与复验记录 T-01',row:2,col:1},
 {id:'review',title:'成果与证据终审',owner:'reviewer',depends:['integrate'],goal:'对照确认后的验收标准，检查交付物、版本、数据来源和独立复验结果。缺材料不下通过结论。',deliverable:'终审报告与证据索引',row:2,col:2},
 {id:'accept',title:'交付给你验收',owner:'planner',depends:['review'],goal:'由你查看最终成果并明确验收。Agent 不代替你批准交付。',deliverable:'用户验收记录',human:true,row:2,col:3}
];
export const feedback=['导出体验','搜索效率','信息归档','协作流程','其他'].flatMap((category,i)=>Array.from({length:[8,6,5,3,2][i]},(_,j)=>({id:`F-${i+1}${j+1}`,category,source:j%2?'问卷反馈':'用户访谈',summary:{导出体验:'导出时保留分类与筛选条件',搜索效率:'按关键词快速定位反馈',信息归档:'相同主题的反馈自动归档',协作流程:'清楚看到任务由谁负责',其他:'支持舒适的阅读主题'}[category]})));
export function metrics(source='全部'){const rows=feedback.filter(r=>source==='全部'||r.source===source);return {rows,total:rows.length,groups:[...new Set(feedback.map(r=>r.category))].map(name=>{const count=rows.filter(r=>r.category===name).length;return {name,count,percent:rows.length?Math.round(count/rows.length*100):0};})};}
export function createProject(scenario='working',empty=false){
 if(!Object.hasOwn(scenarios,scenario))throw new Error('未知演示场景');
 const nodes=definitions.map(n=>({...structuredClone(n),completed:!empty&&n.row===0,started:!empty&&scenario==='working'&&n.id==='data',block:null,version:1,messages:[],draft:'',output:null,conversationId:`chat-${n.id}`,archived:false}));
 if(!empty&&scenario!=='working')for(const n of nodes)if(['data','demo'].includes(n.id))n.completed=true;
 if(!empty&&scenario==='rework')nodes.find(n=>n.id==='integrate').block='test';
 if(!empty&&scenario==='evidence'){nodes.find(n=>n.id==='integrate').completed=true;nodes.find(n=>n.id==='review').block='evidence';}
 for(const n of nodes)if(n.completed)n.output={version:1,text:`${n.deliverable}：载入的演示快照，并非真实模型产物。`};
 return {scenario,nodes,events:[{title:empty?'从需求澄清开始':'载入演示项目快照',detail:'本地预置数据；没有真实模型或工具运行。'}]};
}
export function nodeById(project,id){const n=project.nodes.find(n=>n.id===id);if(!n)throw new Error('未找到对应进程');return n;}
export const activeNodes=project=>project.nodes.filter(n=>!n.archived);
export function nodeStatus(project,id){const n=nodeById(project,id);if(n.archived)return 'archived';if(n.block)return 'blocked';if(n.completed)return 'done';if(n.depends.some(d=>nodeById(project,d).archived||!nodeById(project,d).completed))return 'waiting';return n.started?'active':'ready';}
export function progress(project){const nodes=activeNodes(project),done=nodes.filter(n=>n.completed).length;return {done,total:nodes.length,percent:nodes.length?Math.round(done/nodes.length*100):0};}
export function nextForAgent(project,owner){if(!Object.hasOwn(agents,owner))throw new Error('未知 Agent');const candidates=activeNodes(project).filter(n=>n.owner===owner);return ['blocked','active','ready','waiting','done'].flatMap(status=>candidates.filter(n=>nodeStatus(project,n.id)===status))[0]?.id||null;}
export function descendants(project,id){const result=new Set();let changed=true;while(changed){changed=false;for(const n of activeNodes(project))if(!result.has(n.id)&&n.depends.some(d=>d===id||result.has(d))){result.add(n.id);changed=true;}}return [...result];}
function invalidate(project,id){for(const target of [id,...descendants(project,id)]){const n=nodeById(project,target);n.completed=false;n.started=false;n.output=null;n.block=null;n.version++;}}
export function act(project,id,action,payload={}){
 if(action==='bind'){if(!Object.hasOwn(agents,id)||typeof payload.channelId!=='string'||(payload.channelId&&!/^channel-[a-z0-9-]{8,64}$/.test(payload.channelId)))throw new Error('渠道绑定无效');const next=structuredClone(project);next.bindings={...next.bindings,[id]:payload.channelId};next.events.push({title:'更新区域 API 渠道',detail:'仅影响后续对话，不改变历史消息或成果。'});return next;}
 if(['add','archive','restore'].includes(action))return changeGraph(project,id,action,payload);
 const next=structuredClone(project),n=nodeById(next,id),status=nodeStatus(project,id);let title;if(n.archived)throw new Error('请先恢复已归档节点');
 if(action==='send'){
  if(project.isExample===false)throw new Error('请配置 API 渠道后发送消息');
  const text=String(payload.text||'').trim();if(!text)throw new Error('先写下你想与 Agent 讨论的内容');if(text.length>3000)throw new Error('单条输入最多 3000 字');
  n.messages.push({role:'user',text,owner:n.owner,version:n.version});n.messages.push({role:'assistant',owner:n.owner,version:n.version,text:`【本地示例回复，非真实模型推理】\n已将你的补充放入「${n.title}」的进程上下文。\n当前目标：${n.goal}\n${status==='waiting'?'前序尚未完成，可以先讨论，但不能执行或交付。':n.human?'此处需要你明确确认；对话不会自动批准。':'可在右侧查看交付要求，使用演示按钮体验进程推进。'}\n此原型不实际分析输入，不生成代码或调用工具。`});n.draft='';title=`在「${n.title}」中新增本地演示对话`;
 }else if(action==='start'){
  if(status!=='ready'||n.human)throw new Error('当前进程不可由 Agent 启动');n.started=true;title=`开始：${n.title}${project.isExample===false?'（手动标记）':'（模拟）'}`;
 }else if(action==='complete'||action==='approve'){
  if(status==='waiting'||status==='blocked'||status==='done')throw new Error('前序未完成、存在阻塞或本进程已完成');
  if(n.human&&action!=='approve')throw new Error('此进程需要用户明确确认');
  if(!n.human&&(action!=='complete'||status!=='active'))throw new Error('请先开始此进程');
  n.completed=true;n.started=false;n.output={version:n.version,text:project.isExample===false?`${n.deliverable}\n目标：${n.goal}\n状态：${n.human?'用户明确确认':'用户手动标记完成'}。此记录不代表工具已执行或证据已验证。`:`${n.deliverable}（本地预置示例）\n目标：${n.goal}\n状态：${n.human?'用户在演示中明确确认':'模拟提交完成'}。非实际模型运行结果。`};title=`${n.human?'你已确认':project.isExample===false?'手动完成':'模拟提交'}：${n.title}`;
 }else if(action==='resolve'){
  if(!n.block)throw new Error('当前没有可处理的阻塞');title=n.block==='test'?'模拟修复失败项，等待重新整合复验':'模拟补齐来源，等待重新终审';n.block=null;n.started=false;
 }else if(action==='reopen'){
  if(status!=='done')throw new Error('只有已完成进程可重新打开');invalidate(next,id);title=`重开：${n.title}；所有下游成果和批准已失效`;
 }else if(action==='edit'){
  const name=String(payload.title||'').trim(),goal=String(payload.goal||'').trim();if(!name||!goal||name.length>45||goal.length>1000||!Object.hasOwn(agents,payload.owner))throw new Error('请填写有效名称、目标与负责区域');
  const depends=payload.depends===undefined?n.depends:validateDependencies(next,id,payload.depends);const deliverable=payload.deliverable===undefined?n.deliverable:validText(payload.deliverable,120,'交付要求');const changed=name!==n.title||goal!==n.goal||payload.owner!==n.owner||JSON.stringify(depends)!==JSON.stringify(n.depends)||deliverable!==n.deliverable;if(!changed)return next;
  invalidate(next,id);n.title=name;n.goal=goal;n.owner=payload.owner;n.depends=depends;n.deliverable=deliverable;title=`调整：${n.title}；本进程和所有下游成果/批准已重置`;
 }else throw new Error('不支持的操作');
 next.events.push({title,detail:'工作区记录更新；不代表真实模型或工具执行。'});return next;
}

function validText(value,max,label){const text=typeof value==='string'?value.trim():'';if(!text||text.length>max)throw new Error(`${label}需为 1–${max} 字`);return text;}
export function validateDependencies(project,id,depends){
 if(!Array.isArray(depends)||depends.length>60||new Set(depends).size!==depends.length)throw new Error('前序依赖无效');
 const downstream=new Set(descendants(project,id));
 for(const dep of depends)if(typeof dep!=='string'||dep===id||downstream.has(dep)||!activeNodes(project).some(n=>n.id===dep))throw new Error('依赖不可指向自己、下游或已归档节点');
 return [...depends];
}
function changeGraph(project,id,action,payload){
 const next=structuredClone(project);let title;
 if(action==='add'){
  if(activeNodes(next).length>=60||next.nodes.length>=200)throw new Error('当前最多 60 个活动节点、200 个含归档节点');
  if(typeof id!=='string'||!/^node-[a-z0-9-]{8,64}$/.test(id)||next.nodes.some(n=>n.id===id))throw new Error('节点标识无效或已存在');
  if(!Object.hasOwn(agents,payload.owner))throw new Error('请选择工作区域');
  let depends=payload.depends??[],insertionTarget=null;
  if(payload.placement!==undefined){
   const placement=payload.placement;
   if(!placement||!['after','parallel','between'].includes(placement.kind))throw new Error('新增位置无效');
   const anchor=nodeById(next,placement.anchor);if(anchor.archived)throw new Error('不能从已归档节点增加分支');
   depends=placement.kind==='parallel'?[...anchor.depends]:[anchor.id];
   if(placement.kind==='between'){
    insertionTarget=nodeById(next,placement.target);
    if(insertionTarget.archived||!insertionTarget.depends.includes(anchor.id))throw new Error('这条连线已经改变，请刷新后重新选择');
    if(payload.confirmImpact!==true)throw new Error('请明确确认插入后受影响的下游成果与批准将失效');
   }
  }
  const node={id,title:validText(payload.title,45,'节点名称'),goal:validText(payload.goal,1000,'任务目标'),deliverable:validText(payload.deliverable,120,'交付要求'),owner:payload.owner,depends:validateDependencies(next,id,depends),human:payload.human===true,completed:false,started:false,block:null,version:1,messages:[],draft:'',output:null,archived:false,conversationId:`chat-${id}`};
  next.nodes.push(node);
  if(insertionTarget){
   insertionTarget.depends=insertionTarget.depends.map(dep=>dep===payload.placement.anchor?id:dep);
   invalidate(next,insertionTarget.id);
  }
  title=`${insertionTarget?'连线插入节点，下游成果与批准失效':'新增节点与独立对话'}：${node.title}`;
 }else if(action==='archive'){
  const node=nodeById(next,id);if(node.archived)throw new Error('节点已经归档');
  const affected=descendants(next,id);if(affected.length&&!payload.cascade)throw new Error('此节点有下游依赖，请确认一并归档，或先调整下游依赖');
  for(const target of [id,...affected]){const n=nodeById(next,target);n.archived=true;n.archiveBatch=id;}
  title=`归档 ${affected.length+1} 个节点；对话与成果保留`;
 }else{
  const node=nodeById(next,id);if(!node.archived)throw new Error('节点未归档');
  const restoring=new Set(next.nodes.filter(n=>n.archived&&n.archiveBatch===node.archiveBatch).map(n=>n.id));
  let added=true;while(added){added=false;for(const target of [...restoring])for(const dep of nodeById(next,target).depends)if(nodeById(next,dep).archived&&!restoring.has(dep)){restoring.add(dep);added=true;}}
  if(activeNodes(next).length+restoring.size>60)throw new Error('恢复后超过 60 个活动节点上限');
  for(const target of restoring){const n=nodeById(next,target);n.archived=false;delete n.archiveBatch;}
  for(const target of restoring)invalidate(next,target);
  title=`恢复 ${restoring.size} 个节点，包含必要上游；原对话保留，成果需重新执行`;
 }
 next.events.push({title,detail:'节点与对话一一绑定，同一项目使用同一工作目录；未调用模型。'});return next;
}
// A topological layout, independent of the initial fixture's rows/columns.
export function graphLayout(project,mobile=false){
 const nodes=activeNodes(project),depth=new Map(),visiting=new Set();
 function level(n){if(depth.has(n.id))return depth.get(n.id);if(visiting.has(n.id))throw new Error('进程图存在循环');visiting.add(n.id);const d=n.depends.length?1+Math.max(...n.depends.map(id=>level(nodeById(project,id)))):0;visiting.delete(n.id);depth.set(n.id,d);return d;}
 nodes.forEach(level);const width=mobile?320:960,cardWidth=mobile?128:204,cardHeight=mobile?184:146,gap=mobile?36:24,columns=mobile?2:4,positions={},layers=[];let y=50;
 for(const d of [...new Set(depth.values())].sort((a,b)=>a-b)){
  const group=nodes.filter(n=>depth.get(n.id)===d);layers.push({label:`第 ${d+1} 层`,y:y-26});
  for(let start=0;start<group.length;start+=columns){const row=group.slice(start,start+columns),w=mobile&&row.length===1?248:cardWidth,x0=(width-(row.length*w+(row.length-1)*gap))/2;row.forEach((n,i)=>{positions[n.id]={x:x0+i*(w+gap),y,width:w,height:cardHeight};});y+=cardHeight+70;}
 }
 const edges=nodes.flatMap(n=>n.depends.map(from=>{const a=positions[from],b=positions[n.id];const x=a.x+a.width/2,sy=a.y+a.height,tx=b.x+b.width/2,ty=b.y;return {from,to:n.id,x:(x+tx)/2,y:(sy+ty)/2,d:`M${x} ${sy} C${x} ${(sy+ty)/2} ${tx} ${(sy+ty)/2} ${tx} ${ty}`};}));
 return {width,height:Math.max(230,y),positions,edges,layers};
}

export function createWorkspaceProject(title,description='',template='standard'){
 const p=createProject('working',true);p.title=title;p.description=description;p.isExample=false;p.bindings={};
 const tasks={idea:['需求与初步计划','明确项目目标、边界与验收标准','初步计划'],precheck:['方案初审','检查可行性、风险与证据需求','初审意见'],confirm:['确认总计划','由用户明确确认项目范围和总计划','经用户确认的计划'],architecture:['框架与任务拆解','制定项目结构、任务与交付接口','总框架与任务清单'],data:['数据与市场调研','收集并整理可追溯的数据和资料','调研记录与来源'],demo:['开发与执行','根据已确认框架完成实现与验证','实现成果与验证记录'],integrate:['成果整合与复验','整合执行成果，核对验收标准','整合版本与复验记录'],review:['最终审查','审核成果、来源和验证证据','审查结论'],accept:['用户验收','由用户查看成果并明确验收','验收记录']};
 for(const n of p.nodes){[n.title,n.goal,n.deliverable]=tasks[n.id];if(description)n.goal+=`。项目背景：${description}`;n.goal=n.goal.slice(0,1000);}
 if(template==='blank')p.nodes=[];
 p.events=[{title:'创建项目',detail:template==='blank'?'空白流程':'标准协作流程，尚未开始执行'}];return p;
}

// Public fixture reconstructed from the approved project structure, never from private state.
export const releaseExampleId='project-test-example';
export function createReleaseExample(){
 const p=createWorkspaceProject('项目测试','多Agent协作的闭环平台');
 Object.assign(p,{id:releaseExampleId,isExample:true,distributedExample:true,revision:0,storage:'built-in',directory:'内置示例 · 不关联私人目录'});
 p.events=[{title:'打开内置示例',detail:'公开演示，不含原使用者的渠道、聊天或附件；页面内改动刷新后还原。'}];
 const idea=p.nodes.find(n=>n.id==='idea');
 idea.messages=[
  {role:'user',text:'【演示提问】我想做一个多 Agent 协作平台，怎样拆分工作？',version:1,source:'sample'},
  {role:'assistant',owner:'planner',version:1,source:'sample',text:'【人工编写的演示回复，未调用模型】\n先明确目标和验收标准，再交给审查区检查风险。由你确认总计划后，拆分调研与开发两条并行分支，最后汇合复验、终审，并由你验收。\n你可以点击流程节点查看各自的独立对话。选择“复制为我的项目”后，在三个区域配置自己的 API，开始真实协作。'}
 ];
 return p;
}
