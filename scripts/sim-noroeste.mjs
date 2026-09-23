/**
 * Duelo reproducible de estrategias, sin red ni base de producción.
 * 250 repartos iniciales x 5 perfiles x dos posiciones = 2500 partidas a 30.
 * Simula cartas, pardas, mano, envido, real/falta, truco/retruco/vale cuatro.
 * El espejo aproxima el servidor: el test SQL verifica la función real aparte.
 * Ejecutar: node scripts/sim-noroeste.mjs
 */
import assert from 'node:assert/strict'

const suits=['espada','basto','oro','copa']
const values=[1,2,3,4,5,6,7,10,11,12]
function rank(v,s) {
  if(v===1&&s==='espada')return 1;if(v===1&&s==='basto')return 2
  if(v===7&&s==='espada')return 3;if(v===7&&s==='oro')return 4
  if(v===3)return 5;if(v===2)return 6;if(v===1)return 7
  if(v===12)return 8;if(v===11)return 9;if(v===10)return 10
  if(v===7)return 11;if(v===6)return 12;if(v===5)return 13;return 14
}
const deck=suits.flatMap(suit=>values.map(value=>({suit,value,rank:rank(value,suit)})))
const key=c=>`${c.suit}:${c.value}`
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x))
function hash(...parts) {
  let x=2166136261
  for(const part of parts.join(':')) {x^=part.charCodeAt(0);x=Math.imul(x,16777619)}
  return x>>>0
}
function randomFrom(...parts) {return hash(...parts)/2**32}
function deal(seed,hand) {
  const cards=[...deck];let x=hash(seed,hand,'deck')||1
  for(let i=cards.length-1;i>0;i--) {
    x^=x<<13;x^=x>>>17;x^=x<<5
    const j=(x>>>0)%(i+1);[cards[i],cards[j]]=[cards[j],cards[i]]
  }
  return [cards.slice(0,3),cards.slice(3,6)]
}
function envido(cards) {
  let best=0
  for(const suit of suits) {
    const points=cards.filter(c=>c.suit===suit).map(c=>c.value<=7?c.value:0).sort((a,b)=>b-a)
    if(points.length>=2)best=Math.max(best,20+points[0]+points[1])
    else if(points.length)best=Math.max(best,points[0])
  }
  return best
}
function knownOdds(rank,unseen) {
  return unseen.reduce((s,c)=>s+(c.rank>rank?1:c.rank===rank?.5:0),0)/Math.max(1,unseen.length)
}
function northwestInfo(player,state,profile) {
  const full=state.hands[player], remaining=state.remaining[player]
  const shown=state.played.find(c=>c.round===state.round&&c.player!==player)?.card
  const known=new Set([...full,...state.played.filter(c=>c.player!==player).map(c=>c.card)].map(key))
  const unseen=deck.filter(c=>!known.has(key(c)))
  const standing=state.results.filter(r=>r===player).length-state.results.filter(r=>r===1-player).length
  let weight={paciente:.43,agresivo:.51,farolera:.48,marcador:.47,calculador:.45}[profile]
  if(state.round===2)weight=shown?.90:standing>0?.42:.55
  if(state.round>=3)weight=1
  let best=null,bestScore=-100
  for(const card of remaining) {
    const current=shown
      ? card.rank<shown.rank?1:card.rank===shown.rank?(state.mano===player?.63:.42):0
      : knownOdds(card.rank,unseen)
    const future=Math.max(0,...remaining.filter(c=>key(c)!==key(card)).map(c=>knownOdds(c.rank,unseen)))
    const score=weight*current+(1-weight)*future-(15-card.rank)*(state.round===1?.004:.001)
    if(score>bestScore||score===bestScore&&card.rank>best.card.rank) {
      bestScore=score;best={card,current,future,standing}
    }
  }
  if(!best)return {card:null,chance:0}
  const {current,future}=best
  let chance=state.round>=3?current:standing>0?1-(1-current)*(1-future)
    :standing<0?current*future:current*future+(1-current)*current*future
  chance=clamp(chance+(state.mano===player?.04:0)+(profile==='calculador'?.02:0),.02,.98)
  return {...best,chance}
}
function legacyInfo(player,state) {
  const remaining=state.remaining[player]
  const standing=state.results.filter(r=>r===player).length-state.results.filter(r=>r===1-player).length
  const eff=Math.round(remaining.reduce((s,c)=>s+15-c.rank,0)*3/Math.max(1,remaining.length))+standing*6
  const shown=state.played.find(c=>c.round===state.round&&c.player!==player)?.card
  let card
  if(shown) card=[...remaining].filter(c=>c.rank<shown.rank).sort((a,b)=>b.rank-a.rank)[0]
             ??[...remaining].sort((a,b)=>b.rank-a.rank)[0]
  else {
    const sorted=[...remaining].sort((a,b)=>a.rank-b.rank)
    card=standing<0||state.round>=2?sorted[0]:sorted[Math.floor((sorted.length-1)/2)]
  }
  return {eff,card}
}
function canEnvido(player,state) {
  return !state.envidoDone && state.round===1 && state.trucoValue===1 &&
    !state.played.some(c=>c.player===player)
}
function wantsEnvido(player,state,profile,noise) {
  if(process.env.NOROESTE_CARDS_ONLY==='1'||process.env.NOROESTE_NO_ENVIDO==='1')return null
  if(!canEnvido(player,state))return null
  const et=envido(state.hands[player])
  if(profile==='legacy')return et>=27||et>=23&&noise<.858||et<=20&&noise<.14
    ?et>=32?'real_envido':'envido':null
  const chance=clamp(.16+(et-20)*.055,.04,.97)
  const bluff={paciente:.015,calculador:.015,marcador:.015,agresivo:.045,farolera:.08}[profile]
  if(chance>.32&&noise<Math.min(1,.60+(chance-.32)*.70)||
     et<=19&&noise<bluff&&state.scores[1-player]+2<30)
    return chance>.88&&state.scores[player]+3>=30?'real_envido':'envido'
  return null
}
function acceptsEnvido(player,state,profile,type) {
  const et=envido(state.hands[player]);if(profile==='legacy')return et>={envido:20,real_envido:24,falta_envido:29}[type]
  const chance=clamp(.16+(et-20)*.055,.04,.97)
  const val=type==='falta_envido'?30-Math.max(...state.scores):type==='real_envido'?3:2
  const need=type==='falta_envido'?.80:type==='real_envido'?.51:.36
  return (type!=='falta_envido'||et>=29)&&chance>=Math.max(need,(val-1)/(2*val)+.10)+
    (state.scores[1-player]+val>=30?.06:0)
}
function runEnvido(state,seed,hand) {
  for(const singer of [state.mano,1-state.mano]) {
    const type=wantsEnvido(singer,state,state.strategies[singer],randomFrom(seed,hand,singer,'envido'))
    if(!type)continue
    state.envidoDone=true
    const other=1-singer
    let finalType=type
    const et=envido(state.hands[other])
    if(type==='envido'&&et>=31&&randomFrom(seed,hand,other,'raiseenv')<.30)
      finalType='real_envido'
    if(type==='real_envido'&&et>=31&&randomFrom(seed,hand,other,'raiseenv')<.16)
      finalType='falta_envido'
    const accepter=finalType===type?other:singer
    if(!acceptsEnvido(accepter,state,state.strategies[accepter],finalType)) {
      state.scores[1-accepter]+=finalType===type?1:2
    } else {
      const val=finalType==='falta_envido'?30-Math.max(...state.scores):finalType==='real_envido'?3:2
      const points=state.hands.map(envido)
      state.scores[points[0]===points[1]?state.mano:points[0]>points[1]?0:1]+=val
    }
    break
  }
}
function singsTruco(player,state,profile,seed,hand,stage) {
  if(process.env.NOROESTE_CARDS_ONLY==='1'||process.env.NOROESTE_NO_TRUCO==='1')return false
  const noise=randomFrom(seed,hand,state.round,player,stage)
  if(profile==='legacy') {
    const {eff}=legacyInfo(player,state)
    return state.trucoValue===1&&(eff>=24&&noise<.91||eff<=12&&noise<.175) ||
      state.trucoValue>1&&state.lastSinger!==player&&state.trucoValue<4&&eff>=30&&noise<.445
  }
  const chance=northwestInfo(player,state,profile).chance
  const bluff={paciente:.015,calculador:.015,marcador:.015,agresivo:.045,farolera:.08}[profile]
  const opening={paciente:.68,calculador:.62,farolera:.62,agresivo:.56,
    marcador:state.scores[player]<state.scores[1-player]?.57:.66}[profile]
  return state.trucoValue===1&&(chance>opening||chance<.24&&noise<bluff&&state.scores[1-player]+2<30)||
    state.trucoValue>1&&state.lastSinger!==player&&state.trucoValue<4&&chance>.78&&noise<.18&&
    state.scores[1-player]+state.trucoValue+1<30
}
function responseTruco(player,state,profile,seed,hand) {
  if(profile==='legacy') {
    const {eff}=legacyInfo(player,state)
    const noise=randomFrom(seed,hand,state.round,player,'respond')
    return eff>=30&&state.trucoValue<4&&noise<.445?'raise':eff>=12?'yes':'no'
  }
  const chance=northwestInfo(player,state,profile).chance
  const noise=randomFrom(seed,hand,state.round,player,'respond')
  if(state.trucoValue<4&&chance>.78&&noise<.25&&state.scores[1-player]+state.trucoValue+1<30)
    return 'raise'
  return chance>=.42+(state.scores[1-player]+state.trucoValue>=30?.12:0)-
    (state.scores[player]+state.trucoValue>=30?.06:0)?'yes':'no'
}
function runTruco(singer,state,seed,hand) {
  let proposer=singer
  for(let n=0;n<3;n++) {
    const previous=state.trucoValue
    state.trucoValue=Math.min(4,previous+1)
    const receiver=1-proposer
    const answer=responseTruco(receiver,state,state.strategies[receiver],seed,hand)
    if(answer==='no') {
      state.scores[proposer]+=previous;return true
    }
    state.lastSinger=proposer
    if(answer!=='raise'||state.trucoValue===4)return false
    proposer=receiver
  }
  return false
}
function resolveRound(state,winner) {
  state.results.push(winner)
  const [a,b,c]=state.results
  if(state.results.length===2) {
    if(a===b&&a!==null)return a
    if(a!==null&&b===null)return a
    if(a===null&&b!==null)return b
  }
  if(state.results.length===3) {
    if(c!==null)return c
    if(a!==null)return a
    if(b!==null)return b
    return state.mano
  }
  return null
}
function playGame(seed,profile,swap) {
  const strategies=swap?['legacy',profile]:[profile,'legacy']
  const scores=[0,0]
  for(let hand=0;hand<300&&Math.max(...scores)<30;hand++) {
    const hands=deal(seed,hand),mano=hand%2
    const state={strategies,scores,hands,mano,remaining:hands.map(h=>[...h]),played:[],results:[],
      round:1,envidoDone:false,trucoValue:1,lastSinger:null}
    runEnvido(state,seed,hand)
    if(Math.max(...scores)>=30)break
    let lead=mano,done=false
    for(let round=1;round<=3&&!done;round++) {
      state.round=round
      const played=[]
      for(const player of [lead,1-lead]) {
        if(canEnvido(player,state)) {
          const type=wantsEnvido(player,state,strategies[player],randomFrom(seed,hand,round,player,'lateenv'))
          if(type)runEnvido(state,seed,hand)
        }
        if(Math.max(...scores)>=30) {done=true;break}
        if((state.trucoValue===1||state.trucoValue<4&&state.lastSinger!==player)&&
           singsTruco(player,state,strategies[player],seed,hand,'sing')) {
          if(runTruco(player,state,seed,hand)){done=true;break}
        }
        const card=strategies[player]==='legacy'?legacyInfo(player,state).card
          :northwestInfo(player,state,strategies[player]).card
        assert.ok(card)
        const idx=state.remaining[player].findIndex(c=>key(c)===key(card));assert.ok(idx>=0)
        state.remaining[player].splice(idx,1)
        state.played.push({player,round,card});played.push({player,card})
      }
      if(done)break
      const winner=played[0].card.rank===played[1].card.rank?null:
        played[0].card.rank<played[1].card.rank?played[0].player:played[1].player
      const handWinner=resolveRound(state,winner)
      if(handWinner!==null){scores[handWinner]+=state.trucoValue;done=true}
      lead=winner??mano
    }
    if(!done)throw Error(`mano sin cerrar seed=${seed} hand=${hand}`)
  }
  if(Math.max(...scores)<30)throw Error(`partida sin terminar seed=${seed}`)
  return {winner:scores[0]>=30?0:1,scores}
}

// Táctica y privacidad en el espejo: misma información pública y semilla,
// dos cartas humanas escondidas diferentes -> exactamente la misma decisión.
const own=[deck.find(c=>c.rank===1),deck.find(c=>c.rank===5),deck.find(c=>c.rank===14)]
const sample={hands:[own,[deck[6],deck[7],deck[8]]],remaining:[own.slice(0,2),[]],
  mano:0,round:2,played:[{round:2,player:1,card:deck.find(c=>c.rank===11)}],results:[0],scores:[5,5]}
const first=northwestInfo(0,sample,'calculador')
assert.equal(first.card.rank,5,'ganar con la menor carta suficiente y guardar el ancho')
sample.hands[1]=[deck[20],deck[22],deck[24]]
assert.deepEqual(northwestInfo(0,sample,'calculador'),first,'sin lectura de mano oculta')

const profiles=['paciente','calculador','agresivo','farolera','marcador']
const trials=Number(process.env.NOROESTE_TRIALS??250)
const seedStart=Number(process.env.NOROESTE_SEED_START??1)
let wins=0,games=0,draws=0
const byProfile={}
for(const profile of profiles) {
  let w=0,n=0,margin=0
  for(let seed=seedStart;seed<seedStart+trials;seed++)for(const swap of [false,true]) {
    const result=playGame(seed,profile,swap)
    const northwestSeat=swap?1:0
    if(result.winner===northwestSeat){wins++;w++}
    margin+=result.scores[northwestSeat]-result.scores[1-northwestSeat]
    n++;games++
  }
  byProfile[profile]={wins:w,games:n,rate:+(w/n*100).toFixed(2),averageMargin:+(margin/n).toFixed(2)}
}
const rate=wins/games,z=1.96,center=(rate+z*z/(2*games))/(1+z*z/games)
const half=z*Math.sqrt(rate*(1-rate)/games+z*z/(4*games*games))/(1+z*z/games)
console.log(JSON.stringify({seedRange:[seedStart,seedStart+trials-1],profiles:byProfile,games,wins,losses:games-wins,
  winRate:+(rate*100).toFixed(2),wilson95:[+(100*(center-half)).toFixed(2),+(100*(center+half)).toFixed(2)],
  notes:'Modelo espejo: manos a 30, sin flor; mazo igual y posiciones intercambiadas; no mide partidas reales ni latencia SQL.'},null,2))
