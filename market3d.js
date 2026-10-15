// 3D market stall (Three.js). Crates grow as you buy more of each good.
(function(){
var host=document.getElementById("scene");
if(!host||!window.THREE){if(host)host.style.display="none";return}
var W=host.clientWidth||360,H=190,r;
try{r=new THREE.WebGLRenderer({antialias:true,alpha:true})}catch(e){host.style.display="none";return}
r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.setSize(W,H);host.appendChild(r.domElement);
var sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(40,W/H,.1,100);
cam.position.set(0,4.2,10);
sc.add(new THREE.HemisphereLight(0xffffff,0x446644,.95));
var dl=new THREE.DirectionalLight(0xffffff,.7);dl.position.set(4,8,5);sc.add(dl);
function box(w,h,d,c,x,y,z){var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:c}));m.position.set(x,y,z);sc.add(m);return m}
box(15,.3,7,0xcaa26a,0,-.15,0);
box(8.4,.8,2.2,0x7a4b25,0,.4,0);
box(.2,3.4,.2,0x5a3a1a,-4.1,1.7,-.9);box(.2,3.4,.2,0x5a3a1a,4.1,1.7,-.9);
for(var i=0;i<8;i++){var a=box(1.05,.12,3,i%2?0xf0b323:0x0f6b3f,-3.7+i*1.06,3.5,.2);a.rotation.x=.25}
var cols=[0xe0442f,0xf1ead0,0xb8814a,0x2f9e44,0x4a90c8],ids=["tom","rice","yam","pep","fish"],crates=[];
for(var k=0;k<5;k++){crates.push(box(1.1,.5,1.1,cols[k],-3.2+k*1.6,1.05,0))}
var coin=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.12,24),new THREE.MeshLambertMaterial({color:0xf0b323}));
coin.rotation.x=Math.PI/2;coin.position.set(5.2,2.2,0);sc.add(coin);
var target=[.5,.5,.5,.5,.5],still=window.matchMedia&&matchMedia("(prefers-reduced-motion:reduce)").matches;
window.mh3d={update:function(inv){if(!inv)return;for(var k=0;k<5;k++)target[k]=.5+Math.min((inv[ids[k]]||0)/20,1)*1.4}};
function tick(t){
 requestAnimationFrame(tick);if(document.hidden)return;
 t*=.001;
 if(!still){cam.position.x=Math.sin(t*.5)*1.8;coin.rotation.z=t*2}
 cam.lookAt(0,1.4,0);
 for(var k=0;k<5;k++){var c=crates[k],h=c.scale.y*.5,n=h+(target[k]-h)*.12;c.scale.y=n/.5;c.position.y=.8+n/2}
 r.render(sc,cam)}
requestAnimationFrame(tick);
if(window.S&&S.inv)mh3d.update(S.inv);
})();
