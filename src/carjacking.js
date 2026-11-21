/* Fictional, game-only GTA-style carjacking interaction.
 * This manages an interruptible timer for taking a passing traffic vehicle.
 * It never accesses real vehicles, accounts, or external systems.
 */
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class CarjackController{
 constructor({duration=2.2,cooldown=5}={}){
  this.duration=duration;this.cooldownTime=cooldown;this.cooldown=0;
  this.active=null;this.progress=0;this.total=0;this.successful=0;
 }
 closest(player,traffic,radius=9){
  if(!player)return null;
  let best=null,minimum=radius;
  for(const record of traffic){
   if(!record?.object?.position||record.snatching)continue;
   const d=distance(player,record.object.position);
   const velocity=Math.abs(record.actualSpeed||0);
   if(d<minimum&&velocity<13){best={record,distance:d};minimum=d;}
  }
  return best;
 }
 begin(player,traffic){
  if(this.active)return {ok:false,reason:'CARJACKING IN PROGRESS'};
  if(this.cooldown>0)return {ok:false,reason:'WAIT '+Math.ceil(this.cooldown)+'s BEFORE TRYING AGAIN'};
  const near=this.closest(player,traffic,9);
  if(!near)return {ok:false,reason:'MOVE WITHIN 9m OF A TRAFFIC VEHICLE'};
  near.record.snatching=true;
  near.record.stoppedFor=Math.max(near.record.stoppedFor||0,this.duration+2.5);
  near.record.actualSpeed=0;
  this.active=near.record;
  this.progress=0;this.total++;
  return {ok:true,reason:'TAKING VEHICLE · STAY CLOSE FOR '+this.duration.toFixed(1)+'s'};
 }
 cancel(reason='INTERRUPTED'){
  if(!this.active)return {ok:false,reason};
  this.active.snatching=false;
  this.active.stoppedFor=Math.max(this.active.stoppedFor||0,1.5);
  this.active=null;this.progress=0;this.cooldown=1.2;
  return {ok:false,cancelled:true,reason:'CARJACKING '+reason};
 }
 update(dt,{player,traffic,inCar=false}={}){
  this.cooldown=Math.max(0,this.cooldown-Math.min(.1,Math.max(0,dt||0)));
  if(!this.active)return {done:false};
  const record=this.active;
  if(inCar||!traffic?.includes(record))return this.cancel('INTERRUPTED');
  const d=distance(player,record.object.position);
  if(d>8.5)return this.cancel('CANCELLED · TOO FAR');
  record.stoppedFor=Math.max(record.stoppedFor||0,2);
  record.actualSpeed=0;
  this.progress+=Math.min(.1,Math.max(0,dt||0));
  if(this.progress<this.duration)return {done:false,progress:this.progress/this.duration};
  record.snatching=false;
  this.active=null;this.progress=0;this.cooldown=this.cooldownTime;
  this.successful++;
  return {done:true,record,reason:'VEHICLE TAKEN · DRIVER FLED · POLICE ALERT'};
 }
}
