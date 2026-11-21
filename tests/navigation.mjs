/* Regression coverage for screen-relative movement and OSM GPS routing.
 * Run with Node.js 20+: node --test tests/navigation.mjs
 * Load browser ESM sources via data URL to avoid changing static-site build.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=async(file)=>import('data:text/javascript;charset=utf-8,'+encodeURIComponent(readFileSync(new URL(file,import.meta.url),'utf8')));
const controls=await load('../src/control_math.js');
const {StreetRouter}=await load('../src/map_navigation.js');
const near=(value,goal)=>assert.ok(Math.abs(value-goal)<1e-8,`Expected ${goal}, got ${value}`);
test('left/right arrows move to the matching SCREEN direction (south facing)',()=>{
 const left=controls.cameraRelativeMove(0,0,-1),right=controls.cameraRelativeMove(0,0,1);
 near(left.x,1);near(right.x,-1);near(left.z,0);near(right.z,0);
});
test('camera-relative direction stays correct after 90-degree turn',()=>{
 const left=controls.cameraRelativeMove(Math.PI/2,0,-1);
 const right=controls.cameraRelativeMove(Math.PI/2,0,1);
 near(left.z,-1);near(right.z,1);
});
test('vehicle left/right steering uses behind-car camera convention',()=>{
 const right=controls.steerVehicleYaw(0,1,1,12,1);
 const left=controls.steerVehicleYaw(0,-1,1,12,1);
 assert.ok(right<0);assert.ok(left>0);
 assert.ok(controls.steerVehicleYaw(0,1,1,-5,1)>0,'reverse steering must invert');
});
test('GPS arrow and minimap arrow agree with camera direction',()=>{
 near(controls.minimapArrowRotation(0),Math.PI);
 near(controls.minimapArrowRotation(Math.PI),0);
 near(controls.minimapArrowRotation(Math.PI/2),Math.PI/2);
 near(controls.gpsArrowRotationDegrees(Math.PI/2,0),-90);
});
test('connected OpenStreetMap road nodes form path, not a straight-line guess',()=>{
 const router=new StreetRouter({roads:[
  {width:8,points:[{x:0,z:0},{x:0,z:50},{x:0,z:100}]},
  {width:8,points:[{x:0,z:50},{x:50,z:50}]},
  {width:8,points:[{x:400,z:400},{x:450,z:400}]}
 ]});
 const connected=router.compute({x:0,z:0},{x:50,z:50});
 assert.equal(connected.roadBased,true);near(connected.distance,100);
 assert.equal(router.compute({x:0,z:0},{x:450,z:400}),null,'disconnected roads must not be treated as routable');
});
