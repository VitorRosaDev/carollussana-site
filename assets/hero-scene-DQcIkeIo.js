import{t as e}from"./index-AenpjjQc.js";import{a as t,i as n,l as r,n as i,o as a,s as o,t as s}from"./three-BERk80Yr.js";import{t as c}from"./fullscreen.vert-D8tdj4lg.js";var l=`// Fluido "líquido" por domain warping de fBm (Inigo Quilez), nas cores da marca.
// OCTAVES vem de defines (menos no mobile).
precision highp float;

uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;     // 0..1, já suavizado no JS
uniform float uIntensity;

varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < OCTAVES; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  vec2 m = (uMouse - 0.5) * vec2(aspect, 1.0);
  float t = uTime * 0.05;

  vec2 q = vec2(fbm(p * 1.5 + t), fbm(p * 1.5 + vec2(5.2, 1.3) - t));

  // O cursor empurra o fluido ao redor dele
  vec2 toMouse = p - m;
  float pull = exp(-dot(toMouse, toMouse) * 6.0);
  q += 0.35 * pull * normalize(toMouse + 1e-4);

  vec2 r = vec2(
    fbm(p * 1.5 + 3.0 * q + vec2(1.7, 9.2) + 0.15 * t),
    fbm(p * 1.5 + 3.0 * q + vec2(8.3, 2.8) - 0.12 * t)
  );
  float f = fbm(p * 1.3 + 3.2 * r);

  vec3 violet = vec3(0.490, 0.224, 0.922);
  vec3 lime = vec3(0.776, 1.0, 0.200);

  vec3 col = vec3(0.0);
  col = mix(col, violet, smoothstep(0.38, 0.9, f) * 0.9);
  // realces lime raros, nas cristas do fluido
  col = mix(col, lime, smoothstep(0.62, 0.98, f * length(r) * 1.25) * 0.5);

  // vinheta: centro mais escuro para o título respirar
  float vig = smoothstep(1.25, 0.15, length(p * vec2(0.75, 1.0)));
  float center = smoothstep(0.0, 0.65, length(p * vec2(0.6, 1.0)));
  col *= (0.3 + 0.7 * vig) * (0.45 + 0.55 * center);

  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`;function u(u,{mobile:d=!1,lowPower:f=!1}={}){let p=new s({antialias:!1,alpha:!1,powerPreference:`low-power`});p.debug.checkShaderErrors=!1;let m=d||f?.35:.5;p.setPixelRatio(Math.min(window.devicePixelRatio,2)*m),p.domElement.style.opacity=`0`,u.append(p.domElement);let h=new a,g=new i,_=new t(2,2),v=new o({vertexShader:c,fragmentShader:l,defines:{OCTAVES:d||f?4:5},uniforms:{uTime:{value:0},uRes:{value:new r(1,1)},uMouse:{value:new r(.5,.5)},uIntensity:{value:1}},depthTest:!1,depthWrite:!1});h.add(new n(_,v));let y=new r(.5,.5),b=new r(.65,.4),x=()=>{let{clientWidth:e,clientHeight:t}=u;p.setSize(e,t,!1),v.uniforms.uRes.value.set(e,t)};x();let S=new ResizeObserver(x);S.observe(u);let C=e=>{let t=u.getBoundingClientRect();b.set((e.clientX-t.left)/t.width,1-(e.clientY-t.top)/t.height)};window.addEventListener(`pointermove`,C,{passive:!0});let w=!0,T=!0,E=t=>{w&&(y.lerp(b,.04),v.uniforms.uMouse.value.copy(y),v.uniforms.uTime.value=t,p.render(h,g),T&&(T=!1,e.to(p.domElement,{opacity:1,duration:1.6,ease:`power2.out`})))},D=!1;p.compileAsync(h,g).then(()=>{D||e.ticker.add(E)});let O=new IntersectionObserver(([e])=>w=e.isIntersecting);return O.observe(u),function(){D=!0,e.ticker.remove(E),O.disconnect(),S.disconnect(),window.removeEventListener(`pointermove`,C),_.dispose(),v.dispose(),p.dispose(),p.domElement.remove()}}export{u as initHeroScene};