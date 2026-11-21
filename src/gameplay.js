/* DHAKA AFTER DARK 0.6 — Original city sandbox gameplay mechanics.
 * Distinct from any proprietary GTA assets. No networking or personal data.
 * Save uses this browser's localStorage; safely falls back in restricted mode.
 */
export const MISSIONS=Object.freeze([
 {id:'courier',title:'BANANI COURIER RUN',area:'mohakhali',kind:'delivery',reward:700,limit:210,car:true,brief:'Pick up a car and deliver the parcel to Mohakhali bus stand.'},
 {id:'avenue',title:'GULSHAN AVENUE DRIVE',area:'gulshan',kind:'drive',reward:1100,limit:235,car:true,brief:'Drive from Banani toward Gulshan 2. Stay in your vehicle.'},
 {id:'heat',title:'ESCAPE THE HEAT',area:'gulshan1',kind:'escape',reward:1500,limit:280,car:false,brief:'Reach Gulshan 1 AND lose every wanted star before collecting the reward.'},
 {id:'service',title:'NORTH DHAKA EXPRESS',area:'banani',kind:'delivery',reward:1250,limit:240,car:true,brief:'Complete a return delivery through North Dhaka without running out of time.'},
 {id:'scout',title:'MOHAKHALI SCOUT',area:'mohakhali',kind:'explore',reward:950,limit:240,car:false,brief:'Explore the streets and reach the next orange location marker.'},
 {id:'snatch',title:'BANANI VEHICLE GETAWAY',area:'gulshan',kind:'carjack',reward:1900,limit:330,car:true,brief:'Press F near a traffic vehicle, take control, lose the police and reach Gulshan 2 while driving the snatched car.'}
]);
const MAX=100, clamp=(x,a,b)=>Math.min(b,Math.max(a,Number.isFinite(Number(x))?Number(x):a));
const num=(v,lo=0,hi=1e6)=>clamp(Number(v),lo,hi);
export const SAVE_KEY='dhaka-after-dark-v06-save';
export class UrbanGameplay{
 constructor(storage=typeof localStorage!=='undefined'?localStorage:null){
  this.storage=storage;
  this.cash=0;this.health=100;this.armor=40;this.stamina=100;this.carHealth=100;
  this.wanted=0;this.wantedReason='';this.lostSight=0;this.heatCooldown=0;
  this.missionIndex=0;this.missionTime=0;this.missionActive=false;
  this.garageLevel=0;this.completed=0;this.savedPosition=null;
  this.carSnatches=0;this.missionCarSnatched=false;
  this.lastEvent='';this.autosaveRemaining=14;
  this.load();
 }
 get mission(){return MISSIONS[this.missionIndex%MISSIONS.length];}
 get remaining(){return Math.max(0,Math.ceil(this.mission.limit-this.missionTime));}
 get currentReward(){return this.mission.reward;}
 startMission(){
  this.missionActive=true;this.missionTime=0;this.missionCarSnatched=false;
  this.lastEvent='MISSION STARTED: '+this.mission.title;
  if(this.mission.kind==='escape')this.addWanted(2,'escape challenge');
  return this.lastEvent;
 }
 failMission(reason='TIME EXPIRED'){
  this.missionActive=false;this.missionTime=0;this.missionCarSnatched=false;
  this.wanted=Math.max(0,this.wanted-(this.mission.kind==='escape'?2:0));
  this.lastEvent='MISSION FAILED: '+reason+' — PRESS N TO RETRY';
  return this.lastEvent;
 }
 completeMission({distance,inCar,stolenCar=false}){
  if(!this.missionActive)return {ok:false,reason:'PRESS N TO START THE MISSION'};
  if(distance>11)return {ok:false,reason:'GET CLOSER TO THE CHECKPOINT'};
  if(this.mission.car&&!inCar)return {ok:false,reason:'ARRIVE IN A VEHICLE'};
  if(this.mission.kind==='escape'&&this.wanted!==0)return {ok:false,reason:'LOSE YOUR WANTED STARS FIRST'};
  if(this.mission.kind==='carjack'){
   if(!this.missionCarSnatched)return {ok:false,reason:'HIJACK A TRAFFIC CAR WITH F FIRST'};
   if(!stolenCar)return {ok:false,reason:'RETURN WITH THE HIJACKED VEHICLE'};
   if(this.wanted!==0)return {ok:false,reason:'ESCAPE AND LOSE YOUR WANTED STARS BEFORE DELIVERY'};
  }
  const reward=this.mission.reward;
  this.cash+=reward;this.completed++;this.missionIndex++;this.missionTime=0;
  this.missionActive=false;this.missionCarSnatched=false;
  this.lastEvent='MISSION COMPLETE · +৳'+reward.toLocaleString()+' · PRESS N FOR NEXT JOB';
  this.save();
  return {ok:true,reward,reason:this.lastEvent};
 }
 registerCarjack(){
  this.carSnatches++;if(this.missionActive&&this.mission.kind==='carjack')this.missionCarSnatched=true;
  this.addWanted(2,'traffic car snatched');
  this.lastEvent='VEHICLE TAKEN · ★★ WANTED · LOSE THE POLICE';
  return this.lastEvent;
 }
 addWanted(stars=1,reason='reckless driving'){
  this.wanted=Math.round(clamp(this.wanted+stars,0,5));
  this.lostSight=0;this.wantedReason=reason;this.heatCooldown=3;
  this.lastEvent=this.wanted?'WANTED · '+this.wanted+' STAR'+(this.wanted>1?'S':'')+' · '+reason.toUpperCase():'WANTED CLEARED';
  return this.wanted;
 }
 vehicleDamage(amount){
  this.carHealth=clamp(this.carHealth-num(amount,0,100),0,100);
  this.lastEvent=this.carHealth<=0?'ENGINE DISABLED · EXIT OR VISIT GARAGE':'VEHICLE IMPACT';
  return this.carHealth;
 }
 takeDamage(amount){
  let damage=num(amount,0,100);
  const covered=Math.min(this.armor,damage*.65);
  this.armor-=covered;damage-=covered;
  this.health=clamp(this.health-damage,0,100);
  return this.health;
 }
 registerBusted(){
  this.cash=Math.max(0,this.cash-250);
  this.health=100;this.armor=20;this.carHealth=100;this.wanted=0;this.lostSight=0;
  if(this.missionActive)this.failMission('BUSTED');
  this.lastEvent='BUSTED · ৳250 FINE · RETURNED TO BANANI';
  this.save();return this.lastEvent;
 }
 enterVehicle(){this.carHealth=100;}
 canPurchase(cost){return this.cash>=cost;}
 repair(){
  if(this.carHealth>=100)return {ok:false,reason:'VEHICLE ALREADY REPAIRED'};
  if(!this.canPurchase(300))return {ok:false,reason:'NEED ৳300 FOR REPAIR'};
  this.cash-=300;this.carHealth=100;this.save();
  return {ok:true,reason:'GARAGE REPAIR COMPLETE · -৳300'};
 }
 upgrade(){
  if(this.garageLevel>=3)return {ok:false,reason:'MAX ENGINE UPGRADE REACHED'};
  const cost=1200+this.garageLevel*800;
  if(!this.canPurchase(cost))return {ok:false,reason:'ENGINE UPGRADE NEEDS ৳'+cost};
  this.cash-=cost;this.garageLevel++;this.save();
  return {ok:true,reason:'ENGINE UPGRADE '+this.garageLevel+'/3 · -৳'+cost};
 }
 clinic(){
  if(this.health>=100&&this.armor>=40)return {ok:false,reason:'HEALTH & ARMOR ALREADY RESTORED'};
  if(!this.canPurchase(150))return {ok:false,reason:'NEED ৳150 FOR CLINIC'};
  this.cash-=150;this.health=100;this.armor=40;this.save();
  return {ok:true,reason:'CLINIC VISIT · HEALTH AND ARMOR RESTORED · -৳150'};
 }
 tick(dt,{speed=0,inCar=false,policeDistance=Infinity,sprinting=false,moving=false}={}){
  const step=clamp(dt,0,.1);this.heatCooldown=Math.max(0,this.heatCooldown-step);
  if(this.missionActive){this.missionTime+=step;if(this.missionTime>=this.mission.limit)return {event:this.failMission('OUT OF TIME')};}
  const drain=sprinting&&moving&&!inCar?27*step:-17*step;
  this.stamina=clamp(this.stamina-drain,0,100);
  if(this.wanted){
   if(policeDistance>125||!Number.isFinite(policeDistance)){this.lostSight+=step;}
   else this.lostSight=0;
   if(this.lostSight>11&&this.heatCooldown<=0){
    this.wanted=Math.max(0,this.wanted-1);this.lostSight=0;this.heatCooldown=2;
    if(this.wanted===0)this.lastEvent='WANTED CLEARED · KEEP A LOW PROFILE';
   }
  }
  return {event:null};
 }
 save(position){
  if(position&&Number.isFinite(position.x)&&Number.isFinite(position.z))this.savedPosition={x:position.x,z:position.z};
  const snapshot={version:6,cash:this.cash,health:this.health,armor:this.armor,stamina:this.stamina,
   garageLevel:this.garageLevel,completed:this.completed,missionIndex:this.missionIndex,carSnatches:this.carSnatches,
   savedPosition:this.savedPosition};
  try{this.storage?.setItem(SAVE_KEY,JSON.stringify(snapshot));return true;}catch{return false;}
 }
 load(){
  let s;
  try{s=JSON.parse(this.storage?.getItem(SAVE_KEY)||'null');}catch{return false;}
  if(!s||s.version!==6)return false;
  this.cash=num(s.cash,0,1e8);this.health=num(s.health,1,100);this.armor=num(s.armor,0,100);
  this.stamina=num(s.stamina,0,100);this.garageLevel=num(s.garageLevel,0,3);
  this.completed=num(s.completed,0,1e6);this.missionIndex=Math.floor(num(s.missionIndex,0,1e6));this.carSnatches=num(s.carSnatches||0,0,1e6);
  const p=s.savedPosition;if(p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<2700&&Math.abs(p.z)<2700)this.savedPosition={x:p.x,z:p.z};
  return true;
 }
}
