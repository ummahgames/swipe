'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function environment(options = {}) {
  const ids = [...fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  let paintCalls = 0;
  const noop = () => {};
  function context2d() {
    const c={};
    for(const method of ['save','restore','translate','rotate','scale','setTransform','clearRect','fillRect','strokeRect','beginPath','closePath','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','ellipse','arc','rect','clip','stroke','fill','setLineDash','drawImage','fillText']) c[method]=()=>{paintCalls++;};
    c.createLinearGradient=c.createRadialGradient=()=>({addColorStop:noop}); return c;
  }
  class Element {
    constructor(id='') {this.id=id;this.style={};this.dataset={};this.hidden=false;this.listeners={};this.attributes={};this.disabled=false;this.value='';this.classList={toggle:noop};this._html='';}
    addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);}
    emit(type,event={}) {for(const fn of this.listeners[type]||[]) fn({preventDefault:noop,...event});}
    set innerHTML(value){this._html=value; for(const m of value.matchAll(/\bid="([^"]+)"/g)) if(!elements.has(m[1]))elements.set(m[1],new Element(m[1]));}
    get innerHTML(){return this._html;}
    getContext(){return this.context ||= context2d();}
    getBoundingClientRect(){return {left:0,top:0,width:root.innerWidth,height:root.innerHeight};}
    setAttribute(k,v){this.attributes[k]=v;}
    getAttribute(k){return this.attributes[k];}
    removeAttribute(k){delete this.attributes[k];}
    querySelector(){return new Element();}
    querySelectorAll(){return [];}
    focus(){document.activeElement=this;}
    setPointerCapture(id){this.captured=id;}
    releasePointerCapture(){this.captured=null;}
    toDataURL(){return 'data:image/png;base64,dGVzdA==';}
    append(){ }
    remove(){ }
    click(){ }
    closest(){return this;}
  }
  const elements=new Map(ids.map(id=>[id,new Element(id)]));
  const document=new Element(); document.readyState='complete';document.hidden=false;document.body=new Element();document.createElement=tag=>new Element(tag);
  document.getElementById=id=>{if(!elements.has(id))throw new Error('Missing DOM node: '+id);return elements.get(id);};
  const callbacks=[];const rootEvents={};const memory=new Map();
  const root={document,console,innerWidth:390,innerHeight:844,devicePixelRatio:options.dpr||3,matchMedia:()=>({matches:options.reduced||false}),requestAnimationFrame:fn=>callbacks.push(fn),addEventListener:(type,fn)=>(rootEvents[type] ||= []).push(fn),setTimeout:()=>1,clearTimeout:noop,confirm:()=>true,Blob,URL:{createObjectURL:()=> 'blob:local-save',revokeObjectURL:noop},localStorage:options.storage || {getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)}};
  const context=vm.createContext(root);
  for(const file of ['core.js','art.js','audio.js','game.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
  const app=root.Harvest.app;
  assert.ok(app, elements.get('panel').innerHTML);
  const action=(name,extra={})=>{const target=new Element();target.dataset={action:name,...extra};document.emit('click',{target});};
  const advance=timestamp=>app.frame(timestamp);
  return {root,app,elements,document,action,advance,rootEvents,paintCalls:()=>paintCalls,Element};
}
test('fresh boot renders the safe introduction at DPR 3 with no audio API', () => {
  const env=environment();assert.equal(env.app.screen,'playing');assert.equal(env.app.engine.state,'ready');
  assert.equal(env.elements.get('gameCanvas').width,780);assert.equal(env.elements.get('gameCanvas').height,1688);
  env.advance(1000);assert.ok(env.paintCalls()>20);assert.equal(env.app.engine.time,0);
});
test('pointer swipes start the introduction, preserve capture and clear on cancellation', () => {
  const env=environment();const canvas=env.elements.get('gameCanvas');
  canvas.emit('pointerdown',{button:0,pointerId:1,clientX:100,clientY:439});
  canvas.emit('pointermove',{pointerId:1,clientX:290,clientY:439});
  assert.equal(env.app.engine.state,'playing');assert.equal(env.app.engine.fragments.length,2);
  canvas.emit('pointercancel',{pointerId:1});assert.equal(env.app.pointer,null);assert.equal(env.app.engine.gesture,null);
  env.advance(1000);env.advance(1017);assert.ok(env.app.engine.time>0);
});
test('all screen routes and fruit artwork execute without browser interfaces', () => {
  const env=environment();env.action('home');assert.equal(env.app.screen,'home');
  env.action('chapters');for(let c=0;c<5;c++) {env.action('chapter',{value:String(c)});assert.ok(env.elements.get('panel').innerHTML.includes(env.root.Harvest.CHAPTERS[c].name));env.advance(1000+c*17);}
  env.action('modes');assert.ok(env.elements.get('panel').innerHTML.includes('Daily Harvest'));
  env.action('collection');assert.ok(env.elements.get('panel').innerHTML.includes('Still growing'));
  for(let i=0;i<15;i++){env.app.renderer.sprite(i,false);env.app.renderer.sprite(i,true);}
  env.action('help');env.action('settings');assert.equal(env.app.screen,'settings');env.action('close-settings');assert.equal(env.app.screen,'home');
});
test('pause, settings, resize and resume preserve a round and ignore hidden time', () => {
  const env=environment();env.app.start('campaign',12);env.advance(1000);env.advance(1200);env.advance(1400);env.advance(1600);
  const time=env.app.engine.time;env.action('pause');assert.equal(env.app.engine.state,'paused');
  env.advance(2000);assert.equal(env.app.engine.time,time);
  env.action('settings');env.root.innerWidth=844;env.root.innerHeight=390;env.app.resize();env.action('close-settings');assert.equal(env.app.screen,'paused');
  env.action('resume');env.advance(3000);env.advance(3017);assert.ok(env.app.engine.time>time);assert.equal(env.app.engine.misses,0);
});
test('results save once, unlock Next, retry, and keep separate practice bests', () => {
  const env=environment();env.app.start('campaign',0);const engine=env.app.engine;
  engine.requiredCut=engine.total;engine.cut=8;engine.score=100;engine.finish();env.app.results();
  assert.equal(env.app.store.data.unlocked,1);assert.equal(env.app.store.data.sliced,8);
  env.app.results();assert.equal(env.app.store.data.sliced,8);
  env.action('next');assert.equal(env.app.engine.level.id,1);env.action('pause');env.action('retry');assert.equal(env.app.engine.level.id,1);assert.equal(env.app.screen,'playing');
  env.app.settings().assist=true;env.app.start('quick');assert.equal(env.app.engine.bestKey(),'quick-assist');
});
test('every mode can be started, rendered, finished and recorded', () => {
  const env=environment();
  for(const mode of ['quick','zen','daily','survival']) {
    env.app.start(mode);env.app.engine.advance(0.2);env.app.engine.advance(0.2);env.app.engine.advance(0.2);env.advance(1000);
    for(const e of env.app.engine.entities)env.app.renderer.entity(e);
    env.app.engine.finish();env.app.results();assert.equal(env.app.screen,'results');assert.ok(env.elements.get('panel').innerHTML.includes('Harvest again'));
  }
});
test('keyboard slicing and lifecycle interruptions cannot leave an active blade', () => {
  const env=environment();env.document.emit('keydown',{code:'Space',repeat:false});assert.equal(env.app.engine.state,'playing');
  env.document.emit('keydown',{code:'ArrowRight',repeat:false});env.advance(1000);env.advance(1017);assert.ok(env.app.cursor.x>195);
  env.document.emit('keydown',{code:'Escape'});assert.equal(env.app.screen,'paused');assert.equal(env.app.keys.size,0);assert.equal(env.app.keyboardBlade,false);
  env.action('resume');env.document.hidden=true;env.document.emit('visibilitychange');assert.equal(env.app.screen,'paused');
});
test('storage denial and corrupt imports do not break application routes', () => {
  const env=environment({storage:{getItem(){throw Error('denied')},setItem(){throw Error('denied')}}});
  env.app.start('quick');env.app.engine.finish();env.app.results();assert.ok(env.app.store.warning);
  env.action('settings');assert.ok(env.elements.get('panel').innerHTML.includes('Export save'));assert.throws(()=>env.app.store.import('{invalid'));
  env.action('export');env.action('close-settings');assert.equal(env.app.screen,'home');
});
test('audio supports cached samples, bounded voices and rejected unlocks', async () => {
  const env=environment();let buffers=0;const sources=[];
  class Context {
    constructor(){this.state='suspended';this.sampleRate=8000;this.currentTime=0;this.destination={};}
    async resume(){this.state='running';}
    createGain(){return {gain:{value:0,setTargetAtTime(){}},connect(){}};}
    createBuffer(channels,length){buffers++;return {getChannelData(){return new Float32Array(length);}};}
    createBufferSource(){const node={connect(){},disconnect(){},start(){},stop(){this.onended?.();}};sources.push(node);return node;}
  }
  env.root.AudioContext=Context;const audio=new env.root.Harvest.Audio(()=>env.root.Harvest.defaultSave().settings);await audio.unlock();
  for(let i=0;i<30;i++)audio.play('slice');assert.equal(audio.voices.size,12);assert.equal(buffers,1);audio.stop();assert.equal(audio.voices.size,0);
  env.root.AudioContext=class extends Context {async resume(){throw Error('blocked')}};
  const rejected=new env.root.Harvest.Audio(()=>env.root.Harvest.defaultSave().settings);await rejected.unlock();assert.equal(rejected.failed,true);rejected.play('slice');
});
test('saved comfort choices override fresh system defaults', () => {
  const fresh=environment({reduced:true});assert.equal(fresh.app.settings().reduced,true);
  const data=fresh.root.Harvest.defaultSave();data.settings.reduced=false;
  const saved=environment({reduced:true,storage:{getItem(){return JSON.stringify(data)},setItem(){}}});assert.equal(saved.app.settings().reduced,false);
});
test('replay sessions can finish from pause and campaign cannot skip its deadline', () => {
  const env=environment();env.app.start('survival');env.app.engine.score=75;env.action('pause');env.action('end');assert.equal(env.app.screen,'results');assert.equal(env.app.store.data.bests.survival,75);
  env.app.start('campaign',0);env.action('pause');env.action('end');assert.equal(env.app.screen,'paused');assert.equal(env.app.engine.result,null);
});
test('static and generated HTML templates have balanced elements and local dependencies', () => {
  const env=environment();const templates=[fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')];
  for(const action of ['home','chapters','modes','collection','help','settings']){env.action(action);templates.push(env.elements.get('panel').innerHTML);}
  env.app.start('campaign',3);env.action('pause');templates.push(env.elements.get('panel').innerHTML);env.app.engine.finish();env.app.results();templates.push(env.elements.get('panel').innerHTML);
  const voids=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  for(const markup of templates){
    const stack=[];
    for(const match of markup.matchAll(/<\/?([a-zA-Z][\w-]*)\b[^>]*>/g)){
      const [tag,name]=match;
      if(tag.startsWith('</'))assert.equal(stack.pop(),name,'Unbalanced '+tag);
      else if(!voids.has(name)&&!tag.endsWith('/>'))stack.push(name);
    }
    assert.equal(stack.length,0,'Unclosed elements: '+stack);
  }
  const html=templates[0];
  for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){assert.ok(!/^(https?:)?\/\//.test(match[1]));assert.ok(fs.existsSync(path.join(__dirname,'..',match[1])));}
  for(const file of ['core.js','art.js','audio.js','game.js','styles.css'])assert.ok(!/\bfetch\s*\(|XMLHttpRequest|serviceWorker|@import|https?:\/\//.test(fs.readFileSync(path.join(__dirname,'..',file),'utf8')),file+' has a network dependency');
});
