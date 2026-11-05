import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../client.js',import.meta.url),'utf8');
const scope={};
vm.runInNewContext(source.slice(source.indexOf('    const defaults ='),source.indexOf('    function ordered('))+';globalThis.api={defaults,clean,classify,groupOf};',scope);
const {defaults,clean,classify,groupOf}=scope.api;
const cases=[
  ['番茄定时提醒','tools'],['便利贴','tools'],['上下文管理','tools'],['智能体工作流','tools'],
  ['Java 编程教练','learning'],['English Vocabulary','learning'],['Learn SQL','learning'],
  ['GitHub 仓库','development'],['代码调试助手','development'],['Code Review','development'],
  ['SQL 数据查询','data'],['企业决策工作台','data'],['Data Analysis','data'],
  ['图片创作','creative'],['Video Editor','creative'],['写作助手','creative'],
  ['插件市场','system'],['用量与余额','system'],['Plugin Settings','system'],
  ['Quantum Garden','other'],['decode','other'],['accountability','other'],['开发 数据分析','other'],
];
for(const [label,expected] of cases)assert.equal(classify({id:'extension-42',label}),expected,label);
assert.equal(classify({id:'query-helper',label:'Helper',category:'analytics',description:'A tool for developers'}),'data');
assert.equal(classify({id:'unknown',label:'Helper',tags:['教育','learning']}),'learning');
assert.equal(classify({id:'helper',label:'Helper',description:'A database tool'}),'other','Weak description alone must not guess');
assert.equal(classify({id:'sql',label:'Helper'}),'other','ID alone is weak evidence');
assert.equal(classify({id:'code',label:'SQL 查询'}),'data','Name takes priority over ID');
assert.equal(classify({id:'new-extension',label:'Ｆｌａｓｈｃａｒｄｓ'}),'learning','Normalize full-width names');
assert.equal(classify({id:'myCalendar',label:'My Calendar'}),'tools','Camel-case identifiers');
assert.equal(classify({id:'x',tags:{arbitrary:'code'},description:()=>{throw Error('Do not evaluate arbitrary metadata')}}),'other');
const p=defaults();p.assignments['x']='common';assert.equal(groupOf({id:'x',label:'代码调试'},p),'common');
p.groups=p.groups.filter(id=>id!=='data');assert.equal(groupOf({id:'y',label:'SQL 数据查询'},p),'other','Deleted categories must stay deleted');
assert.equal(groupOf({id:'y',label:'SQL 数据查询'},clean(p)),'other');
const old=clean({groups:['common','tools','learning','system','other'],names:{tools:'我的工具'},assignments:{x:'tools'},footerHidden:{mobile:true}});
assert.ok(old.groups.includes('development'));assert.equal(old.assignments.x,'tools');assert.equal(old.names.tools,'我的工具');assert.equal(old.footerHidden.mobile,true);
assert.equal(groupOf({id:'x',label:'SQL 查询'},old),'tools');
assert.equal(groupOf({id:'new',label:'SQL 查询'},old),'data');
console.log(`PASS: ${cases.length} bilingual classifications, metadata weighting, ambiguity, manual priority and old preference migration`);
