import{t as e}from"./index-AenpjjQc.js";import{a as t,c as n,i as r,l as i,n as a,o,r as s,s as c,t as l}from"./three-BERk80Yr.js";import{t as u}from"./fullscreen.vert-D8tdj4lg.js";var d=`// Hover do portfólio: ondulação a partir do cursor + RGB shift proporcional à velocidade
precision highp float;

uniform sampler2D uTex;
uniform vec2 uScale;    // recorte "object-fit: cover"
uniform vec2 uPos;      // "object-position" (0..1, já em coordenadas GL)
uniform vec2 uMouse;    // 0..1 dentro do quadro
uniform vec2 uVel;      // velocidade do cursor, suavizada
uniform float uHover;   // 0..1
uniform float uTime;

varying vec2 vUv;

vec2 cover(vec2 uv) {
  return uv * uScale + (1.0 - uScale) * uPos;
}

void main() {
  vec2 uv = vUv;
  // leve zoom ao entrar
  uv = (uv - 0.5) * (1.0 - 0.05 * uHover) + 0.5;

  float d = distance(vUv, uMouse);
  float falloff = smoothstep(0.55, 0.0, d);
  float ripple = sin(d * 30.0 - uTime * 5.0) * 0.012 * uHover * falloff;
  uv += normalize(vUv - uMouse + 1e-4) * ripple;
  uv -= uVel * falloff * 0.12 * uHover;

  float shift = (0.004 + length(uVel) * 0.12) * uHover;
  vec2 dir = normalize(uVel + vec2(1e-4, 0.0));

  float r = texture2D(uTex, cover(uv + dir * shift)).r;
  float g = texture2D(uTex, cover(uv)).g;
  float b = texture2D(uTex, cover(uv - dir * shift)).b;

  gl_FragColor = vec4(r, g, b, uHover > 0.001 ? 1.0 : 0.0);
}
`;function f(f){let p=new l({antialias:!1,alpha:!0,powerPreference:`low-power`});p.setPixelRatio(Math.min(window.devicePixelRatio,2)),p.setClearColor(0,0),p.debug.checkShaderErrors=!1;let m=new o,h=new a,g=new t(2,2),_=new c({vertexShader:u,fragmentShader:d,transparent:!0,uniforms:{uTex:{value:null},uScale:{value:new i(1,1)},uPos:{value:new i(.5,.5)},uMouse:{value:new i(.5,.5)},uVel:{value:new i(0,0)},uHover:{value:0},uTime:{value:0}}});m.add(new r(g,_));let v=!1;p.compileAsync(m,h).then(()=>v=!0);let y=new Map,b=new i,x=new i(.5,.5),S=null,C=!1,w=e=>{if(!y.has(e)){let t=new n(e);t.minFilter=s,t.generateMipmaps=!1,t.needsUpdate=!0,y.set(e,t)}return y.get(e)},T=(e,t)=>{let n=e.clientWidth,r=e.clientHeight;p.setSize(n,r,!1);let i=n/r,a=t.naturalWidth/t.naturalHeight,o=i>a?[1,a/i]:[i/a,1];_.uniforms.uScale.value.set(...o);let[s=`50%`,c=`50%`]=getComputedStyle(t).objectPosition.split(` `);_.uniforms.uPos.value.set(parseFloat(s)/100,1-parseFloat(c)/100)},E=e=>{_.uniforms.uTime.value=e,b.multiplyScalar(.88),_.uniforms.uVel.value.lerp(b,.2),p.render(m,h)},D=()=>{C||e.ticker.add(E),C=!0},O=()=>{e.ticker.remove(E),C=!1};f.forEach(t=>{let n=t.querySelector(`.bento__media`),r=t.querySelector(`img`);n&&r&&(t.addEventListener(`pointerenter`,()=>{v&&r.complete&&r.naturalWidth&&(S=t,n.append(p.domElement),T(n,r),_.uniforms.uTex.value=w(r),D(),e.to(_.uniforms.uHover,{value:1,duration:.8,ease:`expo.out`,overwrite:!0}))}),t.addEventListener(`pointermove`,e=>{if(S!==t)return;let r=n.getBoundingClientRect(),i=(e.clientX-r.left)/r.width,a=1-(e.clientY-r.top)/r.height;b.set(i-x.x,a-x.y).multiplyScalar(4).clampLength(0,.6),x.set(i,a),_.uniforms.uMouse.value.set(i,a)}),t.addEventListener(`pointerleave`,()=>{S===t&&e.to(_.uniforms.uHover,{value:0,duration:.6,ease:`power2.out`,overwrite:!0,onComplete:()=>{S===t&&(O(),p.domElement.remove(),S=null)}})}))}),document.documentElement.classList.add(`has-webgl-hover`)}export{f as initImageHover};