const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountWorkspace(document,host,{projects,create,openProject}){
 const $=id=>document.getElementById(id);
 document.body.classList.add('workspace-level');$('breadcrumb').textContent='项目工作空间';document.querySelector('.demo-notice').hidden=true;document.querySelector('.top-actions').hidden=true;
 $('main').innerHTML='<section class="workspace-empty" aria-label="项目工作空间"><button class="new-project-tile" id="new-project" aria-label="新建项目"><span aria-hidden="true">＋</span></button></section>';
 mountProjectRail(document,{projects,openProject});
 const newProject=()=>{
  document.body.classList.remove('project-nav-open');$('sidebar-backdrop').hidden=true;$('toggle-projects').setAttribute('aria-expanded','false');
  $('dialog-title').textContent='新建项目';$('dialog-body').innerHTML='<form id="new-project-form"><label class="field">项目名称<input name="title" maxlength="60" required autofocus placeholder="给项目起个名字"></label><label class="field">项目目标<textarea name="description" maxlength="500" rows="3"></textarea></label><label class="field">起始流程<select name="template"><option value="standard">标准协作流程</option><option value="blank">空白流程</option></select></label><button class="primary" type="submit">创建项目</button><p class="form-error" role="alert"></p></form>';
  const requestId=host.crypto.randomUUID(),form=$('new-project-form');$('detail-dialog').showModal();
  form.onsubmit=async e=>{e.preventDefault();const payload={requestId,title:form.querySelector('[name=title]').value,description:form.querySelector('[name=description]').value,template:form.querySelector('[name=template]').value};const controls=[...form.querySelectorAll('button,input,textarea,select')];controls.forEach(x=>x.disabled=true);try{const p=await create(payload);openProject(p.id);}catch(error){form.querySelector('.form-error').textContent=error.message;controls.forEach(x=>x.disabled=false);}};
 };
 $('new-project').onclick=newProject;document.getElementById('rail-new-project').onclick=newProject;
 $('close-dialog').onclick=()=>$('detail-dialog').close();
 if(host.location?.hash==='#new')newProject();
}

export function mountProjectRail(document,{projects,currentId,openProject,newProject}){
 const toggle=document.getElementById('toggle-projects'),backdrop=document.getElementById('sidebar-backdrop');
 const closeNav=()=>{document.body.classList.remove('project-nav-open');backdrop.hidden=true;toggle.setAttribute('aria-expanded','false');};
 toggle.onclick=()=>{const open=document.body.classList.toggle('project-nav-open');backdrop.hidden=!open;toggle.setAttribute('aria-expanded',String(open));};backdrop.onclick=closeNav;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('project-nav-open')){closeNav();toggle.focus();}});
 let rail=document.getElementById('project-rail');
 if(!rail){rail=document.createElement('aside');rail.id='project-rail';rail.className='project-rail';rail.setAttribute('aria-label','项目列表');document.querySelector('.sidebar').insertBefore(rail,document.querySelector('.future-spaces'));}
 rail.innerHTML=`<div class="rail-heading"><h2>项目</h2><button class="icon-button" id="rail-new-project" ${!currentId&&!projects.some(p=>!p.isExample)?'hidden':''} aria-label="新建项目">＋</button></div><nav class="rail-projects">${projects.filter(p=>!p.isExample||p.distributedExample).map(p=>`<button class="rail-project ${p.id===currentId?'current':''}" data-project-id="${esc(p.id)}" ${p.id===currentId?'aria-current="page"':''}><span class="rail-project-icon">▤</span><span class="rail-project-info"><strong>${esc(p.title)}${p.distributedExample?'<small class="example-label">示例</small>':''}</strong><span class="rail-progress"><i style="width:${p.total?p.done/p.total*100:0}%"></i></span></span></button>`).join('')}</nav>`;
 rail.querySelectorAll('[data-project-id]').forEach(b=>b.onclick=()=>openProject(b.dataset.projectId));
 if(newProject)document.getElementById('rail-new-project').onclick=newProject;
}

export function mountSpace(document,{space}){
 const learning=space==='learning',name=learning?'学习空间':'生活空间';
 const modules=learning?[
  ['◷','专注学习','番茄钟与学习计划','专注计时、学习计划与任务安排将在这里接入。'],
  ['◈','热讯与资料','信息浏览与分类','学习热讯与分类资料将独立于工作项目管理；当前未接入实时资讯。'],
  ['▤','学习记录','日常记录与阶段整理','学习过程、阶段复盘与资料归档将在这里汇总。']
 ]:[
  ['♡','陪伴对话','独立的个人聊天空间','个人陪伴对话尚未接入模型；不会自动读取工作项目中的对话。'],
  ['◇','个人记忆','由你确认的长期信息','个人记忆系统尚未接入，当前不会自动提取、保存或发送个人信息。'],
  ['▤','生活记录','日常想法与信息整理','日常信息与生活记录将在这里独立管理，不写入工作项目。']
 ];
 document.body.classList.add('space-level');
 document.getElementById('breadcrumb').textContent=name;
 document.querySelector('.demo-notice').hidden=true;document.querySelector('.top-actions').hidden=true;
 document.querySelectorAll('.nav-item').forEach(el=>{const selected=el.id===space+'-nav';el.classList.toggle('selected',selected);if(selected)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
 mountProjectRail(document,{projects:[],openProject(){}});
 document.getElementById('main').innerHTML=`<section class="space-page"><header class="space-hero"><span class="eyebrow">${learning?'LEARNING':'LIFE'} SPACE</span><h1>${name}</h1><p>${learning?'留一段时间，专注成长。':'留一个空间，安放日常。'}</p></header><div class="space-modules" aria-label="${name}板块">${modules.map((m,i)=>`<button class="space-module" data-module="${i}" aria-pressed="${i===0}" aria-controls="space-panel"><i class="space-symbol" aria-hidden="true">${m[0]}</i><strong>${m[1]}</strong><span>${m[2]}</span></button>`).join('')}</div><section class="space-panel" id="space-panel" aria-live="polite"></section></section>`;
 const show=i=>{document.querySelectorAll('[data-module]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.module)===i)));document.getElementById('space-panel').innerHTML=`<h2>${modules[i][1]}</h2><p>${modules[i][3]}</p><span class="space-status">空间已开放 · 功能待接入</span>`;};
 document.querySelectorAll('[data-module]').forEach(b=>b.onclick=()=>show(Number(b.dataset.module)));show(0);
}
