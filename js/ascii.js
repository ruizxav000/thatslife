/*
 * The art page: the photograph of a rider crossing snow, redrawn in characters,
 * under a sky that is a black hole.
 *
 * Pass 1 ray traces a Schwarzschild black hole at one ray per character:
 * photons are integrated backwards along null geodesics,
 *     x'' = -1.5 h² x / |x|⁵,  h = |x × x'|,
 * crossing a thin Keplerian disk with Doppler beaming and blackbody colour.
 *
 * Pass 2 draws every cell. Below the ridge, a cell takes the photograph's colour
 * as a dim ground and a glyph for its brightness; where the photograph has an
 * edge (a ridgeline, the horse, a track) the glyph follows the edge: - | / \.
 * Above the ridge, the sky is the black hole: its shadow and the lensed disk
 * fill it, seen from close by.
 * Around the cursor the cells halve and the view is magnified, and the
 * landscape shifts slightly against the sky as the cursor moves.
 *
 * A transition starts from a still of the front page and turns it cell by cell.
 */
(function () {
  'use strict';

  // 70 characters from light to dense, then edge strokes, then scramble glyphs.
  const RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  const DIRS = '-|/\\';
  const NOISE = '01<>[]{}()?!$&~^';
  const ATLAS = RAMP + DIRS + NOISE;
  const D0 = RAMP.length;

  // Where things are in the photograph (fractions of its width and height).
  const SCENE = { rider: 0.55, moon: [0.5, 0.31], moonTall: [0.5, 0.27] };

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
uniform sampler2D uBH,uPhoto,uSky,uHome,uAtlas,uRider,uFx;
uniform vec3 uStar;
uniform vec4 uRiderRect,uShadow;uniform vec2 uRiderPivot;uniform float uRiderRot,uRiderFlip,uRiderAR;
uniform vec2 uRes,uCell,uMoon;
uniform float uGlyphs,uRampN,uD0,uNoise0,uTime,uT,uExposure,uLensR;
uniform vec3 uMouse,uAccent;
uniform vec4 uPhotoRect,uCalm;
float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*0.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.);}
float lum(vec3 c){return dot(c,vec3(0.299,0.587,0.114));}
float ramp(float l){return floor(clamp(l,0.,1.)*(uRampN-0.001));}
float mirror(float u){float f=mod(u,2.);return f>1.?2.-f:f;}
// The snowfield (mirrored beyond the photograph's edges).
vec3 photo(vec2 u){return texture2D(uPhoto,vec2(mirror(u.x),clamp(u.y,0.,1.))).rgb;}
// Tracks (r) and kicked-up snow (g), drawn by the page in photo space, u from -1 to 2.
vec4 fxAt(vec2 u){return texture2D(uFx,vec2((u.x+1.)/3.,clamp(u.y,0.,1.)));}
// The land with the rider on it: fresh tracks, his shadow, and him, pitching as he gallops.
vec3 land(vec2 pu){
  vec3 c=photo(pu);
  vec4 f=fxAt(pu);
  c=mix(c,vec3(0.55,0.62,0.75),clamp(f.r*f.a*1.2,0.,1.)*0.8);
  float sh=1.-smoothstep(0.55,1.,length((pu-uShadow.xy)/uShadow.zw));
  c*=mix(vec3(1.),vec3(0.76,0.82,0.94),sh*0.85);
  vec2 q=(pu-uRiderRect.xy)/uRiderRect.zw,d=q-uRiderPivot;
  d.x*=uRiderAR;float cs=cos(uRiderRot),sn=sin(uRiderRot);
  d=vec2(cs*d.x+sn*d.y,-sn*d.x+cs*d.y);d.x/=uRiderAR;q=uRiderPivot+d;
  if(uRiderFlip>0.5)q.x=1.-q.x;
  if(all(greaterThanEqual(q,vec2(0.)))&&all(lessThanEqual(q,vec2(1.)))){
    vec4 r=texture2D(uRider,q);c=mix(c,r.rgb,smoothstep(0.3,0.6,r.a));}
  return c;
}
void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  float seed=h12(floor(p/uCell)+0.37);
  float edge=uT*1.12-0.06;
  // Not yet turned: the front page exactly as it was.
  if(seed>edge){gl_FragColor=vec4(texture2D(uHome,p/uRes).rgb,1.);return;}

  float d=length(p-uMouse.xy);
  float lens=uMouse.z*(1.-smoothstep(uLensR*0.82,uLensR,d));
  vec2 cell=lens>0.5?uCell*0.5:uCell;
  vec2 cid=floor(p/cell),local=fract(p/cell);
  vec2 ctr=(cid+0.5)*cell;
  vec2 sc=lens>0.5?uMouse.xy+(ctr-uMouse.xy)*mix(0.6,1.,pow(d/uLensR,2.)):ctr;
  vec2 uv=sc/uRes;
  vec2 ck=smoothstep(uCalm.xy-vec2(0.05,0.07),uCalm.xy,uv)*(1.-smoothstep(uCalm.zw,uCalm.zw+vec2(0.05,0.07),uv));
  float calm=ck.x*ck.y;

  float idx;vec3 fg,bg=vec3(0.);
  if(seed>edge-0.06){
    idx=uNoise0+floor(h12(cid+floor(uTime*20.))*(uGlyphs-uNoise0));fg=uAccent;
  }else{
    vec2 pu=(sc-uPhotoRect.xy)/uPhotoRect.zw;
    float sky=pu.y<0.?1.:texture2D(uSky,vec2(mirror(pu.x),clamp(pu.y,0.,1.))).r;
    if(sky>0.5){
      // The sky is the black hole, seen from close by.
      vec2 bu=(sc-uMoon)/uRes+0.5;
      vec3 c=vec3(0.);
      if(all(greaterThan(bu,vec2(0.)))&&all(lessThan(bu,vec2(1.))))
        c=pow(aces(texture2D(uBH,vec2(bu.x,1.-bu.y)).rgb*uExposure),vec3(1./2.2));
      idx=ramp(lum(c)*1.25);fg=c;
      float st=h12(floor(sc/uCell)*1.7+3.1);
      if(st>0.997&&lum(c)<0.03){
        fg=vec3(0.72,0.8,1.)*(0.45+0.55*fract(st*97.))*(0.7+0.3*sin(uTime*1.7+st*60.));
        idx=st>0.9985?uStar.z:(st>0.997?uStar.y:uStar.x);}
    }else{
      // The land, from the photograph, as ink on paper: darker places get denser characters.
      vec3 c=land(pu);
      vec2 du=cell/uPhotoRect.zw;
      float gx=lum(land(pu+vec2(du.x,0.)))-lum(land(pu-vec2(du.x,0.)));
      float gy=lum(land(pu+vec2(0.,du.y)))-lum(land(pu-vec2(0.,du.y)));
      float l=lum(c);
      float ink=clamp((0.82-l)/0.6,0.,1.);
      float sat=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));
      fg=c*mix(0.55,0.3,ink);
      if(length(vec2(gx,gy))>0.16){
        float e=mod(degrees(atan(gy,gx))+90.,180.);
        idx=uD0+(e<22.5||e>=157.5?0.:(e<67.5?3.:(e<112.5?1.:2.)));fg=c*0.3;
      }else idx=ramp(pow(ink,0.8));
      // Paper where the snow is; the photograph's own colour where there is something there.
      bg=mix(vec3(0.95,0.96,0.978),c,clamp(0.25+ink*0.6+sat*1.2,0.,0.9));
      // Snow thrown up by the hooves.
      vec4 f=fxAt(pu);float spray=f.g*f.a;
      if(spray>0.18){idx=spray>0.6?uStar.z:(spray>0.35?uStar.y:uStar.x);fg=vec3(0.32,0.42,0.62);}
    }
  }
  fg*=mix(1.,0.5,calm);bg*=mix(1.,0.12,calm);
  float m=texture2D(uAtlas,vec2((idx+local.x)/uGlyphs,local.y)).a;
  gl_FragColor=vec4(mix(bg,fg,m),1.);
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
    this.photoTex = this.texture(gl.LINEAR);
    this.riderTex = this.texture(gl.LINEAR);
    this.fxTex = this.texture(gl.LINEAR);
    this.rider = { rect: [-1, -1, 0.01, 0.01], pivot: [0.57, 0.92], rot: 0, flip: 0, ar: 1, shadow: [-9, -9, 0.01, 0.01] };
    this.skyTex = this.texture(gl.LINEAR);
    this.homeTex = this.texture(gl.LINEAR);
    this.atlasTex = this.texture(gl.LINEAR);
    this.photoAR = 1000 / 1352;
    this.mouse = [0, 0, 0];
    this.drift = [0, 0];
    this.t = 0;
    this.cam = { dist: 15, incl: 4, phi: -0.5, lean: 0 };
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return t;
  };

  A.upload = function (tex, src) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  };
  A.setPhoto = function (img) { this.photoAR = img.naturalWidth / img.naturalHeight; this.upload(this.photoTex, img); };
  A.setRider = function (img) { this.rider.ar = img.naturalWidth / img.naturalHeight; this.upload(this.riderTex, img); };
  A.setFx = function (canvas) { this.upload(this.fxTex, canvas); };
  A.setSky = function (img) { this.upload(this.skyTex, img); };
  // A still of the front page, the starting point of a transition.
  A.setHome = function (canvas) { this.upload(this.homeTex, canvas); };

  A.resize = function (w, h) {
    const gl = this.gl;
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    const small = w < 700;
    this.cellW = small ? 4 : 5;
    this.cellH = small ? 8 : 10;
    this.cols = Math.ceil(w / this.cellW);
    this.rows = Math.ceil(h / this.cellH);
    this.bw = this.cols; this.bh = this.rows;
    gl.bindTexture(gl.TEXTURE_2D, this.bhTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.bw, this.bh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.bhTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.buildAtlas();
  };

  A.buildAtlas = function () {
    const gw = Math.round(this.cellW * this.dpr * 2), gh = Math.round(this.cellH * this.dpr * 2);
    const c = document.createElement('canvas');
    c.width = gw * ATLAS.length; c.height = gh;
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = '500 ' + Math.round(gh * 0.8) + 'px ' + this.opts.mono;
    for (let i = 0; i < ATLAS.length; i++) x.fillText(ATLAS[i], (i + 0.5) * gw, gh * 0.54);
    this.upload(this.atlasTex, c);
  };

  // The photograph fills the height; the rider sits a little right of centre
  // (centred on narrow screens). Beyond its edges the land is mirrored.
  A.layout = function () {
    const W = this.w, H = this.h, tall = W < 700 || H > W;
    const ph = H * (tall ? 1 : 1.04), pw = ph * this.photoAR;
    return { x: W * (tall ? 0.5 : 0.6) - pw * SCENE.rider, y: H - ph, w: pw, h: ph, moon: tall ? SCENE.moonTall : SCENE.moon };
  };

  A.camera = function () {
    const c = this.cam, inc = c.incl * Math.PI / 180;
    const pos = [c.dist * Math.cos(inc) * Math.cos(c.phi), c.dist * Math.sin(inc), c.dist * Math.cos(inc) * Math.sin(c.phi)];
    const n = function (v) { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
    const cross = function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; };
    let fwd = n([-pos[0], -pos[1], -pos[2]]);
    let right = n(cross(fwd, [0, 1, 0]));
    let up = cross(right, fwd);
    const lx = this.look[0], ly = this.look[1] + c.lean;
    fwd = n([fwd[0] + right[0] * lx + up[0] * ly, fwd[1] + right[1] * lx + up[1] * ly, fwd[2] + right[2] * lx + up[2] * ly]);
    right = n(cross(fwd, [0, 1, 0]));
    up = cross(right, fwd);
    return { pos: pos, fwd: fwd, right: right, up: up };
  };

  A.draw = function (time) {
    const gl = this.gl, d = this.dpr;

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
    const units = [['uBH', this.bhTex], ['uPhoto', this.photoTex], ['uSky', this.skyTex], ['uHome', this.homeTex], ['uAtlas', this.atlasTex], ['uRider', this.riderTex], ['uFx', this.fxTex]];
    units.forEach(function (u, i) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, u[1]);
      gl.uniform1i(p.u[u[0]], i);
    });
    gl.activeTexture(gl.TEXTURE0);

    // The land drifts against the sky with the cursor; the black hole drifts less.
    const L = this.layout(), dx = this.drift[0], dy = this.drift[1];
    const lx = L.x - dx * this.w * 0.014, ly = L.y - dy * this.h * 0.01;
    // The black hole is the sky: centred across the screen, sitting on the ridge.
    const mx = this.w * 0.5 - dx * this.w * 0.005;
    const my = L.y + L.h * L.moon[1] - dy * this.h * 0.004;

    gl.uniform2f(p.u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(p.u.uCell, this.cellW * d, this.cellH * d);
    gl.uniform2f(p.u.uMoon, mx * d, my * d);
    gl.uniform4f(p.u.uPhotoRect, lx * d, ly * d, L.w * d, L.h * d);
    gl.uniform1f(p.u.uGlyphs, ATLAS.length);
    gl.uniform1f(p.u.uRampN, RAMP.length);
    gl.uniform1f(p.u.uD0, D0);
    gl.uniform3f(p.u.uStar, RAMP.indexOf('.'), RAMP.indexOf('+'), RAMP.indexOf('*'));
    gl.uniform1f(p.u.uNoise0, RAMP.length + DIRS.length);
    gl.uniform1f(p.u.uTime, time);
    gl.uniform1f(p.u.uT, this.t);
    gl.uniform1f(p.u.uExposure, 1.6);
    gl.uniform3f(p.u.uMouse, this.mouse[0] * d, this.mouse[1] * d, this.mouse[2]);
    gl.uniform1f(p.u.uLensR, (this.w < 700 ? 90 : 140) * d);
    gl.uniform4fv(p.u.uCalm, this.calm);
    gl.uniform3fv(p.u.uAccent, this.opts.accent);
    const r = this.rider;
    gl.uniform4fv(p.u.uRiderRect, r.rect);
    gl.uniform2fv(p.u.uRiderPivot, r.pivot);
    gl.uniform1f(p.u.uRiderRot, r.rot);
    gl.uniform1f(p.u.uRiderFlip, r.flip);
    gl.uniform1f(p.u.uRiderAR, r.ar);
    gl.uniform4fv(p.u.uShadow, r.shadow);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  window.Ascii = Ascii;
})();
