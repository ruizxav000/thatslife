/*
 * ASCII renderer.
 *
 * Pass 1 ray traces a Schwarzschild black hole (from Twin Paradox) at low
 * resolution: photons are integrated backwards along null geodesics,
 *     x'' = -1.5 h² x / |x|⁵,  h = |x × x'|,
 * crossing a thin Keplerian accretion disk shaded with Doppler beaming,
 * gravitational redshift and blackbody colour.
 *
 * Pass 2 turns the whole screen into characters. Each cell looks at the
 * black hole, the grown network and the current project, picks a glyph by
 * brightness (or, for threads, by the direction the thread runs), and draws
 * it from a glyph atlas. Around the cursor the cells halve in size and the
 * content is magnified. Switching views scrambles every cell in turn.
 */
(function () {
  'use strict';

  const RAMP = ' .,:;-=+*#%@';             // 0..11, by brightness
  const DIRS = '|/\\';                      // 12..14 (and '-' is RAMP[5])
  const NOISE = '01<>[]{}()?!$&~^';         // 15.. scramble glyphs
  const ATLAS = RAMP + DIRS + NOISE;

  const VERT = 'attribute vec2 p;varying vec2 vUv;void main(){vUv=p*0.5+0.5;gl_Position=vec4(p,0.,1.);}';

  const COMMON = `
float hash13(vec3 p){p=fract(p*0.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
vec3 hash33(vec3 p){p=fract(p*vec3(0.1031,0.1030,0.0973));p+=dot(p,p.yxz+33.33);return fract((p.xxy+p.yxx)*p.zyx);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
  return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),u.x),mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),u.x),u.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),u.x),mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),u.x),u.y),u.z);}
float fbm(vec3 p){float a=0.5,s=0.;for(int i=0;i<4;i++){s+=a*noise3(p);p=p*2.03+17.17;a*=0.5;}return s;}
vec3 blackbody(float k){float t=clamp(k,800.,40000.)/100.;vec3 c;
  c.r=t<=66.?1.:clamp(1.29293618606*pow(t-60.,-0.1332047592),0.,1.);
  c.g=t<=66.?clamp(0.39008157876*log(t)-0.63184144378,0.,1.):clamp(1.12989086089*pow(t-60.,-0.0755148492),0.,1.);
  c.b=t>=66.?1.:(t<=19.?0.:clamp(0.54320678911*log(t-10.)-1.19625408914,0.,1.));
  return pow(c,vec3(2.2));}
`;

  const BH = `precision highp float;
varying vec2 vUv;
uniform vec2 uRes;uniform float uDiskTime;
uniform vec3 uCamPos,uCamRight,uCamUp,uCamFwd;uniform float uTanHalfFov;
${COMMON}
vec3 starLayer(vec3 d,float scale,float th,float size){vec3 p=d*scale,cell=floor(p),f=fract(p);float h=hash13(cell);
  if(h<th)return vec3(0.);vec3 c=hash33(cell)*0.6+0.2;float dist=length(f-c);float core=exp(-dist*dist/(size*size));
  float k=fract(h*113.7);return blackbody(mix(3200.,14000.,k*k))*core*(0.35+pow(fract(h*17.31),8.)*9.);}
vec3 sky(vec3 d){return starLayer(d,60.,0.985,0.1)*1.2+starLayer(d,140.,0.975,0.12)*0.5;}
vec4 shadeDisk(vec3 hit,vec3 rv){
  float r=length(hit.xz),a=atan(hit.z,hit.x);
  float om=1.7*pow(r,-1.5);vec2 q=vec2(cos(a-om*uDiskTime),sin(a-om*uDiskTime));
  float d=fbm(vec3(q*3.1,r*0.9))*0.8+fbm(vec3(q*1.2,r*3.4))*0.5-0.36;d=clamp(d*1.9,0.,1.);
  d*=smoothstep(3.,3.35,r)*(1.-smoothstep(7.,12.,r));
  float tn=pow(3./r,0.75);float temp=7400.*tn;
  float beta=clamp(sqrt(0.5/max(r-1.,1e-3)),0.,0.98),gam=inversesqrt(1.-beta*beta);
  vec3 od=vec3(-hit.z,0.,hit.x)/r;float gd=1./(gam*(1.-beta*dot(od,-normalize(rv))));
  float g=sqrt(1.-1./r)*gd;
  vec3 e=blackbody(temp*g)*pow(tn,2.6)*min(pow(g,4.),16.)*1.35;
  float al=clamp(d*1.15,0.,0.97);return vec4(e*al,al);}
void main(){
  vec2 ndc=vUv*2.-1.;ndc.x*=uRes.x/uRes.y;
  vec3 vel=normalize(uCamFwd+(ndc.x*uCamRight+ndc.y*uCamUp)*uTanHalfFov),pos=uCamPos;
  vec3 hv=cross(pos,vel);float h2=dot(hv,hv);
  vec3 col=vec3(0.);float al=0.;bool esc=false;
  float escR=max(length(uCamPos)*1.05,32.);
  for(int i=0;i<300;i++){
    float r2=dot(pos,pos),r=sqrt(r2);
    float st=clamp(0.07*r*(0.35+0.65*smoothstep(0.,1.5,abs(pos.y))),0.006,4.);
    vec3 pr=pos;
    vel+=(-1.5*h2*pos/(r2*r2*r))*(0.5*st);pos+=vel*st;r2=dot(pos,pos);r=sqrt(r2);
    vel+=(-1.5*h2*pos/(r2*r2*r))*(0.5*st);
    if(pr.y*pos.y<0.){float t=pr.y/(pr.y-pos.y);vec3 hit=mix(pr,pos,t);float hr=length(hit.xz);
      if(hr>3.&&hr<12.){vec4 d=shadeDisk(hit,vel);col+=(1.-al)*d.rgb;al+=(1.-al)*d.a;if(al>0.99)break;}}
    if(r<1.)break;
    if(r>escR&&dot(pos,vel)>0.){esc=true;break;}
  }
  if(esc)col+=(1.-al)*sky(normalize(vel));
  gl_FragColor=vec4(col,1.);
}`;

  const ASCII = `precision highp float;
uniform sampler2D uBH,uOrg,uHome,uAtlas,uRider;
uniform vec4 uRiderRect;uniform float uRiderFlip;
uniform vec2 uRes,uCell;uniform float uGlyphs,uNoise0,uTime,uT,uExposure;
uniform vec3 uMouse;uniform float uLensR;
uniform vec4 uCalm;uniform vec3 uAccent;
float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*0.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.);}
float lum(vec3 c){return dot(c,vec3(0.299,0.587,0.114));}
float rampIdx(float l){return floor(clamp(l,0.,1.)*11.999);}
vec3 blackhole(vec2 uv,float dim){
  vec3 c=aces(texture2D(uBH,vec2(uv.x,1.-uv.y)).rgb*uExposure);
  vec2 k=smoothstep(uCalm.xy-vec2(0.06,0.08),uCalm.xy,uv)*(1.-smoothstep(uCalm.zw,uCalm.zw+vec2(0.06,0.08),uv));
  return pow(c,vec3(1./2.2))*mix(1.,dim,k.x*k.y);}
void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 cell0=floor(p/uCell);
  float seed=h12(cell0+0.37);
  float edge=uT*1.12-0.06;

  // Not yet turned: the front page exactly as it was.
  if(seed>edge){gl_FragColor=vec4(texture2D(uHome,p/uRes).rgb,1.);return;}

  float d=length(p-uMouse.xy);
  float lens=uMouse.z*(1.-smoothstep(uLensR*0.82,uLensR,d));
  vec2 cell=lens>0.5?uCell*0.5:uCell;
  vec2 cid=floor(p/cell),local=fract(p/cell);
  vec2 ctr=(cid+0.5)*cell;
  vec2 sc=lens>0.5?uMouse.xy+(ctr-uMouse.xy)*mix(0.62,1.,pow(d/uLensR,2.)):ctr;
  vec2 uv=sc/uRes;

  float idx;vec3 col;
  if(seed>edge-0.06){
    // Turning: scrambling characters.
    idx=uNoise0+floor(h12(cid+floor(uTime*20.))*(uGlyphs-uNoise0));col=uAccent;
  }else{
    // The project world: the black hole in characters.
    col=blackhole(uv,0.3);idx=rampIdx(lum(col)*1.15);

    // Tracks in the snow, drawn by the direction they run.
    vec2 tap=cell/uRes/3.;
    float cov=0.,sxx=0.,syy=0.,sxy=0.;vec3 oc=vec3(0.);
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
      vec4 s=texture2D(uOrg,uv+vec2(float(i),float(j))*tap);
      cov+=s.a;oc+=s.rgb*s.a;
      float x=float(i),y=float(j);sxx+=s.a*x*x;syy+=s.a*y*y;sxy+=s.a*x*y;}
    cov/=9.;
    if(cov>0.05){
      oc/=max(cov*9.,1e-3);
      float an=degrees(0.5*atan(2.*sxy,sxx-syy));
      float aniso=length(vec2(sxx-syy,2.*sxy))/max(sxx+syy,1e-3);
      idx=aniso>0.45&&cov<0.6?(abs(an)<22.5?5.:(abs(an)>67.5?12.:(an<0.?13.:14.))):rampIdx(0.35+cov*0.9);
      col=oc*mix(0.75,1.25,clamp(cov*2.,0.,1.));
    }

    // The rider.
    vec2 ru=(uv-uRiderRect.xy)/(uRiderRect.zw-uRiderRect.xy);
    if(all(greaterThanEqual(ru,vec2(0.)))&&all(lessThanEqual(ru,vec2(1.)))){
      if(uRiderFlip>0.5)ru.x=1.-ru.x;
      vec4 rs=texture2D(uRider,ru);
      if(rs.a>0.45){
        vec2 rd=(uCell*1.2/uRes)/(uRiderRect.zw-uRiderRect.xy);
        float l0=lum(rs.rgb);
        float lb=0.25*(lum(texture2D(uRider,ru+vec2(rd.x,0.)).rgb)+lum(texture2D(uRider,ru-vec2(rd.x,0.)).rgb)
                      +lum(texture2D(uRider,ru+vec2(0.,rd.y)).rgb)+lum(texture2D(uRider,ru-vec2(0.,rd.y)).rgb));
        idx=rampIdx(clamp(0.16+l0*0.78+(l0-lb)*2.2,0.08,1.));
        col=rs.rgb*1.25+0.05;
      }
    }
  }
  float m=texture2D(uAtlas,vec2((idx+local.x)/uGlyphs,local.y)).a;
  gl_FragColor=vec4(col*m,1.);
}`;

  function Ascii(canvas, opts) {
    this.canvas = canvas;
    this.opts = opts;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('no webgl');
    this.gl = gl;
    this.bhProg = this.program(BH);
    this.asciiProg = this.program(ASCII);
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    this.bhTex = this.texture(gl.LINEAR);
    this.fbo = gl.createFramebuffer();
    this.orgTex = this.texture(gl.LINEAR);
    this.homeTex = this.texture(gl.LINEAR);
    this.atlasTex = this.texture(gl.LINEAR);
    this.riderTex = this.texture(gl.LINEAR);
    this.riderRect = [-1, -1, -1, -1];
    this.riderFlip = 0;
    this.feed = document.createElement('canvas');
    this.fctx = this.feed.getContext('2d');
    this.mouse = [0, 0, 0];
    this.t = 0;            // 0 home → 1 project
    this.cam = { dist: 17, incl: 6, phi: -0.5, lean: 0.05 };
    this.look = [0, 0];
    this.calm = [0, 0, 0, 0];
  }
  const A = Ascii.prototype;

  A.program = function (frag) {
    const gl = this.gl;
    function sh(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    p.u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      p.u[info.name] = gl.getUniformLocation(p, info.name);
    }
    p.a = gl.getAttribLocation(p, 'p');
    return p;
  };

  A.texture = function (filter) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    return t;
  };

  A.resize = function (w, h) {
    const gl = this.gl;
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    const small = w < 700;
    this.cellW = small ? 6 : 7;
    this.cellH = small ? 11 : 13;
    this.cols = Math.ceil(w / this.cellW);
    this.rows = Math.ceil(h / this.cellH);

    // Black hole at one sample per cell; the lens interpolates between them.
    this.bw = this.cols; this.bh = this.rows;
    gl.bindTexture(gl.TEXTURE_2D, this.bhTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.bw, this.bh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.bhTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // The network is sampled 3×3 per cell.
    this.feed.width = this.cols * 3;
    this.feed.height = this.rows * 3;
    this.buildAtlas();
  };

  A.buildAtlas = function () {
    const gl = this.gl;
    const gw = Math.round(this.cellW * this.dpr), gh = Math.round(this.cellH * this.dpr);
    const c = document.createElement('canvas');
    c.width = gw * ATLAS.length; c.height = gh;
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = '500 ' + Math.round(gh * 0.78) + 'px ' + this.opts.mono;
    for (let i = 0; i < ATLAS.length; i++) x.fillText(ATLAS[i], (i + 0.5) * gw, gh * 0.54);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  };

  // A still of the front page, used as the starting point of a transition.
  A.setHome = function (canvas) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.homeTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  };

  A.setRider = function (img) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.riderTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  };

  A.camera = function () {
    const c = this.cam, inc = c.incl * Math.PI / 180;
    const pos = [c.dist * Math.cos(inc) * Math.cos(c.phi), c.dist * Math.sin(inc), c.dist * Math.cos(inc) * Math.sin(c.phi)];
    const n = function (v) { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
    const cross = function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; };
    let fwd = n([-pos[0], -pos[1], -pos[2]]);
    let right = n(cross(fwd, [0, 1, 0]));
    let up = cross(right, fwd);
    // The mouse turns the head a little; the view also leans so the hole sits low.
    const lx = this.look[0], ly = this.look[1] + c.lean;
    fwd = n([fwd[0] + right[0] * lx + up[0] * ly, fwd[1] + right[1] * lx + up[1] * ly, fwd[2] + right[2] * lx + up[2] * ly]);
    right = n(cross(fwd, [0, 1, 0]));
    up = cross(right, fwd);
    return { pos: pos, fwd: fwd, right: right, up: up };
  };

  A.draw = function (time, org) {
    const gl = this.gl;
    // Feed the grown network in at 3×3 samples per cell.
    const f = this.fctx;
    f.clearRect(0, 0, this.feed.width, this.feed.height);
    if (org) {
      f.imageSmoothingEnabled = true;
      f.imageSmoothingQuality = 'high';
      for (let i = 0; i < org.length; i++) f.drawImage(org[i], 0, 0, this.feed.width, this.feed.height);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.orgTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.feed);

    // Pass 1: the black hole.
    const cam = this.camera();
    let p = this.bhProg;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.bw, this.bh);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(p.a);
    gl.vertexAttribPointer(p.a, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(p.u.uRes, this.w, this.h);
    gl.uniform1f(p.u.uDiskTime, time * 0.45);
    gl.uniform3fv(p.u.uCamPos, cam.pos);
    gl.uniform3fv(p.u.uCamFwd, cam.fwd);
    gl.uniform3fv(p.u.uCamRight, cam.right);
    gl.uniform3fv(p.u.uCamUp, cam.up);
    gl.uniform1f(p.u.uTanHalfFov, Math.tan(26 * Math.PI / 180));
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Pass 2: characters.
    p = this.asciiProg;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.enableVertexAttribArray(p.a);
    gl.vertexAttribPointer(p.a, 2, gl.FLOAT, false, 0, 0);
    const units = [['uBH', this.bhTex], ['uOrg', this.orgTex], ['uHome', this.homeTex], ['uAtlas', this.atlasTex], ['uRider', this.riderTex]];
    units.forEach(function (u, i) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, u[1]);
      gl.uniform1i(p.u[u[0]], i);
    });
    gl.activeTexture(gl.TEXTURE0);
    const d = this.dpr;
    gl.uniform2f(p.u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(p.u.uCell, this.cellW * d, this.cellH * d);
    gl.uniform1f(p.u.uGlyphs, ATLAS.length);
    gl.uniform1f(p.u.uNoise0, RAMP.length + DIRS.length);
    gl.uniform1f(p.u.uTime, time);
    gl.uniform1f(p.u.uT, this.t);
    gl.uniform1f(p.u.uExposure, 1.7 + 1.0 * Math.min(1, Math.max(0, (this.cam.dist - 9.5) / 7.5)));
    gl.uniform3f(p.u.uMouse, this.mouse[0] * d, this.mouse[1] * d, this.mouse[2]);
    gl.uniform1f(p.u.uLensR, (this.w < 700 ? 90 : 130) * d);
    gl.uniform4fv(p.u.uCalm, this.calm);
    gl.uniform4fv(p.u.uRiderRect, this.riderRect);
    gl.uniform1f(p.u.uRiderFlip, this.riderFlip);
    gl.uniform3fv(p.u.uAccent, this.opts.accent);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  Ascii.GLYPHS = ATLAS;
  window.Ascii = Ascii;
})();
