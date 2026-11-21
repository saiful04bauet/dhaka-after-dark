/* Reusable camera-relative direction helpers.
 * Three.js third-person camera sits behind player and looks towards +local Z.
 * Its visual RIGHT vector is (-cos(yaw), 0, +sin(yaw)).
 */
export function cameraRelativeMove(yaw,forward,strafe){
 return {x:Math.sin(yaw)*forward-Math.cos(yaw)*strafe,
         z:Math.cos(yaw)*forward+Math.sin(yaw)*strafe};
}
export function steerVehicleYaw(yaw,steer,dt,speed,factor){
 return yaw-steer*dt*(speed>=0?1:-1)*.95*factor;
}
export function minimapArrowRotation(yaw){return Math.PI-yaw;}
export function gpsArrowRotationDegrees(bearing,cameraYaw){
 return -(bearing-cameraYaw)*180/Math.PI;
}
