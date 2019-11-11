<svelte:options accessors={true}/>

<script>
import {player, showDialog} from '@/shared';
import { fly, fade, crossfade, scale } from 'svelte/transition';
import { quintOut, cubicOut } from 'svelte/easing';
import { createEventDispatcher, tick, onMount } from 'svelte';
import { vortex } from '@/transitions'
import Player from './player.svelte'
import solver from 'pokersolver';
// This component is on a player seat
import Stack from './stack.svelte'

// this is to render chips anywhere except on player seats
import Chips from './chips.svelte'

import Timer from './timer.svelte'

const dispatch = createEventDispatcher();

const [send, receive] = crossfade({
  duration: d => Math.sqrt(d * 1000),

  fallback(node, params) {
    const style = getComputedStyle(node);
    const transform = style.transform === 'none' ? '' : style.transform;

    return {
      duration: 0,
      easing: quintOut,
      css: t => `
        transform: ${transform} scale(${t});
        opacity: ${t}
      `
    };
  }
});

function deal(node, {rotate = 0, card, seat, duration}) {
  const style = getComputedStyle(node);
  const transform = style.transform === 'none' ? '' : style.transform;
  const fromRect = pot.getBoundingClientRect();
  const targetRect = node.getBoundingClientRect();
  const fromX = fromRect.left + fromRect.width / 2 - targetRect.width / 2;
  // const fromY = fromRect.top + fromRect.height / 2 - targetRect.height / 2;
  const fromY = -80;
  const deltaX = fromX - targetRect.left;
  const deltaY = fromY - targetRect.top;
  const delay = 120 * card;
  const transition = {
    delay: zeroIfAnimationsDisabled(delay),
    duration,
    easing: quintOut,
    css: t => {
      if (!animations) t = 1 // workaround for svelte applying animations even duration is 0 (i think it's caching the transition object)
      return `
        transform: translate(${deltaX*(1-t)}px, ${deltaY*(1-t)}px) rotate(${rotate * Math.pow(t, 80)}deg) scale(${0.8 + (t / 5)});
        z-index: ${t < 0.7 ? 10000-delay : 3};
      `
    }
  }
  return transition;
}

export let state;
export let tableData = {settings:{}};

export let heroIndex = 1;
export let isShowDown = false;
let totalPlayerChips;

$: {
  totalPlayerChips = 0
   for (let index = 0; index < state.seats.length; index++) {
    const seat = state.seats[index];
    if (seat) totalPlayerChips += seat.stack
  }
  totalPlayerChips += totalCommitted + state.pot
}
let pot;
let seatElements = [];
let playerSize = 36;

const defaultState = {
  seats: [],
  board: [],
  strongestCards: [],
	activeSeatIndex: null,
	dealerSeat: null,
	bet: 0,
	pot: 0
};

let initialState = JSON.parse(JSON.stringify(state || defaultState));

export let animations = true;
function zeroIfAnimationsDisabled(time) { return animations ? time : 0 }


export function reset(newInitialState) {
  if (newInitialState) initialState = newInitialState;
  state = Object.assign({}, defaultState, JSON.parse(JSON.stringify(initialState)));
}

reset();

export function getSeatByPlayerId(playerId) { 
  for (let index = 0; index < state.seats.length; index++) {
    const seat = state.seats[index];
    if (seat && seat.player_id == playerId) return index
  }
}

let timerProgress = 0

function updateTimer() {
  requestAnimationFrame(updateTimer)
  if (!state.actionStarted || !state.actionTimeout) return
  const now = new Date().getTime()
  const start = state.actionStarted;
  const end = state.actionTimeout
  timerProgress = 100 * (now - start) / (end - start)
}
onMount(() => requestAnimationFrame(updateTimer))

// let playersSeatIndex;
// $: {
//   for (let index = 0; index < state.seats.length; index++) {
//     const seat = state.seats[index];
//     if (seat && seat.player_id == $player.id) playersSeatIndex = index;
//   }
// }
// $: playersSeat = state.seats[playersSeatIndex]

export let totalCommitted = 0;
$: {
  let result = 0;
  state.seats.filter(s=>s).map(s => result += s.committed);
  totalCommitted = Math.max(totalCommitted, result)
}
$: {
  state.maxCommitment = 0
  for (let i = 0; i < state.seats.filter(s=>s).length; i++) {
    const seat = state.seats.filter(s=>s)[i];
    if (seat.committed > state.maxCommitment) state.maxCommitment = seat.committed
  }
}

let solvedHands = []
let strongestCards = []
$: {
  solvedHands = []
  strongestCards = []
  for (let i = 0; i < state.seats.length; i++) {
    const seat = state.seats[i];
    if (!seat) continue;
    if (!seat.cards || seat.cards.length == 0 || seat.cards[0] == '?') continue;
    const cards = state.board.concat(seat.cards)
    solvedHands[i] = solver.Hand.solve(cards)
    strongestCards = Hand.winners(solvedHands.filter(s=>s)).toString()
    strongestCards = strongestCards.replace(/10/g,'T')
  }
}

// round is a handhistory.org round object
// this is only called by the hand replayer, not live play.
export function startRound(round) {
  if (round.cards && round.cards.length > 0) state.board = state.board.concat(round.cards)
  state.seats.filter(n=>n).map((seat) => seat.lastAction = null)
  let amountToAdd = 0
  isShowDown = round.street=='showdown'
  state.seats.filter(n=>n).map((seat) => {
    amountToAdd += seat.committed
    seat.chips = []
    seat.committed = 0;
  })

  state.minRaiseTo = state.big_blind_amount
  if (animations) {
    setTimeout(() => {
      state.pot += amountToAdd;
      totalCommitted = 0
    }, 500)
  }
  else {
    state.pot += amountToAdd;
    totalCommitted = 0
  }
}

let winningPots
export let winningSeats = []
export let currentHand

export function playWinningAnimation(pots) {
  // Show the chips, then hide them again instantly: Let svelte do the animation as the out-transition
  state.pot = 0
  winningPots = pots;
  for (let i = 0; i < pots.length; i++) {
    const pot = pots[i];
    for (let pwi = 0; pwi < pot.player_wins.length; pwi++) {
      const win = pot.player_wins[pwi];
      if (typeof win.seat_id !== 'number') win.seat_id = getSeatByPlayerId(win.player_id)
      if (win.win_amount > 0) winningSeats.push(win.seat_id)
      winningSeats = winningSeats
    }
  }
  tick().then(() => winningPots = null)
}

// See https://hh-specs.handhistory.org/action-object/action for a list of possible actions
export function perform(action) {
  winningSeats = []
  winningPots = []

  if (action.action == 'Deal Cards') {
    let seat = getSeatByPlayerId(action.player_id)
    if (typeof seat !== 'number') return
    state.seats[seat].cards = action.cards
  }

  if (action.action == 'Post SB') {
    let seat = getSeatByPlayerId(action.player_id)
    if (typeof seat !== 'number') return
    state.seats[seat].committed += action.amount
    state.seats[seat].stack -= action.amount
    doderp(seat, action.action, action.amount)
    if (state.seats[seat].stack < 0) debugger
    state.seats[seat].lastAction = 'Post SB'
  }

  if (action.action == 'Post BB') {
    let seat = getSeatByPlayerId(action.player_id)
    if (typeof seat !== 'number') return
    state.seats[seat].committed += action.amount
    state.seats[seat].stack -= action.amount
    doderp(seat, action.action, action.amount)
    if (state.seats[seat].stack < 0) debugger
    state.seats[seat].lastAction = 'Post BB'
    state.minRaiseTo = 2 * action.amount
  }

  if (action.action == 'Post Dead') {
    let seat = getSeatByPlayerId(action.player_id)
    if (typeof seat !== 'number') return
    state.seats[seat].committed += action.amount
    state.seats[seat].stack -= action.amount
    doderp(seat, action.action, action.amount)
    if (state.seats[seat].stack < 0) debugger
    state.seats[seat].lastAction = 'Post Dead'
    state.minRaiseTo = 2 * action.amount
  }

  if (action.action == 'Fold') {
    let seat = getSeatByPlayerId(action.player_id)
    if (typeof seat !== 'number') return
    state.seats[seat].cards = []
    state.seats[seat].lastAction = 'Fold'
  }

  if (action.action == 'Raise') {
    let seat = getSeatByPlayerId(action.player_id)
    if (typeof seat !== 'number') return
    // If a player faces a $50 bet and raises by $100 to $150, the amount is $150.
    state.minRaiseTo = 2 * (state.seats[seat].committed + action.amount) - state.maxCommitment
    state.seats[seat].committed += action.amount
    state.seats[seat].stack -= action.amount
    doderp(seat, action.action, action.amount)
    if (state.seats[seat].stack < 0) debugger
    state.seats[seat].lastAction = 'Raise' 
  }

  if (action.action == 'Check') {
    let seat = getSeatByPlayerId(action.player_id)
    if (typeof seat !== 'number') return
    state.seats[seat].lastAction = 'Check'
  }

  if (action.action == 'Call') {
    let seat = getSeatByPlayerId(action.player_id)
    if (typeof seat !== 'number') return
    state.seats[seat].committed += action.amount
    state.seats[seat].stack -= action.amount
    doderp(seat, action.action, action.amount)
    if (state.seats[seat].stack < 0) debugger
    state.seats[seat].lastAction = 'Call'
  }

  if (action.action == 'Bet') {
    let seat = getSeatByPlayerId(action.player_id)
    if (typeof seat !== 'number') return
    state.seats[seat].committed += action.amount
    state.seats[seat].stack -= action.amount
    doderp(seat, action.action, action.amount)
    if (state.seats[seat].stack < 0) debugger
    state.seats[seat].lastAction = 'Bet'
    state.minRaiseTo = 2 * action.amount
  }

  if (action.action == 'Shows Cards') {
    let seat = getSeatByPlayerId(action.player_id)
    if (typeof seat !== 'number') return
    isShowDown = true
    state.seats[seat].cards = action.cards
    state.seats[seat].lastAction = null
  }

}

// onMount(function() {
//   setInterval(function() {
//     heroIndex++
//     heroIndex %= 7
//     if (strongestCards.length == 0) {
//       state.seats[2].cards = ['As', 'Ac']
//       strongestCards = ['As', '4d', 'Jc']
//     }
//     else {
//       strongestCards = []
//       // state.seats[2].cards = ['?', '?']
//     }
//     state.seats = state.seats

//   }, 1000)
// })

function seatClass(index) {
  // We rotate the seat so that "heroIndex" always is in the bottom center
  index = (state.seats.length + index - heroIndex) % state.seats.length
  if (index === 0) return 'middle'
  return [1,2,3].indexOf(index) == -1 ? 'right' : 'left'
}

function seatCSS(index) {
  // We rotate the seat so that "heroIndex" always is in the bottom center
  index = (state.seats.length + index - heroIndex) % state.seats.length
  let panelHeight = '23%';
  if (index == 0) {
    return `left: calc(50%);top: calc(100% - ${panelHeight});`
  }
  else if (index == 1) {
    return `left: calc(${playerSize}px / 2 + 10%);top: 366px;`
  }
  else if (index == 2) {
    return `left: calc(${playerSize}px / 2 + 10%);top: 255px;`
  }
  else if (index == 3) {
    return `left: calc(${playerSize}px / 2 + 10%);top: 95px;`
  }
  else if (index == 4) {
    return `left: calc(100% - (${playerSize}px / 2 + 10%));top: 95px;`
  }
  else if (index == 5) {
    return `left: calc(100% - (${playerSize}px / 2 + 10%));top: 255px;`
  }
  else if (index == 6) {
    return `left: calc(100% - (${playerSize}px / 2 + 10%));top: 366px;`
  }
}

function doderp(seat, msg, amount) {
    if (!window.derp) window.derp = {}
    if (!window.derp[seat]) window.derp[seat] = []
    window.derp[seat].push(msg, amount)
  }

</script>

<style lang="scss">


@mixin narrow {
  @media (max-width: 800px) { @content; }
}

.table {
  color: white;
  height: 100%;
  width: 100%;
  min-width: 356px;
  position: absolute;
  // background: radial-gradient(ellipse at center, rgba(0,0,0,0) 0%,rgba(0,0,0,0.1) 70%,rgba(0,0,0,0.3) 100%);
  .board {
    width: 55%;
    max-width: 550px;
    position: absolute;
    left: 50%;
    top: 140px;
    transform: translate(-50%, 0);
    .cards {
      // height: var(--playerSize) * 1.4;
      transition: all 0.3s;
      top: 0;
      &.showing_down {
        .card {
          position: relative;
          filter: brightness(60%);
          &.strongest {
            transform: scale(1.0) translateY(-20px) !important;
            z-index: 15;
            box-shadow: 0 0 53px 6px white;
            filter: brightness(100%);
          }
        }
      }
      .card {
        width: calc(20%);
        max-width: 100px;
        transition: all 0.3s;
        transform: scale(1);
      }
    }
  }
  .pot {
    top: 40%;
    width: 100%;
    text-align: center;
    font-size: 20px;
    position: absolute;
    .collected {
      background: rgba(0,0,0,0.5);
      border-radius: 20px;
      display: inline-block;
      .amount {
        display: inline-block;
        padding-right: 12px;
        padding-left: 4px;
      }
    }
    .total {
      text-align: center;
      font-size: 15px;
    }
    .player_wins {
      position: absolute;
      width: 100%;
      height: 0;
      z-index: 10;
      text-align: center;
    }
  }
}
.table_data {
  top: 50%;
  width: 100%;
  color: #eee;
  opacity: 0.5;
  text-align: center;
  position: absolute;
  user-select: none;
}
.seat {
  position: absolute;
  height: 0px;
  width: 0px;
  transition: all 0.5s;
  &.sittingout {
    opacity: 0.7;
    filter: brightness(70%);
  }
  .profile_pic {
    background: rgba(255,255,0,0);
    box-shadow: 0 0 20px 20px rgba(255,255,0,0);
    transition: all 0.3s;
    border-radius: 100%;
    cursor: pointer;
  }
  &.active {
    .profile_pic {
      background: rgba(255,255,0,0.4);
      box-shadow: 0 0 20px 20px rgba(255,255,0,0.4);
    }
  }
  &.winning {
    .profile_pic {
      background: rgba(255,255,255,0.6);
      box-shadow: 0 0 33px 33px rgba(255,255,255,0.6);
    }
  }
  .timer {
    mix-blend-mode: screen;
    opacity: 0.8;
    z-index: 3;
  }
  .empty_seat {
    padding: 6px 30px;
    position: absolute;
    top: 0;
    left: 0;
    border-radius: 13px;
    transform: translate(-50%, -50%);
  }
  .hand_descr {
    position: absolute;
    z-index: 10;
    transform: translate(-50%, 0);
    top: calc(var(--playerSize) * -2);
    white-space: nowrap;
  }
  .cards {
    position: absolute;
    height: var(--playerSize);
    width: calc(var(--playerSize) * 1.65);
    bottom: -6px;
    transform: translate(-50%, 0);
    // overflow: hidden;
    z-index: 1;
    transition: all 0.3s;
    .card {
      width: calc(var(--playerSize) * 0.9);
      position: absolute;
      box-shadow: 0 0 5px rgba(0,0,0,0.6);
      transition: all 0.3s;
      &.card_0 {
        transform: rotateZ(-5deg) rotateY(180deg);
        left: 0;
        &.turned {
          transform: rotateZ(-5deg);
        }
      }
      &.card_1 {
        transform: rotateZ(12deg) rotateY(180deg);
        right: 0;
        &.turned {
          transform: rotateZ(12deg);
        }
      }
    }
    &.showing_down {
      .card {
        filter: brightness(60%);
        &.turned {
          transform: rotateY(0);
        }
        &.strongest {
          box-shadow: 0 0 53px 6px white;
          transform: translateY(-10%);
          filter: brightness(100%);
        }
      }
    }
    // @include narrow {
    //   width: var(--playerSize) * 1.4;
    //   height: var(--playerSize) / 1.4;
    //   .card {
    //     width: var(--playerSize) * 1.4 / 2;
    //   }
    // }
  }
  .detailsbox {
    cursor: pointer;
    position: absolute;
    width: calc(var(--playerSize) * 2.4);
    height: calc(var(--playerSize));
    z-index: 4;
    transform: translate(-50%, 0);
    text-align: center;
    box-shadow: 2px 3px 12px rgba(0,0,0,0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .committed {
    position: absolute;
    top: 16px;
    white-space: nowrap;
    .chips {
      position: relative;
      width: calc(var(--playerSize) / 1.6);
    }
  }
  .profile_pic, .timer {
    position: absolute;
    // transform: translate(-50%, -50%);
    width: calc(var(--playerSize) * 2);
    height: calc(var(--playerSize) * 2);
    transform: translate(-50%, 0);
    bottom: calc(var(--playerSize) / -2);
  }
  .profile_pic .pic {
    width: 100%;
    height: 100%;
  }
  .dealer {
    width: calc(var(--playerSize) / 1.5);
    position: absolute;
    z-index: 5;
    box-shadow: 0 0 4px -2px rgba(0,0,0,0.8);
    border-radius: 10px;
    top: calc(var(--playerSize) / 1.5);
  }
  .last_action {
    position: absolute;
    white-space: nowrap;
    z-index: 10;
    padding: 1px 2px;
    font-size: 12px;
    line-height: 13px;
  	background: linear-gradient(to bottom, #1e6037 0%,#288a46 50%,#237f40 51%,#37c15e 100%); /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */
    text-align: center;
    display: inline-block;
    color: white;
    text-shadow: 0 0 18px black;
    // border: 1px solid #44cc44;
    // box-shadow: 0 0 10px #22aa22;
    border-radius: 20px;
    &.Fold {
      background: linear-gradient(to bottom, #9a451e 0%,#d8532a 50%,#ca4b20 51%,#e8957e 100%); /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */
      // border: 1px solid #e22e2e;
      // box-shadow: 0 0 10px #bb0f0f;
    }
    &.Raise, &.Bet {
      background: linear-gradient(to bottom, #9a8b1e 0%,#d8b52a 50%,#caab20 51%,#e8d17e 100%); /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */
      // border: 1px solid #fab73b;
      // box-shadow: 0 0 10px #eb9f12;
    }
  }
  &.right {
    .dealer {
      right: calc(var(--playerSize) * -1.5);
    }
    .last_action {
      top: 24px;
      right: calc(var(--playerSize) * 1.25);
    }
    .committed {
      right: calc(var(--playerSize) * 1.35);
      text-align: right;
    }
    
  }
  &.left {
    .dealer {
      left: calc(var(--playerSize) * -1.5);
    }
    .last_action {
      top: 24px;
      left: calc(var(--playerSize) * 1.25); 
    }
    .committed {
      left: calc(var(--playerSize) * 1.35); 
    }
  }
  &.middle {
    .dealer {
      top: calc(var(--playerSize) / 0.8);
      left: calc(var(--playerSize) * -4.7);
    }
    .cards {
      width: calc(var(--playerSize) * 3);
      bottom: calc(var(--playerSize) * 0.1);
      .card {
        width: calc(var(--playerSize) * 1.8);
      }
    }
    .profile_pic, .timer {
      left: calc(var(--playerSize) * -3);
      width: calc(var(--playerSize) * 2);
      height: calc(var(--playerSize) * 2);
      bottom: -30px;
    }
    .detailsbox {
      left: calc(var(--playerSize) * -3);
      bottom: calc(var(--playerSize) * -1.5);
      width: calc(var(--playerSize) * 3);
    }
    .committed {
      text-align: center;
      top: calc(var(--playerSize) * -1.7);
      left: calc(var(--playerSize) * -2.3);
    }
    .last_action {
      transform: translate(-50%, 0);
      bottom: -19px;
      left: calc(var(--playerSize) * -3);
    }
  }
}


</style>

<div class="table" style="--playerSize: {playerSize}px" class:callingout={strongestCards && strongestCards.length > 0}>
  <div class="table_data">
    Blinds: {tableData.settings.small_blind_amount}/{tableData.settings.big_blind_amount}
    &nbsp;&nbsp;&nbsp;&nbsp;
    {#if tableData.settings.ante}
      Ante: {tableData.settings.ante}
    {:else}
      No Ante
    {/if}
    <br>Total Chips In Play: {totalPlayerChips}<br>
    {#if currentHand.game_number}
      Game #{currentHand.game_number}
    {/if}
    
  </div>
  <div class="board">
    <div class="cards" class:showing_down={isShowDown}>
      {#each Array(5) as _, index}
        {#if state.board[index]}
          <img class="card" class:strongest={strongestCards && strongestCards.indexOf(state.board[index]) !== -1} out:fade={{duration: zeroIfAnimationsDisabled(300)}} in:deal="{{ seat: 0, card:index,y: -25, duration: zeroIfAnimationsDisabled(450) }}" src="/cards/{state.board[index].toLowerCase()}.png" alt={state.board[index]}>
        {/if}
      {/each}
    </div>
  </div>
  <div class="pot">
    {#if winningPots}
      {#each winningPots as winningPot}
        {#each winningPot.player_wins as win}
          <div class="player_wins">
            <div out:vortex={{target: seatElements[win.seat_id], duration: zeroIfAnimationsDisabled(700)}}>
              <Chips amount={win.win_amount} width={playerSize * 0.8}></Chips>
            </div>
          </div>
        {/each}
      {/each}
    {/if}
      <div class="collected" bind:this={pot}>
        {#if state.pot > 0}
          <Chips amount={state.pot} width={playerSize * 0.8}></Chips>
          <div class="amount">{state.pot.toLocaleString()}</div>
        {/if}
      </div>
    {#if totalCommitted + state.pot > 0}
      <div class="total">
        {(totalCommitted + state.pot).toLocaleString()} 
      </div>
    {/if}
  </div>
  {#each Array(state.seats.length) as _, index}
    <div class="seat seat_{index} {seatClass(index, heroIndex)}" class:sittingout={state.seats[index] && !state.seats[index].sitting_in} class:winning={winningSeats.indexOf(index) !== -1} style={seatCSS(index, heroIndex)} class:active={state.activeSeatIndex == index} bind:this={seatElements[index]}>
      {#if state.seats[index]}
        <div class="player" transition:scale>
          {#if state.seats[index].currentChatMessage}
            <p in:fade="{{ duration: 100 }}" out:fly="{{ y: -8, duration: 650 }}" class="bubble speech">{state.seats[index].currentChatMessage}</p>
          {/if}
          {#if state.dealerSeat == index}
            <img class="dealer" in:receive={'dealer'} out:send={'dealer'} src="/button.png" alt="DEALER">
          {/if}

          {#if state.seats[index].cards}
            <div class="cards" class:showing_down={isShowDown}>
              {#each state.seats[index].cards as card, cardIndex}
                <img class="card card_{cardIndex}" class:strongest={strongestCards.indexOf(card) !== -1} class:turned={card !== '?'} alt="?" src="/cards/{card == '?' ? 'back' : card.toLowerCase()}.png" out:fly={{duration: zeroIfAnimationsDisabled(600)}} in:deal|local={{rotate: cardIndex == 0 ? -5 : 12, card: cardIndex, seat: index, duration: zeroIfAnimationsDisabled(800)}}>  
              {/each}
            </div>
            {#if solvedHands[index]}
            <div transition:fly class="hand_descr">
              {solvedHands[index].descr}
            </div>
            {/if}
          {/if}
        
          {#await player.fetch(state.seats[index].player_id) then player}
            {#if state.seats[index]}
              <div class="profile_pic" on:click={() => showDialog({component: Player, title: player.nick, player})}>
                <img src={player.profile_pic} alt={player.nick} class="pic">
              </div>
              <div class="detailsbox glossy" on:click={() => showDialog({component: Player, title: player.nick, player})}>
                {#if state.activeSeatIndex == index}
                  <div class="glow"></div>
                {/if}
                <div class="name link">
                  {player.nick}
                </div>
                <div class="stack">
                  {state.seats[index].stack.toLocaleString()}
                </div>
              </div>
            {/if}
          {:catch}
            Error loading player...
          {/await}
          {#if state.activeSeatIndex == index}
          <div class="timer">
            <Timer progress={timerProgress}></Timer>
          </div>
          {/if}
          {#if state.seats[index].lastAction}
            <div transition:scale class="last_action {state.seats[index].lastAction}">
              {state.seats[index].lastAction }
            </div>
          {/if}
          <div class="committed">
            {#if state.seats[index].committed > 0}
              <div out:vortex|local={{target: pot, duration: zeroIfAnimationsDisabled(500)}} class="chips">
                <Stack seatClass={seatClass(index)} seat={state.seats[index]}></Stack>
              </div>
            {/if}
          </div>
        </div>
      {:else if typeof(heroIndex) !== 'number'}
        <div class="btn alt empty_seat" in:scale on:click={() => dispatch('sitDown', index)}>Empty Seat</div>
      {/if}
    </div>
  {/each}
</div>
