import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

test('initial character schedules display before chapters exist and detailed empty schedules override them', async () => {
  const model=await import('../src/pages/directorNext/workspace/characters/appearanceModel.ts');
  const planning={volumes:[{chapters:[
    {id:'p1',chapterOrder:1,title:'初排',plannedCharacterIds:['a']},
    {id:'p2',chapterOrder:2,title:'只安排 b',plannedCharacterIds:['b']},
    {id:'p3',chapterOrder:3,title:'a 只是摘要里的名字'},
    {id:'p4',chapterOrder:4,title:'明确空名单',plannedCharacterIds:[]},
  ]}]};
  const a=model.projectCastAppearanceRows([], 'a', planning);
  assert.deepEqual(a.map(r=>r.planned),[true,false,false,false]);
  assert.deepEqual(model.summarizeAppearances(a,'latest').planned,[1]);
  assert.deepEqual(model.appearanceDestination(a[0]),{kind:'plan',id:'p1'});
  const detailed=[{chapterId:'c1',chapterOrder:1,chapterTitle:'细化',plannedCharacterIds:[],planSource:'task',coverage:'unwritten',events:[]}];
  assert.equal(model.projectCastAppearanceRows(detailed,'a',planning)[0].planned,false);
});

test('cast timeline keeps each character events and plans separate while retaining quiet and planned-only chapters', async () => {
  const model = await import('../src/pages/directorNext/workspace/characters/appearanceModel.ts');
  assert.equal(typeof model.projectCastAppearanceRows,'function');
  const chapters=[
    {chapterId:'c1',chapterOrder:1,chapterTitle:'开门',plannedCharacterIds:['a'],coverage:'recorded',events:[
      {characterId:'a',kind:'present'},{characterId:'b',kind:'mention'}]},
    {chapterId:'c2',chapterOrder:2,chapterTitle:'旧章',plannedCharacterIds:['b'],coverage:'untracked',events:[]},
  ];
  const planning={volumes:[{chapters:[{id:'p1',chapterOrder:1,title:'旧标题'},{id:'p3',chapterOrder:3,title:'a 出场'}]}]};
  const a=model.projectCastAppearanceRows(chapters,'a',planning);
  const b=model.projectCastAppearanceRows(chapters,'b',planning);
  assert.equal(a.length,3);
  assert.deepEqual(a[0].events,[{characterId:'a',kind:'present'}]);
  assert.deepEqual(b[0].events,[{characterId:'b',kind:'mention'}]);
  assert.equal(b[0].planned,false);
  assert.equal(b[1].planned,true);
  assert.equal(a[1].coverage,'untracked');
  assert.equal(a[2].planned,false,'planning prose never implies participation');
  assert.deepEqual(model.appearanceDestination(a[2]),{kind:'plan',id:'p3'});
  assert.equal(model.summarizeAppearances(a,'latest').count,1);
  assert.equal(model.summarizeAppearances(b,'latest').count,0);
  assert.equal(model.projectCastAppearanceRows(chapters,null,planning)[0].events.length,2);
});

test('appearance summary respects reading boundary and never counts mentions, dreams or unknown coverage as absent', async () => {
  const {summarizeAppearances} = await import('../src/pages/directorNext/workspace/characters/appearanceModel.ts');
  const row = (chapterOrder, planned, coverage, kinds) => ({chapterId: String(chapterOrder), chapterOrder, planned, coverage, events: kinds.map(kind=>({kind}))});
  const rows = [row(1,true,'recorded',['present','flashback']),row(2,true,'recorded',['mention']),
    row(3,true,'untracked',[]),row(4,true,'unwritten',[]),row(5,false,'recorded',['present']),row(6,false,'recorded',['dream'])];
  assert.deepEqual(summarizeAppearances(rows,3), {first:1,last:1,count:1,missed:[2],planned:[1,2,3]});
  assert.deepEqual(summarizeAppearances(rows,'latest'), {first:1,last:5,count:2,missed:[2],planned:[1,2,3,4]});
  assert.deepEqual(summarizeAppearances(rows,null), {first:null,last:null,count:0,missed:[],planned:[]});
});

test('timeline chapter windows retain quiet chapters, bound long books and exclude future chapters', async () => {
  const model = await import('../src/pages/directorNext/workspace/characters/appearanceModel.ts');
  assert.equal(typeof model.appearanceTimelinePage, 'function');
  const rows = Array.from({length:60}, (_,index)=>({chapterId:`c${index+1}`,chapterOrder:index+1,chapterTitle:`章节${index+1}`,
    planned:index===59,coverage:'recorded',events:index===27?[{kind:'present'}]:[]}));
  const latest = model.appearanceTimelinePage(rows,'latest');
  assert.equal(latest.page,1,'open near the most recent recorded event, not unwritten future plans');
  assert.equal(latest.pageCount,3);
  assert.equal(latest.rows.length,24);
  assert.equal(latest.rows[0].chapterOrder,25);
  assert.equal(latest.rows[23].chapterOrder,48);
  const reading = model.appearanceTimelinePage(rows,26,99);
  assert.deepEqual(reading.rows.map(r=>r.chapterOrder),[25,26]);
  assert.equal(reading.pageCount,2);
  assert.deepEqual(model.appearanceTimelinePage(rows,null).rows,[]);
  assert.equal(model.appearanceTimelinePage([], 'latest').pageCount,0);
  assert.equal(model.appearanceTimelinePage(rows,'latest',0).rows[0].chapterOrder,1);
});

test('planning-only chapters appear as pending, never infer a character from prose, and use plan navigation until persisted', async () => {
  const model = await import('../src/pages/directorNext/workspace/characters/appearanceModel.ts');
  assert.equal(typeof model.projectAppearanceRows,'function');
  const planning={volumes:[{chapters:[
    {id:'p1',chapterId:null,chapterOrder:1,title:'沈砚露底',summary:'沈砚出场'},
    {id:'p2',chapterId:null,chapterOrder:2,title:'下一章'},
  ]}]};
  const pending=model.projectAppearanceRows([],planning);
  assert.equal(pending.length,2);
  assert.equal(pending[0].chapterId,null);
  assert.equal(pending[0].planned,false,'a name in the outline is not structured participation');
  assert.equal(pending[0].coverage,'unwritten');
  assert.deepEqual(model.appearanceDestination(pending[0]),{kind:'plan',id:'p1'});
  assert.equal(model.summarizeAppearances(pending,'latest').count,0);
  assert.equal(model.appearanceTimelinePage(pending,1).rows.length,1);
  const actual={chapterId:'c1',chapterOrder:1,chapterTitle:'正式标题',planned:true,coverage:'recorded',events:[{kind:'present'}]};
  const merged=model.projectAppearanceRows([actual],planning);
  assert.equal(merged.length,2,'created chapters replace their planned placeholders without duplicate nodes');
  assert.deepEqual(merged[0],actual);
  assert.deepEqual(model.appearanceDestination(merged[0]),{kind:'chapter',id:'c1'});
  assert.equal(model.summarizeAppearances(merged,'latest').count,1);
});

test('appearance diagram renders plan and typed events with chapter links, retaining unknown coverage and hiding future content', async () => {
  const {build} = createRequire(import.meta.resolve('vite'))('esbuild');
  const clientDir = fileURLToPath(new URL('..',import.meta.url));
  const output = path.join(clientDir,'tests',`.appearance-diagram-${process.pid}.mjs`);
  try {
    await build({stdin:{contents:`import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AppearanceList} from './src/pages/directorNext/workspace/characters/CharacterAppearances';
import {projectAppearanceRows} from './src/pages/directorNext/workspace/characters/appearanceModel';
const rows=[
 {chapterId:'c1',chapterOrder:1,chapterTitle:'开门',planned:true,coverage:'recorded',events:[{kind:'present',summary:'递来药箱',evidence:'递箱原文'},{kind:'flashback',summary:'幼时授课',evidence:'授课原文'}]},
 {chapterId:'c2',chapterOrder:2,chapterTitle:'旧章',planned:true,coverage:'untracked',events:[]},
 {chapterId:'c3',chapterOrder:3,chapterTitle:'未来秘密',planned:true,coverage:'recorded',events:[{kind:'dream',summary:'后文梦境秘密',evidence:'未来原文'}]},
];
const render = boundary => renderToStaticMarkup(<AppearanceList rows={rows} boundary={boundary} onSelect={()=>{}}/>);
export const reading=render(2);
export const latest=render('latest');
export const unknownBoundary=render(null);
const planningRows=projectAppearanceRows([],{volumes:[{chapters:Array.from({length:27},(_,i)=>({id:'p'+i,chapterOrder:i+1,title:'规划章'+(i+1)}))}]});
export const planningOnly=renderToStaticMarkup(<AppearanceList rows={planningRows} boundary="latest" onSelect={()=>{}}/>);`,resolveDir:clientDir,loader:'tsx'},bundle:true,platform:'node',format:'esm',packages:'external',
      alias:{'@':path.join(clientDir,'src')},define:{'import.meta.env':'{}'},outfile:output});
    const {reading,latest,unknownBoundary,planningOnly} = await import(pathToFileURL(output).href);
    assert.match(reading,/<figure[^>]*aria-label="Character appearance timeline"/);
    assert.match(reading,/aria-label="Chapter 1 · 开门: Planned appearance"/);
    assert.match(reading,/aria-label="Chapter 1 · 开门: Appeared: 递来药箱"/);
    assert.match(reading,/aria-label="Chapter 1 · 开门: Flashback: 幼时授课"/);
    assert.match(reading,/aria-label="Chapter 2 · 旧章: Unverified; absence cannot be determined"/);
    assert.doesNotMatch(reading,/未来秘密|后文梦境秘密|未来原文/);
    assert.match(latest,/aria-label="Chapter 3 · 未来秘密: Dream: 后文梦境秘密"/);
    assert.doesNotMatch(unknownBoundary,/<figure|开门|旧章|未来秘密/);
    assert.match(planningOnly,/<figure[^>]*aria-label="Character appearance timeline"/);
    assert.match(planningOnly,/appearance schedules are still pending for 27 chapters/);
    assert.match(planningOnly,/Awaiting prose/);
    assert.match(planningOnly,/aria-label="Chapter 1 · 规划章1: Appearance schedule pending; view chapter plan"/);
    assert.match(planningOnly,/aria-label="Chapter 1 · 规划章1: Awaiting manuscript"/);
    assert.match(planningOnly,/View next chapters/);
  } finally {fs.rmSync(output,{force:true});}
});

test('whole-cast chart renders independent lanes, typed events and pending planning without inventing continuous presence', async () => {
  const {build} = createRequire(import.meta.resolve('vite'))('esbuild');
  const clientDir = fileURLToPath(new URL('..',import.meta.url));
  const output = path.join(clientDir,'tests',`.cast-timeline-${process.pid}.mjs`);
  try {
    await build({stdin:{contents:`import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CastTimelineChart} from './src/pages/directorNext/workspace/characters/CastTimeline';
const book={materials:{characters:[{id:'a',name:'青禾',castRole:'protagonist'},{id:'b',name:'阿宁',castRole:'ally'}]},planning:{volumes:[{chapters:[{id:'p3',chapterOrder:3,title:'待写章'}]}]}};
const chapters=[
  {chapterId:'c1',chapterOrder:1,chapterTitle:'药铺',plannedCharacterIds:['a'],coverage:'recorded',events:[
    {characterId:'a',kind:'present',summary:'开门'}, {characterId:'b',kind:'mention',summary:'听说回城'}, {characterId:'b',kind:'dream',summary:'梦中递箱'}]},
  {chapterId:'c2',chapterOrder:2,chapterTitle:'旧章',plannedCharacterIds:[],coverage:'untracked',events:[]},
];
export const chart=renderToStaticMarkup(<CastTimelineChart book={book} chapters={chapters} onSelect={()=>{}}/>);
export const planningOnly=renderToStaticMarkup(<CastTimelineChart book={book} chapters={[]} onSelect={()=>{}}/>);
const scheduledBook={...book,planning:{volumes:[{chapters:[
  {id:'p1',chapterOrder:1,title:'初排章',plannedCharacterIds:['a']},
  {id:'p2',chapterOrder:2,title:'空安排章',plannedCharacterIds:[]},
]}]}};
export const initialSchedule=renderToStaticMarkup(<CastTimelineChart book={scheduledBook} chapters={[]} onSelect={()=>{}}/>);
export const empty=renderToStaticMarkup(<CastTimelineChart book={{...book,materials:{characters:[]}}} chapters={[]} onSelect={()=>{}}/>);`,
      resolveDir:clientDir,loader:'tsx'},bundle:true,platform:'node',format:'esm',packages:'external',alias:{'@':path.join(clientDir,'src')},define:{'import.meta.env':'{}'},outfile:output});
    const {chart,planningOnly,initialSchedule,empty}=await import(pathToFileURL(output).href);
    assert.match(chart,/aria-label="Cast appearance timeline"/);
    assert.match(chart,/2 characters · 3 chapters/);
    assert.match(chart,/aria-label="青禾 · Chapter 1 · 药铺: Planned appearance; Appeared: 开门"/);
    assert.match(chart,/aria-label="阿宁 · Chapter 1 · 药铺: No planned appearance; Mentioned: 听说回城; Dream: 梦中递箱"/);
    assert.match(chart,/aria-label="阿宁 · Chapter 2 · 旧章: No planned appearance; Unverified; absence cannot be determined"/);
    assert.equal((chart.match(/data-appearance-kind="present"/g)||[]).length,1);
    assert.equal((chart.match(/data-appearance-kind="dream"/g)||[]).length,1);
    assert.match(chart,/aria-label="青禾 · Chapter 3 · 待写章: Appearance schedule pending; Awaiting manuscript"/);
    assert.match(planningOnly,/2 characters · 1 chapter/);
    assert.doesNotMatch(planningOnly,/data-appearance-kind="present"/);
    assert.match(initialSchedule,/aria-label="青禾 · Chapter 1 · 初排章: Planned appearance; Awaiting manuscript"/);
    assert.match(initialSchedule,/aria-label="阿宁 · Chapter 1 · 初排章: No planned on-page appearance; Awaiting manuscript"/);
    assert.match(initialSchedule,/aria-label="青禾 · Chapter 2 · 空安排章: No planned on-page appearance; Awaiting manuscript"/);
    assert.doesNotMatch(initialSchedule,/data-appearance-kind="present"|章尚待生成角色出场安排/);
    assert.match(empty,/This novel has no characters yet/);
  } finally {fs.rmSync(output,{force:true});}
});
