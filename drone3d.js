import * as THREE from "./three.module.min.js";

const canvas = document.getElementById("drone3d");
const section = document.getElementById("droneSec");
const stage = document.getElementById("droneStage");
const labelsBox = document.getElementById("droneLabels");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);

scene.add(new THREE.HemisphereLight(0xbfd4e6, 0x141210, 1.05));
const sun = new THREE.DirectionalLight(0xffe2b8, 2.2);
sun.position.set(4, 7, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = sun.shadow.camera.bottom = -5;
sun.shadow.camera.right = sun.shadow.camera.top = 5;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x7fb4ff, .8);
rim.position.set(-5, 3, -4);
scene.add(rim);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({opacity: .22}));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2.4;
ground.receiveShadow = true;
scene.add(ground);

const M = {
  carbon: new THREE.MeshStandardMaterial({color: 0x1b1c20, roughness: .5, metalness: .25}),
  carbonLite: new THREE.MeshStandardMaterial({color: 0x26282e, roughness: .6, metalness: .15}),
  alu: new THREE.MeshStandardMaterial({color: 0x9aa2ad, roughness: .3, metalness: .95}),
  aluRed: new THREE.MeshStandardMaterial({color: 0xb3342c, roughness: .35, metalness: .85}),
  copper: new THREE.MeshStandardMaterial({color: 0xb87333, roughness: .4, metalness: .9}),
  plastic: new THREE.MeshStandardMaterial({color: 0x0e0f12, roughness: .8, metalness: 0}),
  pcb: new THREE.MeshStandardMaterial({color: 0x14241c, roughness: .55, metalness: .3}),
  lipo: new THREE.MeshStandardMaterial({color: 0x274a8f, roughness: .45, metalness: .2}),
  prop: new THREE.MeshStandardMaterial({color: 0xd9342b, roughness: .5, metalness: .1, side: THREE.DoubleSide}),
  lens: new THREE.MeshStandardMaterial({color: 0x101820, roughness: .1, metalness: .6}),
  brass: new THREE.MeshStandardMaterial({color: 0xc9a227, roughness: .35, metalness: .9}),
  strap: new THREE.MeshStandardMaterial({color: 0x3a3d44, roughness: .9})
};

const drone = new THREE.Group();
scene.add(drone);
const parts = [];
const labels = [];
const spinners = [];

function part(group, dir, dist, label){
  group.userData.base = group.position.clone();
  group.userData.dir = dir.clone().normalize();
  group.userData.dist = dist;
  group.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  drone.add(group);
  parts.push(group);
  if (label) labels.push({g: group, text: label, el: null});
  return group;
}

const AR = 1.55, AH = .075, AW = .14;

const frame = new THREE.Group();
const deck = new THREE.Mesh(new THREE.BoxGeometry(1.05, .07, .8), M.carbon);
frame.add(deck);
const nose = new THREE.Mesh(new THREE.BoxGeometry(.5, .065, .34), M.carbon);
nose.position.set(.72, 0, 0);
frame.add(nose);
for (const sx of [-1, 1]) for (const sz of [-1, 1]){
  const st = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .34, 10), M.alu);
  st.position.set(.36 * sx, .2, .26 * sz);
  frame.add(st);
}
part(frame, new THREE.Vector3(0, 0, 1e-6), 0, "Карбонова рама 7\"");

const top = new THREE.Group();
const tp = new THREE.Mesh(new THREE.BoxGeometry(.95, .055, .7), M.carbonLite);
top.add(tp);
const gps = new THREE.Mesh(new THREE.CylinderGeometry(.16, .18, .09, 20), M.plastic);
gps.position.set(-.28, .08, 0);
top.add(gps);
top.position.y = .39;
part(top, new THREE.Vector3(0, 1, -.15), 1.5, "Верхня плита + GPS");

const armSpecs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
armSpecs.forEach(([sx, sz], i) => {
  const yaw = Math.atan2(-sz * .62, sx * .9);
  const arm = new THREE.Group();
  const a = new THREE.Mesh(new THREE.BoxGeometry(AR, AH, AW), M.carbon);
  a.position.x = AR / 2 - .12;
  arm.add(a);
  arm.position.set(.32 * sx, 0, .26 * sz);
  arm.rotation.y = yaw;
  part(arm, new THREE.Vector3(sx, 0, sz), 1.05, i === 0 ? "Промені рами" : null);

  const tip = new THREE.Vector3(
    .32 * sx + Math.cos(yaw) * (AR - .12),
    0,
    .26 * sz - Math.sin(yaw) * (AR - .12)
  );

  const motor = new THREE.Group();
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(.155, .165, .16, 24), M.aluRed);
  bell.position.y = .14;
  motor.add(bell);
  const stator = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .07, 18), M.copper);
  stator.position.y = .05;
  motor.add(stator);
  const mbase = new THREE.Mesh(new THREE.CylinderGeometry(.13, .14, .04, 18), M.alu);
  motor.add(mbase);
  motor.position.copy(tip);
  part(motor, new THREE.Vector3(sx * .25, 1, sz * .25), 1.1, i === 1 ? "Мотори 2807" : null);

  const prop = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .06, 12), M.plastic);
  prop.add(hub);
  for (let b = 0; b < 3; b++){
    const blade = new THREE.Mesh(new THREE.BoxGeometry(.82, .012, .11), M.prop);
    blade.position.x = .42;
    blade.rotation.x = .28;
    const h = new THREE.Group();
    h.rotation.y = b * Math.PI * 2 / 3;
    h.add(blade);
    prop.add(h);
  }
  prop.position.set(tip.x, .26, tip.z);
  prop.userData.spin = (i % 2 ? 1 : -1);
  spinners.push(prop);
  part(prop, new THREE.Vector3(sx * .15, 1, sz * .15), 2.05, i === 2 ? "Пропелери 7×4×3" : null);
});

const stack = new THREE.Group();
for (let i = 0; i < 2; i++){
  const board = new THREE.Mesh(new THREE.BoxGeometry(.42, .03, .42), M.pcb);
  board.position.y = .1 + i * .12;
  stack.add(board);
}
const capc = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .2, 14), M.plastic);
capc.rotation.x = Math.PI / 2;
capc.position.set(-.32, .12, .25);
stack.add(capc);
part(stack, new THREE.Vector3(.2, 1, .9), 1.45, "Політний стек FC+ESC");

const bat = new THREE.Group();
const cell = new THREE.Mesh(new THREE.BoxGeometry(.95, .3, .42), M.lipo);
cell.position.y = -.26;
bat.add(cell);
for (const dx of [-.25, .25]){
  const s = new THREE.Mesh(new THREE.BoxGeometry(.07, .34, .46), M.strap);
  s.position.set(dx, -.26, 0);
  bat.add(s);
}
const xt = new THREE.Mesh(new THREE.BoxGeometry(.12, .1, .08), M.brass);
xt.position.set(.55, -.26, 0);
bat.add(xt);
part(bat, new THREE.Vector3(0, -1, .2), 1.5, "Li-Ion 6S батарея");

const cam3 = new THREE.Group();
const cbody = new THREE.Mesh(new THREE.BoxGeometry(.16, .22, .22), M.plastic);
cam3.add(cbody);
const lens = new THREE.Mesh(new THREE.CylinderGeometry(.08, .09, .1, 16), M.lens);
lens.rotation.z = Math.PI / 2;
lens.position.x = .12;
cam3.add(lens);
cam3.position.set(1.0, .1, 0);
cam3.rotation.z = -.3;
part(cam3, new THREE.Vector3(1, .5, 0), 1.3, "FPV-камера");

const ant = new THREE.Group();
const stem = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .5, 8), M.plastic);
stem.rotation.x = .9;
stem.position.set(0, .12, .2);
ant.add(stem);
const tipA = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 10), M.aluRed);
tipA.position.set(0, .32, .42);
ant.add(tipA);
ant.position.set(-.62, .05, 0);
part(ant, new THREE.Vector3(-1, .4, .3), 1.25, "VTX-антена");

labels.forEach(l => {
  const el = document.createElement("div");
  el.className = "dl";
  el.textContent = l.text;
  labelsBox.appendChild(el);
  l.el = el;
});

const pt = {x: 0, y: 0, cx: 0, cy: 0};
stage.addEventListener("pointermove", e => {
  const r = stage.getBoundingClientRect();
  pt.x = ((e.clientX - r.left) / r.width - .5);
  pt.y = ((e.clientY - r.top) / r.height - .5);
}, {passive: true});

let progress = 0;
function readScroll(){
  const r = section.getBoundingClientRect();
  const span = r.height - innerHeight;
  progress = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
}
addEventListener("scroll", readScroll, {passive: true});
readScroll();

const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
const v = new THREE.Vector3();

function size(){
  const w = stage.clientWidth, h = stage.clientHeight;
  if (canvas.width !== w || canvas.height !== h){
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
addEventListener("resize", size);

let running = false, t0 = performance.now();
function frameLoop(now){
  if (!running) return;
  const t = (now - t0) / 1000;
  size();

  const explode = reduced ? 0 : smooth(.32, .82, progress);
  const flight = reduced ? .4 : 1 - smooth(.18, .42, progress);
  const e = ease(explode);

  for (const p of parts){
    v.copy(p.userData.dir).multiplyScalar(p.userData.dist * e);
    p.position.copy(p.userData.base).add(v);
  }
  for (const s of spinners){
    s.rotation.y += (reduced ? 0 : (8 + 42 * flight)) * s.userData.spin * .016;
  }

  drone.position.y = Math.sin(t * 1.4) * .09 * flight;
  drone.rotation.z = Math.sin(t * .9) * .045 * flight;
  drone.rotation.x = Math.sin(t * 1.1) * .03 * flight;
  drone.rotation.y += ((reduced ? .15 : .25) * (1 - e) + pt.x * 1.2 - drone.rotation.y) * .04;

  pt.cx += (pt.x - pt.cx) * .06;
  pt.cy += (pt.y - pt.cy) * .06;
  const radius = 7 + e * 2.4;
  camera.position.set(
    Math.sin(.65 + pt.cx * .5) * radius,
    2.1 + e * .9 - pt.cy * 1.2,
    Math.cos(.65 + pt.cx * .5) * radius
  );
  camera.lookAt(0, .1, 0);

  renderer.render(scene, camera);

  for (const l of labels){
    l.g.getWorldPosition(v).project(camera);
    const x = (v.x * .5 + .5) * stage.clientWidth;
    const y = (-v.y * .5 + .5) * stage.clientHeight;
    l.el.style.transform = "translate(-50%,-130%) translate(" + x.toFixed(0) + "px," + y.toFixed(0) + "px)";
    l.el.style.opacity = explode > .55 ? 1 : 0;
  }
  requestAnimationFrame(frameLoop);
}

const io = new IntersectionObserver(en => {
  const vis = en[0].isIntersecting;
  if (vis && !running){ running = true; t0 = performance.now() - 1e4; requestAnimationFrame(frameLoop); }
  if (!vis) running = false;
});
io.observe(section);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) running = false;
  else if (!running){ running = true; requestAnimationFrame(frameLoop); }
});
