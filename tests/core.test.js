'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../core.js');
const { Engine, STEP } = H;
function ideal(engine, dt = STEP) {
  engine.begin();
  let guard = 0;
  while (engine.state !== 'finished' && engine.time < 180 && guard++ < 40000) {
    engine.advance(dt);
    if (engine.state === 'paused') throw new Error('Unexpected pause');
    engine.startGesture(guard);
    const fruit = engine.entities.filter(e => !e.hazard && !e.dead);
    for (const e of fruit) if (fruit.filter(f => f.wave === e.wave).every(f => f.age > (f.orbit ? 0.1 : 1.10))) engine.slice(e.x - 3, e.y, e.x + 3, e.y);
    engine.endGesture();
  }
  return engine.result;
}
function fixture(options = {}) {
  const engine = new Engine(options); engine.begin();
  engine.entities = []; engine.events = []; engine.eventIndex = 0;
  engine.waves = [{ id: 0, remaining: 2, required: 2, missed: false, hazard: false, resolved: false }];
  const target = (id, x, hazard = false) => ({ id, wave: 0, x, y: 300, vx: 0, vy: 0, gravity: 0, r: 25, type: 3, angle: 0, spin: 0, age: 0, ttl: 3, born: 0, history: [{ t: 0, x, y: 300 }], required: !hazard, hazard, dead: false });
  engine.entities = [target(1, 100), target(2, 180)];
  engine.startGesture(1); return { engine, target };
}
test('collision includes containment, grazing, diagonals and rejects stationary segments', () => {
  assert.equal(H.segmentCircle(95,100,105,100,100,100,20),0);
  assert.equal(H.segmentCircle(100,100,100,100,100,100,20),null);
  assert.equal(H.segmentCircle(0,20,200,20,100,0,20),0.5);
  assert.equal(H.segmentCircle(0,21,200,21,100,0,20),null);
  assert.ok(H.segmentCircle(0,0,200,200,100,100,20) !== null);
});
test('one measured segment cuts every eligible target, awards once and creates complementary halves', () => {
  const { engine } = fixture();
  assert.deepEqual(engine.slice(50,300,230,300),[1,2]);
  assert.deepEqual(engine.slice(50,300,230,300),[]);
  engine.endGesture(); assert.equal(engine.score,30); assert.equal(engine.cut,2); assert.equal(engine.bestCombo,2);
  assert.equal(engine.fragments.length,4);
  for (const half of engine.fragments) assert.equal(half.type,3);
  assert.equal(engine.fragments[0].side,-engine.fragments[1].side);
});
test('pot ordering stops a segment and last heart loss resolves once', () => {
  const { engine, target } = fixture(); engine.hearts = 1;
  engine.entities = [target(1,100,true),target(2,180)]; engine.waves[0].required = 1;
  engine.slice(50,300,230,300);
  assert.equal(engine.cut,0); assert.equal(engine.hearts,0); assert.equal(engine.state,'finished');
  assert.equal(engine.potHits,1); engine.finish(); engine.slice(50,300,230,300); assert.equal(engine.potHits,1);
});
test('gesture cancellation does not connect new gestures or duplicate a combo', () => {
  const { engine } = fixture(); engine.slice(80,300,120,300); engine.endGesture();
  engine.startGesture(2); engine.slice(160,300,200,300); engine.endGesture();
  assert.equal(engine.score,20); assert.equal(engine.bestCombo,1);
});
test('combo burst expires in active time even with the blade held', () => {
  const { engine } = fixture(); engine.slice(80,300,120,300);
  engine.advance(0.20); engine.advance(0.20); engine.advance(0.10);
  engine.slice(160,300,200,300); engine.endGesture(); assert.equal(engine.score,20);
});
test('relative motion catches a fruit crossing between input samples', () => {
  const { engine } = fixture(); engine.entities[1].x = 230; engine.entities[1].history[0].x = 230; const e = engine.entities[0]; e.x = 140; e.y = 340; e.history = [{t:0,x:140,y:260},{t:0.1,x:140,y:340}]; engine.time = 0.1;
  assert.deepEqual(engine.slice(125,300,155,300,0),[1]);
});
test('all 25 levels and mastery goals are attainable at representative aspect ratios', () => {
  for (const [width,height] of [[390,844],[844,390],[320,568],[1280,800],[280,320]]) {
    for (const level of H.LEVELS) {
      const engine = new Engine({level:level.id,width,height,seed:17171});
      const result = ideal(engine);
      assert.ok(result, `No result: ${level.id} ${width}x${height}`);
      assert.equal(result.passed,true, `Pass: ${level.id} ${width}x${height}, ${JSON.stringify(result)}`);
      assert.equal(result.precisionBadge,true, `Precision: ${level.id} ${width}x${height}`);
      assert.equal(result.comboBadge,true, `Combo: ${level.id} ${width}x${height}`);
      assert.ok(engine.total > 0); assert.ok(engine.goal <= engine.total);
    }
  }
});
test('render frequency does not change perfect-stroke score, quota or spawn count', () => {
  const runs = [30,60,90,120,144].map(fps => {
    const engine = new Engine({ level:19, seed:8 }); const r=ideal(engine,1/fps);
    return { score:r.score,cut:r.cut,required:r.requiredCut,misses:r.misses,serial:engine.serial };
  });
  for (const run of runs) assert.deepEqual(run,runs[0]);
});
test('DPR is absent from physics and resize cannot penalize active targets', () => {
  const engine = new Engine({level:11,width:390,height:844}); engine.begin(); engine.advance(0.20); engine.advance(0.20); engine.advance(0.20);
  const ids=engine.entities.map(e=>e.id); engine.pause(); const time=engine.time;
  engine.resize(844,390); engine.advance(0.1); assert.equal(engine.time,time); assert.deepEqual(engine.entities.map(e=>e.id),ids); assert.equal(engine.misses,0);
  for(const e of engine.entities) assert.ok(Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.vy));
  engine.resume(); engine.advance(0.1); assert.ok(engine.time>time);
});
test('large frame gaps pause rather than spawning a catch-up burst', () => {
  const engine=new Engine(); engine.begin(); engine.advance(20); assert.equal(engine.state,'paused'); assert.equal(engine.time,0); assert.equal(engine.serial,0);
});
test('all cut effects expire and nonfinite center gravity is impossible', () => {
  const {engine}=fixture(); engine.slice(50,300,230,300); engine.endGesture();
  for(let i=0;i<240;i++) engine.advance(STEP);
  assert.equal(engine.fragments.length,0); assert.equal(engine.particles.length,0); assert.equal(engine.labels.length,0);
  for(const fruit of H.FRUITS) assert.ok(fruit.skin && fruit.flesh);
});
test('daily layouts repeat by local date and use a different seed the next day', () => {
  const a=new Engine({mode:'daily',date:'2026-10-12'}),b=new Engine({mode:'daily',date:'2026-10-12'}),c=new Engine({mode:'daily',date:'2026-10-13'});
  assert.deepEqual(a.events,b.events); assert.notDeepEqual(a.events,c.events);
  assert.equal(a.bestKey(),'daily-2026-10-12');
});
test('quality and reduced motion cannot change the gameplay random stream', () => {
  const a=new Engine({mode:'zen',seed:8,settings:{quality:'full'}}),b=new Engine({mode:'zen',seed:8,settings:{quality:'low',reduced:true}});
  a.begin(); b.begin();
  for(let i=0;i<10000;i++) {
    for(const engine of [a,b]) { engine.advance(STEP); engine.startGesture(i); for(const e of engine.entities) if(!e.dead&&!e.hazard&&e.age>1.1) engine.slice(e.x-3,e.y,e.x+3,e.y); engine.endGesture(); }
  }
  assert.equal(a.score,b.score); assert.equal(a.serial,b.serial); assert.equal(a.requiredCut,b.requiredCut); assert.deepEqual(a.events,b.events);
});
test('Survival loses hearts on misses; Zen and Quick Play do not', () => {
  const survival=new Engine({mode:'survival'}); survival.begin(); for(let i=0;i<2000 && survival.state!=='finished';i++) survival.advance(STEP);
  assert.equal(survival.hearts,0); assert.equal(survival.state,'finished');
  for(const mode of ['zen','quick']) { const engine=new Engine({mode}); engine.begin(); for(let i=0;i<1000;i++) engine.advance(STEP); assert.equal(engine.hearts,null); assert.equal(engine.state,'playing'); }
});
test('assistance has separate bests and still permits campaign progression', () => {
  const engine=new Engine({level:0,settings:{assist:true,slow:true}}); const result=ideal(engine); assert.equal(result.passed,true); assert.equal(engine.bestKey(),'campaign-0-assist');
  const store=new H.Store(); store.record(engine); assert.equal(store.data.unlocked,1); assert.equal(store.data.levels[0].passed,true); assert.ok(store.data.bests['campaign-0-assist']>0);
});
test('save validation, migrations, corrupt storage and rejected writes are safe', () => {
  const store=new H.Store({getItem(){return '{broken'},setItem(){throw Error('full')}}); assert.ok(store.warning); assert.equal(store.data.unlocked,0); assert.equal(store.write(),false);
  assert.throws(()=>H.validSave({version:99})); assert.throws(()=>store.import('{}'));
  const input=H.defaultSave(); input.unlocked=24; input.settings.volume=100; input.settings.blade=5; input.discovered=[0,0,999,-1,'apple'];
  const clean=H.validSave(input); assert.equal(clean.unlocked,0); assert.equal(clean.settings.volume,1); assert.equal(clean.settings.blade,0); assert.deepEqual(clean.discovered,[0]);
  const complete=H.defaultSave(); for(let i=0;i<5;i++)complete.levels[i]={passed:true,combo:true,precision:false,score:100};
  const restored=H.validSave(complete); assert.equal(restored.unlocked,5); assert.equal(H.unlockedBlade(restored),1);
});
test('replaying levels merges stars and store records a result once', () => {
  const store=new H.Store(); const first=new Engine({level:0}); ideal(first); store.record(first); const before=store.data.sliced; store.record(first);
  assert.equal(store.data.sliced,before);
  const replay=new Engine({level:0}); replay.begin(); replay.requiredCut=replay.goal; replay.score=5; replay.finish(); store.record(replay);
  assert.equal(store.data.levels[0].precision,true); assert.ok(store.data.levels[0].score>5);
});
test('endless simulation stays bounded through a long Zen session', () => {
  const engine=new Engine({mode:'zen',seed:99}); engine.begin(); let peak=0;
  for(let i=0;i<120*600;i++){engine.advance(STEP);peak=Math.max(peak,engine.entities.length);}
  assert.equal(engine.state,'playing'); assert.ok(peak<=10,`peak ${peak}`); assert.ok(engine.events.length<200,`events ${engine.events.length}`);
  assert.ok(Object.values(engine.waves).filter(Boolean).length<70,`waves ${Object.values(engine.waves).filter(Boolean).length}`);
  assert.ok(engine.particles.length<=200); assert.ok(engine.fragments.length<=60);
});
test('dense and sparse samples of the same stroke have identical rewards', () => {
  const rewards = [];
  for (const spacing of [0.25,1,5,180]) {
    const {engine}=fixture();
    for(let x=50;x<230;x+=spacing)engine.slice(x,300,Math.min(230,x+spacing),300);
    engine.endGesture();rewards.push({cut:engine.cut,score:engine.score,combo:engine.bestCombo});
  }
  for(const r of rewards)assert.deepEqual(r,{cut:2,score:30,combo:2});
});
test('canonical campaign seeds remain attainable with all comfort assists', () => {
  for(const level of H.LEVELS) for(const [width,height] of [[320,568],[844,390],[280,320]]) {
    const engine=new Engine({level:level.id,width,height,settings:{assist:true,slow:true}});
    const result=ideal(engine);assert.equal(result.passed,true,`Assisted pass: ${level.id} ${width}x${height}`);assert.equal(result.precisionBadge,true,`Assisted precision: ${level.id} ${width}x${height}`);assert.equal(result.comboBadge,true,`Assisted combo: ${level.id}`);
  }
});
test('each required fruit offers a useful visible window outside the HUD', () => {
  for(const [width,height] of [[390,844],[844,390],[280,320]]) for(const level of H.LEVELS) {
    const engine=new Engine({level:level.id,width,height});engine.hearts=null;engine.begin();const visible=new Map();const spawned=new Set();
    while(engine.state!=='finished') {
      engine.advance(STEP);
      for(const e of engine.entities)if(e.required){spawned.add(e.id);if(e.x>=e.r && e.x<=width-e.r && e.y>=engine.bounds.top+e.r && e.y<=engine.bounds.bottom-e.r)visible.set(e.id,(visible.get(e.id)||0)+STEP);}
    }
    for(const id of spawned)assert.ok((visible.get(id)||0)>=0.85,`Visibility: level ${level.id}, target ${id}, ${width}x${height}, ${visible.get(id)}`);
  }
});
test('ideal survival travels through all gardens and keeps its history bounded', () => {
  const engine=new Engine({mode:'survival',seed:19});engine.begin();const chapters=new Set();let peak=0;
  for(let i=0;i<120*240;i++) {
    engine.advance(STEP);chapters.add(engine.chapter);peak=Math.max(peak,engine.entities.length);
    engine.startGesture(i);const fruit=engine.entities.filter(e=>!e.hazard&&!e.dead);
    for(const e of fruit)if(fruit.filter(f=>f.wave===e.wave).every(f=>f.age>(f.orbit?0.1:1.1)))engine.slice(e.x-3,e.y,e.x+3,e.y);
    engine.endGesture();
  }
  assert.equal(engine.state,'playing');assert.equal(chapters.size,5);assert.ok(peak<=10,`Peak ${peak}`);assert.ok(Object.keys(engine.waves).length<70);assert.ok(engine.signals.length<=64);
});
test('a complete campaign round trips all stars, chapters, discoveries and blade rewards', () => {
  const store=new H.Store({getItem(){return null},setItem(){}});
  for(const level of H.LEVELS){const engine=new Engine({level:level.id});ideal(engine);store.record(engine);}
  const restored=H.validSave(JSON.parse(JSON.stringify(store.data)));
  assert.equal(restored.unlocked,24);assert.equal(H.unlockedBlade(restored),5);assert.equal(restored.discovered.length,15);
  assert.equal(Object.values(restored.levels).reduce((n,l)=>n+[l.passed,l.combo,l.precision].filter(Boolean).length,0),75);
});
