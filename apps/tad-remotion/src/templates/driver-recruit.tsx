import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Easing,
} from 'remotion';

const FONT = "'Inter', 'Outfit', -apple-system, sans-serif";
const YELLOW = '#fad400';
const WHITE = '#ffffff';
const BG = '#000000';

const FPS = 30;

// ── Scene 1: HOOK (0-4s) ──────────────────────────────────────────────────
const S1: React.FC<{ f: number }> = ({ f }) => {
  const op = interpolate(f, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sc = spring({ frame: Math.max(0,f-3), fps: FPS, from: 1.3, to: 1, config: { damping: 10, mass: 0.4 } });
  return (
    <AbsoluteFill style={{ background: BG, justifyContent:'center', alignItems:'center', opacity: op, transform: `scale(${sc})` }}>
      <div style={{width:80,height:80,borderRadius:16,background:YELLOW,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,fontWeight:900,color:BG,boxShadow:`0 0 60px ${YELLOW}70`,marginBottom:30}}>TAD</div>
      <h1 style={{fontFamily:FONT,fontSize:80,fontWeight:900,color:WHITE,margin:0,textAlign:'center',letterSpacing:'-1px'}}>CONDUCTORES</h1>
      <p style={{fontFamily:FONT,fontSize:22,fontWeight:700,color:YELLOW,margin:'16px 0 0',letterSpacing:'6px',textTransform:'uppercase'}}>Te estamos buscando</p>
    </AbsoluteFill>
  );
};

// ── Scene 2: GANA (4-9s) ──────────────────────────────────────────────────
const S2: React.FC<{ f: number }> = ({ f }) => {
  const op = interpolate(f,[0,12],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const ty = spring({frame:Math.max(0,f),fps:FPS,from:40,to:0,config:{damping:12,mass:0.5}});
  return (
    <AbsoluteFill style={{ background: BG, justifyContent:'center', alignItems:'center', opacity: op, transform:`translateY(${ty}px)`, padding:'0 40px' }}>
      <h1 style={{fontFamily:FONT,fontSize:72,fontWeight:900,color:WHITE,textAlign:'center',margin:0}}>GANA HASTA</h1>
      <h1 style={{fontFamily:FONT,fontSize:120,fontWeight:900,color:YELLOW,textAlign:'center',margin:'10px 0',letterSpacing:'-2px'}}>RD$15,000</h1>
      <p style={{fontFamily:FONT,fontSize:28,fontWeight:600,color:WHITE,textAlign:'center',margin:0}}>CADA MES</p>
      <p style={{fontFamily:FONT,fontSize:16,fontWeight:400,color:'#a1a1aa',textAlign:'center',marginTop:16}}>Sin hacer nada extra. Solo instalamos la pantalla.</p>
    </AbsoluteFill>
  );
};

// ── Scene 3: BENEFICIOS (9-16s) ───────────────────────────────────────────
const S3: React.FC<{ f: number }> = ({ f }) => {
  const items = [
    { n:'RD$500', l:'POR SLOT', c:YELLOW },
    { n:'RD$500', l:'POR REFERIDO', c:WHITE },
    { n:'RD$5,000', l:'RETIRO MÍNIMO', c:YELLOW },
  ];
  return (
    <AbsoluteFill style={{ background: BG, justifyContent:'center', padding:'0 40px' }}>
      <h2 style={{fontFamily:FONT,fontSize:24,fontWeight:800,color:WHITE,textAlign:'center',marginBottom:30,letterSpacing:'2px'}}>BENEFICIOS</h2>
      {items.map((it,i)=>{const d=5+i*10;const op=interpolate(Math.max(0,f-d),[0,8],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
      return <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 20px',marginBottom:10,border:`1px solid ${it.c}30`,borderRadius:12,opacity:op}}>
        <span style={{fontFamily:FONT,fontSize:32,fontWeight:900,color:it.c}}>{it.n}</span>
        <span style={{fontFamily:FONT,fontSize:14,fontWeight:600,color:'#a1a1aa',letterSpacing:'2px'}}>{it.l}</span>
      </div>})}
    </AbsoluteFill>
  );
};

// ── Scene 4: REFERIDOS (16-22s) ──────────────────────────────────────────
const S4: React.FC<{ f: number }> = ({ f }) => {
  const sc = spring({frame:Math.max(0,f),fps:FPS,from:0.85,to:1,config:{damping:10,mass:0.5}});
  const op = interpolate(f,[0,10],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return (
    <AbsoluteFill style={{ background: BG, justifyContent:'center', alignItems:'center', opacity: op, transform:`scale(${sc})`, padding:'0 40px' }}>
      <div style={{padding:'30px',borderRadius:20,border:`2px solid ${YELLOW}60`,textAlign:'center',maxWidth:600}}>
        <h2 style={{fontFamily:FONT,fontSize:28,fontWeight:900,color:WHITE,margin:0}}>SISTEMA DE REFERIDOS</h2>
        <p style={{fontFamily:FONT,fontSize:48,fontWeight:900,color:YELLOW,margin:'20px 0 8px'}}>RD$500</p>
        <p style={{fontFamily:FONT,fontSize:18,fontWeight:500,color:WHITE,margin:0}}>Por cada conductor que refieras</p>
        <p style={{fontFamily:FONT,fontSize:14,fontWeight:400,color:'#a1a1aa',marginTop:12}}>Sin límite • Código QR único</p>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 5: TODO (22-26s) ───────────────────────────────────────────────
const S5: React.FC<{ f: number }> = ({ f }) => {
  const items = ['📱 Billetera digital','📍 GPS inteligente','🏦 Pago directo','🔗 QR de referidos'];
  return (
    <AbsoluteFill style={{ background: BG, justifyContent:'center', padding:'0 40px' }}>
      <h2 style={{fontFamily:FONT,fontSize:22,fontWeight:800,color:WHITE,textAlign:'center',marginBottom:24}}>TODO INCLUIDO</h2>
      {items.map((t,i)=>{const d=3+i*6;const op=interpolate(Math.max(0,f-d),[0,8],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});const x=interpolate(Math.max(0,f-d),[0,10],[20,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
      return <div key={i} style={{opacity:op,transform:`translateX(${x}px)`,padding:'14px 16px',marginBottom:8,border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,fontFamily:FONT,fontSize:18,fontWeight:600,color:WHITE}}>{t}</div>})}
    </AbsoluteFill>
  );
};

// ── Scene 6: CTA (26-30s) ────────────────────────────────────────────────
const S6: React.FC<{ f: number }> = ({ f }) => {
  const sc = spring({frame:Math.max(0,f),fps:FPS,from:0.8,to:1,config:{damping:10,mass:0.4}});
  const op = interpolate(f,[0,10],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return (
    <AbsoluteFill style={{ background: BG, justifyContent:'center', alignItems:'center', opacity: op, transform:`scale(${sc})` }}>
      <div style={{width:80,height:80,borderRadius:16,background:YELLOW,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,fontWeight:900,color:BG,marginBottom:20}}>TAD</div>
      <h1 style={{fontFamily:FONT,fontSize:64,fontWeight:900,color:WHITE,textAlign:'center',margin:0,letterSpacing:'-1px'}}>ÚNETE A LA RED</h1>
      <p style={{fontFamily:FONT,fontSize:18,fontWeight:600,color:YELLOW,marginTop:16}}>Escanea el QR del conductor TAD</p>
      <p style={{fontFamily:FONT,fontSize:14,fontWeight:400,color:'#a1a1aa',marginTop:20}}>tad.do — Empieza hoy</p>
    </AbsoluteFill>
  );
};

// ── COMPOSITION ───────────────────────────────────────────────────────────
const DriverRecruit: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={120}><S1 f={f} /></Sequence>
      <Sequence from={120} durationInFrames={150}><S2 f={Math.max(0,f-120)} /></Sequence>
      <Sequence from={270} durationInFrames={210}><S3 f={Math.max(0,f-270)} /></Sequence>
      <Sequence from={480} durationInFrames={180}><S4 f={Math.max(0,f-480)} /></Sequence>
      <Sequence from={660} durationInFrames={120}><S5 f={Math.max(0,f-660)} /></Sequence>
      <Sequence from={780} durationInFrames={120}><S6 f={Math.max(0,f-780)} /></Sequence>
    </AbsoluteFill>
  );
};

export { DriverRecruit };
export default DriverRecruit;