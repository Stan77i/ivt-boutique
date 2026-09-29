/* IVT — shaders de la scène <ivt-terroir>. NN = nombre de nœuds (lieux + marchés), NR = nombre de flux. */
window.IVT_GLSL = {
COMMON: `
uniform float uTime,uPix,uFocus,uPhase,uIntro,uFlow,uRate,uCity,uData,uSeedVis,uAccentMix;
uniform vec2 uFocusPos,uMan; uniform vec3 uMouse,uCollect,uAccent;
uniform float uHiZ[NN]; uniform float uHiR[NR];
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
float nearF(vec2 q){return smoothstep(0.75,0.05,distance(q,uFocusPos))*uFocus;}
float groundH(vec2 q,float inside){
  float n=fbm(q*1.1+3.7);
  float h=(n-0.4)*0.10+0.16*exp(-dot(q-uMan,q-uMan)*1.4);
  h*=mix(0.15,1.0,inside);
  float rows=0.5+0.5*sin(q.x*70.0+q.y*12.0);
  h+=nearF(q)*(0.01+0.03*rows*smoothstep(0.2,1.2,uPhase));
  return h;
}`,
DOT_FRAG: `varying vec3 vCol; varying float vA;
void main(){vec2 c=gl_PointCoord-.5;float d=length(c);if(d>.5)discard;gl_FragColor=vec4(vCol,vA*smoothstep(.5,.15,d));}`,
FLAT_FRAG: `varying vec3 vCol; varying float vA; void main(){gl_FragColor=vec4(vCol,vA);}`,

TERRAIN_V: `
attribute float aIn; attribute float aRnd; varying vec3 vCol; varying float vA;
void main(){
  vec3 p=position; float n=fbm(p.xz*1.1+3.7);
  p.y=groundH(p.xz,aIn);
  float mi=smoothstep(0.65,0.0,distance(p.xz,uMouse.xz))*aIn;
  p.y+=mi*0.025;
  float near=nearF(p.xz);
  vec3 mute=vec3(0.42,0.55,0.48), earth=vec3(0.58,0.40,0.26), leaf=vec3(0.36,0.58,0.30);
  float north=smoothstep(1.2,-2.6,p.z);
  vec3 c=mix(mix(leaf,mute,0.45),mix(earth,mute,0.35),north);
  c=mix(c,earth*1.15,smoothstep(0.55,0.8,n)*0.5);
  c=mix(c,mix(earth*1.25,vec3(0.55,0.78,0.25),smoothstep(1.0,1.8,uPhase)),near*0.85);
  c+=mi*vec3(0.18,0.2,0.12);
  vCol=c;
  float intro=smoothstep(aRnd*0.7,aRnd*0.7+0.3,uIntro);
  vA=(aIn>0.5?0.72:0.10)*intro*(1.0+near*0.4);
  vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
  gl_PointSize=min(uPix*(aIn>0.5?2.1:1.5)*(1.0+near*0.9+mi*0.8)*5.5/(-mv.z),7.0*uPix);
}`,

LINE_V: `
attribute float aT; attribute float aR; varying vec3 vCol; varying float vA;
void main(){
  float hi=uHiR[int(aR)];
  float prog=clamp((uIntro-1.1)/1.4,0.,1.);
  float vis=1.0-smoothstep(prog-0.04,prog,aT);
  vA=vis*uFlow*(0.03+0.47*hi);
  vCol=mix(vec3(0.55,0.78,0.25),vec3(0.95,0.93,0.86),aT);
  vCol=mix(vCol,uAccent,hi*uAccentMix*0.75);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}`,

PART_V: `
attribute vec3 aP1; attribute vec3 aP2; attribute float aSeed; attribute float aR; attribute float aOff;
varying vec3 vCol; varying float vA;
void main(){
  float hi=uHiR[int(aR)];
  float sp=(0.045+0.035*fract(aSeed*7.13))*uRate*(0.7+0.6*hi);
  float t=fract(aSeed+uTime*sp);
  vec3 p=mix(mix(position,aP1,t),mix(aP1,aP2,t),t);
  vec3 tg=normalize(mix(aP1-position,aP2-aP1,t)+vec3(1e-4));
  vec3 sd=normalize(cross(tg,vec3(0.,1.,0.))+vec3(1e-4));
  p+=sd*aOff*0.035*(1.0-t);
  vec3 toM=uMouse-p; float md=length(toM.xz);
  p.xz+=toM.xz*smoothstep(0.7,0.0,md)*0.14;
  p.y+=smoothstep(0.7,0.0,md)*0.03;
  float intro=smoothstep(2.0,2.8,uIntro);
  vA=uFlow*intro*(0.06+0.94*hi)*smoothstep(0.,0.06,t)*smoothstep(1.,0.95,t)*(0.7+0.5*t);
  vCol=mix(vec3(0.62,0.85,0.30),vec3(1.0,0.86,0.62),smoothstep(0.35,1.0,t));
  vCol=mix(vCol,uAccent,hi*uAccentMix*0.8*(1.0-0.5*t));
  vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
  gl_PointSize=min(uPix*(1.3+2.4*hi)*5.5/(-mv.z),9.0*uPix);
}`,

ZONE_V: `
attribute float aIdx; attribute float aKind; attribute float aStag;
varying float vHi; varying float vIdx; varying float vK; varying float vIn;
void main(){
  vHi=uHiZ[int(aIdx)]; vIdx=aIdx; vK=aKind;
  vIn=smoothstep(0.8+aStag*0.9,1.1+aStag*0.9,uIntro);
  vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv;
  float s=(aKind>1.5?46.:26.)*(0.45+0.8*vHi);
  gl_PointSize=min(uPix*s*4.5/(-mv.z),90.*uPix);
}`,
ZONE_F: `uniform float uTime; varying float vHi; varying float vIdx; varying float vK; varying float vIn;
void main(){
  float d=length(gl_PointCoord-.5)*2.;
  float core=smoothstep(.2,.1,d);
  float ph=fract(uTime*(vK>1.5?0.6:0.35)+vIdx*.137);
  float ring=smoothstep(.07,0.,abs(d-ph))*(1.-ph);
  vec3 c=vK>1.5?vec3(1.0,0.95,0.9):(vK>0.5?vec3(0.95,0.72,0.40):vec3(0.62,0.85,0.30));
  float a=(core*(0.25+0.75*vHi)+ring*0.9*vHi)*vIn;
  if(a<0.01)discard; gl_FragColor=vec4(c,a);
}`,

SEED_V: `
attribute float aRnd; varying vec3 vCol; varying float vA;
void main(){
  float ph=uPhase; vec3 p=position; p.xz+=uFocusPos; float h=groundH(p.xz,1.0);
  float fall=smoothstep(0.,0.75,ph-aRnd*0.2);
  float y=mix(0.55+aRnd*0.45,h+0.008,fall);
  float grow=smoothstep(1.0,1.8,ph-aRnd*0.15);
  y+=grow*(0.02+0.035*aRnd);
  float ripe=smoothstep(2.0,2.7,ph-aRnd*0.2);
  float coll=smoothstep(3.0,3.85,ph-aRnd*0.3);
  vec3 tgt=uCollect+vec3((aRnd-.5)*0.07,0.015+fract(aRnd*13.1)*0.05,(fract(aRnd*7.7)-.5)*0.07);
  vec3 q=mix(vec3(p.x,y,p.z),tgt,coll); q.y+=sin(coll*3.1416)*0.14;
  float k=fract(aRnd*3.7);
  vec3 prod=k<0.45?vec3(0.86,0.24,0.18):(k<0.7?vec3(0.95,0.58,0.22):vec3(0.55,0.80,0.28));
  vec3 c=mix(vec3(0.62,0.44,0.28),vec3(0.50,0.76,0.28),grow);
  c=mix(c,mix(prod,uAccent,uAccentMix*0.6),ripe);
  vCol=c;
  vA=uSeedVis*(0.35+0.65*fall)*(0.8+0.2*ripe);
  vec4 mv=modelViewMatrix*vec4(q,1.); gl_Position=projectionMatrix*mv;
  gl_PointSize=min(uPix*(1.4+grow*1.0+ripe*1.6)*3.2/(-mv.z),10.*uPix);
}`,

CITY_V: `
attribute float aD; varying float vTop; varying float vD; varying float vY;
void main(){
  vec3 p=position; float g=smoothstep(aD*0.8,aD*0.8+0.3,uCity);
  p.y*=max(g,0.002); vTop=step(0.5,normal.y); vD=aD; vY=position.y;
  gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(p,1.);
}`,
CITY_F: `uniform float uCity; varying float vTop; varying float vD; varying float vY;
void main(){
  vec3 side=mix(vec3(0.05,0.17,0.12),vec3(0.16,0.30,0.24),vY);
  vec3 c=mix(side,vec3(0.80,0.87,0.82),vTop*0.85);
  c+=vec3(0.90,0.30,0.22)*(1.-vD)*(1.-vD)*0.35*uCity*vTop;
  gl_FragColor=vec4(c,1.);
}`,

COL_V: `
attribute float aH; attribute float aNode; varying vec3 vCol; varying float vA;
void main(){
  vec3 p=position; p.y*=max(aH*uData,0.0005);
  float hi=uHiZ[int(aNode)];
  vCol=mix(vec3(0.40,0.66,0.22),vec3(0.85,0.96,0.55),position.y);
  vA=uData*(0.2+0.6*hi)*(0.45+0.5*position.y);
  gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(p,1.);
}`
};
