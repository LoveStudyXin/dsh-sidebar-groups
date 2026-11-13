import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const code=readFileSync(new URL('./client.js',import.meta.url),'utf8');
let mod,registration,component,persisted=JSON.stringify({assignments:{plugins:"common"},names:{common:"Old favorites"},open:{common:false}}),selected,newSession=0;
const cleanups=[],dictionaries={},states=new Map();
const slotListeners=new Map();
const documentListeners=new Map();let pointerTarget=null;
const document={addEventListener:(name,fn)=>documentListeners.set(name,fn),removeEventListener:(name,fn)=>{if(documentListeners.get(name)===fn)documentListeners.delete(name);},elementFromPoint:()=>pointerTarget};
const entries=['plugins','schedules','java-coach','new-plugin'].map(id=>({options:{id,label:id}}));
const footerEntries=['cost-meter','dsh-mobile','cost-meter-display-onboarding','sample-widget'].map(id=>({options:{id}}));
let current,cursor=0;
const React={
  Fragment:Symbol('Fragment'),
  createElement:(type,props,...children)=>{const flat=children.flat(Infinity);return{type,props:{...props,children:flat.length===1?flat[0]:flat},children:flat};},
  useSyncExternalStore:(_,get)=>get(),
  useEffect(){},
  useState(initial){const slots=current,i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},
  useRef(initial){const slots=current,i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
};
const Modal=({open,title,children,footer})=>open?React.createElement('dialog',{'aria-label':title},children,footer):null;
vm.runInNewContext(code,{document,window:{__ModuleLoader__:{load:x=>mod=x},addEventListener(){},removeEventListener(){}},localStorage:{getItem:()=>persisted,setItem:(_,value)=>{persisted=value;}},console});
const ctx={effect:fn=>{const cleanup=fn();if(cleanup)cleanups.push(cleanup);},locale:{register:(_,lang,dict)=>{dictionaries[lang]=dict;return()=>{};},bind:()=>key=>dictionaries.en[key]??key,subscribe:()=>()=>{},getSnapshot:()=> 'en'},slots:{entriesOfSlot:name=>name==='sidebar.footer.action'?footerEntries:entries,subscribe:(name,fn)=>{slotListeners.set(name,fn);return()=>slotListeners.delete(name);},inject:(_,fn)=>fn(),register:(options,fn)=>{if(options.name==='sidebar'){registration=options;component=fn;}return()=>{};}},layout:{selectPanel:id=>{selected=id;},toggleSidebar(){}},uiWorkspace:{startSession:()=>{newSession++;}}};
mod.factory(name=>{if(name==='react')return React;assert.equal(name,'@deepseek-ai/dsh-client-ui-primitives');return{Modal};}).apply(ctx);
assert.equal(mod.id,'@local/sidebar-groups');assert.equal(registration.priority,undefined);assert.equal(Object.keys(registration.children).length,8);
const hooks=registration.inject().hooks;
const renderSlot=(name,owner,opts)=>({type:'slot',props:{name,owner,opts},children:[]});
function resolve(node,path='root'){
  if(!node||typeof node!=='object')return node;
  if(typeof node.type==='function'){
    const key=path+':'+node.type.name;if(!states.has(key))states.set(key,[]);
    const previous=current,previousCursor=cursor;current=states.get(key);cursor=0;
    const result=node.type(node.props);current=previous;cursor=previousCursor;
    return resolve(result,path+'/component');
  }
  return{...node,children:(node.children??[]).map((child,index)=>resolve(child,path+'/'+(child?.props?.key??index)))};
}
function render(collapsed=false){
  return resolve(React.createElement(component,{collapsed,renderSlot,usePanels:fn=>fn(hooks.panels.getSnapshot()),usePreferences:fn=>fn(hooks.preferences.getSnapshot()),usePanelInfo:fn=>fn({activePanelId:'plugins'}),useFooterItems:fn=>fn(hooks.footerItems.getSnapshot())}));
}
const flatten=node=>!node||typeof node!=='object'?[]:[node,...(node.children||[]).flatMap(flatten)];
let nodes;
const refresh=()=>{nodes=flatten(render());return nodes;};
const text=node=>(node.children??[]).filter(child=>typeof child==='string').join('');
const button=label=>{const node=nodes.find(n=>n.type==='button'&&(n.props['aria-label']===label||text(n)===label));assert.ok(node,'Missing button: '+label);return node;};
const click=label=>button(label).props.onClick();
const event=()=>{const data=new Map();return{stopPropagation(){},preventDefault(){},dataTransfer:{setData:(key,value)=>data.set(key,value),getData:key=>data.get(key)??'',get types(){return[...data.keys()];}}};};
function dragEntry(id,group,before){
  const source=nodes.find(n=>n.props['data-entry']===id),target=nodes.find(n=>before?n.props['data-entry']===before:n.props['data-group']===group);
  assert.ok(source&&target,'Missing drag endpoints');const e=event();source.props.onDragStart(e);target.props.onDragOver(e);target.props.onDrop(e);refresh();
}
function openManager(){click('Manage groups');refresh();assert.ok(nodes.some(n=>n.type==='dialog'));}
function pointerEntry(id,group,cancel=false,outside=false){
  const source=nodes.find(n=>n.props['data-entry']===id),target=nodes.find(n=>n.props['data-group']===group);
  const scope={querySelector:()=>null,getBoundingClientRect:()=>({top:0,bottom:800}),scrollTop:0};
  const element={dataset:{lssDropGroup:target.props['data-lss-drop-group']},closest:()=>scope};
  pointerTarget={closest:()=>element};
  source.props.onPointerDown({...event(),button:0,clientX:0,clientY:0,target:{closest:()=>null},currentTarget:{closest:()=>scope}});
  documentListeners.get('pointermove')({...event(),clientX:50,clientY:50});
  if(cancel)documentListeners.get('keydown')({...event(),key:'Escape'});
  else {if(outside)pointerTarget=null;documentListeners.get('pointerup')({...event(),clientX:50,clientY:50});}
  assert.ok(!documentListeners.has('pointermove'),'Pointer listeners must be cleaned up');refresh();
}
function save(){click('Save changes');refresh();}
refresh();
// DSH 0.2.2 calls useSectionScroller() when mounting its native workspace browser.
const workspaceSeat = registration.children['sidebar.workspaces'];
function mountWorkspaceBrowser(tree, wide) {
  const workspace = flatten(tree).find(n => n.type === 'slot' && n.props.name === 'sidebar.workspaces');
  assert.ok(workspace, 'The sidebar must render the native workspace slot');
  assert.equal(workspace.props.owner.wide, wide);
  const useSectionScroller = workspaceSeat.inject.hooks.sectionScroller({}, workspace.props.opts.hookContext);
  const scroller = useSectionScroller();
  if (wide) {
    scroller.bindScrollerRef({});
    scroller.bindScrollerRef(null);
  }
  return scroller;
}
assert.equal(mountWorkspaceBrowser(render(), true), mountWorkspaceBrowser(render(true), false),
  'The workspace should retain the same scroller capability when toggling the sidebar');
assert.ok(nodes.some(n=>n.type==='slot'&&n.props.name==='sidebar.settings'));
function verifyAccountOutsideScroll(tree){
  const all=flatten(tree),sidebar=all.find(n=>n.type==='aside');
  const scroller=sidebar.children.find(n=>n.props?.className==='lss-scroll');
  const account=sidebar.children.find(n=>n.props?.className==='lss-settings');
  assert.ok(scroller&&account,'Account must be a fixed sibling of the shared scroller');
  assert.ok(!flatten(scroller).some(n=>n.type==='slot'&&n.props.name==='sidebar.settings'),'Account must never scroll with content');
  for(const slot of ['sidebar.workspaces','sidebar.panellist','sidebar.footer.action'])assert.ok(flatten(scroller).some(n=>n.type==='slot'&&n.props.name===slot),'Shared scroll area must retain '+slot);
  assert.equal(flatten(account).filter(n=>n.type==='slot'&&n.props.name==='sidebar.settings').length,1);
}
verifyAccountOutsideScroll(render());verifyAccountOutsideScroll(render(true));

assert.equal(nodes.filter(n=>n.type==='slot'&&n.props.name==='sidebar.panellist').length,1);
assert.equal(text(button('Manage groups')),'','Manager entry should be an icon, with no dedicated text row');
assert.ok(nodes.some(n=>n.type==='span'&&text(n)==='Plugin wall'));
const ungrouped=nodes.find(n=>n.props.className==='lss-ungrouped');
assert.ok(ungrouped,'Legacy common assignments must become top-level entries');
assert.ok(!flatten(ungrouped).some(n=>n.props.className==='lss-group-title'),'Top-level entries have no folder heading');
assert.ok(button('plugins').props.className.includes('lss-root-row'),'Ungrouped entry uses root indentation even with legacy folded state');
assert.ok(!nodes.some(n=>text(n)==='Old favorites'),'Legacy common rename must not reintroduce a heading');
click('Search plugins');refresh();
const search=nodes.find(n=>n.type==='input'&&n.props['aria-label']==='Search plugins');
search.props.onChange({target:{value:'schedules'}});refresh();
assert.equal(nodes.filter(n=>n.type==='slot'&&n.props.name==='sidebar.panellist').length,1);
assert.ok(button('schedules'),'Search should reveal entries in collapsed groups');
nodes.find(n=>n.type==='input'&&n.props['aria-label']==='Search plugins').props.onChange({target:{value:'not-an-existing-plugin'}});refresh();assert.ok(nodes.some(n=>n.props.role==='status'&&text(n)==='No matching plugins'));
click('Clear plugin search');refresh();assert.equal(nodes.filter(n=>n.type==='slot'&&n.props.name==='sidebar.panellist').length,1);
click('plugins');assert.equal(selected,'plugins');click('New session');assert.equal(newSession,1);
click('Productivity');refresh();assert.equal(JSON.parse(persisted).open.tools,true);
const baseline=persisted;
openManager();
assert.ok(nodes.some(n=>n.type==='span'&&text(n)==='Ungrouped'));
assert.ok(!nodes.some(n=>n.type==='input'&&n.props['aria-label']==='Group name: Ungrouped'));
assert.ok(!nodes.some(n=>n.type==='button'&&n.props['aria-label']==='Drag Ungrouped'));
assert.ok(nodes.some(n=>n.type==='option'&&n.props.value==='common'&&text(n)==='Ungrouped'),'Move menu exposes ungrouped');
dragEntry('schedules','common');assert.equal(persisted,baseline,'Dragging in the dialog must stay a draft');
click('Cancel');refresh();assert.equal(persisted,baseline,'Cancel must discard draft changes');
// Closing unmounts the manager; reflect that in this minimal hook harness.
for(const key of [...states.keys()])if(key.includes('GroupManager')||key.includes('Modal'))states.delete(key);
openManager();pointerEntry('schedules','common',true);assert.equal(persisted,baseline,'Escape cancels an in-progress pointer drag');
pointerEntry('schedules','common',false,true);save();assert.ok(!JSON.parse(persisted).assignments.schedules,'Dropping outside must not change grouping');
for(const key of [...states.keys()])if(key.includes('GroupManager')||key.includes('Modal'))states.delete(key);
openManager();
pointerEntry('schedules','common');save();assert.equal(JSON.parse(persisted).assignments.schedules,'common');
assert.ok(!nodes.some(n=>n.type==='dialog'));
for(const key of [...states.keys()])if(key.includes('GroupManager')||key.includes('Modal'))states.delete(key);
openManager();dragEntry('schedules','common','plugins');
const groupHandle=button('Drag Learning'),groupTarget=nodes.find(n=>n.props['data-group']==='tools');const e=event();groupHandle.props.onDragStart(e);groupTarget.props.onDrop(e);refresh();
const rename=nodes.find(n=>n.type==='input'&&n.props['aria-label']==='Group name: Productivity');rename.props.onChange({target:{value:'Daily'}});refresh();save();
let p=JSON.parse(persisted);assert.ok(p.order.indexOf('schedules')<p.order.indexOf('plugins'));assert.ok(p.groups.indexOf('learning')<p.groups.indexOf('tools'));assert.equal(p.groups[0],'common');assert.equal(p.names.tools,'Daily');
for(const key of [...states.keys()])if(key.includes('GroupManager')||key.includes('Modal'))states.delete(key);
openManager();nodes.find(n=>n.type==='input'&&n.props['aria-label']==='New group name').props.onChange({target:{value:'Research'}});refresh();nodes.find(n=>n.type==='form').props.onSubmit({preventDefault(){}});refresh();save();
p=JSON.parse(persisted);assert.ok(Object.values(p.names).includes('Research'));
assert.equal(flatten(render(true)).filter(n=>n.type==='slot'&&n.props.name==='sidebar.panellist').length,4);
// Footer controls are drafts and keep runtime-only registrations mounted.
const beforeFooter=persisted;
click('Footer components');refresh();
assert.ok(!nodes.some(n=>n.type==='input'&&String(n.props['aria-label']).includes('cost-meter-display-onboarding')));
nodes.find(n=>n.type==='input'&&n.props['aria-label']==='Show Usage & balance').props.onChange({target:{checked:false}});refresh();assert.equal(persisted,beforeFooter);
click('Cancel');refresh();assert.equal(persisted,beforeFooter);
for(const key of [...states.keys()])if(key.includes('FooterManager')||key.includes('Modal'))states.delete(key);
click('Footer components');refresh();
nodes.find(n=>n.type==='input'&&n.props['aria-label']==='Show Usage & balance').props.onChange({target:{checked:false}});refresh();
click('Move up Mobile access');refresh();save();
p=JSON.parse(persisted);assert.equal(p.footerHidden['cost-meter'],true);assert.ok(p.footerOrder.indexOf('dsh-mobile')<p.footerOrder.indexOf('cost-meter'));
assert.equal(nodes.find(n=>n.props['data-footer']==='cost-meter').props.hidden,true);
assert.ok(nodes.some(n=>n.type==='slot'&&n.props.opts?.only==='cost-meter'),'Hidden widgets stay mounted so their own hooks and dialogs keep working');
assert.ok(nodes.some(n=>n.type==='slot'&&n.props.opts?.only==='cost-meter-display-onboarding'));
for(const key of [...states.keys()])if(key.includes('FooterManager')||key.includes('Modal'))states.delete(key);
click('Footer components');refresh();
nodes.find(n=>n.type==='input'&&n.props['aria-label']==='Show Usage & balance').props.onChange({target:{checked:true}});refresh();
nodes.find(n=>n.type==='select'&&n.props['aria-label']==='Usage & balance: Start expanded').props.onChange({target:{value:'expanded'}});refresh();save();
p=JSON.parse(persisted);assert.equal(p.footerOpen['cost-meter'],true);assert.equal(p.footerHidden['cost-meter'],false);
// A delayed toggle must not overwrite grouping or the newer footer controls.
const details=nodes.find(n=>n.type==='details'&&n.props['data-footer']==='cost-meter');details.props.onToggle({currentTarget:{open:false}});p=JSON.parse(persisted);assert.equal(p.footerOpen['cost-meter'],false);assert.equal(p.names.tools,'Daily');assert.equal(p.assignments.schedules,'common');assert.ok(p.footerOrder.includes('dsh-mobile'));
// Newly installed entries are classified from live slot metadata; no restart or AI required.
entries.push({options:{id:'fresh-extension',label:'数据库查询',description:'SQL reports'}});
slotListeners.get('sidebar.panellist')();refresh();
for(const key of [...states.keys()])if(key.includes('GroupManager')||key.includes('Modal'))states.delete(key);
openManager();
const dataGroup=nodes.find(n=>n.props['data-group']==='data');
assert.ok(flatten(dataGroup).some(n=>n.props['data-entry']==='fresh-extension'),'A new plugin should automatically appear in Data & analysis');
dragEntry('fresh-extension','common');save();
entries.find(entry=>entry.options.id==='fresh-extension').options.label='编程教练';
slotListeners.get('sidebar.panellist')();refresh();
assert.equal(JSON.parse(persisted).assignments['fresh-extension'],'common','Metadata updates must preserve manual grouping');
// The direct sidebar can move every root entry into folders, then recreate the empty root drop zone.
function sidebarDrag(id,group){
  const label=entries.find(entry=>entry.options.id===id).options.label;
  const source=button(label),e=event();source.props.onDragStart(e);refresh();
  const target=nodes.find(n=>n.props['data-lss-drop-group']===group&&!n.props['data-lss-drop-before']);
  assert.ok(target,'Missing sidebar drop zone '+group);target.props.onDrop(e);refresh();
}
for(const id of ['plugins','schedules','fresh-extension'])sidebarDrag(id,'tools');
assert.ok(!nodes.some(n=>n.props.className==='lss-ungrouped'),'Empty ungrouped area takes no space at rest');
sidebarDrag('plugins','common');
assert.equal(JSON.parse(persisted).assignments.plugins,'common');
assert.ok(nodes.some(n=>n.props.className==='lss-ungrouped'));
assert.ok(button('plugins').props.className.includes('lss-root-row'));
click('Daily');refresh();assert.ok(!nodes.some(n=>n.type==='button'&&n.props['aria-label']==='schedules'),'Normal folders remain collapsible');
cleanups.reverse().forEach(fn=>fn());
console.log('PASS: plugin wall and search, groups and pointer drag, footer draft/cancel/save, visibility/order/expansion, preserved runtime widgets and delayed toggles');
