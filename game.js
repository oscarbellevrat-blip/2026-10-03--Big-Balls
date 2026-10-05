/* =====================================================================
   BIG BALLS — MOTO LEGENDS
   Jeu de moto 2D : physique, rampes, bosses, garage, credits.
   ===================================================================== */
'use strict';

/* ------------------------------ UTILS ------------------------------ */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp  = (a, b, t) => a + (b - a) * t;
const TAU   = Math.PI * 2;
function norm(a){ a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }
function mulberry32(a){
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const $ = id => document.getElementById(id);

/* ------------------------------ AUDIO ------------------------------ */
const Snd = {
  ctx: null, on: true, ready: false,
  init(){
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch(e){ return; }
    this.ready = true;
    this.master = this.ctx.createGain();
    this.master.gain.value = this.on ? 0.55 : 0;
    this.master.connect(this.ctx.destination);
    // moteur : saw + square sub
    this.osc = this.ctx.createOscillator(); this.osc.type = 'sawtooth'; this.osc.frequency.value = 60;
    this.lp  = this.ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 700; this.lp.Q.value = 7;
    this.eg  = this.ctx.createGain(); this.eg.gain.value = 0;
    this.osc.connect(this.lp); this.lp.connect(this.eg); this.eg.connect(this.master);
    this.osc.start();
    this.sub = this.ctx.createOscillator(); this.sub.type = 'square'; this.sub.frequency.value = 30;
    this.sg  = this.ctx.createGain(); this.sg.gain.value = 0;
    this.sub.connect(this.sg); this.sg.connect(this.master);
    this.sub.start();
  },
  resume(){ if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  engine(speed, throttle, on){
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.eg.gain.setTargetAtTime(on ? 0.045 + throttle * 0.07 : 0, t, 0.06);
    this.sg.gain.setTargetAtTime(on ? 0.035 : 0, t, 0.06);
    const f = clamp(55 + speed * 0.12 + throttle * 28, 45, 430);
    this.osc.frequency.setTargetAtTime(f, t, 0.045);
    this.sub.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    this.lp.frequency.setTargetAtTime(clamp(480 + speed * 0.7, 400, 2400), t, 0.05);
  },
  blip(freq, dur, type){
    if (!this.ready || !this.on) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = type || 'triangle'; o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  toggle(){
    this.on = !this.on;
    if (this.master) this.master.gain.value = this.on ? 0.55 : 0;
    return this.on;
  }
};

/* ------------------------------ DATA ------------------------------ */
function pal(o){
  return Object.assign({
    body:'#cfd6e2', accent:'#ff2d6b', rim:'#e8eef7', tire:'#15161c',
    seat:'#1b1c22', fork:'#b9c2d0', exhaust:'#aeb6c4', frame:'#3a3f4c'
  }, o);
}

const BIKES = [
  { name:'Rusty 50',    sub:'ÉPOQUE ÉPIQUE',    price:0,     power:1350, top:500,  grip:1.00, mass:1.00, rot:9.5, iner:280, nitro:0.00,
    col:pal({body:'#8f96a3',accent:'#c0552b',rim:'#d6dbe3',frame:'#4a4f5c',exhaust:'#8b8f99'}), bonus:'Le tas de rouille qui t’a appris à tomber.' },
  { name:'Dirt Scout',  sub:'TRAIL',             price:500,   power:1650, top:640,  grip:1.12, mass:0.97, rot:9.0, iner:275, nitro:0.10,
    col:pal({body:'#3fa9dc',accent:'#ffd35a',rim:'#dfe8f2',frame:'#2b3442',exhaust:'#c8ced8'}), bonus:'Suspensions souples, accroche renforcée.' },
  { name:'MX 250',      sub:'MOTOCROSS',         price:1400,  power:2000, top:780,  grip:1.18, mass:0.94, rot:8.6, iner:265, nitro:0.18,
    col:pal({body:'#5aff8f',accent:'#1b2a1f',rim:'#e6f7ec',frame:'#20301f',exhaust:'#cfd8d2'}), bonus:'Légère et nerveuse dans les bosses.' },
  { name:'Café Racer',  sub:'ROADSTER',          price:2800,  power:2380, top:900,  grip:1.05, mass:1.05, rot:8.0, iner:300, nitro:0.22,
    col:pal({body:'#f0a63a',accent:'#2a1a0c',rim:'#ffe9c4',frame:'#3a2a12',seat:'#4a2f14',exhaust:'#e3d6bd'}), bonus:'Vitesse de pointe généreuse.' },
  { name:'Superbike R1',sub:'SPORT',             price:5500,  power:2850, top:1080, grip:1.10, mass:1.02, rot:7.6, iner:310, nitro:0.30,
    col:pal({body:'#ff2d6b',accent:'#ffffff',rim:'#ffffff',frame:'#2a0f1c',exhaust:'#d7d7de'}), bonus:'Aérodynamique, monte vite en vitesse.' },
  { name:'Turbo Falcon',sub:'HYPERSPORT',        price:9000,  power:3400, top:1250, grip:1.14, mass:1.00, rot:7.2, iner:320, nitro:0.40,
    col:pal({body:'#7a5cff',accent:'#31e6ff',rim:'#e8ecff',frame:'#1c1636',exhaust:'#c9c9dd'}), bonus:'Turbo soufflé, fusée des collines.' },
  { name:'Volt Hyper',  sub:'ÉLECTRIQUE',        price:15000, power:4200, top:1450, grip:1.20, mass:0.96, rot:7.0, iner:300, nitro:0.55,
    col:pal({body:'#31e6ff',accent:'#0affc0',rim:'#d8ffff',frame:'#0c2733',exhaust:'#7fe9ff',tire:'#101319'}), bonus:'Couple instantané, accélération brutale.' },
  { name:'Mud Hog',     sub:'BOUE',              price:800,   power:1800, top:700,  grip:1.26, mass:1.08, rot:8.4, iner:290, nitro:0.10,
    col:pal({body:'#6b7a45',accent:'#3a2a12',rim:'#cfd6b8',frame:'#2e2a1a',seat:'#241f14',exhaust:'#8f9584'}), bonus:'Rien ne l’arrête dans la gadoue.' },
  { name:'Pocket Rocket',sub:'MINI SPORT',       price:2000,  power:2200, top:850,  grip:1.14, mass:0.88, rot:9.4, iner:245, nitro:0.22,
    col:pal({body:'#ff7a2d',accent:'#ffffff',rim:'#ffe0c4',frame:'#3a1c0a',exhaust:'#d9d4cf'}), bonus:'Minuscule mais ultra nerveuse.' },
  { name:'Rally Beast', sub:'RALLYE',            price:4000,  power:2650, top:980,  grip:1.24, mass:1.04, rot:8.1, iner:300, nitro:0.30,
    col:pal({body:'#2d6bff',accent:'#ff2d45',rim:'#dfe8f7',frame:'#101a3a',exhaust:'#c8ced8'}), bonus:'Faite pour avaler les bosses.' },
  { name:'Nitro King',  sub:'DRAGSTER',          price:7000,  power:3300, top:1200, grip:1.12, mass:0.99, rot:7.5, iner:315, nitro:0.52,
    col:pal({body:'#1b1c22',accent:'#ffd35a',rim:'#ffd35a',frame:'#0a0b10',seat:'#101014',exhaust:'#e3c96b'}), bonus:'Le roi du départ arrêté.' },
  { name:'Vulcan',      sub:'MUSCLE',            price:12000, power:3900, top:1360, grip:1.20, mass:1.06, rot:7.0, iner:330, nitro:0.55,
    col:pal({body:'#c22a2a',accent:'#ffb03a',rim:'#f0e0d8',frame:'#2a0f0f',seat:'#1c1010',exhaust:'#b8b0a8'}), bonus:'Un monstre de couple.' },
  { name:'Neon Blade',  sub:'CYBER',             price:22000, power:4700, top:1520, grip:1.26, mass:0.95, rot:6.9, iner:318, nitro:0.66,
    col:pal({body:'#b62aff',accent:'#31e6ff',rim:'#e8ecff',frame:'#1a0a2e',exhaust:'#8f7bff',tire:'#0e0c18'}), bonus:'Lame lumineuse de la nuit.' },
  { name:'Sand Storm',  sub:'DUNE',              price:30000, power:5300, top:1650, grip:1.30, mass:1.03, rot:6.7, iner:332, nitro:0.70,
    col:pal({body:'#d9a441',accent:'#0affc0',rim:'#fff0c8',frame:'#3a2a12',seat:'#2a1f0c',exhaust:'#c9c0a8'}), bonus:'La tempête des dunes.' },
  { name:'Spectre',     sub:'FANTÔME',           price:40000, power:5900, top:1780, grip:1.28, mass:0.92, rot:7.0, iner:308, nitro:0.78,
    col:pal({body:'#dfe8f7',accent:'#5a7fff',rim:'#ffffff',frame:'#1c2233',seat:'#20242f',exhaust:'#aab4c8'}), bonus:'On l’entend avant de la voir.' },
  { name:'Big Balls One',sub:'LÉGENDE',          price:55000, power:6800, top:2000, grip:1.33, mass:1.00, rot:6.6, iner:340, nitro:0.90,
    col:pal({body:'#ffd35a',accent:'#0a0b10',rim:'#fff6d8',frame:'#3a2a08',seat:'#141008',exhaust:'#f0d98a'}), bonus:'La moto ultime. Merci d’avoir joué !' }
];

// atout de chaque moto : le garage devient un choix (quelle façon de jouer ?) et plus seulement une échelle de prix
const PERKS = {
  lucky:    { name:'Porte-bonheur',   txt:'Missions +25 % de crédits.' },
  scout:    { name:'Pilotage précis', txt:'Atterrissage parfait plus facile (17° au lieu de 10°).' },
  wheelie:  { name:'Roi du wheelie',  txt:'Wheelies plus faciles et payés double.' },
  cruise:   { name:'Croisière',       txt:'La nitro se recharge seule à haute vitesse.' },
  aero:     { name:'Aéro',            txt:'Nitro : vitesse max +10 %, moins de traînée.' },
  turbo:    { name:'Turbo',           txt:'Boost d’atterrissage parfait doublé.' },
  regen:    { name:'Régénération',    txt:'Recharge la nitro en freinant et en descente.' },
  amphib:   { name:'Amphibie',        txt:'Flotte sur l’eau au lieu de couler.' },
  flipcash: { name:'Acrobate',        txt:'Figures +40 % de crédits.' },
  shock:    { name:'Amortisseurs',    txt:'Tolère les réceptions de travers.' },
  nitroflip:{ name:'Plein d’enfer',   txt:'Les figures rechargent 2× plus de nitro.' },
  torque:   { name:'Couple',          txt:'+35 % de puissance en montée.' },
  chain:    { name:'Flow',            txt:'Chaîne de style tenue 8 s au lieu de 5 s.' },
  float:    { name:'Planeur',         txt:'Gravité réduite de 12 % en l’air.' },
  ghost:    { name:'Seconde vie',     txt:'La première chute de chaque course est annulée.' },
  legend:   { name:'Légende',         txt:'Tous les gains +25 %.' }
};
const BIKE_PERK = {
  'Rusty 50':'lucky', 'Dirt Scout':'scout', 'MX 250':'wheelie', 'Café Racer':'cruise', 'Superbike R1':'aero',
  'Turbo Falcon':'turbo', 'Volt Hyper':'regen', 'Mud Hog':'amphib', 'Pocket Rocket':'flipcash', 'Rally Beast':'shock',
  'Nitro King':'nitroflip', 'Vulcan':'torque', 'Neon Blade':'chain', 'Sand Storm':'float', 'Spectre':'ghost', 'Big Balls One':'legend'
};
BIKES.forEach(b => { b.perk = BIKE_PERK[b.name] || null; });

// améliorations par moto : 4 réglages × 5 niveaux, prix indexé sur celui de la moto (puits de crédits entre deux achats)
const UPGRADES = [
  { id:'power', name:'PUISSANCE', per:0.05 },    // +5 % de poussée par niveau
  { id:'top',   name:'VITESSE',   per:0.04 },    // +4 % de vitesse de pointe
  { id:'nitro', name:'NITRO',     per:0.08 },    // +0,08 de force nitro
  { id:'rot',   name:'CONTRÔLE',  per:0.05 }     // +5 % de rotation
];
const UPG_MAX = 5;
const upgCost = (bi, lvl) => Math.round((150 + BIKES[bi].price * 0.08) * (lvl + 1) / 10) * 10;
// caractéristiques réelles d'une moto, améliorations comprises
function bikeSpec(bi){
  const b = BIKES[bi], u = (Save.upg && Save.upg[bi]) || [0, 0, 0, 0];
  return Object.assign({}, b, {
    power: b.power * (1 + UPGRADES[0].per * u[0]),
    top:   b.top   * (1 + UPGRADES[1].per * u[1]),
    nitro: b.nitro + UPGRADES[2].per * u[2],
    rot:   b.rot   * (1 + UPGRADES[3].per * u[3])
  });
}

const CHARS = [
  { name:'Rookie',    sub:'DÉBUTANT',   price:0,     grip:1.00, mass:1.00, rot:1.00,
    suit:'#4d7cff', helmet:'#e8eef7', visor:'#1b2540', skin:'#f0c39a', trim:'#ffffff', bonus:'Aucun bonus.' },
  { name:'Dirt Dan',  sub:'BOUFFEUR',   price:400,   grip:1.07, mass:1.02, rot:0.98,
    suit:'#c0552b', helmet:'#ffd35a', visor:'#2a1a0c', skin:'#d99a6c', trim:'#2a1a0c', bonus:'+7% accroche.' },
  { name:'Aria',      sub:'PILOTE',     price:1200,  grip:1.03, mass:0.93, rot:1.08,
    suit:'#ff2d6b', helmet:'#ff8ab5', visor:'#3a0a1c', skin:'#f6c9a8', trim:'#ffe3ee', bonus:'Corps léger : +7% masse en moins.' },
  { name:'Max Turbo', sub:'VÉTÉRAN',    price:2500,  grip:1.05, mass:1.00, rot:1.15,
    suit:'#ffd35a', helmet:'#31e6ff', visor:'#08303a', skin:'#e0a878', trim:'#08303a', bonus:'+15% contrôle en rotation.' },
  { name:'Ghost',     sub:'LÉGENDE',    price:5500,  grip:1.12, mass:0.96, rot:1.12,
    suit:'#e9edf6', helmet:'#b9c2d0', visor:'#0a0f1c', skin:'#c9cfda', trim:'#5a6a86', bonus:'Équilibré et accrocheur.' },
  { name:'Nova',      sub:'CHAMPIONNE', price:9000,  grip:1.18, mass:0.92, rot:1.20,
    suit:'#7a5cff', helmet:'#31e6ff', visor:'#12083a', skin:'#f0c39a', trim:'#d8c4ff', bonus:'La meilleure pilote du circuit.' }
];

/* ------------------------------ WORLDS ------------------------------ */
const WORLDS = [
  {
    short:'MONDE 1', name:'DUNES', sub:'COUCHER DE SOLEIL',
    sky:[[0,'#0b1230'],[0.34,'#2c2f6e'],[0.56,'#8a4a86'],[0.72,'#ff8a4c'],[0.86,'#ffc46b'],[1,'#4a2b3c']],
    stars:{ count:70, color:'#dff0ff', alpha:0.9 },
    sun:{ x:0.74, y:0.66, r:0.16, core:'rgba(255,246,214,.98)', moon:false,
      glow:[[0,'rgba(255,240,190,.95)'],[0.28,'rgba(255,190,110,.55)'],[0.7,'rgba(255,120,90,.14)'],[1,'rgba(255,120,90,0)']] },
    clouds:['rgba(255,190,200,.5)','rgba(180,190,255,.45)'],
    mtn:[
      { factor:0.10, base:0.52, amp:0.100, color:'#4a3a6e', rim:'rgba(255,170,130,.35)' },
      { factor:0.20, base:0.56, amp:0.085, color:'#352c5a', rim:'rgba(255,140,120,.22)' }
    ],
    hills:{ top:'#2e2548', bottom:'#130f22', trees:'pine', near:'#201a3a', far:'#171230', spacingNear:46, spacingFar:34 },
    ground:{
      stops:[[0,'#7a5232'],[0.28,'#553520'],[1,'#1a110a']],
      strata:[[26,8,'rgba(255,205,150,.10)'],[58,14,'rgba(0,0,0,.16)'],[105,10,'rgba(255,190,120,.07)'],[170,22,'rgba(0,0,0,.20)'],[260,16,'rgba(255,170,110,.05)']],
      pebble:'rgba(0,0,0,.22)', pebbleHi:'rgba(255,210,160,.10)',
      edge:'#3f2a18', track1:'#5a4524', track2:'#8a7a3a',
      hilite:'rgba(255,226,150,.65)', hilite2:null,
      grass:'#a9bd52', rock:'#6d5a34'
    },
    dust:'#c8a678',
    perf:1.00,
    gen:{ amp:1, w:[0.24,0.22,0.20,0.12,0.12,0.10], startFlat:900, easyIntro:true }
  },
  {
    short:'MONDE 2', name:'NÉON CITY', sub:'NUIT CYBER',
    sky:[[0,'#02030c'],[0.34,'#0a0f2e'],[0.56,'#241a54'],[0.72,'#5a1f66'],[0.86,'#b62a86'],[1,'#2a0b33']],
    stars:{ count:120, color:'#eaffff', alpha:1 },
    sun:{ x:0.76, y:0.60, r:0.14, core:'rgba(232,244,255,.98)', moon:true,
      glow:[[0,'rgba(180,220,255,.85)'],[0.28,'rgba(120,190,255,.4)'],[0.7,'rgba(80,120,255,.12)'],[1,'rgba(80,120,255,0)']] },
    clouds:['rgba(150,90,255,.35)','rgba(255,45,240,.28)'],
    mtn:[
      { factor:0.10, base:0.52, amp:0.110, color:'#241a4a', rim:'rgba(49,230,255,.35)' },
      { factor:0.20, base:0.56, amp:0.090, color:'#181040', rim:'rgba(255,45,240,.28)' }
    ],
    hills:{ top:'#12102c', bottom:'#050412', trees:'city', near:'#0d0b22', far:'#080718', spacingNear:38, spacingFar:52 },
    ground:{
      stops:[[0,'#2c3050'],[0.3,'#191c30'],[1,'#06070e']],
      strata:[[26,8,'rgba(49,230,255,.10)'],[58,14,'rgba(0,0,0,.25)'],[105,10,'rgba(255,45,240,.08)'],[170,22,'rgba(0,0,0,.28)'],[260,16,'rgba(120,80,255,.08)']],
      pebble:'rgba(0,0,0,.30)', pebbleHi:'rgba(49,230,255,.12)',
      edge:'#070a14', track1:'#3c4260', track2:'#232840',
      hilite:'rgba(49,230,255,.85)', hilite2:'rgba(255,45,240,.55)',
      grass:'#31e6ff', rock:'#7a3aff'
    },
    dust:'#7fd8ff',
    perf:0.90,
    gen:{ amp:1.35, w:[0.16,0.13,0.24,0.16,0.13,0.18], startFlat:900, easyIntro:false }
  },
  {
    short:'MONDE 3', name:'LACS', sub:'VALLÉE VERTE',
    sky:[[0,'#1d4a8a'],[0.35,'#4b8cd0'],[0.6,'#93ccef'],[0.82,'#dcefff'],[1,'#f4f8ea']],
    stars:{ count:0, color:'#ffffff', alpha:0 },
    sun:{ x:0.26, y:0.20, r:0.10, core:'rgba(255,253,230,.98)', moon:false,
      glow:[[0,'rgba(255,248,200,.85)'],[0.3,'rgba(255,238,160,.35)'],[0.7,'rgba(255,228,140,.10)'],[1,'rgba(255,228,140,0)']] },
    clouds:['rgba(255,255,255,.8)','rgba(225,240,255,.65)'],
    mtn:[
      { factor:0.10, base:0.50, amp:0.130, color:'#7e93b4', rim:'rgba(255,255,255,.55)', snow:true },
      { factor:0.20, base:0.56, amp:0.100, color:'#54718f', rim:'rgba(210,235,255,.35)', snow:true }
    ],
    hills:{ top:'#3f6b3a', bottom:'#17301d', trees:'pine', near:'#2c5230', far:'#21422a', spacingNear:40, spacingFar:28 },
    ground:{
      stops:[[0,'#6b9447'],[0.3,'#4a7031'],[1,'#13220f']],
      strata:[[26,8,'rgba(220,255,180,.10)'],[58,14,'rgba(0,0,0,.16)'],[105,10,'rgba(180,230,140,.07)'],[170,22,'rgba(0,0,0,.22)'],[260,16,'rgba(150,200,120,.05)']],
      pebble:'rgba(0,0,0,.22)', pebbleHi:'rgba(230,255,200,.10)',
      edge:'#2c3f1c', track1:'#6d5b2e', track2:'#8f7a3c',
      hilite:'rgba(240,255,190,.6)', hilite2:null,
      grass:'#9fce4f', rock:'#5f6e46'
    },
    dust:'#a8d47c',
    perf:0.75,
    water:{ level:-70, hi:'rgba(150,220,255,.55)', mid:'rgba(40,115,175,.78)', deep:'rgba(8,40,75,.92)', foam:'rgba(230,250,255,.75)' },
    gen:{ amp:1.05, w:[0.16,0.08,0.26,0.00,0.08,0.16,0.26], startFlat:900, easyIntro:true, ramp:1.25 }   // ramp : les motos y sont bridées (perf 0,75), rampes 25 % plus longues
  }
];
// monde de la course en cours (course libre : celui choisi au menu ; championnat et défi du jour : imposé)
let runWorld = 0;
const world = () => WORLDS[clamp(runWorld | 0, 0, WORLDS.length - 1)];

/* ------------------------------ SAVE ------------------------------ */
const SKEY = 'bigballs.v2';
const UNLOCK_WORLDS = true;   // un monde ne se débloque qu'en terminant le précédent (mettre false pour tout ouvrir)
const Save = {
  credits: 500,
  ownedBikes: [0],
  ownedChars: [0],
  selBike: 0,
  selChar: 0,
  selWorld: 0,
  best: 0,
  cleared: [],      // mondes dont l'objectif de distance a été atteint
  missionsDone: 0,
  shakeLvl: 0,      // option d'accessibilité : index dans SHAKE_LEVELS (0 = normale)
  bests: [0, 0, 0], // record de distance par monde (l'ancien `best` reste le record toutes courses confondues)
  sound: true,
  upg: [],          // upg[moto] = niveaux [puissance, vitesse, nitro, contrôle]
  champ: [],        // champ[monde] = { race: courses déjà courues (0-2), pts: [joueur, rival 1…4] }
  trophies: [],     // trophies[monde] = meilleure place finale au championnat (0 = jamais terminé)
  daily: { day:'', best:0, ghost:[] },   // défi du jour : record du jour et fantôme de ce record
  load(){
    try {
      const d = JSON.parse(localStorage.getItem(SKEY) || 'null');
      if (d && typeof d === 'object') Object.assign(this, this.sane(d));
    } catch(e){}
  },
  // ne garde que des valeurs de la bonne forme : une sauvegarde abîmée ou modifiée à la main ne doit pas faire planter le jeu
  sane(d){
    const num = (v, def, hi = 1e12) => Number.isFinite(+v) ? clamp(+v, 0, hi) : def;
    const ids = (v, n) => Array.isArray(v) ? [...new Set(v.map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < n))] : [];
    const out = {};
    out.credits = num(d.credits, 500);
    out.ownedBikes = ids(d.ownedBikes, BIKES.length); if (!out.ownedBikes.includes(0)) out.ownedBikes.unshift(0);
    out.ownedChars = ids(d.ownedChars, CHARS.length); if (!out.ownedChars.includes(0)) out.ownedChars.unshift(0);
    out.selBike = out.ownedBikes.includes(+d.selBike) ? +d.selBike : 0;
    out.selChar = out.ownedChars.includes(+d.selChar) ? +d.selChar : 0;
    out.cleared = ids(d.cleared, WORLDS.length);
    out.selWorld = Math.round(num(d.selWorld, 0, WORLDS.length - 1));
    if (UNLOCK_WORLDS && out.selWorld > 0 && !out.cleared.includes(out.selWorld - 1)) out.selWorld = 0;   // monde pas encore débloqué
    out.best = num(d.best, 0);
    out.bests = WORLDS.map((_, i) => num(Array.isArray(d.bests) ? d.bests[i] : 0, 0));
    out.missionsDone = Math.round(num(d.missionsDone, 0));
    out.shakeLvl = Math.round(num(d.shakeLvl, 0, SHAKE_LEVELS_N - 1));
    out.sound = d.sound !== false;
    out.upg = BIKES.map((_, i) => [0, 1, 2, 3].map(k => Math.round(num(Array.isArray(d.upg) && Array.isArray(d.upg[i]) ? d.upg[i][k] : 0, 0, UPG_MAX))));
    out.champ = WORLDS.map((_, i) => {
      const c = Array.isArray(d.champ) && d.champ[i] && typeof d.champ[i] === 'object' ? d.champ[i] : {};
      return { race: Math.round(num(c.race, 0, 2)), pts: [0, 1, 2, 3, 4].map(k => Math.round(num(Array.isArray(c.pts) ? c.pts[k] : 0, 0, 999))) };
    });
    out.trophies = WORLDS.map((_, i) => Math.round(num(Array.isArray(d.trophies) ? d.trophies[i] : 0, 0, 5)));
    const dl = d.daily && typeof d.daily === 'object' ? d.daily : {};
    out.daily = {
      day: typeof dl.day === 'string' ? dl.day.slice(0, 10) : '',
      best: Math.round(num(dl.best, 0)),
      ghost: Array.isArray(dl.ghost) && dl.ghost.length <= GHOST_MAX * 3 && dl.ghost.every(Number.isFinite) ? dl.ghost : []
    };
    return out;
  },
  store(){
    try {
      localStorage.setItem(SKEY, JSON.stringify({
        credits:this.credits, ownedBikes:this.ownedBikes, ownedChars:this.ownedChars,
        selBike:this.selBike, selChar:this.selChar, selWorld:this.selWorld, best:this.best,
        cleared:this.cleared, missionsDone:this.missionsDone, shakeLvl:this.shakeLvl,
        bests:this.bests, sound:this.sound, upg:this.upg, champ:this.champ, trophies:this.trophies, daily:this.daily
      }));
    } catch(e){}
  }
};
const SHAKE_LEVELS_N = 3;          // nombre de niveaux de SHAKE_LEVELS (déclaré plus bas, avant le premier appel de load)
const GHOST_MAX = 15 * 60 * 6;     // fantôme : 15 positions/s, 6 min au plus
Save.load();
if (!Save.upg.length) Save.upg = Save.sane({}).upg;          // première partie : structures vides mais complètes
if (!Save.champ.length){ const z = Save.sane({}); Save.champ = z.champ; Save.trophies = z.trophies; }
runWorld = Save.selWorld;
Snd.on = Save.sound;               // le réglage du son est mémorisé

/* ------------------------------ CANVAS ------------------------------ */
const cv = $('game');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize(){
  DPR = Math.min(window.devicePixelRatio || 1, 'ontouchstart' in window ? 1.5 : 2);   // tactile : moins de pixels à remplir
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.floor(W * DPR); cv.height = Math.floor(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

/* ------------------------------ TERRAIN ------------------------------ */
const STEP = 4;
const Terrain = { E: null, n: 0, genX: 0, rng: null, seed: 1, tail: 0 };
let GEN = WORLDS[0].gen;

function tAdd(x0, width, fn){
  const i0 = Math.max(0, Math.floor(x0 / STEP));
  const i1 = Math.min(Terrain.n - 1, Math.ceil((x0 + width) / STEP));
  for (let i = i0; i <= i1; i++){
    const t = (i * STEP - x0) / width;
    if (t < 0 || t > 1) continue;
    Terrain.E[i] += fn(t);
  }
}
const smooth = t => t * t * (3 - 2 * t);

/* Toutes les bosses respectent une pente max (~40-50°) pour rester franchissables.
   smooth() a une pente max de 1.5*H/w, d'où les largeurs minimales ci-dessous. */
const easeIn = t => Math.pow(t, 1.6);
// difficulté qui monte avec la distance : +12 % d'amplitude à 1 000 m, +25 % à 2 000 m, plafonné à +35 % (les largeurs suivent, donc les pentes restent franchissables)
const ampAt = x => GEN.amp * (1 + Math.min(0.35, x / 80000));
// rampes plus longues (donc moins raides) dans les mondes où les motos sont bridées : GEN.ramp > 1
const rampK = () => GEN.ramp || 1;
function featHill(x, rng, easy){
  const amp = ampAt(x);
  const Hh = (easy ? 30 + rng() * 40 : 40 + rng() * 130) * amp;
  const wu = Math.max(150 + rng() * 220, Hh * 2.1);
  const wd = Math.max(150 + rng() * 260, Hh * 2.0);
  tAdd(x, wu, t => Hh * smooth(t));
  tAdd(x + wu, wd, t => Hh * (1 - smooth(t)));
  return wu + wd + 40 + rng() * 80;
}
function featWhoops(x, rng, easy){
  const amp = ampAt(x);
  const count = easy ? 3 : 3 + Math.floor(rng() * 6);
  const wl = 100 + rng() * 60;
  const A = Math.min(wl * 0.2, (12 + rng() * (easy ? 8 : 20)) * amp);
  const w = count * wl;
  tAdd(x, w, t => A * 0.5 * (1 - Math.cos(t * TAU * count)));
  return w + 50 + rng() * 80;
}
function featKicker(x, rng){
  const amp = ampAt(x);
  // rampe de saut (lèvre franche) + pente de réception qui s'adoucit vers le sol
  const Hh = (50 + rng() * 85) * amp;
  const wu = (Hh * 1.7 + 30 + rng() * 40) * rampK();
  const wd = Hh * 2.4;
  tAdd(x, wu, t => Hh * easeIn(t));
  tAdd(x + wu, wd, t => Hh * (1 - t) * (1 - t));   // (1-t)^2 : retombe en douceur
  return wu + wd + 80 + rng() * 90;
}
function featGap(x, rng){
  const amp = ampAt(x);
  // grande rampe, puis vallée à franchir (ou à traverser)
  const Hh = (50 + rng() * 70) * amp;
  const depth = (40 + rng() * 70) * amp;
  const wu = (Hh * 1.8 + 40 + rng() * 40) * rampK();
  const wdn = (Hh + depth) * 2.2 + 60 + rng() * 80;
  const wr = depth * 3.6 + 40;
  tAdd(x, wu, t => Hh * easeIn(t));
  tAdd(x + wu, wdn, t => (Hh + depth) * (1 - t) * (1 - t) - depth);
  tAdd(x + wu + wdn, wr, t => -depth * (1 - smooth(t)));
  return wu + wdn + wr + 60;
}
function featRidge(x, rng){
  const amp = ampAt(x);
  const Hh = (80 + rng() * 90) * amp;
  const w = Math.max(240 + rng() * 120, Hh * 3.6);
  tAdd(x, w, t => Hh * Math.pow(Math.sin(Math.PI * t), 1.5));
  return w + 50 + rng() * 60;
}
function featMega(x, rng){
  const amp = ampAt(x);
  // énorme tremplin avec un trou au milieu du saut : le grand frisson
  const Hh = (90 + rng() * 70) * amp;
  const hole = 24 + rng() * 36;
  const wu = (Hh * 1.7 + 30 + rng() * 40) * rampK();
  const gap = 140 + rng() * 140;
  const wd = Hh * 2.2;
  tAdd(x, wu, t => Hh * easeIn(t));
  tAdd(x + wu, gap, t => Hh - hole * Math.sin(Math.PI * t));
  tAdd(x + wu + gap, wd, t => Hh * (1 - smooth(t)));
  return wu + gap + wd + 90 + rng() * 90;
}
function featWater(x, rng){
  const amp = ampAt(x);
  // rampe de décollage, lac peu profond, berge courte puis plateau plat pour l'atterrissage
  const Hh = (70 + rng() * 60) * amp;
  const depth = 70 + (25 + rng() * 35) * amp;
  const wu = (Hh * 2.0 + 60 + rng() * 40) * rampK();
  const gap = 150 + rng() * 100;
  // berge en pente douce (~32° au plus, contre un mur de ~75° avant) : une moto bridée qui retombe court en ressort
  // au lieu de glisser à reculons dans le lac ; puis petit plateau qui redescend au niveau du sol
  const wb = (depth + 25) * 2.4;
  const wp = 120 + rng() * 80;
  tAdd(x, wu, t => Hh * easeIn(t));
  tAdd(x + wu, gap, t => Hh + (-depth - Hh) * smooth(Math.min(1, t * 2.2)));
  tAdd(x + wu + gap, wb, t => -depth + (depth + 25) * smooth(t));
  tAdd(x + wu + gap + wb, wp, t => 25 * (1 - smooth(t)));
  return wu + gap + wb + wp + 60;
}

function addChunk(len){
  const startX = Terrain.genX, endX = startX + len;
  const MARGIN = 900;
  const nNew = Math.ceil((len + MARGIN + 220) / STEP);
  const oldN = Terrain.n;
  const arr = new Float32Array(oldN + nNew);
  if (Terrain.E) arr.set(Terrain.E.subarray(0, oldN));
  Terrain.E = arr; Terrain.n = oldN + nNew;

  let x = Math.max(startX, Terrain.tail);   // reprend après le débordement de la dernière feature du bloc précédent
  if (startX < 1){
    x = GEN.startFlat; // piste plate au départ + petits échauffements
    if (GEN.easyIntro){
      x += featWhoops(x, Terrain.rng, true);
      x += featHill(x, Terrain.rng, true);
    }
  }
  const cutoff = endX - MARGIN;
  const FEATS = [featHill, featWhoops, featKicker, featGap, featRidge, featMega, featWater];
  let guard = 0;
  while (x < cutoff && guard++ < 4000){
    const r = Terrain.rng();
    let acc = 0, pick = 0;
    for (let i = 0; i < GEN.w.length; i++){
      acc += GEN.w[i];
      if (r < acc){ pick = i; break; }
    }
    x += FEATS[pick](x, Terrain.rng);
  }
  Terrain.tail = x;
  Terrain.genX = endX;
}
function ensureTerrain(upto){
  while (Terrain.genX < upto) addChunk(24000);
}
function newTrack(seed){
  GEN = world().gen;
  Terrain.E = new Float32Array(STEP * 2);
  Terrain.n = 0; Terrain.genX = 0; Terrain.tail = 0;
  Terrain.seed = seed;
  Terrain.rng = mulberry32(seed >>> 0);
  ensureTerrain(24000);
}

function groundY(x){
  const E = Terrain.E;
  let i = x / STEP;
  if (i <= 0) return -E[0];
  if (i >= Terrain.n - 2) return -E[Terrain.n - 2];
  const i0 = i | 0, f = i - i0;
  return -(E[i0] * (1 - f) + E[i0 + 1] * f);
}
function groundSlope(x){
  const E = Terrain.E;
  let i = Math.round(x / STEP);
  if (i < 1) i = 1;
  if (i > Terrain.n - 2) i = Terrain.n - 2;
  return -(E[i + 1] - E[i - 1]) / (2 * STEP);
}

/* ------------------------------ PARTICLES / TEXTS ------------------------------ */
const parts = [];
const floats = [];
function spawnPart(x, y, vx, vy, life, size, color, grav){
  if (parts.length > 420) parts.shift();
  parts.push({ x, y, vx, vy, life, max: life, size, color, grav: grav === undefined ? 300 : grav });
}
function spawnText(x, y, txt, color){
  floats.push({ x, y, txt, color: color || '#fff', life: 1.1, max: 1.1 });
}

/* ------------------------------ INPUT ------------------------------ */
const keys = {};
const isTouch = 'ontouchstart' in window;   // commandes tactiles, jauge déplacée, aide clavier masquée
const In = { throttle:0, brake:0, lean:0, nitro:false, restart:false };
// lettres lues par position physique (e.code) : W/A/S/D deviennent Z/Q/S/D sur un clavier AZERTY ; flèches et espace par e.key
const keyId = e => e.code && e.code.startsWith('Key') ? e.code.slice(3).toLowerCase() : e.key.toLowerCase();
window.addEventListener('keydown', e => {
  // les flèches/espace ne sont captées qu'en jeu : ailleurs (boutique…) elles gardent leur rôle normal
  if (state === 'play' && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  keys[keyId(e)] = true;
  if (e.repeat) return;
  if (state === 'play'){
    if (!paused && (e.key === 'r' || e.key === 'R')) In.restart = true;   // en pause, R ne doit pas relancer à la reprise
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') setPause(!paused);
  } else if (state === 'over' && !$('over').classList.contains('hidden') &&      // l'écran de fin doit être affiché (pas la boutique ouverte depuis lui)
             (e.key === 'Enter' || e.key === ' ' || e.key === 'r' || e.key === 'R')){
    e.preventDefault(); startGame();                    // rejouer au clavier depuis l'écran de fin
  } else if (state === 'over' && mode === 'champ' && !$('champ').classList.contains('hidden') && (e.key === 'Enter' || e.key === ' ')){
    e.preventDefault(); startGame('champ');             // course suivante du championnat
  }
});
window.addEventListener('keyup', e => { keys[keyId(e)] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

const touchKeys = {};
function bindTouch(){
  document.querySelectorAll('.tbtn').forEach(btn => {
    const k = btn.dataset.key;
    const on  = e => { e.preventDefault(); touchKeys[k] = true; };
    const off = e => { e.preventDefault(); touchKeys[k] = false; };
    btn.addEventListener('touchstart', on, {passive:false});
    btn.addEventListener('touchend', off, {passive:false});
    btn.addEventListener('touchcancel', off, {passive:false});
    btn.addEventListener('mousedown', on);
    btn.addEventListener('mouseup', off);
    btn.addEventListener('mouseleave', off);
  });
}
function readInput(){
  In.throttle = (keys['arrowright'] || keys['d'] || touchKeys.throttle) ? 1 : 0;
  In.brake    = (keys['arrowleft']  || keys['a'] || touchKeys.left) ? 1 : 0;
  const up    = (keys['arrowup']    || keys['w'] || touchKeys.rotBack) ? 1 : 0;
  const down  = (keys['arrowdown']  || keys['s'] || touchKeys.rotFwd) ? 1 : 0;
  In.lean = up - down;                       // +1 = rotation arrière (nose up)
  In.nitro = !!(keys[' '] || touchKeys.nitro);
}

/* ------------------------------ BIKE STATE ------------------------------ */
const WB = 46, WR = 13;
// un « pilote » = l'état physique d'une moto. Le joueur (`bike`) et les rivaux du championnat partagent la même physique.
function makeRider(o){
  return Object.assign({
    x:0, y:0, a:0, vx:0, vy:0, av:0,
    onGround:false, air:false, airTime:0, totalAir:0,
    rotAcc:0, flips:0, pendFlips:0, earned:0, wheelAng:0, throttle:0,
    nitro:1, nitroLock:false, boosting:0, dead:false, deadT:0,
    chain:0, chainT:0, bestJump:0, goalHit:false, missionGain:0,
    banked:0,         // crédits de distance déjà encaissés avant la fin de course (voir bankRun)
    contacts:0, squash:0, leanSm:0,
    rearC:false, frontC:false,                                      // roues au contact au dernier pas
    wheelieOn:false, wheelieT:0, wheelieOff:0, bestWheelie:0,       // wheelie en cours, durée, meilleur de la course
    perfects:0, skips:0, inWater:false, ghostUsed:false, respawnT:0, fuel:1, fin:0, tries:0, lastSafe:-1e9,
    safeX:undefined, safeY:0, safeA:0, safeV:0, rescues:0, rescueX:-1e9, stuckT:0, stuckWarned:false,
    spec:BIKES[0], ch:CHARS[0], isPlayer:false, inp:null, bot:null, name:''
  }, o);
}
const bike = makeRider({ isPlayer:true });
let rivals = [];                // rivaux du championnat (vide en course libre et au défi du jour)
let mode = 'free';              // 'free' (course libre) | 'daily' (défi du jour) | 'champ' (championnat)
let camX = 0, camY = 0, camZoom = 1;
let waterPathCache = null;
let runSeed = 1, startX = 0, runT = 0;

/* ------------------------------ GAME FEEL ------------------------------ */
// Paliers d'importance (trauma / hit-stop) : atterrissage = moyen, figure = fort, chute = fort.
const fx = { trauma:0, t:0, stop:0, sqz:0, sqzV:0 };
const SHAKE_MAX = 16;      // px de décalage à trauma = 1 (la secousse suit trauma²)
const SHAKE_DECAY = 1.5;   // trauma perdu par seconde : la secousse finit toujours seule
const SHAKE_LEVELS = [{ k:1, txt:'Normale' }, { k:0.4, txt:'Réduite' }, { k:0, txt:'Aucune' }];
const STOP_MAX = 0.14;     // plafond du hit-stop (s) : pas de blocage même si plusieurs impacts s'empilent
const SQZ_K = 380, SQZ_C = 22;   // ressort amorti (~12 % de dépassement) : écrasé → léger étirement → repos
const shakeLabel = () => '📳 Secousse : ' + SHAKE_LEVELS[clamp(Save.shakeLvl | 0, 0, SHAKE_LEVELS.length - 1)].txt;
const addTrauma = a => { fx.trauma = Math.min(1, fx.trauma + a); };      // les impacts s'additionnent
const hitStop = s => { fx.stop = Math.min(STOP_MAX, Math.max(fx.stop, s)); };
const kickSquash = q => { fx.sqz = Math.max(fx.sqz, q); fx.sqzV = 0; };  // écrasement instantané, retour élastique
function resetFx(){ fx.trauma = 0; fx.stop = 0; fx.sqz = 0; fx.sqzV = 0; }
function stepSquash(dt){
  const n = Math.ceil(dt * 120);      // sous-pas ≤ 1/120 s : ressort stable même à 20 fps ; n = 0 pendant le hit-stop
  for (let i = 0; i < n; i++){
    const h = dt / n;
    fx.sqzV += (-SQZ_K * fx.sqz - SQZ_C * fx.sqzV) * h;
    fx.sqz += fx.sqzV * h;
  }
}

// remet un pilote sur la ligne de départ (garde sa moto, son pilote et, pour un rival, son IA)
function resetRider(r, x){
  Object.assign(r, makeRider({ spec:r.spec, ch:r.ch, isPlayer:r.isPlayer, inp:r.inp, bot:r.bot, name:r.name }));
  r.x = x; r.y = groundY(x) - WR - 6;
}
function resetBike(){
  bike.spec = bikeSpec(Save.selBike); bike.ch = CHARS[Save.selChar];
  resetRider(bike, 160);
  resetFx();
  startX = bike.x; runT = 0; ghostRec = [];
  camX = bike.x; camY = bike.y;
}
// repart du dernier point sûr avec l'élan qu'on y avait (sinon on resterait bloqué au pied de la même rampe).
// Échecs répétés au même endroit : l'élan varie (100 %, 55 %, 25 %), puis on est posé après l'obstacle —
// sans ça, une même chute pouvait se rejouer à l'infini (vu en simulation : 111 chutes d'affilée).
function respawnRider(r){
  if (r.safeX === undefined){ r.safeX = startX; r.safeY = groundY(startX) - WR - 6; r.safeA = 0; r.safeV = 0; }
  r.tries = Math.abs(r.safeX - r.lastSafe) < 400 ? r.tries + 1 : 0;
  r.lastSafe = r.safeX;
  if (r.tries >= 3){
    const x = safeGroundAfter(r.safeX + 500);
    r.safeX = x; r.safeY = groundY(x) - WR - 6; r.safeA = Math.atan2(groundSlope(x), 1);
    r.lastSafe = x; r.tries = 0;
    if (r.isPlayer) toast('OBSTACLE PASSÉ');
  }
  const v = r.safeV * [1, 0.55, 0.25][r.tries];
  r.x = r.safeX; r.y = r.safeY; r.a = r.safeA;
  r.vx = Math.cos(r.a) * v; r.vy = Math.sin(r.a) * v; r.av = 0;
  r.dead = false; r.respawnT = 0; r.air = false; r.airTime = 0; r.rotAcc = 0; r.pendFlips = 0;
  r.squash = 0; r.stuckT = 0; r.wheelieOn = false; r.wheelieT = 0; r.wheelieOff = 0; r.skips = 0;
}

// premier sol presque plat, hors de l'eau, à partir de x
function safeGroundAfter(x){
  const wtr = world().water;
  for (let k = 0; k < 400; k++, x += 20)
    if (Math.abs(groundSlope(x)) < 0.25 && !(wtr && groundY(x) > -wtr.level - 5)) return x;
  return x;
}

/* ------------------------------ PHYSICS ------------------------------ */
const GRAV = 1600;
const NITRO_CAP = 1.4;   // la nitro pousse à fond jusqu'à `top`, puis de moins en moins jusqu'à top × 1,4 (au lieu d'emballer la vitesse)
const AIR_TORQUE = 3.0;   // rotation en l'air = spec.rot × pilote × ceci (0,42 au sol). Était 1,7 : un tour exigeait ~1 s de vol, plus que les premières motos n'en font
const OVERSPEED_DRAG = 6000;   // px/s² de traînée horizontale à 2 × top (quadratique : nulle sous `top`, douce juste au-dessus) → vitesse ≤ ~1,5 × top
// nitro gagnée en pilotant : la recharge passive (0,10/s avant) devient faible, le vol et les atterrissages parfaits la remplissent
const NITRO_REGEN = 0.025;     // /s, toujours
const NITRO_AIR = 0.06;        // /s en plus pendant le vol
const PERFECT_ANG = 0.17;      // écart moto / pente sous lequel l'atterrissage est PARFAIT (~10°)
const PERFECT_BOOST = 0.12;    // élan gagné à l'atterrissage parfait, en fraction de `top`
// ↑ + gaz au sol = wheelie. Couples exprimés en fraction du seuil de gravité G = g × demi-empattement / inertie
// (≈ 47 rad/s² pour la Rusty) : en dessous de G la roue avant ne décolle pas.
const WHEELIE_TORQUE = 1.35;   // pour lever la roue avant
// une fois levée : couple réduit + aide d'équilibre (gaz tenu) → monter (↑ tenu) et retomber (↑ relâché) vont à la même vitesse
const WHEELIE_HOLD = 0.8, WHEELIE_ASSIST = 0.6;
const WHEELIE_RIGHT = 4;       // redressement automatique en wheelie (26 sinon) : l'équilibre est au pilote
const WHEELIE_DAMP = 6;
const WHEELIE_AV = 2.2;        // vitesse de rotation max en wheelie (rad/s) : 200 ms de retard = ~0,45 rad de dépassement au plus        // amortissement en wheelie : le nez monte et descend assez lentement pour qu'un humain (~150-200 ms de réaction) suive
const SKIP_SPEED = 220;        // ricochet : vitesse horizontale minimale (px/s)…
const SKIP_ANGLE = 0.35;       // …et moto à plat à ~20° près
const SKIP_MAX = 3;            // ricochets au plus avant de toucher terre

const perkOf = r => r.spec.perk;
// gain en course du joueur (atout Légende compris)
function pay(n){
  n = Math.round(n * (perkOf(bike) === 'legend' ? 1.25 : 1));
  Save.credits += n; bike.earned += n;
  return n;
}
// chaîne de style : figures, atterrissages parfaits et wheelies d'au moins 1 s se suivent → +25 % par maillon
function chainLink(r){
  r.chain = r.chainT > 0 ? r.chain + 1 : 1;
  r.chainT = perkOf(r) === 'chain' ? 8 : 5;
  return 1 + 0.25 * (r.chain - 1);
}
function endWheelie(r){
  const T = r.wheelieT;
  r.wheelieOn = false; r.wheelieT = 0; r.wheelieOff = 0;
  r.bestWheelie = Math.max(r.bestWheelie, T);
  if (T < 1 || r.dead) return;
  const mult = chainLink(r);
  if (r.isPlayer){
    const gain = pay(T * 20 * mult * (perkOf(r) === 'wheelie' ? 2 : 1));
    spawnText(r.x, r.y - 70, 'WHEELIE ' + T.toFixed(1) + ' s  +' + gain + (r.chain > 1 ? '  CHAÎNE x' + r.chain : ''), '#ffd35a');
    Snd.blip(760, 0.14, 'square');
  }
}

function physStep(r, inp, dt){
  const spec = r.spec, ch = r.ch, perk = spec.perk, P = r.isPlayer;
  const perf = (world().perf || 1) * (r.bot ? r.bot.boost : 1);      // les motos faiblissent dans les mondes avancés
  let power = spec.power * perf;
  const top = spec.top * perf;
  const mass = spec.mass * ch.mass;
  const inertia = spec.iner * 2.8 * mass;   // inertie réaliste : les chocs ne font plus tourner la moto comme une toupie
  const cap = NITRO_CAP + (perk === 'aero' ? 0.14 : 0);

  r.vy += GRAV * (perk === 'float' && r.air ? 0.88 : 1) * dt;

  let cs = Math.cos(r.a), sn = Math.sin(r.a);
  const dx = cs, dy = sn;

  const fwd = r.vx * dx + r.vy * dy;
  const slopeHere = groundSlope(r.x);
  if (perk === 'torque' && r.onGround && slopeHere < -0.15) power *= 1.35;   // montée (y vers le bas : pente négative)

  // ---------- moteur ----------
  const thr = r.dead ? 0 : inp.throttle;
  r.throttle = thr;
  if (thr > 0 && fwd < top){
    const F = power * thr * dt / mass * (r.onGround ? 1 : r.inWater ? 0.6 : 0.1);   // pas de vol en poussant
    r.vx += dx * F; r.vy += dy * F;
  }
  // ---------- frein / marche arrière ----------
  if (!r.dead && inp.brake > 0){
    if (fwd > 30){
      const F = power * 1.35 * dt / mass;
      r.vx -= dx * F; r.vy -= dy * F;
    } else if (fwd > -top * 0.45){
      const F = power * 0.75 * dt / mass;
      r.vx -= dx * F; r.vy -= dy * F;
    }
  }
  // ---------- nitro ----------
  // `room` : 1 sous `top`, tombe à 0 au plafond top × cap — la poussée s'éteint d'elle-même, sans frein artificiel
  const room = clamp((top * cap - fwd) / (top * (cap - 1)), 0, 1);
  // réservoir vidé : nitro verrouillée jusqu'à 25 % ou relâchement de la touche (sinon elle se rallume à 2 % sans fin)
  if (r.nitro <= 0.02) r.nitroLock = true;
  else if (r.nitroLock && (!inp.nitro || r.nitro >= 0.25)) r.nitroLock = false;
  const wantNitro = inp.nitro && !r.nitroLock;
  if (!r.dead && wantNitro && fwd > 60){
    r.boosting = Math.min(1, r.boosting + dt * 3);
    r.nitro = Math.max(0, r.nitro - dt * 0.34 * (0.3 + 0.7 * room));   // plafond atteint : la réserve ne fond plus pour rien
    const F = power * (0.8 + spec.nitro * 1.8) * room * dt / mass * (r.onGround ? 1 : 0.35);
    r.vx += dx * F; r.vy += dy * F;
    for (let i = 0; i < (P ? 2 : 1); i++){
      spawnPart(r.x - dx * 30 + (Math.random()-0.5)*6, r.y - dy * 30 + (Math.random()-0.5)*6,
        -dx*180 + (Math.random()-0.5)*90, -dy*180 + (Math.random()-0.5)*90,
        0.35 + Math.random()*0.25, 3 + Math.random()*4, spec.col.accent, 80);
    }
  } else {
    r.boosting = Math.max(0, r.boosting - dt * 2.2);
  }
  if (!wantNitro){                       // touche tenue sur réservoir vide : ça recharge quand même
    let regen = NITRO_REGEN;
    if (r.air) regen += NITRO_AIR;
    if (perk === 'cruise' && r.onGround && fwd > top * 0.6) regen += 0.09;
    if (perk === 'regen' && r.onGround && (inp.brake > 0 || slopeHere > 0.15)) regen += 0.14;
    r.nitro = Math.min(1, r.nitro + dt * regen);
  }
  // ---------- traînée au-delà de `top` : descentes et élan de nitro ne font plus grimper la vitesse sans limite ----------
  // horizontale seulement : les arcs de saut et les durées de vol restent ceux de la physique d'origine
  const over = Math.abs(r.vx) / top - 1;
  if (over > 0) r.vx -= Math.sign(r.vx) * OVERSPEED_DRAG * (perk === 'aero' ? 0.6 : 1) * over * over * dt;

  // ---------- rotation joueur ----------
  const wheelieTry = r.onGround && inp.lean > 0 && thr > 0;   // cabrer en accélérant = wheelie
  const wG = GRAV * (WB / 2) / (spec.iner * 2.8);               // seuil de gravité du wheelie (voir WHEELIE_TORQUE)
  if (!r.dead && inp.lean !== 0){
    let strength = spec.rot * ch.rot * (r.onGround ? 0.42 : AIR_TORQUE);
    if (wheelieTry) strength = wG * (r.wheelieOn ? WHEELIE_HOLD : WHEELIE_TORQUE) * ch.rot;
    r.av -= inp.lean * strength * dt;   // angle négatif = nez en l'air (écran : y vers le bas)
  }
  if (r.wheelieOn && thr > 0 && !r.dead)
    r.av -= wG * WHEELIE_ASSIST * (perk === 'wheelie' ? 1.15 : 1) * Math.cos(norm(r.a - Math.atan2(slopeHere, 1))) * dt;
  // ---------- auto-redressement au sol ----------
  if (r.onGround && !r.dead){
    const target = Math.atan2(slopeHere, 1);
    const err = norm(r.a - target);
    const soft = r.wheelieOn || wheelieTry;   // en wheelie, le redressement s'efface : c'est au pilote de tenir l'équilibre
    const k = soft ? WHEELIE_RIGHT : 26;
    r.av -= err * k * dt;
    r.av *= Math.exp(-(soft ? WHEELIE_DAMP : 7.5) * dt);
  } else {
    r.av *= Math.exp(-0.8 * dt);
    // stabilisation en l'air : la moto suit sa trajectoire (sauf si le joueur tourne)
    if (!r.dead && inp.lean === 0 && Math.hypot(r.vx, r.vy) > 80){
      const target = Math.atan2(r.vy, r.vx);
      r.av -= norm(r.a - target) * 5 * dt;
    }
  }
  r.av = clamp(r.av, -13, 13);
  if (r.wheelieOn || wheelieTry) r.av = clamp(r.av, -WHEELIE_AV, WHEELIE_AV);   // même une moto surpuissante cabre à vitesse humaine

  // ---------- intégration ----------
  r.a += r.av * dt;
  r.x += r.vx * dt;
  r.y += r.vy * dt;

  // ---------- collisions roues : solveur d'impulsions ----------
  cs = Math.cos(r.a); sn = Math.sin(r.a);
  let contacts = 0;
  let maxPen = 0;
  r.rearC = false; r.frontC = false;
  const grip = spec.grip * ch.grip;
  const restitution = 0.10;
  const offs = [-WB / 2, WB / 2];
  for (let it = 0; it < 2; it++){
    for (let w = 0; w < 2; w++){
      const ox = offs[w];
      const wx = r.x + ox * cs;
      const wy = r.y + ox * sn;
      const gy = groundY(wx);
      const pen = (wy + WR) - gy;
      if (pen <= 0) continue;
      if (it === 0){ contacts++; if (w === 0) r.rearC = true; else r.frontC = true; }
      const s = groundSlope(wx);
      const nl = Math.hypot(s, 1);
      const nx = s / nl, ny = -1 / nl;
      const penN = Math.min(pen / nl, 30);
      if (it === 0) maxPen = Math.max(maxPen, penN);
      const rxx = wx - r.x, ryy = wy - r.y;
      const pxv = r.vx + r.av * (-ryy);
      const pyv = r.vy + r.av * (rxx);
      const vn = pxv * nx + pyv * ny;
      const rn = rxx * ny - ryy * nx;
      const kn = 1 / mass + rn * rn / inertia;
      const bias = it === 0 ? Math.max(0, penN - 0.5) * 0.2 / dt : 0;
      let lam = (-(1 + restitution) * Math.min(0, vn) + bias) / kn;
      if (lam < 0) lam = 0;
      r.vx += nx * lam / mass;
      r.vy += ny * lam / mass;
      r.av += rn * lam / inertia;
      // frottement tangentiel (Coulomb, borné par l'impulsion normale)
      const tx = -ny, ty = nx;
      const vt = pxv * tx + pyv * ty;
      const rt = rxx * ty - ryy * tx;
      const kt = 1 / mass + rt * rt / inertia;
      let lt = -vt / kt;
      const maxT = grip * 0.12 * lam;
      lt = clamp(lt, -maxT, maxT);
      r.vx += tx * lt / mass;
      r.vy += ty * lt / mass;
      r.av += rt * lt / inertia;
      if (it === 0){
        const slip = Math.abs(vt);
        if ((slip > 40 || thr > 0) && Math.random() < (P ? 0.5 : 0.2))
          spawnPart(wx, gy - 3, -r.vx * 0.12 + (Math.random()-0.5)*70, -30 - Math.random()*60,
            0.5 + Math.random()*0.4, 2 + Math.random()*4, world().dust, 260);
      }
    }
  }
  r.squash = Math.max(r.squash, Math.min(1, maxPen / 14));
  r.onGround = contacts > 0;
  r.contacts = contacts;

  // mémorise un point de passage sûr (repêchage, et reprise après chute en championnat), avec l'élan du moment
  if (r.onGround && Math.abs(r.vx) > 220 && Math.abs(groundSlope(r.x)) < 0.45){
    r.safeX = r.x; r.safeY = r.y - 6; r.safeA = r.a; r.safeV = Math.min(Math.hypot(r.vx, r.vy), top) * 0.8;
  }

  // ---------- wheelie : roue arrière seule au sol, nez levé ----------
  const slopeAng = Math.atan2(groundSlope(r.x), 1);
  const fwx = r.x + (WB / 2) * cs, fwy = r.y + (WB / 2) * sn;
  const clear = groundY(fwx) - (fwy + WR);
  if (!r.dead && r.rearC && !r.frontC && clear > 4 && norm(r.a - slopeAng) < -0.12){
    r.wheelieOn = true; r.wheelieT += dt; r.wheelieOff = 0;
  } else if (r.wheelieOn){
    r.wheelieOff += dt;                                   // tolère un petit rebond de la roue arrière
    if (r.wheelieOff > 0.15 || r.dead) endWheelie(r);
  }

  // ---------- air / figures ----------
  const hAbove = groundY(r.x) - r.y - WR;
  const airborne = hAbove > 22 && contacts === 0 && !r.inWater;
  if (airborne){
    r.airTime += dt;
    if (Math.abs(r.av) > 0.5) r.rotAcc += r.av * dt;
  } else if (r.air || r.airTime > 0){
    // atterrissage : RATÉ (chute ou figure perdue) < PROPRE < PARFAIT (élan + nitro + maillon de chaîne)
    const errL = Math.abs(norm(r.a - slopeAng));
    const clean = errL < (perk === 'shock' ? 1.2 : 0.9);   // retombée sur les roues
    const perfect = clean && !r.dead && r.airTime > 0.35 && errL < (perk === 'scout' ? 0.30 : PERFECT_ANG);
    if (P && clean) kickSquash(clamp(0.05 + r.airTime * 0.12, 0.05, 0.2));   // plus on tombe de haut, plus ça s'écrase
    if (r.airTime > 0.45 && !r.dead){
      r.totalAir += r.airTime;
      if (P){
        const gain = pay(r.airTime * 25);
        spawnText(r.x, r.y - 40, '+' + gain, '#31e6ff');
        Snd.blip(220, 0.09, 'sine');
        addTrauma(clamp(0.3 + r.airTime * 0.2, 0.35, 0.55));    // palier moyen
        hitStop(clamp(0.03 + r.airTime * 0.025, 0.04, 0.06));
        for (let i = 0; i < 18; i++)
          spawnPart(r.x, groundY(r.x) - 4, (Math.random()-0.5)*260, -Math.random()*220,
            0.5, 2 + Math.random()*5, world().dust, 320);
      }
    }
    const flipsOk = r.pendFlips > 0 && clean && !r.dead;
    const mult = (perfect || flipsOk) ? chainLink(r) : 1;      // un atterrissage = un seul maillon, même parfait ET avec figure
    if (perfect){
      const fwdNow = r.vx * cs + r.vy * sn;
      const add = clamp(top * cap - fwdNow, 0, top * PERFECT_BOOST * (perk === 'turbo' ? 2 : 1));
      r.vx += cs * add; r.vy += sn * add;
      r.nitro = Math.min(1, r.nitro + 0.2);
      r.perfects++;
      if (P){
        const gain = pay((25 + r.airTime * 40) * mult);
        spawnText(r.x, r.y - 96, 'PARFAIT !  +' + gain, '#5affc0');
        Snd.blip(1320, 0.12, 'sine');
        addTrauma(0.12);
        for (let i = 0; i < 14; i++)
          spawnPart(r.x + (Math.random()-0.5)*40, r.y + 6, (Math.random()-0.5)*160, -60 - Math.random()*160,
            0.5, 2 + Math.random()*3, '#5affc0', 200);
      }
    }
    if (r.pendFlips > 0 && !r.dead){
      if (clean){
        const n = r.pendFlips;
        r.flips += n;
        r.bestJump = Math.max(r.bestJump, n);
        r.nitro = Math.min(1, r.nitro + (perk === 'nitroflip' ? 0.5 : 0.25) * n);   // récompense du risque : recharge de nitro
        if (P){
          const gain = pay(150 * n * n * mult * (perk === 'flipcash' ? 1.4 : 1));   // x2 = 600, x3 = 1350… puis × chaîne
          spawnText(r.x, r.y - 70, 'FIGURE x' + n + '  +' + gain + (r.chain > 1 ? '  CHAÎNE x' + r.chain : ''), '#ffd35a');
          Snd.blip(880, 0.18, 'square');
          addTrauma(0.2 + 0.1 * Math.min(n, 3));                      // s'ajoute à l'atterrissage (≈ 0,7 → 1 pour x1 → x3) : reste sous la chute
          hitStop(0.08 + 0.015 * n);
          kickSquash(clamp(0.2 + 0.04 * n, 0.2, 0.3));
        }
      } else {
        if (P) spawnText(r.x, r.y - 70, 'RATÉ !', '#ff5a6b');
        r.chain = 0; r.chainT = 0;
      }
      r.pendFlips = 0;
    }
    r.airTime = 0;
    r.rotAcc = 0;
  }
  r.air = airborne;

  // figures : comptées en l'air, payées seulement à la retombée réussie
  while (Math.abs(r.rotAcc) >= TAU){
    const back = r.rotAcc < 0;
    r.rotAcc -= Math.sign(r.rotAcc) * TAU;
    r.pendFlips++;
    if (P){
      spawnText(r.x, r.y - 60, back ? 'BACKFLIP !' : 'FRONTFLIP !', '#ffffff');
      Snd.blip(660, 0.12, 'triangle');
    }
  }

  if (r.chainT > 0){ r.chainT -= dt; if (r.chainT <= 0) r.chain = 0; }

  // ---------- vitesse / roues ----------
  const sp = Math.hypot(r.vx, r.vy);
  r.wheelAng += sp / WR * dt;

  // ---------- chute ----------
  if (!r.dead){
    const hx = r.x + (-4 * cs - (-52) * sn);
    const hy = r.y + (-4 * sn + (-52) * cs);
    if (hy > groundY(hx) + 10) crash(r, 'Chute !');
  }
  // ---------- eau : flotter (Amphibie), ricocher (moto à plat et lancée) ou couler ----------
  const wtr = world().water;
  r.inWater = false;
  if (!r.dead && wtr){
    const surf = -wtr.level;
    const overLake = groundY(r.x) > surf + 2;
    if (overLake && r.y + WR > surf){
      if (perk === 'amphib'){
        r.inWater = true;
        const sink = clamp((r.y + WR - surf) / 18, 0, 1.5);
        r.vy -= (GRAV + 1400 * sink) * dt;           // poussée d'Archimède : la moto remonte et flotte en surface
        r.vy *= Math.exp(-4 * dt);
        r.vx *= Math.exp(-0.35 * dt);
        r.av -= norm(r.a) * 8 * dt; r.av *= Math.exp(-4 * dt);
        if (Math.random() < 0.3)
          spawnPart(r.x - 20, surf - 2, -r.vx * 0.2 + (Math.random()-0.5)*60, -40 - Math.random()*80, 0.5, 2 + Math.random()*3, '#bfeaff', 300);
      } else if (r.skips < SKIP_MAX && r.vy > 0 && r.vx > SKIP_SPEED && Math.abs(norm(r.a)) < SKIP_ANGLE){
        r.skips++;
        r.y = surf - WR - 1;
        r.vy = -(Math.min(r.vy * 0.5, 520) + 140);
        r.vx *= 0.9;
        for (let i = 0; i < (P ? 16 : 6); i++)
          spawnPart(r.x + (Math.random()-0.5)*30, surf - 2, (Math.random()-0.5)*200, -80 - Math.random()*220, 0.6, 2 + Math.random()*4, i % 3 ? '#bfeaff' : '#ffffff', 420);
        if (P){
          const gain = pay(40 * r.skips);
          spawnText(r.x, r.y - 50, 'RICOCHET' + (r.skips > 1 ? ' x' + r.skips : '') + ' !  +' + gain, '#8fd8ff');
          Snd.blip(520 + 140 * r.skips, 0.12, 'sine');
          addTrauma(0.25);
        }
      } else crash(r, 'Noyade !');
    }
    if (r.onGround && !overLake) r.skips = 0;
  }
  if (r.x < -50 || r.y > 4000) crash(r, 'Perdu !');
}

function crash(r, msg){
  if (r.dead) return;
  if (r.isPlayer) checkObjectives();     // une mission atteinte par le saut fatal compte (checkObjectives ignore la moto morte)
  if (perkOf(r) === 'ghost' && !r.ghostUsed && r.safeX !== undefined){   // Spectre : la première chute est annulée
    r.ghostUsed = true; respawnRider(r);
    if (r.isPlayer){ toast('SECONDE VIE !'); Snd.blip(440, 0.3, 'sine'); addTrauma(0.4); }
    return;
  }
  r.dead = true; r.deadT = 0; r.chain = 0; r.chainT = 0;
  r.wheelieOn = false; r.wheelieT = 0;
  const wtr = world().water;
  const wet = !!wtr && groundY(r.x) > -wtr.level + 2;
  const champ = mode === 'champ';
  if (!r.isPlayer || champ) r.respawnT = 1.2;    // championnat : on repart du dernier point sûr, le temps perdu est la pénalité
  const n = r.isPlayer ? 30 : 12;
  for (let i = 0; i < n; i++)
    spawnPart(r.x, r.y, (Math.random()-0.5)*420, -Math.random()*380,
      0.8, 2 + Math.random()*6,
      wet ? (i % 3 ? '#bfeaff' : '#ffffff') : (i % 3 ? '#c8a678' : '#ff2d6b'), 360);
  if (!r.isPlayer) return;
  addTrauma(1);                                                   // palier fort : le plus gros impact du jeu
  Snd.blip(wet ? 260 : 120, 0.5, wet ? 'sine' : 'sawtooth');
  Snd.engine(0, 0, false);
  if (wet) spawnText(r.x, r.y - 46, 'SPLASH !', '#8fd8ff');
  if (champ) toast(msg);
  else setTimeout(() => endRun(msg), 900);
}

// blocage : repêchage automatique. Le pilote doit pousser (gaz tenu) : s'arrêter volontairement ne téléporte pas.
function stuckCheck(r, inp, dt, maxRescues){
  const stuck = !r.dead && r.onGround && inp.throttle > 0 && Math.hypot(r.vx, r.vy) < 40 && r.x > startX + 300;
  r.stuckT = stuck ? r.stuckT + dt : 0;
  if (r.isPlayer && r.stuckT > 1.5 && !r.stuckWarned){ r.stuckWarned = true; toast('Bloqué…'); }
  if (r.x > r.rescueX + 400) r.rescues = 0;           // on a progressé depuis le dernier repêchage
  if (r.stuckT > 2.6){
    if (r.rescues >= maxRescues) crash(r, 'Bloqué !');  // trop de repêchages au même endroit : la course s'arrête
    else if (r.safeX !== undefined){
      r.rescues++; r.rescueX = r.safeX;
      respawnRider(r);
      if (r.isPlayer) toast('Repêchage !');
    }
    r.stuckT = 0;
  }
  if (!stuck) r.stuckWarned = false;
}

// où et quand la moto va-t-elle retomber ? (balistique simple ; sert à l'IA des rivaux et au repère d'atterrissage)
function predictLanding(r){
  let x = r.x, y = r.y, vx = r.vx, vy = r.vy;
  const wtr = world().water, surf = wtr ? -wtr.level : Infinity;
  const h = 1 / 30;
  for (let t = h; t < 3; t += h){
    vy += GRAV * h; x += vx * h; y += vy * h;
    const gy = groundY(x);
    if (y + WR >= surf && gy > surf + 2) return { t, x, y: surf, slope: 0, water: true };
    if (y + WR + 8 >= gy) return { t, x, y: gy, slope: groundSlope(x), water: false };
  }
  return { t: 3, x, y, slope: 0, water: false };
}

/* ------------------------------ RENDER HELPERS ------------------------------ */
function noise1(x, s){
  return Math.sin(x * 0.0021 + s) * 0.55 +
         Math.sin(x * 0.0073 + s * 2.1) * 0.28 +
         Math.sin(x * 0.0151 + s * 3.7) * 0.12;
}

function drawSky(w){
  const g = ctx.createLinearGradient(0, 0, 0, H);
  for (const [p, c] of w.sky) g.addColorStop(p, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // étoiles
  ctx.save();
  const st = w.stars;
  for (let i = 0; i < st.count; i++){
    const sx = ((i * 137.5) % 1000) / 1000 * W;
    const sy = (i * 61.7 % 300) / 300 * H * 0.42;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(performance.now() * 0.001 + i));
    ctx.globalAlpha = tw * (1 - sy / (H * 0.5)) * st.alpha;
    ctx.fillStyle = st.color;
    ctx.fillRect(sx, sy, 1.6, 1.6);
  }
  ctx.restore();
}

function drawSun(w, bgY){
  const s = w.sun;
  const sx = W * s.x, sy = H * s.y + bgY;
  const r = Math.min(W, H) * s.r;
  const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.6);
  for (const [p, c] of s.glow) gl.addColorStop(p, c);
  ctx.fillStyle = gl;
  ctx.fillRect(sx - r * 2.6, sy - r * 2.6, r * 5.2, r * 5.2);
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU);
  ctx.fillStyle = s.core;
  ctx.fill();
  if (s.moon){
    // cratères de la lune
    ctx.fillStyle = 'rgba(140,170,214,.35)';
    const craters = [[-0.32, 0.18, 0.22], [0.25, -0.15, 0.16], [0.10, 0.34, 0.12], [-0.12, -0.38, 0.10]];
    for (const [cx, cy, cr] of craters){
      ctx.beginPath(); ctx.arc(sx + r * cx, sy + r * cy, r * cr, 0, TAU); ctx.fill();
    }
  }
}

function drawClouds(w){
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 7; i++){
    const px = ((i * 331 - camX * 0.05) % (W + 600) + W + 600) % (W + 600) - 300;
    const py = H * (0.10 + (i * 0.049 % 0.3));
    const s = 0.7 + (i % 3) * 0.35;
    ctx.fillStyle = w.clouds[i % 2];
    for (let k = 0; k < 4; k++){
      ctx.beginPath();
      ctx.ellipse(px + k * 34 * s, py + Math.sin(k + i) * 8 * s, (40 + k * 8) * s, (16 + k * 3) * s, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

const _shadeCache = new Map();
function shade(hex, amt){
  const key = hex + amt;
  let v = _shadeCache.get(key);
  if (v) return v;
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  v = `rgb(${r},${g},${b})`;
  _shadeCache.set(key, v);
  return v;
}
const hash1 = i => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };

function mountainLayer(factor, baseY, amp, color, seedv, rim, snow){
  const step = 24;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let sx = 0; sx <= W + step; sx += step){
    const wx = (camX * factor + sx);
    ctx.lineTo(sx, baseY + noise1(wx, seedv) * amp);
  }
  ctx.lineTo(W + step, H);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, baseY - amp, 0, baseY + amp * 3);
  g.addColorStop(0, color);
  g.addColorStop(1, shade(color.length === 7 ? color : '#201a3a', -0.55));
  ctx.fillStyle = g;
  ctx.fill();
  if (snow){
    ctx.save();
    ctx.clip();
    const sg = ctx.createLinearGradient(0, baseY - amp * 1.7, 0, baseY - amp * 0.05);
    sg.addColorStop(0, 'rgba(255,255,255,.95)');
    sg.addColorStop(0.75, 'rgba(255,255,255,.55)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, baseY + amp);
    ctx.restore();
  }
  if (rim){
    ctx.beginPath();
    for (let sx = 0; sx <= W + step; sx += step){
      const wx = (camX * factor + sx);
      const y = baseY + noise1(wx, seedv) * amp;
      if (sx === 0) ctx.moveTo(sx, y); else ctx.lineTo(sx, y);
    }
    ctx.lineWidth = 1.6; ctx.strokeStyle = rim; ctx.stroke();
  }
}

function drawPine(x, y, h, col){
  ctx.fillStyle = col;
  const w = h * 0.34;
  for (let k = 0; k < 3; k++){
    const ty = y - h * (0.36 + k * 0.27);
    const bw = w * (1 - k * 0.24);
    ctx.beginPath();
    ctx.moveTo(x, ty - h * 0.30);
    ctx.lineTo(x + bw, ty + h * 0.12);
    ctx.lineTo(x - bw, ty + h * 0.12);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillRect(x - 1.4, y - h * 0.14, 2.8, h * 0.16);
}

function drawCity(x, y, w, h, col, winCol, id){
  ctx.fillStyle = col;
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = winCol;
  const cols = Math.max(1, Math.floor(w / 6.5));
  const rows = Math.max(1, Math.floor(h / 8.5));
  for (let i = 0; i < cols; i++){
    for (let j = 0; j < rows; j++){
      if (hash1(id * 13 + i * 31 + j * 57) < 0.55) continue;
      ctx.fillRect(x - w / 2 + 2.2 + i * 6.5, y - h + 3 + j * 8.5, 2.4, 3.4);
    }
  }
  if (hash1(id + 5) > 0.62){
    ctx.fillStyle = col;
    ctx.fillRect(x - 0.8, y - h - 9, 1.6, 9);
    ctx.fillStyle = '#ff2df0';
    ctx.beginPath(); ctx.arc(x, y - h - 9, 1.7, 0, TAU); ctx.fill();
  }
}

function drawHills(w){
  const base = H * 0.58, amp = H * 0.075;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let sx = 0; sx <= W + 30; sx += 30){
    const wx = camX * 0.55 + sx;
    ctx.lineTo(sx, base + noise1(wx, 11) * amp);
  }
  ctx.lineTo(W + 30, H); ctx.closePath();
  const g = ctx.createLinearGradient(0, base - amp, 0, base + amp * 3);
  g.addColorStop(0, w.hills.top); g.addColorStop(1, w.hills.bottom);
  ctx.fillStyle = g; ctx.fill();
  // décor : forêt de pins (monde 1) ou skyline de buildings (monde 2)
  for (let row = 0; row < 2; row++){
    const f = row ? 0.55 : 0.50, spacing = row ? w.hills.spacingFar : w.hills.spacingNear;
    const col = row ? w.hills.far : w.hills.near;
    const off = -((camX * f) % spacing);
    for (let sx = off - spacing; sx <= W + spacing; sx += spacing){
      const wx = camX * f + sx;
      const id = Math.round(wx / spacing);
      if (hash1(id + row * 91) < 0.18) continue;
      const y = base + noise1(wx, 11) * amp + 6;
      const jx = sx + (hash1(id) - 0.5) * 12;
      if (w.hills.trees === 'city'){
        const bh = 34 + hash1(id + 7) * (row ? 46 : 78);
        const bw = 16 + hash1(id + 17) * (row ? 14 : 22);
        drawCity(jx, y, bw, bh, col, row ? 'rgba(120,220,255,.45)' : 'rgba(49,230,255,.75)', id + row * 91);
      } else {
        drawPine(jx, y, 30 + hash1(id + 7) * 40, col);
      }
    }
  }
}

function drawTerrain(w){
  const G = w.ground;
  const z = camZoom;
  const left = camX - (W * 0.5) / z - 60;
  const right = camX + (W * 0.6) / z + 60;

  ensureTerrain(right + 2000);

  const i0 = Math.max(0, Math.floor(left / STEP));
  const i1 = Math.min(Terrain.n - 1, Math.ceil(right / STEP));
  const bottom = camY + (H * 2.2) / z;

  const surf = new Path2D();
  const xs = left < 0 ? left : i0 * STEP;          // à gauche du départ le sol reste plat, comme dans la physique
  surf.moveTo(xs, -Terrain.E[i0]);
  if (xs < i0 * STEP) surf.lineTo(i0 * STEP, -Terrain.E[i0]);
  for (let i = i0 + 1; i <= i1; i++) surf.lineTo(i * STEP, -Terrain.E[i]);
  const body = new Path2D(surf);
  body.lineTo(i1 * STEP, bottom);
  body.lineTo(xs, bottom);
  body.closePath();

  // terre : dégradé + strates
  const gg = ctx.createLinearGradient(0, camY - 200, 0, camY + 700);
  for (const [p, c] of G.stops) gg.addColorStop(p, c);
  ctx.fillStyle = gg;
  ctx.fill(body);

  ctx.save();
  ctx.clip(body);
  ctx.lineJoin = 'round';
  const strata = G.strata;
  for (const [dy, w2, c] of strata){
    ctx.save(); ctx.translate(0, dy); ctx.lineWidth = w2; ctx.strokeStyle = c; ctx.stroke(surf); ctx.restore();
  }
  // cailloux et racines enfouis
  for (let i = i0 - (i0 % 4); i <= i1; i += 4){
    const h = hash1(i);
    if (h < 0.55) continue;
    const x = i * STEP + h * 12;
    const y = -Terrain.E[i] + 22 + hash1(i + 3) * 110;
    const rx = 3 + hash1(i + 5) * 7;
    ctx.fillStyle = G.pebble;
    ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.65, h * 3, 0, TAU); ctx.fill();
    ctx.fillStyle = G.pebbleHi;
    ctx.beginPath(); ctx.ellipse(x - 1, y - 1.2, rx * 0.6, rx * 0.35, h * 3, 0, TAU); ctx.fill();
  }
  ctx.restore();

  // piste : bord, revêtement, lumière
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.lineWidth = 22; ctx.strokeStyle = G.edge; ctx.stroke(surf);
  ctx.lineWidth = 15; ctx.strokeStyle = G.track1; ctx.stroke(surf);
  ctx.save(); ctx.translate(0, -1.5);
  ctx.lineWidth = 8; ctx.strokeStyle = G.track2; ctx.stroke(surf);
  ctx.restore();
  ctx.save(); ctx.translate(0, -3.6);
  ctx.lineWidth = 2.2; ctx.strokeStyle = G.hilite; ctx.stroke(surf);
  ctx.restore();
  if (G.hilite2){
    ctx.save(); ctx.translate(0, -5.4);
    ctx.lineWidth = 1.6; ctx.strokeStyle = G.hilite2; ctx.stroke(surf);
    ctx.restore();
  }

  // touffes d'herbe + petits cailloux sur la piste
  ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = i0; i <= i1; i += 2){
    const h = hash1(i * 1.7);
    if (h < 0.35) continue;
    const x = i * STEP + h * 6, y = -Terrain.E[i];
    const len = 4 + hash1(i + 11) * 7;
    const lean = (hash1(i + 13) - 0.5) * 7;
    ctx.moveTo(x, y - 2); ctx.lineTo(x + lean, y - 2 - len);
    ctx.moveTo(x + 2, y - 2); ctx.lineTo(x + 2 + lean * 0.6, y - 1 - len * 0.7);
  }
  ctx.strokeStyle = G.grass; ctx.stroke();
  ctx.fillStyle = G.rock;
  for (let i = i0; i <= i1; i += 3){
    const h = hash1(i * 3.3);
    if (h < 0.8) continue;
    ctx.beginPath(); ctx.ellipse(i * STEP, -Terrain.E[i] - 3, 3 + h * 3, 2, 0, 0, TAU); ctx.fill();
  }

  // eau : remplit les creux dont le sol passe sous le niveau du lac
  waterPathCache = null;
  if (w.water){
    const wy = -w.water.level;
    const wp = new Path2D();
    let run = -1;
    for (let i = i0; i <= i1; i++){
      const under = -Terrain.E[i] > wy;
      if (under && run < 0) run = i;
      if ((!under || i === i1) && run >= 0){
        const end = under ? i : i - 1;
        const x1 = end * STEP + STEP;
        wp.moveTo(run * STEP, wy);
        wp.lineTo(x1, wy);
        wp.lineTo(x1, bottom);
        wp.lineTo(run * STEP, bottom);
        wp.closePath();
        run = -1;
      }
    }
    const wg = ctx.createLinearGradient(0, wy, 0, wy + Math.max(420, (H * 1.4) / z));
    wg.addColorStop(0, w.water.hi);
    wg.addColorStop(0.45, w.water.mid);
    wg.addColorStop(1, w.water.deep);
    ctx.fillStyle = wg;
    ctx.fill(wp);
    waterPathCache = wp;
    // vagues animées en surface
    const wt = performance.now() / 1000;
    ctx.beginPath();
    let rs = -1;
    for (let i = i0; i <= i1; i++){
      const under = -Terrain.E[i] > wy;
      if (under && rs < 0) rs = i;
      if ((!under || i === i1) && rs >= 0){
        const end = under ? i : i - 1;
        for (let k = rs; k <= end; k++){
          const xx = k * STEP;
          const yy = wy + Math.sin(xx * 0.045 + wt * 2.4) * 1.8;
          if (k === rs) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        rs = -1;
      }
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = w.water.foam;
    ctx.stroke();
  }
}

/* ------------------------------ BIKE DRAWING ------------------------------ */
function limb(g, pts, w, col, outline){
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  if (outline){ g.lineWidth = w + 2.4; g.strokeStyle = outline; g.stroke(); }
  g.lineWidth = w; g.strokeStyle = col; g.stroke();
}

function wheel(g, x, y, r, ang, C){
  g.save(); g.translate(x, y);
  const R = r * 1.14;
  // pneu
  g.beginPath(); g.arc(0, 0, R, 0, TAU);
  g.fillStyle = C.tire; g.fill();
  // crampons (tournent avec la roue)
  g.save(); g.rotate(ang);
  g.fillStyle = '#050609';
  for (let i = 0; i < 16; i++){
    g.save(); g.rotate(i / 16 * TAU);
    g.fillRect(R - 3.4, -1.5, 4.2, 3);
    g.restore();
  }
  g.restore();
  // reflet du flanc (lumière fixe)
  g.beginPath(); g.arc(0, 0, R * 0.84, -2.7, -1.3);
  g.lineWidth = 1.8; g.strokeStyle = 'rgba(255,255,255,.2)'; g.stroke();
  g.save(); g.rotate(ang);
  // jante
  const rg = g.createRadialGradient(-r * 0.2, -r * 0.2, 1, 0, 0, r * 0.7);
  rg.addColorStop(0, shade(C.rim, 0.35)); rg.addColorStop(1, shade(C.rim, -0.4));
  g.beginPath(); g.arc(0, 0, r * 0.68, 0, TAU);
  g.fillStyle = rg; g.fill();
  g.lineWidth = 1.6; g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke();
  // rayons
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(20,24,34,.7)'; g.lineWidth = 1.3;
  for (let i = 0; i < 8; i++){
    const a = i / 8 * TAU;
    g.beginPath(); g.moveTo(Math.cos(a) * r * 0.16, Math.sin(a) * r * 0.16);
    g.lineTo(Math.cos(a) * r * 0.64, Math.sin(a) * r * 0.64); g.stroke();
  }
  // disque de frein
  g.beginPath(); g.arc(0, 0, r * 0.42, 0, TAU);
  g.strokeStyle = 'rgba(15,18,26,.6)'; g.lineWidth = 1.1; g.stroke();
  // moyeu
  g.beginPath(); g.arc(0, 0, r * 0.2, 0, TAU);
  g.fillStyle = '#20242f'; g.fill();
  g.beginPath(); g.arc(0, 0, r * 0.08, 0, TAU);
  g.fillStyle = '#9aa3b4'; g.fill();
  g.restore();
  g.restore();
}

function renderBike(g, C, ch, wheelAng, lean, t, dead){
  const hb = WB / 2;
  const OL = 'rgba(8,10,18,.75)';              // contour sombre
  g.lineCap = 'round'; g.lineJoin = 'round';

  // --- roue arrière ---
  wheel(g, -hb, 0, WR, wheelAng, C);

  // --- bras oscillant + amortisseur ---
  limb(g, [-hb, 0, -6, -12], 5, C.frame, OL);
  limb(g, [-15, -25, -10, -8], 4, C.accent, OL);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1;
  for (let i = 1; i < 5; i++){
    const f = i / 5, px = lerp(-15, -10, f), py = lerp(-25, -8, f);
    g.beginPath(); g.moveTo(px - 2.6, py); g.lineTo(px + 2.6, py - 1); g.stroke();
  }

  // --- échappement + silencieux ---
  limb(g, [-4, -13, -18, -12, -30, -17], 4.6, shade(C.exhaust, -0.15), OL);
  g.save(); g.translate(-35, -19); g.rotate(-0.28);
  const eg = g.createLinearGradient(0, -4, 0, 4);
  eg.addColorStop(0, shade(C.exhaust, 0.45)); eg.addColorStop(0.55, C.exhaust); eg.addColorStop(1, shade(C.exhaust, -0.5));
  g.fillStyle = eg; g.strokeStyle = OL; g.lineWidth = 1.2;
  g.beginPath(); if (g.roundRect) g.roundRect(-11, -3.6, 22, 7.2, 3.4); else g.rect(-11, -3.6, 22, 7.2);
  g.fill(); g.stroke();
  g.fillStyle = '#0b0c10'; g.beginPath(); g.ellipse(-11, 0, 1.6, 3, 0, 0, TAU); g.fill();
  g.restore();

  // --- garde-boue arrière + plaque ---
  g.fillStyle = shade(C.body, -0.2); g.strokeStyle = OL; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(-18, -26); g.quadraticCurveTo(-34, -29, -40, -22);
  g.lineTo(-37, -20); g.quadraticCurveTo(-30, -24, -17, -22); g.closePath(); g.fill(); g.stroke();

  // --- moteur ---
  const mg = g.createLinearGradient(0, -20, 0, -4);
  mg.addColorStop(0, shade(C.frame, 0.3)); mg.addColorStop(1, shade(C.frame, -0.35));
  g.fillStyle = mg; g.strokeStyle = OL; g.lineWidth = 1.2;
  g.beginPath(); if (g.roundRect) g.roundRect(-13, -19, 22, 15, 4); else g.rect(-13, -19, 22, 15);
  g.fill(); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1;
  for (let i = 0; i < 4; i++){ g.beginPath(); g.moveTo(-9 + i * 5, -17); g.lineTo(-9 + i * 5, -7); g.stroke(); }
  g.fillStyle = shade(C.exhaust, 0.1);
  g.beginPath(); g.ellipse(-1, -10, 4, 4, 0, 0, TAU); g.fill();
  g.strokeStyle = OL; g.lineWidth = 1; g.stroke();
  // chaîne
  g.strokeStyle = 'rgba(190,196,210,.6)'; g.lineWidth = 1.1; g.setLineDash([2, 1.6]);
  g.beginPath(); g.moveTo(-hb, -3.2); g.lineTo(-5, -5); g.stroke(); g.setLineDash([]);

  // --- cadre ---
  const bg = g.createLinearGradient(0, -34, 0, -16);
  bg.addColorStop(0, shade(C.body, 0.35)); bg.addColorStop(0.5, C.body); bg.addColorStop(1, shade(C.body, -0.35));
  g.fillStyle = bg; g.strokeStyle = OL; g.lineWidth = 1.3;
  g.beginPath();
  g.moveTo(-17, -18); g.lineTo(9, -19); g.lineTo(15, -31);
  g.lineTo(-4, -33); g.lineTo(-19, -25); g.closePath(); g.fill(); g.stroke();

  // --- réservoir ---
  const tg = g.createLinearGradient(0, -37, 0, -22);
  tg.addColorStop(0, shade(C.body, 0.5)); tg.addColorStop(0.45, C.body); tg.addColorStop(1, shade(C.body, -0.45));
  g.fillStyle = tg; g.strokeStyle = OL; g.lineWidth = 1.3;
  g.beginPath(); g.ellipse(6, -29, 14, 8.5, -0.14, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = C.accent;
  g.beginPath(); g.ellipse(9, -31.5, 8, 3.2, -0.16, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(-2, -34.5); g.quadraticCurveTo(7, -37.5, 15, -33); g.stroke();

  // --- selle ---
  g.fillStyle = C.seat; g.strokeStyle = OL; g.lineWidth = 1.1;
  g.beginPath(); if (g.roundRect) g.roundRect(-28, -27.5, 24, 8.5, 4); else g.rect(-28, -27.5, 24, 8.5);
  g.fill(); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.moveTo(-25, -25.5); g.lineTo(-8, -25.5); g.stroke();

  // --- fourche télescopique ---
  limb(g, [21, -35, hb, 1], 5.4, shade(C.fork, -0.2), OL);           // fourreaux
  limb(g, [21, -35, 22 - (21 - hb) * 0.45, -35 + 36 * 0.45], 3.6, shade(C.fork, 0.35));  // tubes
  limb(g, [15, -22, 21, -34], 4, C.frame, OL);
  // plaque numéro avant
  g.save(); g.translate(19.5, -41); g.rotate(-0.2);
  g.fillStyle = '#f4f6fa'; g.strokeStyle = OL; g.lineWidth = 1.2;
  g.beginPath(); if (g.roundRect) g.roundRect(-5.5, -6, 11, 11, 3); else g.rect(-5.5, -6, 11, 11);
  g.fill(); g.stroke();
  g.fillStyle = C.accent; g.fillRect(-2.2, -3, 4.4, 5.6);
  g.restore();
  // garde-boue avant
  g.strokeStyle = OL; g.lineWidth = 6.2;
  g.beginPath(); g.arc(hb, 0, WR + 4.6, -Math.PI * 0.93, -Math.PI * 0.16); g.stroke();
  g.strokeStyle = C.body; g.lineWidth = 4;
  g.beginPath(); g.arc(hb, 0, WR + 4.6, -Math.PI * 0.93, -Math.PI * 0.16); g.stroke();

  // --- roue avant ---
  wheel(g, hb, 0, WR, wheelAng, C);

  // --- guidon + leviers ---
  limb(g, [19, -35, 23, -40], 3.4, '#262b38', OL);
  limb(g, [20, -41, 31, -38], 3.2, '#262b38', OL);
  limb(g, [29, -38.4, 35, -35.5], 2, '#9aa3b4');
  g.fillStyle = '#0d0f15'; g.beginPath(); g.ellipse(31.5, -38.2, 3.6, 2.6, 0.2, 0, TAU); g.fill();

  // --- PILOTE ---
  const lean1 = clamp(lean, -1, 1);
  const lo = -lean1 * 6;                                   // vers l'arrière si on cabre
  const sh = [1 + lo * 0.7, -47 - lean1 * 1.5];            // épaule
  const hip = [-14, -25];
  const knee = [2 + lo * 0.1, -19.5];
  const foot = [-6, -6.5];
  const hand = [30, -39.5];
  const pants = shade(ch.suit, -0.42), boot = '#15171e';
  // jambe
  limb(g, [hip[0], hip[1], knee[0], knee[1]], 9, pants, OL);
  limb(g, [knee[0], knee[1], foot[0], foot[1]], 7.5, pants, OL);
  limb(g, [foot[0] - 1, foot[1] + 1.5, foot[0] + 4.5, foot[1] + 2.5], 6.6, boot, OL);
  g.fillStyle = shade(ch.suit, 0.2); g.beginPath(); g.ellipse(knee[0] + 1, knee[1] - 1, 3.8, 3.2, 0, 0, TAU); g.fill();
  // torse
  limb(g, [hip[0], hip[1], sh[0], sh[1]], 12.5, ch.suit, OL);
  limb(g, [hip[0] + 1, hip[1] - 3, sh[0] + 1, sh[1] + 3], 3, ch.trim);
  g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(sh[0] - 4, sh[1] + 2); g.lineTo(hip[0] - 4, hip[1] - 2); g.stroke();
  // bras
  const elbow = [sh[0] + 13, sh[1] + 5 + lean1 * 1.5];
  limb(g, [sh[0], sh[1], elbow[0], elbow[1], hand[0] - 1, hand[1] + 1], 6.6, shade(ch.suit, 0.08), OL);
  g.fillStyle = '#12141b'; g.beginPath(); g.ellipse(hand[0], hand[1], 4, 3.2, 0.2, 0, TAU); g.fill();
  // tête / casque
  const hx = sh[0] + 5, hy = sh[1] - 9.5;
  g.fillStyle = ch.skin; g.beginPath(); g.arc(hx + 1.5, hy + 2, 8, 0, TAU); g.fill();
  const hgrad = g.createLinearGradient(hx - 9, hy - 10, hx + 9, hy + 8);
  hgrad.addColorStop(0, shade(ch.helmet, 0.45)); hgrad.addColorStop(0.5, ch.helmet); hgrad.addColorStop(1, shade(ch.helmet, -0.35));
  g.beginPath(); g.arc(hx, hy, 10.8, Math.PI * 0.92, Math.PI * 2.12);
  g.lineTo(hx + 10.5, hy + 5.5); g.lineTo(hx - 6, hy + 8.5); g.closePath();
  g.fillStyle = hgrad; g.fill(); g.lineWidth = 1.3; g.strokeStyle = OL; g.stroke();
  // visière / lunettes
  g.fillStyle = ch.visor;
  g.beginPath(); if (g.roundRect) g.roundRect(hx + 1.2, hy - 3.6, 10.2, 7, 2.6); else g.rect(hx + 1.2, hy - 3.6, 10.2, 7);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(hx + 3.5, hy - 1.6); g.lineTo(hx + 8.5, hy - 1.9); g.stroke();
  // visière pare-soleil
  g.fillStyle = ch.trim;
  g.beginPath(); g.moveTo(hx + 1, hy - 9); g.quadraticCurveTo(hx + 10, hy - 11, hx + 15, hy - 5.8);
  g.lineTo(hx + 10, hy - 5); g.quadraticCurveTo(hx + 6, hy - 8, hx + 1, hy - 7); g.closePath(); g.fill();
  g.strokeStyle = OL; g.lineWidth = 1; g.stroke();
  // bande casque
  g.beginPath(); g.arc(hx, hy, 10.8, Math.PI * 1.05, Math.PI * 1.55);
  g.lineWidth = 2.6; g.strokeStyle = ch.trim; g.stroke();
}

/* ------------------------------ GAME RENDER ------------------------------ */
function renderGame(dt, sdt){     // dt = temps réel, sdt = temps de simulation (0 pendant le hit-stop)
  const spec = bike.spec;
  const ch = bike.ch;

  // caméra
  const sp = Math.hypot(bike.vx, bike.vy);
  const lookAhead = clamp(bike.vx * 0.28, -120, 320);
  const tx = bike.x + lookAhead;
  const ty = bike.y + 30;
  camX = lerp(camX, tx, 1 - Math.exp(-6 * dt));
  camY = lerp(camY, ty, 1 - Math.exp(-5 * dt));
  const sizeZ = clamp(Math.min(W, H) / 860, 0.55, 1.15);
  const targetZoom = sizeZ * (1 - clamp(sp / 2400, 0, 0.32));
  camZoom = lerp(camZoom, targetZoom, 1 - Math.exp(-3 * dt));

  // secousse à trauma : amplitude = trauma² × option, bruit lisse (sinus incommensurables) — pas de hasard par frame
  fx.t += dt;
  fx.trauma = Math.max(0, fx.trauma - SHAKE_DECAY * dt);     // temps réel : la secousse continue pendant le hit-stop
  const amp = fx.trauma * fx.trauma * SHAKE_MAX * SHAKE_LEVELS[clamp(Save.shakeLvl | 0, 0, SHAKE_LEVELS.length - 1)].k;
  const shx = amp * (0.6 * Math.sin(fx.t * 41) + 0.4 * Math.sin(fx.t * 77 + 1.3));
  const shy = amp * (0.6 * Math.sin(fx.t * 47 + 2.1) + 0.4 * Math.sin(fx.t * 83 + 4.2));

  const bgY = (camY - 0) * 0.10;
  const w = world();

  drawSky(w);
  drawSun(w, bgY);
  drawClouds(w);
  ctx.save(); ctx.translate(shx * 0.3, bgY * 0.6 + shy * 0.3);
  mountainLayer(w.mtn[0].factor, H * w.mtn[0].base, H * w.mtn[0].amp, w.mtn[0].color, 1.7, w.mtn[0].rim, w.mtn[0].snow);
  mountainLayer(w.mtn[1].factor, H * w.mtn[1].base, H * w.mtn[1].amp, w.mtn[1].color, 4.3, w.mtn[1].rim, w.mtn[1].snow);
  ctx.restore();
  ctx.save(); ctx.translate(shx * 0.5, bgY + shy * 0.5);
  drawHills(w);
  ctx.restore();

  ctx.save();
  ctx.translate(W * 0.42 + shx, H * 0.64 + shy);
  ctx.scale(camZoom, camZoom);
  ctx.translate(-camX, -camY);

  // --- terrain ---
  drawTerrain(w);
  drawFinish();
  drawCans();
  drawGhost();
  for (const r of rivals) drawRival(r);
  drawLandingMark();

  // --- ombre ---
  const gy = groundY(bike.x);
  const hAbove = gy - bike.y;
  const sa = clamp(1 - hAbove / 260, 0.05, 0.42);
  const shadeOverWater = w.water && gy > -w.water.level + 2;
  if (!shadeOverWater){
    ctx.save();
    ctx.globalAlpha = sa;
    ctx.fillStyle = '#000';
    const sc = clamp(1 - hAbove / 400, 0.5, 1);
    ctx.beginPath();
    ctx.ellipse(bike.x, gy + 3, 34 * sc, 7 * sc, Math.atan(groundSlope(bike.x)), 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // --- traînée de vitesse ---
  if (sp > 700 && bike.onGround){
    ctx.save();
    ctx.globalAlpha = clamp((sp - 700) / 900, 0, 0.4);
    ctx.strokeStyle = spec.col.accent;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++){
      const yy = bike.y - 10 - i * 9;
      ctx.beginPath();
      ctx.moveTo(bike.x - 60 - i * 30, yy);
      ctx.lineTo(bike.x - 20 - i * 12, yy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- moto ---
  const sq = 1 - bike.squash * 0.10;
  bike.squash *= Math.exp(-9 * sdt);
  stepSquash(sdt);                       // gelé pendant le hit-stop : la frame d'impact reste écrasée
  ctx.save();
  ctx.translate(bike.x, bike.y);
  ctx.rotate(bike.a);
  // squash & stretch d'événement, ancré au contact des roues (y = WR) pour que la moto ne décolle pas du sol
  ctx.translate(0, WR); ctx.scale(1 + fx.sqz * 0.5, 1 - fx.sqz); ctx.translate(0, -WR);
  ctx.scale(1, sq);
  renderBike(ctx, spec.col, ch, bike.wheelAng, bike.leanSm, performance.now() / 1000, bike.dead);
  ctx.restore();

  // --- nitro trail ---
  if (bike.boosting > 0.05){
    ctx.save();
    ctx.globalAlpha = bike.boosting * 0.7;
    const gg = ctx.createLinearGradient(bike.x, bike.y, bike.x - 120, bike.y);
    gg.addColorStop(0, spec.col.accent); gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.moveTo(bike.x - 24, bike.y - 6); ctx.lineTo(bike.x - 130, bike.y - 16);
    ctx.lineTo(bike.x - 130, bike.y + 16); ctx.lineTo(bike.x - 24, bike.y + 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // --- particules ---
  for (const p of parts){
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1) * 0.9;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- voile d'eau (passe devant la moto quand elle est immergée) ---
  if (waterPathCache && w.water){
    ctx.fillStyle = 'rgba(45,120,180,.16)';
    ctx.fill(waterPathCache);
  }

  // --- textes flottants ---
  ctx.textAlign = 'center';
  if (bike.wheelieOn && bike.wheelieT > 0.3){        // chrono de wheelie au-dessus du pilote
    ctx.font = '900 18px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    const t = 'WHEELIE ' + bike.wheelieT.toFixed(1) + ' s';
    ctx.strokeText(t, bike.x, bike.y - 84);
    ctx.fillStyle = bike.wheelieT >= 1 ? '#ffd35a' : '#ffffff';
    ctx.fillText(t, bike.x, bike.y - 84);
  }
  for (const f of floats){
    ctx.globalAlpha = clamp(f.life / f.max, 0, 1);
    ctx.font = '900 20px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // --- vignette ---
  const vg = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.35, W/2, H/2, Math.max(W,H)*0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  // flash nitro
  if (bike.boosting > 0.05){
    ctx.fillStyle = `rgba(120,240,255,${bike.boosting * 0.07})`;
    ctx.fillRect(0, 0, W, H);
  }

  drawSpeedo(sp, spec);
  drawRivalEdges();
}

// repère d'atterrissage : un trait à l'endroit où la moto va retomber, vert si l'angle actuel donnerait un atterrissage PARFAIT
function drawLandingMark(){
  if (bike.dead || !bike.air || bike.airTime < 0.15) return;
  const L = predictLanding(bike);
  if (L.t > 1.4) return;
  const ang = Math.atan2(L.slope, 1);
  const err = Math.abs(norm(bike.a - ang));
  const perfWin = perkOf(bike) === 'scout' ? 0.30 : PERFECT_ANG;
  const col = err < perfWin ? '#5affc0' : err < (perkOf(bike) === 'shock' ? 1.2 : 0.9) ? '#ffd35a' : '#ff5a6b';
  ctx.save();
  ctx.translate(L.x, L.y - 4); ctx.rotate(ang);
  ctx.globalAlpha = clamp(1.4 - L.t, 0.25, 0.9);
  ctx.lineCap = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = col;
  ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(28, 0); ctx.stroke();
  ctx.restore();
}

// rival : même dessin que le joueur, nom au-dessus ; clignote pendant sa chute
function drawRival(r){
  if (r.x < camX - (W * 0.5) / camZoom - 100 || r.x > camX + (W * 0.6) / camZoom + 100) return;
  ctx.save();
  if (r.dead) ctx.globalAlpha = 0.35 + 0.3 * Math.sin(performance.now() / 60);
  ctx.translate(r.x, r.y); ctx.rotate(r.a);
  ctx.scale(1, 1 - r.squash * 0.10);
  renderBike(ctx, r.spec.col, r.ch, r.wheelAng, r.leanSm, 0, r.dead);
  ctx.restore();
  ctx.save();
  ctx.font = '800 ' + Math.round(14 / camZoom) + 'px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';   // taille constante à l'écran malgré le zoom
  ctx.lineWidth = 3.5 / camZoom; ctx.strokeStyle = 'rgba(0,0,0,.65)';
  ctx.strokeText(r.name, r.x, r.y - 78);
  ctx.fillStyle = r.bot.color; ctx.fillText(r.name, r.x, r.y - 78);
  ctx.restore();
}
// rivaux hors champ : étiquette au bord de l'écran avec l'écart en mètres
function drawRivalEdges(){
  if (!rivals.length) return;
  let nl = 0, nr = 0;
  ctx.save();
  ctx.font = '800 12px "Trebuchet MS", sans-serif'; ctx.textBaseline = 'middle';
  for (const r of rivals){
    const sx = W * 0.42 + (r.x - camX) * camZoom;
    if (sx > 0 && sx < W) continue;
    const gap = Math.round((r.x - bike.x) / 10);
    const right = sx >= W;
    const y = H * 0.30 + (right ? nr++ : nl++) * 22;
    const txt = right ? r.name + '  +' + gap + ' m ▶' : '◀ ' + r.name + '  ' + gap + ' m';
    const tw = ctx.measureText(txt).width + 16;
    const x = right ? W - tw - 8 : 8;
    ctx.fillStyle = 'rgba(8,12,24,.7)'; ctx.fillRect(x, y - 9, tw, 18);
    ctx.fillStyle = r.bot.color; ctx.textAlign = 'left'; ctx.fillText(txt, x + 8, y);
  }
  ctx.restore();
}
// fantôme du record du jour : position enregistrée 15 fois par seconde, interpolée
function drawGhost(){
  const g = mode === 'daily' ? Save.daily.ghost : null;
  if (!g || g.length < 6) return;
  const f = runT * GHOST_HZ, i = Math.floor(f), k = f - i;
  if ((i + 1) * 3 + 2 >= g.length) return;
  const x = lerp(g[i * 3], g[i * 3 + 3], k), y = lerp(g[i * 3 + 1], g[i * 3 + 4], k), a = lerp(g[i * 3 + 2], g[i * 3 + 5], k) / 100;
  ctx.save();
  ctx.globalAlpha = 0.33;
  ctx.translate(x, y); ctx.rotate(a);
  renderBike(ctx, GHOST_COL, CHARS[0], runT * 30, 0, 0, false);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.7; ctx.font = '800 ' + Math.round(13 / camZoom) + 'px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = '#dff6ff'; ctx.fillText('RECORD DU JOUR', x, y - 76);
  ctx.restore();
}
// bidons d'essence (championnat)
function drawCans(){
  if (!cans.length) return;
  const l = camX - (W * 0.5) / camZoom - 60, rgt = camX + (W * 0.6) / camZoom + 60;
  const t = performance.now() / 1000;
  for (const c of cans){
    if (c.taken || c.x < l || c.x > rgt) continue;
    const y = c.y + Math.sin(t * 3 + c.x) * 3;
    ctx.save();
    ctx.translate(c.x, y); ctx.rotate(Math.sin(t * 2 + c.x) * 0.08);
    ctx.fillStyle = 'rgba(255,90,60,.25)'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8402a'; ctx.strokeStyle = '#3a0c06'; ctx.lineWidth = 2;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-10, -12, 20, 24, 3); else ctx.rect(-10, -12, 20, 24);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a0c06'; ctx.fillRect(-6, -17, 7, 5); ctx.fillRect(3, -16, 5, 4);
    ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, 6); ctx.moveTo(6, -6); ctx.lineTo(-6, 6); ctx.stroke();
    ctx.restore();
  }
}

// ligne d'arrivée du monde courant : deux poteaux et un bandeau à damier, visibles quand on s'en approche
function drawFinish(){
  const goalM = runGoal();
  const x = startX + goalM * 10;
  if (x < camX - (W * 0.55) / camZoom - 100 || x > camX + (W * 0.65) / camZoom + 100) return;   // hors champ
  const half = 70, h = 170, yl = groundY(x - half), yr = groundY(x + half), top = Math.min(yl, yr) - h;
  ctx.save();
  ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.strokeStyle = '#d8e4f2';
  ctx.beginPath(); ctx.moveTo(x - half, yl + 6); ctx.lineTo(x - half, top); ctx.moveTo(x + half, yr + 6); ctx.lineTo(x + half, top); ctx.stroke();
  const cells = 14, cw = (half * 2) / cells;
  for (let i = 0; i < cells; i++) for (let j = 0; j < 2; j++){
    ctx.fillStyle = (i + j) % 2 ? '#10131c' : '#f4f8ff';
    ctx.fillRect(x - half + i * cw, top + j * cw, cw, cw);
  }
  ctx.fillStyle = '#ffd35a'; ctx.font = '900 16px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ARRIVÉE  ' + goalM + ' m', x, top - 10);
  ctx.restore();
}

function updateEffects(dt){
  for (let i = parts.length - 1; i >= 0; i--){
    const p = parts[i];
    p.life -= dt;
    p.vy += p.grav * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= Math.exp(-1.5 * dt);
    if (p.life <= 0) parts.splice(i, 1);
  }
  for (let i = floats.length - 1; i >= 0; i--){
    const f = floats[i];
    f.life -= dt; f.y -= 34 * dt;
    if (f.life <= 0) floats.splice(i, 1);
  }
}

function drawSpeedo(sp, spec){
  // en tactile, les boutons occupent le bas à droite : la jauge passe en haut à droite, sous le bouton pause
  const cx = isTouch ? W - 70 : W - 78, cy = isTouch ? 120 : H - 82, r = 54;
  const top = spec.top * (world().perf || 1);
  const frac = clamp(sp / (top * NITRO_CAP), 0, 1);   // l'aiguille finit en bout de cadran au plafond nitro
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = 'rgba(8,12,24,.62)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(120,200,255,.25)'; ctx.stroke();
  // arc
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  ctx.beginPath(); ctx.arc(0, 0, r - 9, a0, a1);
  ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.stroke();
  const grd = ctx.createLinearGradient(-r, 0, r, 0);
  grd.addColorStop(0, '#31e6ff'); grd.addColorStop(0.6, '#ffd35a'); grd.addColorStop(1, '#ff2d6b');
  ctx.beginPath(); ctx.arc(0, 0, r - 9, a0, a0 + (a1 - a0) * frac);
  ctx.lineWidth = 7; ctx.strokeStyle = grd; ctx.lineCap = 'round'; ctx.stroke();
  // texte
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#eafaff'; ctx.font = '900 26px "Trebuchet MS", sans-serif';
  ctx.fillText(Math.round(sp / 3), 0, -2);
  ctx.fillStyle = '#7fa7c9'; ctx.font = '700 10px "Trebuchet MS", sans-serif';
  ctx.fillText('KM/H', 0, 16);
  // nitro
  ctx.beginPath();
  ctx.rect(-34, 26, 68, 7);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill();
  ctx.beginPath();
  ctx.rect(-34, 26, 68 * bike.nitro, 7);
  ctx.fillStyle = bike.nitro > 0.25 ? '#0affc0' : '#ff8a4c'; ctx.fill();
  // essence (championnat) : barre sous le cadran, rouge clignotant sur la réserve
  if (mode === 'champ'){
    ctx.fillStyle = 'rgba(8,12,24,.62)'; ctx.fillRect(-r, r + 6, r * 2, 14);
    ctx.fillStyle = bike.fuel > FUEL_LOW ? '#ffb03a' : (Math.sin(performance.now() / 90) > 0 ? '#ff3b3b' : '#7a1a1a');
    ctx.fillRect(-r + 2, r + 8, (r * 2 - 4) * clamp(bike.fuel, 0, 1), 10);
    ctx.fillStyle = '#fff'; ctx.font = '800 9px "Trebuchet MS", sans-serif';
    ctx.fillText('ESSENCE', 0, r + 13.5);
  }
  ctx.restore();
}

/* ------------------------------ MISSIONS & OBJECTIF ------------------------------ */
const runDist = () => Math.max(0, (bike.x - startX) / 10);
const WORLD_GOALS = [1000, 1500, 2000];   // distance (m) à franchir pour « finir » chaque monde
// Ce que la moto choisie peut réellement faire — mesuré en simulation (cf. ANALYSE_GAME_DEVELOPER.md), pas deviné :
//  - le meilleur saut d'une course de 1 000 m vaut en médiane ~0,22 + 0,00066 × vitesse max effective (nitro coupé) ;
//  - n tours d'affilée demandent ~3,85 × (1 + 0,6·(n−1)) / √(rot × pilote × AIR_TORQUE) s de vol avec un contrôleur optimal.
const FLIP_HUMAN = 1.15;   // un joueur n'est pas un contrôleur optimal
// objectif de distance de la course en cours : longueur de l'épreuve en championnat, objectif du monde sinon
const runGoal = () => mode === 'champ' && race ? race.len : WORLD_GOALS[clamp(runWorld | 0, 0, WORLDS.length - 1)];
function bikeProfile(){
  const spec = bikeSpec(Save.selBike), ch = CHARS[Save.selChar];   // améliorations comprises
  const topEff = spec.top * (world().perf || 1);
  const rot = spec.rot * ch.rot * AIR_TORQUE;
  return {
    tier: Math.min(5, Math.floor(Math.log2(1 + spec.price / 700))),   // 0 (Rusty) … 5 (haut de gamme)
    bestAir: 0.22 + 0.00066 * topEff,
    airPerKm: 1.2 + 0.0015 * topEff,                                   // temps de vol cumulé par km, volontairement prudent
    flipAir: n => FLIP_HUMAN * 3.85 * (1 + 0.6 * (n - 1)) / Math.sqrt(rot)
  };
}

// w = poids de la récompense (plus dur → mieux payé) ; ok(palier, cible, profil) = la moto peut-elle le faire ?
const MISSION_KINDS = [
  { id:'dist',  w:1.0, t:[400, 800, 1200], scale:true,  ok:() => true,
    txt:n => 'Parcourir ' + n + ' m', get:runDist },
  { id:'flips', w:1.5, t:[1, 3, 6],        scale:false, ok:(i, n, P) => P.bestAir >= (0.93 + 0.1 * i) * P.flipAir(1),
    txt:n => 'Réussir ' + n + ' figure' + (n > 1 ? 's' : ''), get:() => bike.flips },
  { id:'air',   w:1.2, t:[3, 8, 15],       scale:false, ok:(i, n, P) => n <= 3.5 * P.airPerKm,       // faisable en ~3 km de course
    txt:n => n + ' s en l’air au total', get:() => bike.totalAir },
  { id:'combo', w:2.0, t:[2, 3, 4],        scale:false, ok:(i, n, P) => P.bestAir >= 0.93 * P.flipAir(n),
    txt:n => n + ' tours dans un seul saut', get:() => bike.bestJump },
  { id:'wheelie', w:1.2, t:[1.5, 3, 5],    scale:false, ok:() => true,                              // toutes les motos peuvent cabrer
    txt:n => 'Wheelie de ' + n + ' s', get:() => Math.max(bike.bestWheelie, bike.wheelieOn ? bike.wheelieT : 0) },
  { id:'perfect', w:1.3, t:[2, 4, 8],      scale:false, ok:() => true,
    txt:n => n + ' atterrissage' + (n > 1 ? 's' : '') + ' parfait' + (n > 1 ? 's' : ''), get:() => bike.perfects }
];
let missions = [];
let chainEl = null, chainShown = 0;

function newMissions(){
  const wi = runWorld | 0, P = bikeProfile();
  const perk = BIKES[Save.selBike].perk;
  const bonus = (perk === 'lucky' ? 1.25 : 1) * (perk === 'legend' ? 1.25 : 1);   // atouts Porte-bonheur et Légende
  const pool = [];
  for (const k of MISSION_KINDS) k.t.forEach((base, i) => {
    const target = Math.round(base * (k.scale ? (1 + 0.5 * wi) * (1 + 0.1 * P.tier) : 1));
    if (!k.ok(i, target, P)) return;                                  // jamais de mission que la moto ne peut pas tenir
    pool.push({ k, target, reward: Math.round(200 * (i + 1) * k.w * (1 + 0.15 * P.tier) * (1 + 0.5 * wi) * bonus), done:false });
  });
  for (let i = pool.length - 1; i > 0; i--){                          // mélange de Fisher–Yates (le tri aléatoire est biaisé)
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = [];
  for (const m of pool) if (picked.length < 3 && !picked.some(p => p.k === m.k)) picked.push(m);   // 3 types différents si possible…
  for (const m of pool) if (picked.length < 3 && !picked.includes(m)) picked.push(m);             // …sinon on complète
  missions = picked;
}

// n'écrit dans le DOM que si le texte change : réécrire un texte identique relance quand même style et mise en page
const setText = (el, txt) => { if (el._t !== txt){ el._t = txt; el.textContent = txt; } };

// structure du HUD des missions construite une fois par course ; ensuite seuls les textes qui changent sont touchés
function buildMissionsHud(){
  const host = $('hudMissions'); host.innerHTML = '';
  for (const m of missions){
    m.row = document.createElement('div'); m.row.className = 'mission';
    m.a = document.createElement('span'); m.a.textContent = m.k.txt(m.target);
    m.b = document.createElement('b');
    m.row.appendChild(m.a); m.row.appendChild(m.b); host.appendChild(m.row);
  }
  chainEl = document.createElement('div'); chainEl.className = 'chain'; chainShown = 0;
}

function checkObjectives(){
  if (bike.dead) return;
  for (const m of missions){
    if (m.done || m.k.get() < m.target) continue;
    m.done = true;
    Save.credits += m.reward; bike.earned += m.reward; bike.missionGain += m.reward;
    Save.missionsDone++;
    Save.store();
    toast('MISSION ✓  +' + m.reward);
    Snd.blip(990, 0.22, 'square');
  }
  const wi = clamp(runWorld | 0, 0, WORLDS.length - 1);
  if (mode !== 'champ' && !bike.goalHit && runDist() >= WORLD_GOALS[wi]){   // en championnat, l'arrivée est celle de la course
    bike.goalHit = true;
    const first = !Save.cleared.includes(wi);
    const bonus = (first ? 1500 : 250) * (wi + 1);
    if (first) Save.cleared.push(wi);
    Save.credits += bonus; bike.earned += bonus; bike.missionGain += bonus;
    Save.store();
    toast((first ? 'MONDE TERMINÉ !' : 'LIGNE D’ARRIVÉE !') + '  +' + bonus + (first && UNLOCK_WORLDS && wi + 1 < WORLDS.length ? '  •  MONDE ' + (wi + 2) + ' DÉBLOQUÉ' : ''));
    Snd.blip(1200, 0.3, 'triangle');
    addTrauma(0.4);
  }
  // HUD des missions : progression, case cochée et chaîne, sans reconstruire de HTML
  for (const m of missions){
    if (!m.b) continue;
    setText(m.b, m.done ? '+' + m.reward : Math.min(m.target, Math.floor(m.k.get())) + '/' + m.target);
    if (m.done && !m.row.classList.contains('done')){ m.row.classList.add('done'); m.a.textContent = '✓ ' + m.k.txt(m.target); }
  }
  if (chainEl && bike.chain !== chainShown){
    chainShown = bike.chain;
    if (bike.chain > 1){
      chainEl.textContent = 'CHAÎNE x' + bike.chain + ' · +' + (25 * (bike.chain - 1)) + '%';
      if (!chainEl.parentNode) $('hudMissions').appendChild(chainEl);
    } else if (chainEl.parentNode) chainEl.parentNode.removeChild(chainEl);
  }
}

/* ------------------------------ HUD / UI ------------------------------ */
function fmtM(px){ return Math.max(0, Math.round(px / 10)) + ' m'; }

let hudProgShown = -1;
function updateHUD(){
  setText($('hudCredits'), Save.credits);
  setText($('hudSpeed'), Math.round(Math.hypot(bike.vx, bike.vy) / 3));
  setText($('hudDist'), fmtM(bike.x - startX));
  const wi = clamp(runWorld | 0, 0, WORLDS.length - 1);
  if (mode === 'champ'){
    setText($('hudRecord'), CHAMP[wi].name + ' • Course ' + (race.idx + 1) + '/3 • ' + race.len + ' m • POS ' + racePos() + '/' + (rivals.length + 1) +
      ' • ' + Math.max(0, race.t).toFixed(1) + ' s');
  } else if (mode === 'daily'){
    setText($('hudRecord'), 'DÉFI DU JOUR • ' + world().short + ' • Record du jour : ' + Save.daily.best + ' m');
  } else {
    setText($('hudRecord'), 'Record : ' + Save.bests[wi] + ' m • ' + world().short +
      ' • Objectif : ' + WORLD_GOALS[wi] + ' m' + (Save.cleared.includes(wi) ? ' ✔' : ''));
  }
  const prog = Math.min(100, Math.floor(100 * runDist() / runGoal()));
  if (prog !== hudProgShown){ hudProgShown = prog; $('hudProg').style.width = prog + '%'; }
}

let msgTimer = 0;
function toast(txt){
  const el = $('hudMsg');
  el.textContent = txt;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  msgTimer = 1.1;
}

function show(id){ [ 'menu','shop','over','pause','champ' ].forEach(k => $(k).classList.toggle('hidden', k !== id)); }
function hideAll(){ [ 'menu','shop','over','pause','champ' ].forEach(k => $(k).classList.add('hidden')); }

/* ---------- SHOP ---------- */
let shopMode = 'bikes';
function openShop(mode){
  shopMode = mode;
  $('shopTitle').textContent = mode === 'bikes' ? 'GARAGE MOTO' : 'PILOTES';
  $('shopCredits').textContent = Save.credits;
  show('shop');
  buildShop(false);
}
// après un achat / équipement : on met à jour la grille sans la remonter en haut
function refreshShop(){ $('shopCredits').textContent = Save.credits; buildShop(true); }
function shopToast(txt){
  const el = $('shopToast');
  el.textContent = txt;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

function statRow(label, v, max, cls){
  const pct = clamp(v / max, 0, 1) * 100;
  return `<div class="stat ${cls}"><span>${label}</span><div class="bar"><div class="fill" style="width:${pct}%"></div></div></div>`;
}

function buildShop(keepScroll){
  const grid = $('shopGrid');
  const scroll = keepScroll ? grid.scrollTop : 0;
  grid.innerHTML = '';
  const list = shopMode === 'bikes' ? BIKES : CHARS;
  const owned = shopMode === 'bikes' ? Save.ownedBikes : Save.ownedChars;
  const sel = shopMode === 'bikes' ? Save.selBike : Save.selChar;
  const order = list.map((_, i) => i).sort((a, b) => list[a].price - list[b].price);

  order.forEach(i => {
    const item = list[i];
    const has = owned.includes(i);
    const isSel = sel === i;
    const card = document.createElement('div');
    card.className = 'card' + (has ? ' owned' : ' locked') + (isSel ? ' selected' : '');
    let stats = '';
    if (shopMode === 'bikes'){
      const sp = bikeSpec(i);           // barres = valeurs réelles, améliorations comprises
      stats = statRow('PUISSANCE', sp.power, 6800, 'power') +
              statRow('VITESSE', sp.top, 2000, '') +
              statRow('NITRO', sp.nitro, 0.9, 'power') +
              statRow('CONTRÔLE', sp.rot - 6, 3.6, '') +
              statRow('LÉGÈRETÉ', 1.12 - item.mass, 0.26, 'grip') +
              statRow('ACCROCHE', item.grip, 1.35, 'grip');
      if (item.perk) stats += `<div class="perk">★ <b>${PERKS[item.perk].name}</b> — ${PERKS[item.perk].txt}</div>`;
      if (has) stats += '<div class="upgs">' + UPGRADES.map((u, k) => {
        const l = Save.upg[i][k], c = upgCost(i, l);
        const pips = '<i>' + '●'.repeat(l) + '<s>' + '●'.repeat(UPG_MAX - l) + '</s></i>';
        const act = l >= UPG_MAX ? '<em>MAX</em>'
          : `<button class="btn" data-upg="${i}:${k}" ${Save.credits < c ? 'disabled' : ''}>+ ⬤ ${c}</button>`;
        return `<div class="upg"><span>${u.name}</span>${pips}${act}</div>`;
      }).join('') + '</div>';
    } else {
      stats = statRow('ACCROCHE', item.grip, 1.2, 'grip') +
              statRow('CONTRÔLE', item.rot, 1.22, '') +
              statRow('LÉGÈRETÉ', 1.06 - item.mass, 0.16, 'power');
    }
    const priceHtml = has
      ? `<span class="tag owned">${isSel ? 'ÉQUIPÉ' : 'POSSÉDÉ'}</span>`
      : `<span class="tag">⬤ ${item.price}</span>`;
    const btn = has
      ? (isSel ? '' : `<button class="btn" data-select="${shopMode}:${i}">ÉQUIPER</button>`)
      : `<button class="btn primary" data-buy="${shopMode}:${i}" ${Save.credits < item.price ? 'disabled' : ''}>ACHETER</button>`;
    card.innerHTML =
      `<canvas class="card-canvas"></canvas>
       <h3>${item.name}</h3>
       <div class="sub">${item.sub} • ${item.bonus}</div>
       ${stats}
       <div class="price">${priceHtml}${btn}</div>`;
    grid.appendChild(card);
    drawPreview(card.querySelector('canvas'), item, shopMode, i);
  });
  grid.scrollTop = scroll;
}

function drawPreview(canvas, item, mode, idx){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 220, h = 78;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  // fond dégradé
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(49,230,255,.07)');
  g.addColorStop(1, 'rgba(0,0,0,.18)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // sol
  c.strokeStyle = 'rgba(255,255,255,.12)';
  c.beginPath(); c.moveTo(0, h - 12); c.lineTo(w, h - 12); c.stroke();

  if (mode === 'bikes'){
    const spec = item, ch = CHARS[Save.selChar];
    const sc = Math.min(w / 130, 0.86);
    c.save();
    c.translate(w / 2 + 6, h - 14);
    c.scale(sc, sc);
    c.rotate(-0.05);
    renderBike(c, spec.col, ch, 0.6, 0, 0, false);
    c.restore();
  } else {
    // personnage
    c.save();
    c.translate(w / 2, h - 10);
    const sc = 1.05;
    c.scale(sc, sc);
    drawCharPortrait(c, item);
    c.restore();
  }
}

function drawCharPortrait(c, ch){
  c.lineCap = 'round';
  // jambes
  c.strokeStyle = ch.suit; c.lineWidth = 8;
  c.beginPath(); c.moveTo(-10, -22); c.lineTo(-6, -8); c.stroke();
  c.beginPath(); c.moveTo(6, -22); c.lineTo(10, -8); c.stroke();
  // torse
  c.lineWidth = 16;
  c.beginPath(); c.moveTo(-2, -24); c.lineTo(0, -50); c.stroke();
  // bras
  c.lineWidth = 8;
  c.beginPath(); c.moveTo(-1, -48); c.lineTo(-16, -34); c.stroke();
  c.beginPath(); c.moveTo(1, -48); c.lineTo(16, -34); c.stroke();
  // tête
  c.beginPath(); c.arc(0, -58, 11, 0, TAU);
  c.fillStyle = ch.helmet; c.fill();
  c.beginPath(); c.arc(-1, -57, 11, -1.9, -0.1);
  c.lineWidth = 6; c.strokeStyle = ch.visor; c.stroke();
  c.beginPath(); c.arc(0, -58, 11, -0.5, 0.2);
  c.lineWidth = 4; c.strokeStyle = ch.trim; c.stroke();
}

/* ------------------------------ FLOW ------------------------------ */
let state = 'menu';

const WORLD_TIPS = ['Idéal pour débuter', 'Tous niveaux', 'Conseillé : Pocket Rocket ou mieux'];
const worldUnlocked = i => !UNLOCK_WORLDS || i === 0 || Save.cleared.includes(i - 1);
function updateWorldButtons(){
  document.querySelectorAll('#menu .world-btn').forEach(b => {
    const i = +b.dataset.world, ok = worldUnlocked(i);
    b.classList.toggle('selected', i === Save.selWorld);
    b.classList.toggle('locked', !ok);
    const rec = b.querySelector('.rec');
    if (rec) rec.textContent = ok ? WORLD_TIPS[i] : '🔒 Termine le Monde ' + i + ' (' + WORLD_GOALS[i - 1] + ' m)';
  });
}

function goMenu(){
  state = 'menu'; paused = false;
  mode = 'free'; rivals = []; cans = []; race = null;
  runWorld = Save.selWorld;
  hideAll(); show('menu');
  $('touch').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('menuCredits').textContent = Save.credits;
  $('menuBest').textContent = Save.best + ' m';
  $('menuMiss').textContent = Save.missionsDone;
  $('soundBtn').textContent = Snd.on ? '🔊 Son' : '🔇 Muet';
  $('shakeBtn').textContent = shakeLabel();
  updateWorldButtons();
  Save.store();
  Snd.engine(0, 0, false);
}

// kind : 'free' | 'daily' | 'champ' ; sans argument on rejoue le même mode (bouton REJOUER, touche Entrée)
function startGame(kind){
  if (kind) mode = kind;
  if (mode === 'champ') return startRace();
  if (mode === 'daily'){
    if (Save.daily.day !== dayKey()) Save.daily = { day: dayKey(), best: 0, ghost: [] };
    runWorld = dayWorld();
    runSeed = daySeed(Save.daily.day);          // même piste pour tout le monde, toute la journée
  } else {
    if (!worldUnlocked(Save.selWorld | 0)) Save.selWorld = 0;
    runWorld = Save.selWorld;
    runSeed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
  }
  rivals = []; cans = []; race = null;
  newTrack(runSeed);
  resetBike();
  newMissions(); buildMissionsHud(); hudProgShown = -1;
  enterPlay(mode === 'daily' ? 'DÉFI DU JOUR !' : 'GO !');
}
function enterPlay(msg){
  In.restart = false;
  parts.length = 0; floats.length = 0;
  state = 'play'; paused = false;
  hideAll();
  $('hud').classList.remove('hidden');
  $('hud').classList.toggle('touch', isTouch);
  $('touch').classList.toggle('hidden', !isTouch);
  Snd.init(); Snd.resume();
  toast(msg);
}
// R : nouvelle tentative (la distance est encaissée) ; en championnat, retour au dernier point sûr
function restartRun(){
  if (bike.dead) return;
  if (mode === 'champ'){
    if (race && race.t > 0){ respawnRider(bike); toast('Retour au dernier point'); }
    return;
  }
  dailyNote(Math.round(runDist()));
  bankRun(); resetBike();
  parts.length = 0; floats.length = 0;
  toast('Nouvelle tentative');
}

// crédits de distance : 1 pour 2 m (atout Légende : +25 %)
const distPay = dist => Math.floor(dist / 2 * (perkOf(bike) === 'legend' ? 1.25 : 1));
// encaisse la distance déjà parcourue quand la page se cache ou se ferme : une course interrompue ne perd plus ses gains.
// `bike.banked` évite de payer deux fois si la course reprend ensuite (endRun ne verse que le reste).
function noteBest(dist){
  const wi = clamp(runWorld | 0, 0, WORLDS.length - 1);
  if (dist > Save.best) Save.best = dist;
  if (dist > Save.bests[wi]) Save.bests[wi] = dist;
}
function bankRun(){
  if (state !== 'play' || mode === 'champ') return;     // championnat : pas de paie à la distance, des primes de place
  const dist = Math.max(0, Math.round((bike.x - startX) / 10));
  noteBest(dist);
  const part = distPay(dist) - bike.banked;
  if (part > 0){ Save.credits += part; bike.banked += part; }
  Save.store();
}

let paused = false;
function setPause(on){
  if (on === paused || state !== 'play' || (on && bike.dead && mode !== 'champ')) return;
  paused = on;
  $('pause').classList.toggle('hidden', !on);
  for (const k in keys) keys[k] = false;            // aucune touche ne reste « collée » à la reprise
  for (const k in touchKeys) touchKeys[k] = false;
  if (on){ Snd.engine(0, 0, false); bankRun(); }
}
// onglet masqué (changement d'appli sur mobile) : pause + encaissement ; fermeture de page : encaissement
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (state === 'play') setPause(true);
  bankRun(); Save.store();
});
window.addEventListener('pagehide', () => { bankRun(); Save.store(); });

function endRun(msg){
  if (state !== 'play') return;
  state = 'over'; paused = false;
  const dist = Math.max(0, Math.round((bike.x - startX) / 10));
  noteBest(dist);
  const distGain = Math.max(distPay(dist), bike.banked);   // moto qui a reculé après un encaissement : jamais de crédits retirés
  Save.credits += distGain - bike.banked;   // la part déjà encaissée par bankRun n'est pas payée deux fois
  const daily = dailyNote(dist);
  const gain = distGain + bike.earned + daily;      // air + figures déjà crédités en course
  Save.store();

  $('overTitle').textContent = msg || 'FIN DE COURSE';
  $('rDist').textContent = dist + ' m';
  $('rWorld').textContent = (mode === 'daily' ? 'Défi du jour • ' : '') + world().short + ' • ' + world().name;
  $('rAir').textContent = bike.totalAir.toFixed(1) + ' s';
  $('rFlips').textContent = bike.flips + (bike.perfects ? ' • ' + bike.perfects + ' parfait' + (bike.perfects > 1 ? 's' : '') : '');
  $('rMiss').textContent = missions.filter(m => m.done).length + ' / ' + missions.length +
    (bike.goalHit ? ' • arrivée ✔' : '');
  $('rGain').textContent = '+' + gain;
  // détail des gains, état des missions et prochain achat : le but du jeu devient lisible
  $('rDetail').textContent = 'Distance +' + distGain + '  •  Style +' + Math.max(0, bike.earned - bike.missionGain) +
    '  •  Missions et arrivée +' + bike.missionGain + (daily ? '  •  Record du jour +' + daily : '');
  $('rMissList').innerHTML = missions.map(m => m.done
    ? '<div class="rm done"><span>✓ ' + m.k.txt(m.target) + '</span><b>+' + m.reward + '</b></div>'
    : '<div class="rm"><span>' + m.k.txt(m.target) + '</span><b>' + Math.min(m.target, Math.floor(m.k.get())) + '/' + m.target + '</b></div>').join('');
  showNextBuy();
  $('hud').classList.add('hidden');
  $('touch').classList.add('hidden');
  show('over');
  Snd.blip(330, 0.25, 'triangle');
}
function showNextBuy(){
  const nextIdx = BIKES.map((_, i) => i).filter(i => !Save.ownedBikes.includes(i)).sort((a, b) => BIKES[a].price - BIKES[b].price)[0];
  if (nextIdx === undefined){
    $('rNext').textContent = 'Garage complet !'; $('rNextBar').style.width = '100%';
  } else {
    const nb = BIKES[nextIdx];
    $('rNext').textContent = Save.credits >= nb.price ? 'Prochain achat : ' + nb.name + ' — disponible !' : 'Prochain achat : ' + nb.name + ' — encore ' + (nb.price - Save.credits) + ' ⬤';
    $('rNextBar').style.width = Math.round(100 * clamp(Save.credits / nb.price, 0, 1)) + '%';
  }
}

/* ------------------------------ DÉFI DU JOUR ------------------------------ */
// une piste par jour (même graine pour tous), un record du jour, et le fantôme de ce record à battre
const GHOST_HZ = 15;
const GHOST_COL = pal({ body:'#e8f6ff', accent:'#31e6ff', rim:'#ffffff', frame:'#9fb6cc', seat:'#9fb6cc', tire:'#9fb6cc' });
let ghostRec = [];
function dayKey(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function daySeed(k){ let h = 2166136261; for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619); return h >>> 0; }
// le monde du jour tourne parmi les mondes débloqués
function dayWorld(){
  const n = WORLDS.filter((_, i) => worldUnlocked(i)).length;
  const d = new Date();
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5) % n;
}
// échantillon i = position au temps i / GHOST_HZ : le fantôme rejoué est calé sur le même chrono
function recordGhost(){
  if (mode !== 'daily') return;
  const want = Math.min(GHOST_MAX, Math.floor(runT * GHOST_HZ) + 1);
  while (ghostRec.length / 3 < want) ghostRec.push(Math.round(bike.x), Math.round(bike.y), Math.round(bike.a * 100));
}
// nouveau record du jour : 1 crédit par mètre gagné sur l'ancien record, et ce parcours devient le fantôme
function dailyNote(dist){
  if (mode !== 'daily' || dist <= Save.daily.best) return 0;
  const bonus = dist - Save.daily.best;
  Save.daily.best = dist;
  Save.daily.ghost = ghostRec.slice(0, GHOST_MAX * 3);
  Save.credits += bonus;
  return bonus;
}

/* ------------------------------ CHAMPIONNAT ------------------------------ */
// une série de 3 courses par monde contre 4 rivaux IA (même physique que le joueur). Essence limitée, bidons sur la piste.
const CHAMP = [
  { name:'COUPE DES DUNES', races:[1000, 1400, 1800], prize:[3000, 1500, 800], rivals:[
    { name:'Gégé',     bike:0, ch:1, skill:0.45, color:'#ff9a5a' },
    { name:'Lina',     bike:0, ch:2, skill:0.65, color:'#5ad1ff' },
    { name:'Bouboule', bike:7, ch:3, skill:0.45, color:'#b6d36a' },
    { name:'Kenzo',    bike:1, ch:4, skill:0.70, color:'#7dffb0' } ] },
  { name:'NÉON GRAND PRIX', races:[1400, 1800, 2200], prize:[6000, 3000, 1500], rivals:[
    { name:'Vex',      bike:8, ch:5, skill:0.60, color:'#ff8a3a' },
    { name:'Duchesse', bike:3, ch:2, skill:0.60, color:'#ffc46b' },
    { name:'Rocco',    bike:2, ch:1, skill:0.65, color:'#6b9bff' },
    { name:'Mika',     bike:9, ch:3, skill:0.70, color:'#ff5a8a' } ] },
  { name:'TROPHÉE DES LACS', races:[1400, 1800, 2200], prize:[10000, 5000, 2500], rivals:[
    { name:'Jinx',     bike:3,  ch:4, skill:0.70, color:'#8fb4ff' },
    { name:'Sato',     bike:9,  ch:5, skill:0.72, color:'#ff6b9b' },
    { name:'Le Baron', bike:4,  ch:3, skill:0.72, color:'#ffd35a' },
    { name:'Falco',    bike:10, ch:2, skill:0.80, color:'#b49bff' } ] }
];
const CHAMP_PTS = [10, 6, 4, 2, 1];          // points par place (abandon : 0)
const RACE_PAY = [600, 350, 200, 100, 50];   // crédits par place et par course (× 1 + 0,5 par monde)
const FUEL_IDLE = 0.015, FUEL_THR = 0.045;   // essence brûlée par seconde : au ralenti, et en plus gaz à fond (~17 s de plein gaz)
const FUEL_CAN = 0.45, FUEL_LOW = 0.2;       // un bidon rend 45 % du réservoir ; réserve sous 20 %
const MEDALS = ['🏆', '🥈', '🥉'];
let race = null;      // { wi, idx, len, t (< 0 pendant le compte à rebours), done }
let cans = [];
let champWorld = 0;   // série affichée dans l'écran du championnat

function makeRivals(wi){
  return CHAMP[wi].rivals.map(d => makeRider({
    spec: BIKES[d.bike], ch: CHARS[d.ch], name: d.name,
    inp: { throttle:0, brake:0, lean:0, nitro:false },
    bot: { skill:d.skill, color:d.color, boost:1, planned:false, flipGoal:0, err:0, nitroT:0 }
  }));
}
function placeCans(len){
  cans = [];
  const rng = mulberry32((runSeed ^ 0x5eed) >>> 0), wtr = world().water;
  for (let m = 170 + rng() * 60; m < len - 50; m += 260 + rng() * 100){   // ~1 bidon / 310 m : une moto lente doit presque tous les prendre
    let x = startX + m * 10;
    while (wtr && groundY(x) > -wtr.level - 10) x += 40;    // jamais au fond d'un lac
    cans.push({ x, y: groundY(x) - 30, taken:false });
  }
}
function startRace(){
  if (!worldUnlocked(champWorld)) champWorld = 0;
  const wi = champWorld, c = Save.champ[wi];
  mode = 'champ'; runWorld = wi;
  race = { wi, idx: c.race, len: CHAMP[wi].races[c.race], t: -3, done: false, count: 4, dryT: 0, lowWarned: false };
  runSeed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
  newTrack(runSeed);
  ensureTerrain(race.len * 10 + 4000);          // piste générée jusqu'après l'arrivée (bidons placés sur le vrai relief)
  resetBike();
  rivals = makeRivals(wi);
  for (const r of rivals) resetRider(r, bike.x);
  missions = []; buildMissionsHud(); hudProgShown = -1;
  placeCans(race.len);
  enterPlay('PRÊTS ?');
}
// place du joueur : 1 + rivaux arrivés ou devant lui
const racePos = () => 1 + rivals.filter(r => r.fin || r.x > bike.x).length;
// compte à rebours et panne sèche : coupent les gaz du joueur
function gateRaceInput(){
  if (race.t < 0){ In.throttle = 0; In.brake = 0; In.nitro = false; }
  if (bike.fuel <= 0){ In.throttle = 0; In.nitro = false; }
}
function raceTick(dt){
  const prev = race.t;
  race.t += dt;
  if (race.t < 0){
    const n = Math.ceil(-race.t);
    if (n !== race.count){ race.count = n; toast(String(n)); Snd.blip(440, 0.15, 'square'); }
    return;
  }
  if (prev < 0){ toast('GO !'); Snd.blip(880, 0.3, 'square'); }
  const finX = startX + race.len * 10;
  for (const r of rivals) if (!r.fin && r.x >= finX) r.fin = race.t;
  // essence
  if (!bike.dead) bike.fuel = Math.max(0, bike.fuel - dt * (FUEL_IDLE + FUEL_THR * In.throttle));
  if (bike.fuel < FUEL_LOW && !race.lowWarned){ race.lowWarned = true; toast('⛽ RÉSERVE !'); Snd.blip(300, 0.2, 'square'); }
  if (bike.fuel >= FUEL_LOW) race.lowWarned = false;
  for (const c of cans){
    if (c.taken || bike.dead || Math.abs(c.x - bike.x) > 45 || Math.abs(c.y - bike.y) > 55) continue;
    c.taken = true;
    bike.fuel = Math.min(1, bike.fuel + FUEL_CAN);
    spawnText(c.x, c.y - 30, '⛽ +ESSENCE', '#ffb03a');
    Snd.blip(600, 0.12, 'triangle');
  }
  if (bike.x >= finX && !bike.dead) return finishRace(false);
  // panne sèche : réservoir vide et moto arrêtée → abandon
  const dry = bike.fuel <= 0 && !bike.dead && Math.hypot(bike.vx, bike.vy) < 25;
  race.dryT = dry ? race.dryT + dt : 0;
  if (race.dryT > 1.5) finishRace(true, 'PANNE SÈCHE !');
}
function tickRespawns(dt){
  for (const r of mode === 'champ' ? [bike, ...rivals] : rivals){
    if (!r.dead || r.respawnT <= 0) continue;
    r.respawnT -= dt;
    if (r.respawnT <= 0){ respawnRider(r); if (r.isPlayer) toast('C’EST REPARTI !'); }
  }
}

// IA d'un rival : gaz à fond, nitro par rafales, et en l'air vise la pente de réception (avec une imprécision selon son niveau)
function botThink(r, dt){
  const b = r.bot, inp = r.inp;
  inp.throttle = 0; inp.brake = 0; inp.lean = 0; inp.nitro = false;
  if (r.dead || !race || race.t < 0) return;
  inp.throttle = 1;
  // élastique léger : un rival distancé pousse un peu plus, un rival très en tête lève un peu le pied (±10 % à 250 m)
  b.boost = r.fin ? 1 : 1 + clamp((bike.x - r.x) / 25000, -0.08, 0.10);
  if (r.onGround || r.inWater){
    b.planned = false;
    if (b.nitroT > 0){ b.nitroT -= dt; inp.nitro = true; }
    else if (r.nitro > 0.5 && Math.random() < dt * b.skill * 0.7) b.nitroT = 0.5 + Math.random() * b.skill * 1.5;
    return;
  }
  const L = predictLanding(r);
  if (!b.planned){                       // décision une fois par saut : figure ou pas, et erreur de visée
    b.planned = true;
    b.err = (Math.random() - 0.5) * (1 - b.skill);
    const need = 3.85 / Math.sqrt(r.spec.rot * r.ch.rot * AIR_TORQUE);     // durée d'un tour, contrôleur parfait
    const margin = 1.35 + (1 - b.skill);
    b.flipGoal = 0;
    if (Math.random() < b.skill * 0.6){
      if (L.t > need * 1.6 * margin) b.flipGoal = 2;
      else if (L.t > need * margin) b.flipGoal = 1;
    }
  }
  if (b.flipGoal > 0 && r.pendFlips < b.flipGoal && L.t > 0.3){ inp.lean = 1; return; }
  const target = L.water ? 0 : Math.atan2(L.slope, 1) + b.err;            // au-dessus d'un lac : à plat pour ricocher
  const e = norm(r.a - target);
  inp.lean = clamp(e * 3 + r.av * 0.35, -1, 1);
  if (Math.abs(inp.lean) < 0.08) inp.lean = 0;
}

function finishRace(dnf, msg){
  if (!race || race.done) return;
  race.done = true; state = 'over'; paused = false;
  const wi = race.wi, c = Save.champ[wi];
  // classement : arrivés dans l'ordre des temps, puis les autres selon la distance ; un abandon est dernier
  const rows = [{ k:0, you:true, fin: dnf ? 0 : race.t, x: dnf ? -Infinity : bike.x }]
    .concat(rivals.map((r, i) => ({ k:i + 1, you:false, fin:r.fin, x:r.x })));
  rows.sort((a, b) => (a.fin && b.fin) ? a.fin - b.fin : a.fin ? -1 : b.fin ? 1 : b.x - a.x);
  rows.forEach((r, p) => { r.place = p; r.pts = r.you && dnf ? 0 : CHAMP_PTS[p]; c.pts[r.k] += r.pts; });
  const me = rows.find(r => r.you);
  const credits = dnf ? 0 : Math.round(RACE_PAY[me.place] * (1 + 0.5 * wi) * (perkOf(bike) === 'legend' ? 1.25 : 1));
  Save.credits += credits;
  let final = null;
  if (c.race >= 2){
    // dernière course : classement général (égalité au profit du joueur), prime, trophée, et nouvelle saison
    const st = c.pts.map((p, k) => ({ k, p })).sort((a, b) => b.p - a.p || (a.k === 0 ? -1 : b.k === 0 ? 1 : a.k - b.k));
    const rank = st.findIndex(s => s.k === 0);
    const firstWin = rank === 0 && Save.trophies[wi] !== 1;
    const prize = rank < 3 ? CHAMP[wi].prize[rank] * (firstWin ? 2 : 1) : 0;
    Save.credits += prize;
    if (!Save.trophies[wi] || rank + 1 < Save.trophies[wi]) Save.trophies[wi] = rank + 1;
    final = { st, rank, prize, firstWin };
    Save.champ[wi] = { race: 0, pts: [0, 0, 0, 0, 0] };
  } else c.race++;
  Save.store();
  $('hud').classList.add('hidden');
  $('touch').classList.add('hidden');
  showRaceResult({ wi, idx: race.idx, rows, dnf, msg, place: me.place, credits, style: bike.earned, final });
  Snd.blip(me.place === 0 && !dnf ? 1200 : 330, 0.3, 'triangle');
}

const champName = (wi, k) => k === 0 ? 'TOI' : CHAMP[wi].rivals[k - 1].name;
const champCol = (wi, k) => k === 0 ? '#31e6ff' : CHAMP[wi].rivals[k - 1].color;
const champBike = (wi, k) => k === 0 ? BIKES[Save.selBike].name : BIKES[CHAMP[wi].rivals[k - 1].bike].name;
function standingsHtml(wi, pts){
  const st = pts.map((p, k) => ({ k, p })).sort((a, b) => b.p - a.p || (a.k === 0 ? -1 : b.k === 0 ? 1 : a.k - b.k));
  return '<table class="champ-table"><tr><th>#</th><th>Pilote</th><th>Moto</th><th>Pts</th></tr>' +
    st.map((s, i) => `<tr class="${s.k === 0 ? 'you' : ''}"><td>${i + 1}</td><td style="color:${champCol(wi, s.k)}">${champName(wi, s.k)}</td>` +
      `<td class="dim">${champBike(wi, s.k)}</td><td>${s.p}</td></tr>`).join('') + '</table>';
}
function showRaceResult(R){
  const C = CHAMP[R.wi];
  const title = R.dnf ? R.msg : R.place === 0 ? 'VICTOIRE !' : (R.place + 1) + (R.place ? 'e' : 'er') + ' PLACE';
  let h = `<h2>${title}</h2><div class="champ-sub">${C.name} • Course ${R.idx + 1}/3 • ${WORLDS[R.wi].short}</div>`;
  h += '<table class="champ-table"><tr><th>#</th><th>Pilote</th><th>Temps</th><th>Pts</th></tr>' +
    R.rows.map(r => `<tr class="${r.you ? 'you' : ''}"><td>${r.place + 1}</td><td style="color:${champCol(R.wi, r.k)}">${champName(R.wi, r.k)}</td>` +
      `<td>${r.fin ? r.fin.toFixed(1) + ' s' : r.you && R.dnf ? 'abandon' : 'en course'}</td><td>+${r.pts}</td></tr>`).join('') + '</table>';
  h += `<div class="gain-detail">Place +${R.credits}  •  Style +${R.style}</div>`;
  let btns;
  if (R.final){
    const F = R.final;
    h += `<h3 class="champ-final">${MEDALS[F.rank] || ''} ${F.rank === 0 ? 'CHAMPION !' : (F.rank + 1) + 'e AU CLASSEMENT FINAL'}</h3>`;
    h += standingsHtml(R.wi, F.st.reduce((a, s) => (a[s.k] = s.p, a), []));
    h += F.prize ? `<div class="champ-prize">Prime de fin de saison : +${F.prize} ⬤${F.firstWin ? ' (premier titre : ×2)' : ''}</div>`
                 : '<div class="champ-prize dim">Pas de prime hors du podium. Améliore ta moto au garage !</div>';
    btns = '<button class="btn primary" data-act="race">▶&nbsp; NOUVELLE SAISON</button>';
  } else {
    h += '<h3>CLASSEMENT GÉNÉRAL</h3>' + standingsHtml(R.wi, Save.champ[R.wi].pts);
    btns = `<button class="btn primary" data-act="race">▶&nbsp; COURSE ${R.idx + 2}/3 • ${C.races[R.idx + 1]} m</button>`;
  }
  h += `<div class="over-buttons">${btns}<button class="btn" data-act="shop-bikes">🏍&nbsp; GARAGE</button>` +
       '<button class="btn" data-act="menu">☰&nbsp; MENU</button></div>';
  $('champBody').innerHTML = h;
  show('champ');
}
// écran du championnat : choix de la série, classement en cours, règles
function openChamp(wi){
  if (wi !== undefined) champWorld = wi;
  if (!worldUnlocked(champWorld)) champWorld = 0;
  state = 'menu'; mode = 'free'; rivals = []; cans = []; race = null;
  runWorld = champWorld;
  const C = CHAMP[champWorld], c = Save.champ[champWorld];
  let h = '<h2>CHAMPIONNAT</h2><div class="menu-worlds champ-tabs">' + CHAMP.map((s, i) => {
    const ok = worldUnlocked(i), tr = Save.trophies[i];
    return `<button class="world-btn ${i === champWorld ? 'selected' : ''} ${ok ? '' : 'locked'}" data-act="champ-tab" data-world="${i}">` +
      `<b>${s.name}</b><span>${WORLDS[i].short}${tr ? ' • ' + (MEDALS[tr - 1] || tr + 'e') : ''}</span>` +
      `<span class="rec">${ok ? '' : '🔒 Termine le Monde ' + i}</span></button>`;
  }).join('') + '</div>';
  h += `<div class="champ-sub">Course ${c.race + 1}/3 • ${C.races[c.race]} m • ${WORLDS[champWorld].name}</div>`;
  h += standingsHtml(champWorld, c.pts);
  h += '<div class="champ-rules">⛽ Essence limitée : ramasse les bidons. Panne sèche = abandon.<br>' +
       'Chute = tu repars du dernier point sûr (R : y retourner).<br>' +
       `Points 10 / 6 / 4 / 2 / 1 • Prime finale : ${C.prize.join(' / ')} ⬤ (×2 au premier titre)</div>`;
  h += `<div class="over-buttons"><button class="btn primary" data-act="race">▶&nbsp; COURSE ${c.race + 1}/3</button>` +
       (c.race > 0 ? '<button class="btn" data-act="champ-reset">↺&nbsp; RECOMMENCER LA SAISON</button>' : '') +
       '<button class="btn" data-act="menu">←&nbsp; MENU</button></div>';
  $('champBody').innerHTML = h;
  hideAll(); show('champ');
  $('hud').classList.add('hidden');
  $('touch').classList.add('hidden');
}

function buy(kind, idx){
  const list = kind === 'bikes' ? BIKES : CHARS;
  const owned = kind === 'bikes' ? Save.ownedBikes : Save.ownedChars;
  const item = list[idx];
  if (!item || owned.includes(idx)) return;
  if (Save.credits < item.price) return;
  Save.credits -= item.price;
  owned.push(idx);
  if (kind === 'bikes') Save.selBike = idx; else Save.selChar = idx;
  Save.store();
  Snd.blip(880, 0.16, 'square');
  shopToast('Acheté : ' + item.name);
  refreshShop();
}
function buyUpgrade(bi, k){
  if (!Save.ownedBikes.includes(bi) || !UPGRADES[k]) return;
  const l = Save.upg[bi][k];
  if (l >= UPG_MAX) return;
  const c = upgCost(bi, l);
  if (Save.credits < c) return;
  Save.credits -= c;
  Save.upg[bi][k] = l + 1;
  Save.store();
  Snd.blip(980, 0.14, 'square');
  shopToast(BIKES[bi].name + ' : ' + UPGRADES[k].name + ' niveau ' + (l + 1));
  refreshShop();
}
function select(kind, idx){
  const list = kind === 'bikes' ? BIKES : CHARS;
  if (kind === 'bikes') Save.selBike = idx; else Save.selChar = idx;
  Save.store();
  Snd.blip(520, 0.1, 'sine');
  shopToast('Équipé : ' + list[idx].name);
  refreshShop();
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act],[data-buy],[data-select],[data-upg]');
  if (!b) return;
  Snd.init(); Snd.resume();
  if (b.dataset.act){
    const a = b.dataset.act;
    if (a === 'play') startGame();
    else if (a === 'menu') goMenu();
    else if (a === 'shop-bikes') openShop('bikes');
    else if (a === 'shop-chars') openShop('chars');
    else if (a === 'world'){
      const wi = clamp(+b.dataset.world || 0, 0, WORLDS.length - 1);
      if (!worldUnlocked(wi)){ Snd.blip(180, 0.15, 'square'); return; }
      Save.selWorld = wi; runWorld = wi;
      Save.store();
      updateWorldButtons();
      Snd.blip(700, 0.12, 'sine');
    }
    else if (a === 'pause') setPause(true);
    else if (a === 'resume') setPause(false);
    else if (a === 'quit-run'){ setPause(false); if (mode === 'champ') finishRace(true, 'ABANDON'); else endRun('COURSE TERMINÉE'); }
    else if (a === 'free') startGame('free');
    else if (a === 'daily') startGame('daily');
    else if (a === 'race') startGame('champ');
    else if (a === 'champ') openChamp();
    else if (a === 'champ-tab'){
      const wi = clamp(+b.dataset.world || 0, 0, WORLDS.length - 1);
      if (!worldUnlocked(wi)){ Snd.blip(180, 0.15, 'square'); return; }
      openChamp(wi); Snd.blip(700, 0.12, 'sine');
    }
    else if (a === 'champ-reset'){
      // deux clics : le premier arme le bouton, le second efface les points de la saison en cours
      if (!b.dataset.armed){ b.dataset.armed = '1'; b.textContent = '↺  CONFIRMER : EFFACER LES POINTS ?'; return; }
      Save.champ[champWorld] = { race: 0, pts: [0, 0, 0, 0, 0] }; Save.store(); openChamp();
    }
    else if (a === 'sound'){
      const on = Snd.toggle();
      Save.sound = on; Save.store();
      b.textContent = on ? '🔊 Son' : '🔇 Muet';
    }
    else if (a === 'shake'){
      Save.shakeLvl = ((Save.shakeLvl | 0) + 1) % SHAKE_LEVELS.length;
      Save.store();
      b.textContent = shakeLabel();
    }
  } else if (b.dataset.upg){
    const [i, k] = b.dataset.upg.split(':');
    buyUpgrade(+i, +k);
  } else if (b.dataset.buy){
    const [k, i] = b.dataset.buy.split(':');
    buy(k, +i);
  } else if (b.dataset.select){
    const [k, i] = b.dataset.select.split(':');
    select(k, +i);
  }
});

/* ------------------------------ MAIN LOOP ------------------------------ */
function renderMenuBg(dt){
  camX += dt * 90;
  camY = 0; camZoom = 1;
  const w = world();
  drawSky(w);
  drawSun(w, 0);
  drawClouds(w);
  mountainLayer(w.mtn[0].factor, H * w.mtn[0].base, H * w.mtn[0].amp, w.mtn[0].color, 1.7, w.mtn[0].rim, w.mtn[0].snow);
  mountainLayer(w.mtn[1].factor, H * w.mtn[1].base, H * w.mtn[1].amp, w.mtn[1].color, 4.3, w.mtn[1].rim, w.mtn[1].snow);
  drawHills(w);
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}

let last = performance.now();
function loop(now){
  requestAnimationFrame(loop);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05;

  if (state === 'play' && paused){
    Snd.engine(0, 0, false);       // pause : rien n'avance, le dernier cadre reste affiché sous l'écran de pause
  } else if (state === 'play'){
    if (In.restart){ In.restart = false; restartRun(); }   // la distance déjà parcourue est encaissée
    readInput();
    if (mode === 'champ') gateRaceInput();
    // hit-stop : simulation figée en temps réel (le rendu, la secousse et les entrées continuent)
    const frozen = fx.stop > 0;
    if (frozen) fx.stop -= dt;
    const sdt = frozen ? 0 : dt;
    if (!frozen){
      for (const r of rivals) botThink(r, dt);
      const steps = clamp(Math.ceil(dt / (1 / 240)), 1, 8);
      const h = dt / steps;
      for (let i = 0; i < steps; i++){
        physStep(bike, In, h);
        for (const r of rivals) physStep(r, r.inp, h);
      }
      runT += dt;
      recordGhost();
      updateEffects(dt);
      tickRespawns(dt);
      // blocage : repêchage automatique (course libre : 3 au même endroit au plus, puis fin de course)
      stuckCheck(bike, In, dt, mode === 'champ' ? Infinity : 3);
      for (const r of rivals) stuckCheck(r, r.inp, dt, Infinity);
      checkObjectives();                  // missions (vides en championnat) et affichage de la chaîne de style
      if (mode === 'champ') raceTick(dt);
    }
    bike.leanSm = lerp(bike.leanSm, In.lean, 1 - Math.exp(-8 * sdt));
    for (const r of rivals) r.leanSm = lerp(r.leanSm, r.inp.lean, 1 - Math.exp(-8 * sdt));
    renderGame(dt, sdt);
    updateHUD();

    const sp = Math.hypot(bike.vx, bike.vy);
    Snd.engine(sp, In.throttle, !bike.dead && state === 'play');

    if (msgTimer > 0){
      msgTimer -= dt;
      if (msgTimer <= 0) $('hudMsg').classList.remove('show');
    }
  } else if (state === 'menu' || state === 'over'){
    Snd.engine(0, 0, false);
    renderMenuBg(dt);
  }
}
requestAnimationFrame(loop);

/* ------------------------------ BOOT ------------------------------ */
bindTouch();
goMenu();
