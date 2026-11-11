import { useEffect, useRef } from 'react';

const VERTEX = `attribute vec2 a_position; void main(){gl_Position=vec4(a_position,0.,1.);}`;
const FRAGMENT = `
precision mediump float;
uniform vec2 u_resolution; uniform float u_time; uniform vec2 u_mouse;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.03;a*=.5;}return s;}
void main(){
 vec2 uv=gl_FragCoord.xy/u_resolution;vec2 p=(uv-.5)*vec2(u_resolution.x/u_resolution.y,1.);
 float t=u_time*.015;
 float haze=fbm(p*3.5+vec2(t,0.));
 vec3 sky=mix(vec3(.035,.082,.12),vec3(.075,.14,.17),smoothstep(.0,.95,uv.y));
 sky+=vec3(.035,.055,.065)*haze;
 float stars=step(.995,hash(floor(uv*u_resolution.xy*.63)))*smoothstep(.52,.9,uv.y);
 sky+=vec3(.42,.50,.45)*stars*.8;
 float moon=length(p-vec2(.38,.20));sky+=vec3(.15,.20,.17)*exp(-moon*8.)*.33;
 float hills1=.28+.07*fbm(vec2(p.x*2.5,1.8))+.03*sin(p.x*6.);
 float hills2=.15+.08*fbm(vec2(p.x*4.+8.,4.))+.025*sin(p.x*9.);
 float h1=1.-smoothstep(hills1-.005,hills1+.012,uv.y);
 float h2=1.-smoothstep(hills2-.005,hills2+.008,uv.y);
 sky=mix(sky,vec3(.038,.082,.102),h1*.94);
 sky=mix(sky,vec3(.019,.047,.064),h2*.98);
 float fog=exp(-abs(uv.y-hills1)*30.)*(1.-h2)*.12;
 sky+=fog*vec3(.24,.30,.26);
 float vignette=smoothstep(1.15,.10,length(p*vec2(.72,1.05)));
 sky*=.65+.35*vignette;
 gl_FragColor=vec4(sky,1.);
}`;

export function WebGLAtmosphere() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) return;
    function shader(type: number, source: string) { const s = gl!.createShader(type); if(!s) return null; gl!.shaderSource(s, source); gl!.compileShader(s); if(!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)){gl!.deleteShader(s);return null;} return s; }
    const v = shader(gl.VERTEX_SHADER,VERTEX), f=shader(gl.FRAGMENT_SHADER,FRAGMENT);
    if(!v||!f) return;
    const program=gl.createProgram(); if(!program)return;
    gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'a_position');
    const resolution=gl.getUniformLocation(program,'u_resolution'),time=gl.getUniformLocation(program,'u_time'),mouse=gl.getUniformLocation(program,'u_mouse');
    const started=performance.now();let frame=0;
    const resize=()=>{const dpr=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.max(1,Math.floor(canvas.clientWidth*dpr));canvas.height=Math.max(1,Math.floor(canvas.clientHeight*dpr));gl.viewport(0,0,canvas.width,canvas.height);};
    resize(); const observer=new ResizeObserver(resize);observer.observe(canvas);
    const draw=(now:number)=>{if(!document.hidden){gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);gl.uniform2f(resolution,canvas.width,canvas.height);gl.uniform1f(time,(now-started)/1000);gl.uniform2f(mouse,0,0);gl.drawArrays(gl.TRIANGLES,0,6);}frame=requestAnimationFrame(draw);};
    frame=requestAnimationFrame(draw);
    return ()=>{cancelAnimationFrame(frame);observer.disconnect();gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(v);gl.deleteShader(f);};
  },[]);
  return <canvas ref={ref} className="webgl-atmosphere" aria-hidden="true" />;
}
