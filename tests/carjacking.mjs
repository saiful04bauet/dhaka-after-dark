import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
async function load(path){const source=readFileSync(new URL(path,import.meta.url),'utf8');return import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));}
const {CarjackController}=await load('../src/carjacking.js');
const {UrbanGameplay,MISSIONS}=await load('../src/gameplay.js');
const {slippyPixel,metersToPixels,TileRadar}=await load('../src/radar_tiles.js');
const near=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<=eps,`Expected ${a} near ${b}`);
const record=(x=4,z=0,velocity=0)=>({object:{position:{x,z}},actualSpeed:velocity,stoppedFor:0});
const storage=()=>({data:new Map(),setItem(k,v){this.data.set(k,v)},getItem(k){return this.data.get(k)||null}});
test('F selects nearby traffic car and requires uninterrupted hijack timer',()=>{
 const jack=new CarjackController({duration:2.2,cooldown:5});
 const car=record(3,0);
 const begin=jack.begin({x:0,z:0},[car]);assert.equal(begin.ok,true);
 assert.equal(car.snatching,true);assert.ok(car.stoppedFor>2.2);
 let status;
 for(let i=0;i<21;i++)status=jack.update(.1,{player:{x:0,z:0},traffic:[car],inCar:false});
 assert.equal(status.done,false);
 status=jack.update(.1,{player:{x:0,z:0},traffic:[car],inCar:false});
 assert.equal(status.done,true);assert.equal(status.record,car);
 assert.equal(jack.successful,1);assert.equal(car.snatching,false);
 assert.equal(jack.begin({x:0,z:0},[car]).ok,false);
});
test('Carjacking cancels when player flees, enters another car or traffic vanishes',()=>{
 const jack=new CarjackController();
 const car=record(2,0);
 assert.equal(jack.begin({x:0,z:0},[car]).ok,true);
 let action=jack.update(.4,{player:{x:12,z:12},traffic:[car]});
 assert.equal(action.cancelled,true);assert.equal(car.snatching,false);
 jack.cooldown=0;
 assert.equal(jack.begin({x:0,z:0},[car]).ok,true);
 action=jack.update(.1,{player:{x:0,z:0},traffic:[car],inCar:true});
 assert.equal(action.cancelled,true);
});
test('Car snatching getaway requires a newly snatched car and no police pursuit',()=>{
 const g=new UrbanGameplay(storage());
 assert.equal(MISSIONS.at(-1).kind,'carjack');g.missionIndex=MISSIONS.length-1;
 g.startMission();
 assert.equal(g.completeMission({distance:3,inCar:true,stolenCar:true}).ok,false);
 g.registerCarjack();assert.equal(g.carSnatches,1);assert.equal(g.wanted,2);
 assert.equal(g.completeMission({distance:3,inCar:true,stolenCar:true}).ok,false);
 g.wanted=0;
 assert.equal(g.completeMission({distance:3,inCar:true,stolenCar:false}).ok,false);
 const reward=g.completeMission({distance:3,inCar:true,stolenCar:true});
 assert.equal(reward.ok,true);assert.equal(reward.reward,1900);
 g.save({x:5,z:8});assert.equal(new UrbanGameplay(g.storage).carSnatches,1);
});
test('Web Mercator coordinate correctness for Bangladesh real street radar',()=>{
 const equator=slippyPixel(0,0,2);near(equator.x,512);near(equator.y,512);
 const dhaka=slippyPixel(23.79075,90.40503,15);
 assert.ok(dhaka.x>6000000&&dhaka.y>3000000);
 const dx=slippyPixel(23.79075,90.40503+.001,15).x-dhaka.x;
 const expected=111320*Math.cos(23.79075*Math.PI/180)*.001*metersToPixels(23.79075,15);
 assert.ok(Math.abs(dx-expected)/expected<.005);
 assert.ok(metersToPixels(23.79075,16)>metersToPixels(23.79075,15));
 const radar=new TileRadar();
 assert.equal(radar.draw(null,310,310,{lat:23.79,lon:90.4}),false);
});
