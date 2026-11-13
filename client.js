window.__ModuleLoader__.load({
  id: '@local/sidebar-groups',
  factory(require) {
    const React = require('react');
    const {Modal} = require('@deepseek-ai/dsh-client-ui-primitives');
    const h = React.createElement;
    const KEY = 'local.sidebar-space.groups.v2';
    const ENTRY_MIME = 'application/x-lss-entry';
    const GROUP_MIME = 'application/x-lss-group';
    const defaults = () => ({groupingVersion:1,groups:['common','tools','development','data','creative','learning','system','other'],names:{},assignments:{},open:{},order:[],footer:false,footerHidden:{},footerOpen:{},footerOrder:[]});
    function clean(value) {
      const base = defaults();
      if (!value || typeof value !== 'object') return base;
      const groups = Array.isArray(value.groups) ? [...new Set(value.groups.filter(x=>typeof x==='string' && x.length>0 && x.length<80))].slice(0,30) : base.groups;
      base.groups = ['common',...groups.filter(x=>x!=='common')];
      if (value.groupingVersion !== 1) for (const id of ['development','data','creative']) if (!base.groups.includes(id)) base.groups.splice(base.groups.indexOf('other') < 0 ? base.groups.length : base.groups.indexOf('other'),0,id);
      for (const key of ['names','assignments','open','footerHidden','footerOpen']) if (value[key] && typeof value[key]==='object' && !Array.isArray(value[key])) base[key] = {...value[key]};
      base.order = Array.isArray(value.order) ? [...new Set(value.order.filter(x=>typeof x==='string' && x.length<200))].slice(0,500) : [];
      base.footer = value.footer === true;
      base.footerOrder = Array.isArray(value.footerOrder) ? [...new Set(value.footerOrder.filter(x=>typeof x==='string'&&x.length<200))].slice(0,100) : [];
      return base;
    }
    // Local, deterministic classification. No requests, model, or plugin-specific ID table.
    const categoryRules = [
      ['learning', ['学习','教育','教学','课程','练习','背单词','词汇','教练','考试','刷题'], /\b(learn(?:ing)?|education|tutorials?|courses?|tutor|coach|quiz|flashcards?|vocabulary|study)\b/],
      ['development', ['开发','编程','代码','调试','终端','仓库','版本控制','接口测试'], /\b(develop(?:ment|er)?|coding|code|debug(?:ger)?|terminal|git|github|repository|compiler|sdk|ide)\b/],
      ['data', ['数据分析','数据查询','数据库','报表','图表','可视化','统计','表格','决策'], /\b(data|database|sql|analytics|analysis|charts?|dashboard|statistics|spreadsheet|decision)\b/],
      ['creative', ['写作','绘画','画图','图像','图片','视频','音频','音乐','设计','创作','文案'], /\b(writ(?:e|er|ing)|image|photo|video|audio|music|design|creative|canvas|drawing)\b/],
      ['system', ['插件','扩展','市场','设置','配置','账号','账户','余额','额度','用量','费用','移动访问'], /\b(plugins?|extensions?|market(?:place)?|settings?|config(?:uration)?|accounts?|quota|usage|cost|billing|mobile)\b/],
      ['tools', ['效率','工具','任务','日程','定时','提醒','笔记','便签','便利贴','上下文','智能体','工作流','自动化','剪贴板'], /\b(productivity|tools?|tasks?|schedules?|scheduler|calendar|reminders?|notes?|sticky|context|agents?|superagent|workflow|automation|clipboard)\b/],
    ];
    function metadataText(value) {
      if (typeof value === 'string') return value.slice(0,2000).normalize('NFKC').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replace(/[_-]+/g,' ');
      return Array.isArray(value) ? value.slice(0,30).filter(x=>typeof x==='string').map(metadataText).join(' ') : '';
    }
    function classify(item) {
      const sources = [[item.category,12],[item.categories,12],[item.tags,8],[item.label,4],[item.description,2],[item.id,1]].map(([value,weight])=>[metadataText(value),weight]);
      // Teaching intent (e.g. SQL coach) outranks its technical subject.
      const scores = categoryRules.map(([id,words,english])=>({id,score:sources.reduce((sum,[value,weight])=>sum+(value&&(english.test(value)||words.some(word=>value.includes(word)))?weight*(id==='learning'?1.75:1):0),0)})).sort((a,b)=>b.score-a.score);
      // Generic descriptions and weak/ambiguous identifiers should not guess a category.
      return scores[0].score>=4 && scores[0].score-scores[1].score>=2 ? scores[0].id : 'other';
    }
    function groupOf(item, prefs) {
      const id=item.id;
      if (Object.hasOwn(prefs.assignments,id) && prefs.groups.includes(prefs.assignments[id])) return prefs.assignments[id];
      const suggested=classify(item);
      return prefs.groups.includes(suggested) ? suggested : prefs.groups.includes('other') ? 'other' : 'common';
    }
    function ordered(items,p) {
      const ranks = new Map(p.order.map((id,index)=>[id,index]));
      return [...items].sort((a,b)=>(ranks.get(a.id)??10000)-(ranks.get(b.id)??10000));
    }
    function moveEntry(p,items,id,group,before) {
      if(!items.some(item=>item.id===id)||!p.groups.includes(group)||before===id)return p;
      const next={...p,assignments:{...p.assignments,[id]:group},open:{...p.open,[group]:true}};
      const ids=ordered(items,p).map(item=>item.id).filter(key=>key!==id);
      let index=before ? ids.indexOf(before) : -1;
      if(index<0){const last=ids.findLastIndex(key=>groupOf(items.find(item=>item.id===key),next)===group);index=last<0?ids.length:last+1;}
      ids.splice(index,0,id);
      // Preserve absent plugins' saved order as well as their assignments.
      next.order=[...ids,...p.order.filter(key=>!items.some(item=>item.id===key))];
      return next;
    }
    const icon = (kind,size=16) => h('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.65,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},
      kind==='settings' ? [h('path',{key:1,d:'M4 7h9m4 0h3M4 17h3m4 0h9'}),h('circle',{key:2,cx:15,cy:7,r:2}),h('circle',{key:3,cx:9,cy:17,r:2})] :
      kind==='grip' ? [6,12,18].flatMap(y=>[h('circle',{key:`8-${y}`,cx:8,cy:y,r:.75,fill:'currentColor',stroke:'none'}),h('circle',{key:`14-${y}`,cx:14,cy:y,r:.75,fill:'currentColor',stroke:'none'})]) :
      kind==='panel' ? [h('rect',{key:1,x:4,y:4,width:16,height:16,rx:3}),h('path',{key:2,d:'M10 4v16'})] :
      kind==='plus' ? h('path',{d:'M12 5v14M5 12h14'}) :
      kind==='search' ? [h('circle',{key:1,cx:10.5,cy:10.5,r:6.5}),h('path',{key:2,d:'m16 16 4 4'})] :
      kind==='folder' ? h('path',{d:'M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Zm0 3h18'}) :
      kind==='folderOpen' ? [h('path',{key:1,d:'M3 17V5a1 1 0 0 1 1-1h5l2 3h9v3'}),h('path',{key:2,d:'M3 20 6 10h16l-3 10H3Z'})] :
      kind==='usage' ? [h('path',{key:1,d:'M4 20V4m0 16h16M9 16v-5m5 5V7m5 9V4'})] :
      kind==='up' ? h('path',{d:'m6 15 6-6 6 6'}) :
      kind==='down' ? h('path',{d:'m6 9 6 6 6-6'}) :
      kind==='close' ? h('path',{d:'m6 6 12 12M18 6 6 18'}) :
      kind==='trash' ? h('path',{d:'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5'}) :
      h('path',{d:'m9 5 7 7-7 7'}));
    const css = `
.lss-root{--lss-bg:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-1,#fafafa));height:100%;min-height:0;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;padding:6px 10px;gap:8px;color:var(--dsw-alias-label-primary);background:var(--lss-bg);font-size:14px;overflow:hidden}
.lss-root>.lss-scroll{flex:1 1 0;min-height:0;min-width:0;display:flex;flex-direction:column;gap:8px;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-gutter:stable;overscroll-behavior:contain}.lss-scroll>*{flex-shrink:0}.lss-root button,.lss-root input,.lss-modal button,.lss-modal input,.lss-modal select{font:inherit;color:inherit;box-sizing:border-box}.lss-root button,.lss-modal button{cursor:pointer}.lss-root button:focus-visible,.lss-modal button:focus-visible,.lss-modal input:focus-visible,.lss-modal select:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#6157ed);outline-offset:2px}
.lss-control{border:0;background:transparent;border-radius:8px;padding:7px 9px;min-height:32px;display:flex;align-items:center;gap:9px;text-align:left}.lss-control:hover,.lss-control[aria-current=page]{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.1))}.lss-icon-button{display:inline-flex;justify-content:center;align-items:center;flex:none;width:28px;height:28px;padding:5px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary)}.lss-icon-button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.1))}
.lss-top{position:sticky;top:-6px;z-index:2;display:flex;align-items:center;justify-content:space-between;min-height:32px;background:var(--lss-bg)}.lss-top-actions{display:flex;align-items:center;gap:2px}.lss-brand{display:flex;align-items:center;gap:8px;min-width:0;overflow:hidden;font-weight:600}.lss-brand svg{max-width:28px;max-height:28px}html[data-platform=darwin] .lss-top{height:40px;justify-content:flex-end}html[data-platform=darwin] .lss-top .lss-brand{display:none}
.lss-new{justify-content:center;width:100%;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.14));background:var(--dsw-alias-bg-base,transparent);min-height:36px}.lss-nav{flex:0 0 auto;overflow:visible;max-height:none;min-height:0}.lss-ungrouped{border-radius:8px;margin:0 0 4px}.lss-root:not([data-compact=true]) .lss-row.lss-root-row{padding-left:8px}.lss-ungrouped-card{grid-column:1/-1}.lss-ungrouped[data-drop=true]{background:var(--dsw-alias-state-business-primary-tint,rgba(98,87,237,.07));outline:1px solid var(--dsw-alias-state-business-primary,#6157ed);outline-offset:-1px}.lss-row{width:100%;min-width:0}.lss-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.lss-group{border-radius:8px;padding-bottom:3px}.lss-group-title{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:4px 8px;min-height:26px;font-size:12px;color:var(--dsw-alias-label-secondary)}.lss-group-title button{display:flex;align-items:center;gap:6px;flex:1;font:inherit;color:inherit;border:0;background:transparent;text-align:left;padding:0;min-height:24px}.lss-chevron{display:inline-flex;transform:rotate(0deg);transition:transform .15s}.lss-chevron[data-open=true]{transform:rotate(90deg)}.lss-count{font-variant-numeric:tabular-nums;opacity:.55;font-size:11px}.lss-workspaces{display:flex;flex-direction:column;flex:1 0 auto;min-height:0;overflow:visible;min-width:0;margin-top:4px}
/* The native browser is content-sized here; only .lss-scroll owns scrolling. */
.lss-workspaces [data-sidebar-list-area]{overflow:visible}
.lss-workspaces [class*="_root"],.lss-workspaces [class*="_listArea"],.lss-workspaces [class*="_treeBody"]{flex:0 0 auto!important;min-height:0!important;max-height:none!important;height:auto!important;min-width:0}.lss-workspaces [role=tree]{flex:0 0 auto!important;overflow:visible!important;max-height:none!important;height:auto!important;scrollbar-gutter:auto!important;margin-right:0!important;min-width:0}.lss-workspaces [class*="_fade"]{display:none}.lss-foot{flex:0 0 auto}.lss-footer-body{overflow:visible;max-height:none}.lss-settings{flex:0 0 auto;min-width:0;margin-top:0;background:var(--lss-bg)}.lss-error{font-size:12px;margin:0;padding:5px;color:var(--dsw-alias-state-error-primary,#bd3c39)}
.lss-root[data-compact=true]{padding:6px;align-items:stretch}.lss-root[data-compact=true] .lss-row{justify-content:center;padding:8px}.lss-root[data-compact=true] .lss-brand{display:none}
.lss-section-head{display:flex;align-items:center;gap:4px;height:36px;margin:3px 0 4px;padding-left:4px;color:var(--dsw-alias-label-tertiary,#858991);font-size:13px}.lss-section-label{flex:1;min-width:0;white-space:nowrap}.lss-section-actions{display:flex;align-items:center;gap:2px}.lss-section-head .lss-icon-button{color:inherit}.lss-search-field{min-width:0;flex:1;display:flex;align-items:center;gap:5px;height:30px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:8px;padding:0 5px;color:var(--dsw-alias-label-secondary)}.lss-search-field input{width:0;min-width:0;flex:1;border:0;outline:0;background:transparent;color:inherit;font:inherit}.lss-search-field .lss-icon-button{width:22px;height:22px;padding:3px}.lss-group-title{min-height:32px;padding:2px 8px;color:var(--dsw-alias-label-primary);font-size:13px}.lss-group-title button{min-height:32px;gap:9px}.lss-group-heading{display:flex;align-items:center;gap:9px;min-height:32px}.lss-group-title svg{color:var(--dsw-alias-label-tertiary,#858991);flex:none}.lss-root:not([data-compact=true]) .lss-row{padding-left:34px;min-height:34px}.lss-search-empty{margin:0;padding:8px;color:var(--dsw-alias-label-tertiary);font-size:12px}
.lss-foot{border-top:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.12));padding-top:6px;margin-top:8px}.lss-foot .lss-section-head{margin:0;height:30px;font-size:12px}.lss-footer-item{border-radius:8px;margin:2px 0}.lss-footer-summary{list-style:none;display:flex;align-items:center;gap:9px;min-height:32px;padding:5px 8px;box-sizing:border-box;font-size:12px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:8px}.lss-footer-summary::-webkit-details-marker{display:none}.lss-footer-summary:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.08))}.lss-footer-summary>span{flex:1}.lss-footer-summary>svg:last-child{width:11px;height:11px;transition:transform .15s}.lss-footer-item[open]>.lss-footer-summary>svg:last-child{transform:rotate(90deg)}.lss-footer-content{padding:4px 4px 8px}.lss-footer-tool .dsh-mobile-control__trigger{display:flex!important;align-items:center;justify-content:flex-start!important;gap:9px!important;width:100%!important;min-height:32px!important;height:auto!important;padding:5px 8px!important;margin:0!important;border:0!important;background:transparent!important;font-size:12px!important;border-radius:8px!important;color:var(--dsw-alias-label-secondary)!important}.lss-footer-tool .dsh-mobile-control__trigger:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.08))!important}.lss-footer-tool .dsh-mobile-control__trigger-label{display:inline!important;opacity:1!important}.lss-footer-tool .dsh-mobile-control__trigger-icon{width:16px!important;height:16px!important}.lss-footer-config{display:flex;flex-direction:column;gap:8px}.lss-footer-config-row{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.14));border-radius:10px}.lss-footer-config-row>label{display:flex;align-items:center;gap:10px;flex:1;cursor:pointer;min-width:0}.lss-footer-config-row input[type=checkbox]{accent-color:var(--dsw-alias-state-business-primary,#6157ed);width:16px;height:16px}.lss-footer-mode{border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:7px;padding:4px 6px;background:transparent;font-size:12px!important}.lss-footer-config-order{display:flex;gap:2px}.lss-icon-button:disabled{opacity:.25;cursor:default}.lss-settings{margin-top:6px}
.lss-modal{width:min(760px,calc(100vw - 40px))!important;max-width:760px!important;border-radius:18px!important;color:var(--dsw-alias-label-primary);font-size:14px}.lss-modal-content{max-height:min(76vh,760px)!important;overflow-y:auto!important;scrollbar-width:thin}.lss-manager-toolbar{display:flex;align-items:center;gap:8px;justify-content:space-between;margin:0 0 18px}.lss-hint{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}.lss-manager-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:12px}.lss-card{min-width:0;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.18));border-radius:12px;background:var(--dsw-alias-bg-layer-1,rgba(128,128,128,.025));padding:10px;transition:border-color .12s,background .12s}.lss-card-head{display:flex;align-items:center;gap:3px;padding:0 0 8px}.lss-grip{cursor:grab!important;color:var(--dsw-alias-label-tertiary,#888)}.lss-grip:active{cursor:grabbing!important}.lss-group-name{width:0;min-width:0;flex:1;border:1px solid transparent;border-radius:6px;background:transparent;padding:5px;font-weight:600!important}.lss-group-name:hover,.lss-group-name:focus{border-color:var(--dsw-alias-border-l1,#ddd);background:var(--dsw-alias-bg-base,transparent)}.lss-card-rows{min-height:38px;border-radius:8px}.lss-item{display:flex;align-items:center;gap:6px;min-width:0;min-height:38px;border-radius:7px;padding:3px 5px;background:var(--dsw-alias-bg-base,rgba(128,128,128,.035));margin:4px 0;cursor:grab}.lss-item,.lss-grip{user-select:none;touch-action:none}.lss-item[draggable=true]:active{cursor:grabbing}.lss-item-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:13px}.lss-item-move{appearance:none;text-align:center;padding:0;width:28px;height:26px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:5px}.lss-drop-empty{min-height:46px;display:flex;align-items:center;justify-content:center;border:1px dashed var(--dsw-alias-border-l1,rgba(128,128,128,.2));border-radius:8px;font-size:12px;color:var(--dsw-alias-label-tertiary,#888)}.lss-card[data-drop=true],.lss-group[data-drop=true]{background:var(--dsw-alias-state-business-primary-tint,rgba(98,87,237,.07));outline:1px solid var(--dsw-alias-state-business-primary,#6157ed);outline-offset:-1px}.lss-item[data-drop=true],.lss-row[data-drop=true]{box-shadow:inset 0 2px var(--dsw-alias-state-business-primary,#6157ed)}.lss-item[data-dragging=true]{opacity:.4}.lss-add-group{display:flex;gap:8px;align-items:center;margin-top:18px}.lss-add-group input{min-width:0;flex:1;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:8px;padding:8px 10px;color:inherit;background:var(--dsw-alias-bg-base,transparent)}.lss-button{border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.2));border-radius:8px;background:transparent;padding:8px 14px;min-height:34px;font-size:13px}.lss-button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.07))}.lss-button:disabled{opacity:.4;cursor:default}.lss-button-primary{background:var(--dsw-alias-state-business-primary,#6157ed);border-color:transparent;color:white!important}.lss-button-primary:hover{filter:brightness(.95);background:var(--dsw-alias-state-business-primary,#6157ed)}.lss-dialog-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%}.lss-dialog-actions{display:flex;gap:8px}.lss-text-button{border:0;background:transparent;padding:5px 0;color:var(--dsw-alias-label-secondary)!important;font-size:12px!important}.lss-status{min-height:18px;margin-top:12px;font-size:12px;color:var(--dsw-alias-label-secondary)}
@media(max-width:600px){.lss-manager-grid{grid-template-columns:1fr}.lss-modal{width:calc(100vw - 24px)!important}.lss-manager-toolbar{align-items:flex-start}.lss-dialog-footer{flex-wrap:wrap}}@media(prefers-reduced-motion:reduce){.lss-chevron,.lss-card{transition:none}}
`;
    return {
      inject:['slots','locale','layout','uiWorkspace'],
      apply(ctx) {
        const ns='local-sidebar-space';
        const zh={title:'分组侧栏',common:'不分组',tools:'效率工具',learning:'学习',system:'插件管理',other:'其他',new:'新会话',collapse:'收起侧栏',expand:'展开侧栏',manage:'管理分组',add:'添加分组',name:'新分组名称',hint:'新插件按名称与分类信息自动归组；手动拖动后优先使用你的设置。拖动分组标题可排序；不分组的插件直接显示在顶部。',extras:'底部扩展',reset:'恢复默认',saveError:'无法保存设置，本次修改仅临时生效。',openError:'入口暂不可用，请检查对应插件是否已启用。',empty:'拖动入口到这里',move:'移动到分组',remove:'删除空分组',rename:'分组名称',drag:'拖动',cancel:'取消',save:'保存更改',close:'关闭',saved:'更改在保存后生效',moved:'已移动入口，保存后生效',reordered:'已调整分组顺序，保存后生效'};
        const en={title:'Grouped sidebar',common:'Ungrouped',tools:'Productivity',learning:'Learning',system:'Plugin management',other:'Other',new:'New session',collapse:'Collapse sidebar',expand:'Expand sidebar',manage:'Manage groups',add:'Add group',name:'New group name',hint:'New plugins are grouped locally by their names and metadata. Your manual moves take priority. Drag group headers to reorder. Ungrouped plugins appear directly at the top.',extras:'Footer extensions',reset:'Reset defaults',saveError:'Settings could not be saved; changes are temporary.',openError:'This panel is unavailable. Check whether its plugin is enabled.',empty:'Drop entries here',move:'Move to group',remove:'Remove empty group',rename:'Group name',drag:'Drag',cancel:'Cancel',save:'Save changes',close:'Close',saved:'Changes take effect when saved',moved:'Entry moved. Save to apply.',reordered:'Group reordered. Save to apply.'};
        Object.assign(zh,{ungroupedDrop:'拖到这里，不分组',development:'开发',data:'数据分析',creative:'创作',wall:'插件墙',search:'搜索插件',searchPlaceholder:'搜索插件名称',clearSearch:'清除插件搜索',noResults:'没有匹配的插件',footerTitle:'状态与工具',footerSettings:'底部组件设置',footerHint:'选择侧栏底部显示的组件、顺序和默认展开方式。余额、额度的字段与账号仍可在「费用」设置中调整。',usage:'用量与余额',mobile:'移动访问',sessionPlugins:'Cordis 插件',show:'显示',collapsed:'默认收起',expanded:'默认展开',moveUp:'上移',moveDown:'下移',noFooter:'当前没有底部组件'});
        Object.assign(en,{ungroupedDrop:'Drop here to ungroup',development:'Development',data:'Data & analysis',creative:'Creative',wall:'Plugin wall',search:'Search plugins',searchPlaceholder:'Search plugin names',clearSearch:'Clear plugin search',noResults:'No matching plugins',footerTitle:'Status & tools',footerSettings:'Footer components',footerHint:'Choose which components appear, their order, and whether they start expanded. Balance and quota details remain in Cost settings.',usage:'Usage & balance',mobile:'Mobile access',sessionPlugins:'Cordis plugins',show:'Show',collapsed:'Start collapsed',expanded:'Start expanded',moveUp:'Move up',moveDown:'Move down',noFooter:'No footer components available'});
        for(const [lang,dict]of Object.entries({'zh-CN':zh,zh,en}))ctx.effect(()=>ctx.locale.register(ns,lang,dict));
        const t=ctx.locale.bind(ns);
        let prefs;try{prefs=clean(JSON.parse(localStorage.getItem(KEY)));}catch{prefs=defaults();}
        let snapshot={prefs,error:false};
        const listeners=new Set();
        const settings={getSnapshot:()=>snapshot,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}};
        const change=next=>{
          let error=false;try{localStorage.setItem(KEY,JSON.stringify(next));}catch{error=true;}
          snapshot={prefs:next,error};listeners.forEach(fn=>fn());
        };
        // Always derive toggles from the latest snapshot, including delayed details events.
        const update=fn=>change(fn(snapshot.prefs));
        ctx.effect(()=>{const receive=e=>{if(e.key!==KEY)return;try{snapshot={prefs:clean(JSON.parse(e.newValue)),error:false};listeners.forEach(fn=>fn());}catch{}};window.addEventListener('storage',receive);return()=>window.removeEventListener('storage',receive);});
        let rows=[];const rowListeners=new Set();
        const sync=()=>{
          const next=ctx.slots.entriesOfSlot('sidebar.panellist').map(({options})=>({id:options.id,order:options.order??0,label:(typeof options.label==='function'?options.label():options.label)||options.id,description:typeof options.description==='string'?options.description:'',category:typeof options.category==='string'?options.category:'',categories:Array.isArray(options.categories)?options.categories.filter(x=>typeof x==='string'):[],tags:Array.isArray(options.tags)?options.tags.filter(x=>typeof x==='string'):[]})).sort((a,b)=>a.order-b.order);
          if(JSON.stringify(next)===JSON.stringify(rows))return;rows=next;rowListeners.forEach(fn=>fn());
        };
        ctx.effect(()=>ctx.slots.subscribe('sidebar.panellist',sync));ctx.effect(()=>ctx.locale.subscribe(sync));
        const panels={getSnapshot:()=>rows,subscribe:fn=>{rowListeners.add(fn);return()=>rowListeners.delete(fn);}};
        // These entries host notifications/dialogs, rather than sidebar widgets.
        const runtimeFooterIds=new Set(['cost-meter-display-onboarding','cost-meter-codex-compat','cost-meter-peak-alert']);
        let footerRows=[];const footerListeners=new Set();
        const syncFooter=()=>{
          const next=ctx.slots.entriesOfSlot('sidebar.footer.action').map(({options})=>({id:options.id,order:options.order??0,label:(typeof options.label==='function'?options.label():options.label)||({'cost-meter':t('usage'),'dsh-mobile':t('mobile'),'cordis-panel':t('sessionPlugins')}[options.id])||options.id,runtime:runtimeFooterIds.has(options.id),direct:options.id==='dsh-mobile'||options.id==='cordis-panel'||(options.id!=='cost-meter'&&!options.label)})).sort((a,b)=>a.order-b.order);
          if(JSON.stringify(next)===JSON.stringify(footerRows))return;footerRows=next;footerListeners.forEach(fn=>fn());
        };
        ctx.effect(()=>ctx.slots.subscribe('sidebar.footer.action',syncFooter));ctx.effect(()=>ctx.locale.subscribe(syncFooter));
        const footerItems={getSnapshot:()=>footerRows,subscribe:fn=>{footerListeners.add(fn);return()=>footerListeners.delete(fn);}};
        // Keep the legacy common ID for saved assignments, but present it as ungrouped.
        const title=(p,id)=>id==='common'?t('common'):Object.hasOwn(p.names,id)&&typeof p.names[id]==='string'&&p.names[id].trim()?p.names[id]:t(id);
        function useDrag(p,items,setPrefs,onStatus) {
          const active=React.useRef(null);
          const pointer=React.useRef(null);
          const suppress=React.useRef(0);
          const [hover,setHover]=React.useState(null);
          const [dragging,setDragging]=React.useState(null);
          React.useEffect(()=>()=>pointer.current?.cancel(),[]);
          React.useEffect(()=>{
            if(!dragging)return;
            // Match the desktop host's native drag acceptance, scoped to this plugin.
            const accept=e=>{if(!active.current)return;e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';};
            document.addEventListener('dragover',accept);document.addEventListener('drop',accept);
            return()=>{document.removeEventListener('dragover',accept);document.removeEventListener('drop',accept);};
          },[dragging]);
          const read=e=>{
            if(active.current)return active.current;
            const entry=e.dataTransfer?.getData(ENTRY_MIME);if(entry&&items.some(item=>item.id===entry))return{kind:'entry',id:entry};
            const group=e.dataTransfer?.getData(GROUP_MIME);if(group&&p.groups.includes(group))return{kind:'group',id:group};
            return null;
          };
          const start=(e,kind,id)=>{if(pointer.current){e.preventDefault();return;}e.stopPropagation();active.current={kind,id};setDragging(id);if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData(kind==='entry'?ENTRY_MIME:GROUP_MIME,id);e.dataTransfer.setData('text/plain',title(p,id));}};
          const finish=()=>{active.current=null;setDragging(null);setHover(null);};
          const commit=(drag,group,before)=>{
            if(drag.kind==='entry'){setPrefs(current=>moveEntry(current,items,drag.id,group,before));onStatus?.(t('moved'));}
            else if(drag.id!=='common'&&drag.id!==group){setPrefs(current=>{const groups=current.groups.filter(id=>id!==drag.id);const index=group==='common'?1:groups.indexOf(group);groups.splice(index<0?groups.length:index,0,drag.id);return{...current,groups};});onStatus?.(t('reordered'));}
          };
          const beginPointer=(e,kind,id)=>{
            if(e.button!==0||e.target.closest('select,input,option'))return;
            e.stopPropagation();pointer.current?.cancel();
            const scope=e.currentTarget.closest('.lss-modal,.lss-scroll');
            const initial={x:e.clientX,y:e.clientY};let moved=false,over=null;
            const locate=event=>{
              const element=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-lss-drop-group]');
              return element&&element.closest('.lss-modal,.lss-scroll')===scope?{group:element.dataset.lssDropGroup,before:element.dataset.lssDropBefore||null}:null;
            };
            const cleanup=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',cancel);document.removeEventListener('keydown',key,true);window.removeEventListener('blur',cancel);pointer.current=null;};
            const cancel=()=>{cleanup();finish();};
            const move=event=>{
              if(!moved&&Math.hypot(event.clientX-initial.x,event.clientY-initial.y)<5)return;
              moved=true;event.preventDefault();active.current={kind,id};setDragging(id);over=locate(event);setHover(over?(over.before??over.group):null);
              const scroller=scope?.querySelector('.lss-modal-content')??scope;
              if(scroller){const rect=scroller.getBoundingClientRect();if(event.clientY<rect.top+36)scroller.scrollTop-=14;else if(event.clientY>rect.bottom-36)scroller.scrollTop+=14;}
            };
            const up=event=>{if(moved){event.preventDefault();const destination=locate(event);if(destination)commit({kind,id},destination.group,destination.before);suppress.current=Date.now()+300;}cleanup();finish();};
            const key=event=>{if(event.key==='Escape'&&moved){event.preventDefault();event.stopPropagation();cancel();}};
            pointer.current={cancel};document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',up);document.addEventListener('pointercancel',cancel);document.addEventListener('keydown',key,true);window.addEventListener('blur',cancel);
          };
          const suppressClick=e=>{if(Date.now()<suppress.current){e.preventDefault();e.stopPropagation();suppress.current=0;}};
          const target=(group,before=null)=>({
            'data-lss-drop-group':group,'data-lss-drop-before':before??undefined,
            onDragOver:e=>{if(!active.current&&!Array.from(e.dataTransfer?.types??[]).some(type=>type===ENTRY_MIME||type===GROUP_MIME))return;e.preventDefault();e.stopPropagation();if(e.dataTransfer)e.dataTransfer.dropEffect='move';const key=before??group;if(hover!==key)setHover(key);},
            onDrop:e=>{const drag=read(e);if(!drag)return;e.preventDefault();e.stopPropagation();commit(drag,group,before);finish();},
          });
          return{start,finish,target,hover,dragging,beginPointer,suppressClick};
        }
        function GroupManager({p,items,onClose,focusAdd=false}) {
          const [draft,setDraft]=React.useState(()=>clean(p));
          const [name,setName]=React.useState('');
          const [status,setStatus]=React.useState(t('saved'));
          const addInput=React.useRef(null);
          React.useEffect(()=>{if(focusAdd)addInput.current?.focus();},[focusAdd]);
          const drag=useDrag(draft,items,setDraft,setStatus);
          const members=id=>ordered(items,draft).filter(item=>groupOf(item,draft)===id);
          const add=e=>{e.preventDefault();const label=name.trim();if(!label||draft.groups.length>=30)return;const id=`custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;setDraft(current=>({...current,groups:[...current.groups,id],names:{...current.names,[id]:label}}));setName('');};
          const save=()=>{change(clean(draft));onClose();};
          return h(Modal,{open:true,onClose,title:t('manage'),closeLabel:t('close'),className:'lss-modal',contentClassName:'lss-modal-content',description:t('hint'),footer:h('div',{className:'lss-dialog-footer'},h('button',{type:'button',className:'lss-text-button',onClick:()=>{setDraft(current=>({...current,groups:defaults().groups,names:{},assignments:{},open:{},order:[]}));setStatus(t('saved'));}},t('reset')),h('div',{className:'lss-dialog-actions'},h('button',{type:'button',className:'lss-button',onClick:onClose},t('cancel')),h('button',{type:'button',className:'lss-button lss-button-primary',onClick:save},t('save'))))},
            h('style',null,css),
            h('div',{className:'lss-manager-grid'},draft.groups.map(id=>{
              const groupItems=members(id);
              return h('section',{key:id,className:id==='common'?'lss-card lss-ungrouped-card':'lss-card','aria-label':title(draft,id),'data-group':id,'data-drop':drag.hover===id,...drag.target(id)},
                h('div',{className:'lss-card-head'},id==='common'?h('span',{className:'lss-icon-button','aria-hidden':true},icon('panel',15)):h('button',{type:'button',className:'lss-icon-button lss-grip',draggable:true,'aria-label':`${t('drag')} ${title(draft,id)}`,title:`${t('drag')} ${title(draft,id)}`,onPointerDown:e=>drag.beginPointer(e,'group',id),onClickCapture:drag.suppressClick,onDragStart:e=>drag.start(e,'group',id),onDragEnd:drag.finish},icon('grip',16)),
                  id==='common'?h('span',{className:'lss-group-name'},t('common')):h('input',{className:'lss-group-name',maxLength:40,'aria-label':`${t('rename')}: ${title(draft,id)}`,value:Object.hasOwn(draft.names,id)?draft.names[id]:t(id),onChange:e=>{const value=e.target.value;setDraft(current=>({...current,names:{...current.names,[id]:value}}));}}),h('span',{className:'lss-count'},groupItems.length),
                  id!=='common'&&h('button',{type:'button',className:'lss-icon-button',disabled:groupItems.length>0,title:t('remove'),'aria-label':`${t('remove')}: ${title(draft,id)}`,onClick:()=>setDraft(current=>({...current,groups:current.groups.filter(key=>key!==id)}))},icon('trash',14))),
                h('div',{className:'lss-card-rows'},groupItems.length?groupItems.map(item=>h('div',{key:item.id,className:'lss-item',draggable:true,'data-entry':item.id,'data-dragging':drag.dragging===item.id,'data-drop':drag.hover===item.id,'aria-label':`${t('drag')} ${item.label}`,onPointerDown:e=>drag.beginPointer(e,'entry',item.id),onClickCapture:drag.suppressClick,onDragStart:e=>drag.start(e,'entry',item.id),onDragEnd:drag.finish,...drag.target(id,item.id)},
                  icon('grip',15),h('span',{className:'lss-item-label'},item.label),h('select',{className:'lss-item-move',value:'','aria-label':`${item.label}: ${t('move')}`,title:t('move'),onChange:e=>{const group=e.target.value;if(group)setDraft(current=>moveEntry(current,items,item.id,group));}},h('option',{value:'',disabled:true},'↗'),draft.groups.filter(group=>group!==id).map(group=>h('option',{key:group,value:group},title(draft,group)))))):
                  h('div',{className:'lss-drop-empty'},t('empty'))));
            })),
            h('form',{className:'lss-add-group',onSubmit:add},h('input',{ref:addInput,'aria-label':t('name'),placeholder:t('name'),maxLength:40,value:name,onChange:e=>setName(e.target.value)}),h('button',{type:'submit',className:'lss-button',disabled:!name.trim()||draft.groups.length>=30},t('add'))),
            h('div',{className:'lss-status',role:'status','aria-live':'polite'},status));
        }
        function FooterManager({p,items,onClose}) {
          const [draft,setDraft]=React.useState(()=>clean(p));
          const visibleItems=ordered(items.filter(item=>!item.runtime),{order:draft.footerOrder});
          const reorder=(id,delta)=>setDraft(current=>{
            const ids=ordered(items.filter(item=>!item.runtime),{order:current.footerOrder}).map(item=>item.id);
            const from=ids.indexOf(id),to=from+delta;if(from<0||to<0||to>=ids.length)return current;
            [ids[from],ids[to]]=[ids[to],ids[from]];
            return{...current,footerOrder:[...ids,...current.footerOrder.filter(key=>!ids.includes(key))]};
          });
          return h(Modal,{open:true,onClose,title:t('footerSettings'),closeLabel:t('close'),description:t('footerHint'),className:'lss-modal',contentClassName:'lss-modal-content',footer:h('div',{className:'lss-dialog-footer'},h('button',{type:'button',className:'lss-text-button',onClick:()=>setDraft(current=>({...current,footerHidden:{},footerOpen:{},footerOrder:[]}))},t('reset')),h('div',{className:'lss-dialog-actions'},h('button',{type:'button',className:'lss-button',onClick:onClose},t('cancel')),h('button',{type:'button',className:'lss-button lss-button-primary',onClick:()=>{change(clean(draft));onClose();}},t('save'))))},
            h('style',null,css),h('div',{className:'lss-footer-config'},visibleItems.length?visibleItems.map((item,index)=>h('div',{key:item.id,className:'lss-footer-config-row'},
              h('label',null,h('input',{type:'checkbox','aria-label':`${t('show')} ${item.label}`,checked:draft.footerHidden[item.id]!==true,onChange:e=>{const checked=e.target.checked;setDraft(current=>({...current,footerHidden:{...current.footerHidden,[item.id]:!checked}}));}}),h('span',null,item.label)),
              !item.direct&&h('select',{className:'lss-footer-mode','aria-label':`${item.label}: ${t('expanded')}`,value:draft.footerOpen[item.id]===true?'expanded':'collapsed',onChange:e=>{const expanded=e.target.value==='expanded';setDraft(current=>({...current,footerOpen:{...current.footerOpen,[item.id]:expanded}}));}},h('option',{value:'collapsed'},t('collapsed')),h('option',{value:'expanded'},t('expanded'))),
              h('div',{className:'lss-footer-config-order'},h('button',{type:'button',className:'lss-icon-button','aria-label':`${t('moveUp')} ${item.label}`,disabled:index===0,onClick:()=>reorder(item.id,-1)},icon('up',14)),h('button',{type:'button',className:'lss-icon-button','aria-label':`${t('moveDown')} ${item.label}`,disabled:index===visibleItems.length-1,onClick:()=>reorder(item.id,1)},icon('down',14))))) : h('p',{className:'lss-hint'},t('noFooter'))));
        }
        // Newer workspace browsers bind their own scroller by default. Here the
        // plugin wall and workspace already share the outer .lss-scroll viewport.
        const sectionScroller = {bindScrollerRef: () => {}};
        const workspaceHookContext = {useSectionScroller: () => sectionScroller};

        function Sidebar({collapsed,renderSlot,usePanels,usePreferences,usePanelInfo,useFooterItems}) {
          React.useSyncExternalStore(fn=>ctx.locale.subscribe(fn),()=>ctx.locale.getSnapshot());
          const items=usePanels(x=>x);const {prefs:p,error}=usePreferences(x=>x);const activeId=usePanelInfo(info=>info.activePanelId);
          const footerRows=useFooterItems(x=>x);
          const [editing,setEditing]=React.useState(false);const [actionError,setActionError]=React.useState(false);
          const [searching,setSearching]=React.useState(false);const [query,setQuery]=React.useState('');const searchInput=React.useRef(null);
          React.useEffect(()=>{if(searching)searchInput.current?.focus();},[searching]);
          const drag=useDrag(p,items,update);
          const wide=!collapsed;const toggle=()=>ctx.layout.toggleSidebar();
          const open=id=>{try{ctx.layout.selectPanel(id);setActionError(false);}catch{setActionError(true);}};
          const matches=ordered(items,p).filter(item=>String(item.label).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
          const row=item=>h('button',{key:item.id,type:'button',className:`lss-control lss-row${groupOf(item,p)==='common'?' lss-root-row':''}`,title:item.label,'aria-label':item.label,'aria-current':activeId===item.id?'page':undefined,onClick:()=>open(item.id),draggable:wide,onPointerDown:e=>drag.beginPointer(e,'entry',item.id),onClickCapture:drag.suppressClick,onDragStart:e=>drag.start(e,'entry',item.id),onDragEnd:drag.finish,'data-drop':drag.hover===item.id,...drag.target(groupOf(item,p),item.id)},renderSlot('sidebar.panellist',{size:18,active:activeId===item.id},{only:item.id}),wide&&h('span',{className:'lss-label'},item.label));
          const groups=p.groups.map(id=>{
            const members=matches.filter(item=>groupOf(item,p)===id);if(!members.length&&!drag.dragging)return null;
            // Ungrouped is a root drop zone, without a folder heading or disclosure.
            if(id==='common')return h('div',{key:id,className:'lss-ungrouped','aria-label':t('common'),'data-drop':drag.hover===id,...drag.target(id)},members.length?members.map(row):h('div',{className:'lss-drop-empty'},t('ungroupedDrop')));
            const expanded=query.trim()!==''||p.open[id]===true;
            return h('section',{key:id,className:'lss-group','data-drop':drag.hover===id,...drag.target(id)},h('div',{className:'lss-group-title'},h('button',{type:'button','aria-expanded':expanded,onClick:()=>update(current=>({...current,open:{...current.open,[id]:!expanded}}))},icon(expanded?'folderOpen':'folder',16),title(p,id)),h('span',{className:'lss-count'},members.length)),expanded&&members.map(row));
          });
          return h(React.Fragment,null,h('aside',{className:'lss-root','aria-label':t('title'),'data-compact':!wide},h('style',null,css),
            h('div',{className:'lss-scroll'},h('div',{className:'lss-top','data-window-drag':''},h('div',{className:'lss-brand'},renderSlot('sidebar.brand.mark',{}, {fallback:h('span',null,'▣')}),renderSlot('sidebar.brand.name',{}, {fallback:'DeepSeek'})),h('div',{className:'lss-top-actions',style:{WebkitAppRegion:'no-drag'}},h('button',{type:'button',className:'lss-icon-button',title:t(wide?'collapse':'expand'),'aria-label':t(wide?'collapse':'expand'),onClick:toggle},icon('panel'),!wide&&renderSlot('sidebar.toggle.badge',{})))),
            h('button',{type:'button',className:'lss-control lss-new',title:t('new'),'aria-label':t('new'),onClick:()=>ctx.uiWorkspace.startSession()},icon('plus'),wide&&t('new')),
            h('nav',{className:'lss-nav','aria-label':t('wall')},
              wide&&h('div',{className:'lss-section-head'},searching?h('div',{className:'lss-search-field'},icon('search',15),h('input',{ref:searchInput,'aria-label':t('search'),placeholder:t('searchPlaceholder'),value:query,onChange:e=>setQuery(e.target.value),onKeyDown:e=>{if(e.key==='Escape'){setQuery('');setSearching(false);}}}),h('button',{type:'button',className:'lss-icon-button','aria-label':t('clearSearch'),onClick:()=>{setQuery('');setSearching(false);}},icon('close',13))):h('span',{className:'lss-section-label'},t('wall')),
                h('div',{className:'lss-section-actions'},!searching&&h('button',{type:'button',className:'lss-icon-button',title:t('search'),'aria-label':t('search'),onClick:()=>setSearching(true)},icon('search')),
                  h('button',{type:'button',className:'lss-icon-button',title:t('manage'),'aria-label':t('manage'),'aria-haspopup':'dialog',onClick:()=>setEditing('groups')},icon('settings')),
                  h('button',{type:'button',className:'lss-icon-button',title:t('add'),'aria-label':t('add'),'aria-haspopup':'dialog',onClick:()=>setEditing('add')},icon('plus')))),
              wide?groups:ordered(items,p).map(row),wide&&query.trim()!==''&&matches.length===0&&h('p',{className:'lss-search-empty',role:'status'},t('noResults'))),
            (error||actionError)&&h('p',{role:'alert',className:'lss-error'},t(error?'saveError':'openError')),
            h('div',{className:'lss-workspaces'},renderSlot('sidebar.workspaces',{wide,expandSidebar:()=>{if(collapsed)toggle();}},{hookContext:workspaceHookContext})),
            h('div',{className:'lss-foot'},
              wide&&h('div',{className:'lss-section-head'},h('span',{className:'lss-section-label'},t('footerTitle')),h('button',{type:'button',className:'lss-icon-button',title:t('footerSettings'),'aria-label':t('footerSettings'),'aria-haspopup':'dialog',onClick:()=>setEditing('footer')},icon('settings',15))),
              footerRows.filter(item=>item.runtime).map(item=>h(React.Fragment,{key:item.id},renderSlot('sidebar.footer.action',{wide},{only:item.id}))),
              ordered(footerRows.filter(item=>!item.runtime),{order:p.footerOrder}).map(item=>{
                const hidden=p.footerHidden[item.id]===true;
                if(item.direct||!wide)return h('div',{key:item.id,className:'lss-footer-tool',hidden,'data-footer':item.id},renderSlot('sidebar.footer.action',{wide},{only:item.id}));
                return h('details',{key:item.id,className:'lss-footer-item',hidden,'data-footer':item.id,open:p.footerOpen[item.id]===true,onToggle:e=>{const isOpen=e.currentTarget.open;if(isOpen!==(snapshot.prefs.footerOpen[item.id]===true))update(current=>({...current,footerOpen:{...current.footerOpen,[item.id]:isOpen}}));}},
                  h('summary',{className:'lss-footer-summary'},icon(item.id==='cost-meter'?'usage':'panel',15),h('span',null,item.label),icon('chevron',11)),h('div',{className:'lss-footer-content'},renderSlot('sidebar.footer.action',{wide},{only:item.id})));
              }))),
            h('div',{className:'lss-settings'},renderSlot('sidebar.settings',{wide}))),
            (editing==='groups'||editing==='add')&&h(GroupManager,{p,items,focusAdd:editing==='add',onClose:()=>setEditing(false)}),editing==='footer'&&h(FooterManager,{p,items:footerRows,onClose:()=>setEditing(false)}));
        }
        const children={};
        for(const name of ['sidebar.brand.mark','sidebar.brand.name','sidebar.toggle.badge','sidebar.settings'])children[name]={kind:'single',scope:'root'};
        children['sidebar.workspaces'] = {
          kind: 'single',
          scope: 'root',
          inject: {hooks: {sectionScroller: (_standard, {useSectionScroller}) => useSectionScroller}},
        };
        for(const name of ['sidebar.panellist','sidebar.panellist.actions','sidebar.footer.action'])children[name]={kind:'list',scope:'root'};
        ctx.slots.inject('sidebar',()=>ctx.slots.register({name:'sidebar',children,inject:()=>({hooks:{panels,preferences:settings,footerItems}})},Sidebar));
        function HeaderControls(){React.useSyncExternalStore(fn=>ctx.locale.subscribe(fn),()=>ctx.locale.getSnapshot());return h('div',{className:'lss-top-actions',style:{WebkitAppRegion:'no-drag'}},h('style',null,css),h('button',{type:'button',className:'lss-icon-button',title:t('expand'),'aria-label':t('expand'),onClick:()=>ctx.layout.toggleSidebar()},icon('panel')),h('button',{type:'button',className:'lss-icon-button',title:t('new'),'aria-label':t('new'),onClick:()=>ctx.uiWorkspace.startSession()},icon('plus')));}
        ctx.slots.inject('shell.leading',()=>ctx.slots.register({name:'shell.leading'},HeaderControls));sync();syncFooter();
      }
    };
  }
});
