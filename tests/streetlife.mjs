import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../src/gameplay.js',import.meta.url),'utf8');
const {UrbanGameplay,MISSIONS}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(js));
const store=()=>({memory:new Map(),getItem(k){return this.memory.get(k)||null},setItem(k,v){this.memory.set(k,v)}});
test('story missions require cars and award configured Taka',()=>{
 const m=new UrbanGameplay(store());
 assert.equal(m.mission.title,'BANANI COURIER RUN');
 m.startMission();
 assert.equal(m.completeMission({distance:2,inCar:false}).ok,false);
 assert.equal(m.completeMission({distance:2,inCar:true}).reward,700);
 assert.equal(m.cash,700);assert.equal(m.missionIndex,1);
 assert.equal(m.missionActive,false);
});
test('police stars are capped, disappear after escaping range and return after pursuit',()=>{
 const m=new UrbanGameplay(store());
 m.addWanted(9,'test');assert.equal(m.wanted,5);
 for(let i=0;i<160;i++)m.tick(.1,{policeDistance:200});
 assert.ok(m.wanted<=4);
 m.addWanted(3,'new collision');assert.ok(m.wanted>=4);
 m.registerBusted();assert.equal(m.wanted,0);assert.equal(m.health,100);
});
test('timed missions fail instead of awarding money',()=>{
 const m=new UrbanGameplay(store());m.startMission();
 for(let i=0;i<2500;i++)m.tick(.1,{policeDistance:Infinity});
 assert.equal(m.missionActive,false);assert.equal(m.cash,0);assert.equal(m.missionIndex,0);
});
test('damage, garage repairs/upgrades and clinic enforce cash',()=>{
 const m=new UrbanGameplay(store());
 m.vehicleDamage(45);assert.equal(m.carHealth,55);
 assert.equal(m.repair().ok,false);
 m.cash=4500;
 assert.equal(m.repair().ok,true);assert.equal(m.carHealth,100);assert.equal(m.cash,4200);
 assert.equal(m.upgrade().ok,true);assert.equal(m.garageLevel,1);assert.equal(m.cash,3000);
 m.takeDamage(60);assert.ok(m.health<100);
 assert.equal(m.clinic().ok,true);assert.equal(m.health,100);assert.equal(m.armor,40);assert.equal(m.cash,2850);
});
test('autosave persists progress and validates safe player positions',()=>{
 const storage=store(),m=new UrbanGameplay(storage);
 m.cash=1500;m.completed=3;m.missionIndex=3;m.garageLevel=2;
 assert.equal(m.save({x:210,z:450}),true);
 const restored=new UrbanGameplay(storage);
 assert.equal(restored.cash,1500);assert.equal(restored.completed,3);
 assert.equal(restored.missionIndex,3);assert.equal(restored.garageLevel,2);
 assert.deepEqual(restored.savedPosition,{x:210,z:450});
});
test('escape mission requires wanted stars cleared',()=>{
 const m=new UrbanGameplay(store());
 m.missionIndex=2;m.startMission();
 assert.equal(m.wanted,2);
 assert.equal(m.completeMission({distance:0,inCar:false}).ok,false);
 m.wanted=0;
 assert.equal(m.completeMission({distance:0,inCar:false}).ok,true);
 assert.equal(m.cash,MISSIONS[2].reward);
});
test('stamina drains on foot while sprinting and recovers when resting',()=>{
 const m=new UrbanGameplay(store());
 for(let i=0;i<10;i++)m.tick(.1,{sprinting:true,moving:true,inCar:false});
 assert.ok(m.stamina<100);
 const drained=m.stamina;
 for(let i=0;i<10;i++)m.tick(.1,{sprinting:false,moving:false});
 assert.ok(m.stamina>drained);
});
