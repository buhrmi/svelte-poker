<svelte:options accessors={true}/>

<script>
import player from '../stores/player';
import { fly, fade, crossfade } from 'svelte/transition';
import { quintOut, cubicOut } from 'svelte/easing';
import { createEventDispatcher } from 'svelte';
import { vortex } from '@/transitions'
import Stack from './stack.svelte'
import { onMount } from 'svelte';


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
export let heroIndex = 1;
let pot;
let seatElements = [];
let playerSize = 36;

const defaultState = {
  seats: [],
  board: [],
  calledOutCards: [],
	activeSeatIndex: null,
	dealerSeat: null,
	bet: 0,
	pot: 0
};

const initialState = JSON.parse(JSON.stringify(state || defaultState));

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

// let playersSeatIndex;
// $: {
//   for (let index = 0; index < state.seats.length; index++) {
//     const seat = state.seats[index];
//     if (seat && seat.player_id == $player.id) playersSeatIndex = index;
//   }
// }
// $: playersSeat = state.seats[playersSeatIndex]

let totalCommitted;
$: {
  let result = 0;
  state.seats.filter(s=>s).map(s => result += s.committed);
  totalCommitted = result
}
$: {
  state.maxCommitment = 0
  for (let i = 0; i < state.seats.filter(s=>s).length; i++) {
    const seat = state.seats.filter(s=>s)[i];
    if (seat.committed > state.maxCommitment) state.maxCommitment = seat.committed
  }
}

export function startRound(round) {
  if (round.cards && round.cards.length > 0) state.board = round.cards
  state.seats.filter(n=>n).map((seat) => seat.lastAction = null)
  state.seats.filter(n=>n).map((seat) => {
    state.pot += seat.committed;
    seat.committed = 0;
    seat.chips = []
  })
  state.minRaiseTo = state.big_blind_amount
}

// See https://hh-specs.handhistory.org/action-object/action for a list of possible actions
export function perform(action) {
  if (action.action == 'Deal Cards') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].cards = ['?', '?']
  }

  if (action.action == 'Post SB') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].committed += action.amount
    state.seats[seat].stack -= action.amount
    state.seats[seat].lastAction = 'Posted SB'
  }

  if (action.action == 'Post BB') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].committed += action.amount
    state.seats[seat].stack -= action.amount
    state.seats[seat].lastAction = 'Posted BB'
    state.minRaiseTo = 2 * action.amount
  }

  if (action.action == 'Fold') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].cards = []
    state.seats[seat].lastAction = 'Folded'
  }

  if (action.action == 'Raise') {
    let seat = getSeatByPlayerId(action.player_id)
    
    // If a player faces a $50 bet and raises by $100 to $150, the amount is $150.
    let oldMinRaiseTo = state.minRaiseTo
    state.seats[seat].committed += action.amount
    state.seats[seat].stack -= action.amount
    state.seats[seat].lastAction = 'Raise'
    state.minRaiseTo = 2 * state.seats[seat].committed - state.minRaiseTo
  }

  if (action.action == 'Check') {
    
  }

  if (action.action == 'Call') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].committed += action.amount
    state.seats[seat].stack -= action.amount
    state.seats[seat].lastAction = 'Called'
  }

  if (action.action == 'Bet') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].committed += action.amount
    state.seats[seat].stack -= action.amount
    state.seats[seat].lastAction = 'Bet'
    state.minRaiseTo = 2 * action.amount
  }

  if (action.action == 'Shows Cards') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].cards = action.cards
  }

}

// onMount(function() {
//   setInterval(function() {
//     heroIndex++
//     heroIndex %= 7
//     if (state.calledOutCards.length == 0) {
//       state.seats[2].cards = ['As', 'Ac']
//       state.calledOutCards = ['As', '4d', 'Jc']
//     }
//     else {
//       state.calledOutCards = []
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
  let panelHeight = '20%';
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
    return `left: calc(${playerSize}px / 2 + 10%);top: 65px;`
  }
  else if (index == 4) {
    return `left: calc(100% - (${playerSize}px / 2 + 10%));top: 65px;`
  }
  else if (index == 5) {
    return `left: calc(100% - (${playerSize}px / 2 + 10%));top: 255px;`
  }
  else if (index == 6) {
    return `left: calc(100% - (${playerSize}px / 2 + 10%));top: 366px;`
  }
}

</script>

<style lang="scss">


@mixin narrow {
  @media (max-width: 800px) { @content; }
}
.table.callingout {
  .card:not(.calledout) {
    opacity: 0.3;
  }
}
.table {
  background-image: url('/felt.png');
  color: white;
  height: 100%;
  width: 100%;
  // background: radial-gradient(ellipse at center, rgba(0,0,0,0) 0%,rgba(0,0,0,0.1) 70%,rgba(0,0,0,0.3) 100%);
  .board {
    width: 55%;
    position: absolute;
    left: 50%;
    top: 130px;
    transform: translate(-50%, 0);
    .cards {
      // height: var(--playerSize) * 1.4;
      .card {
        width: calc(20%);
        transition: all 0.3s;
        &.calledout {
          transform: scale(1.1) translateY(-20px) !important;
          z-index: 10;
          box-shadow: 0 0 0px 3px #d612dd;
        }
      }
    }
    .pot {
      margin-top: 20px;
      width: 100%;
      text-align: center;
      font-size: 20px;
    }
    .committed {
      text-align: center;
      font-size: 15px;
    }
  }
}
.seat {
  position: absolute;
  height: 0px;
  width: 0px;
  transition: all 0.5s;
  &.active {
    .profile_pic img {
      box-shadow: 0 0 0px 2px yellow;
    }
    .detailsbox {
      box-shadow: 0 0 0px 2px yellow;
    }
  }
  .btn.empty_seat {
    position: absolute;
    top: 0;
    left: 0;
    border-radius: 10px;
    transform: translate(-50%, -50%);
  }
  
  .cards {
    position: absolute;
    height: var(--playerSize);
    width: calc(var(--playerSize) * 1.65);
    bottom: -6px;
    transform: translate(-50%, 0);
    // overflow: hidden;
    z-index: 1;
    .card {
      width: calc(var(--playerSize) * 0.9);
      position: absolute;
      box-shadow: 0 0 2px rgba(0,0,0,0.8);
      transition: all 0.3s;
      &.card_0 {
        transform: rotate(-5deg) rotateY(180deg);
        left: 0;
        &.turned {
          transform: rotateZ(0) translate(0px, -10px) scale(1.3);
        }
      }
      &.card_1 {
        transform: rotate(12deg) rotateY(180deg);
        right: 0;
        &.turned {
          transform: rotateZ(0) translate(0px, -10px) scale(1.3);
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
    position: absolute;
    width: calc(var(--playerSize) * 2);
    height: calc(var(--playerSize));
    background: rgba(0, 0, 0, 0.8);
    z-index: 2;
    transform: translate(-50%, 0);
    border-radius: 10px;
    text-align: center;
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
  .profile_pic {
    position: absolute;
    // transform: translate(-50%, -50%);
    transition: all 0.3s;
    z-index: 0;
    width: calc(var(--playerSize) * 2);
    height: calc(var(--playerSize) * 2);
    transform: translate(-50%, 0);
    bottom: calc(var(--playerSize) / -2);
    .pic {
      box-shadow: -1px 1px 2px rgba(0,0,0,0.5);
      border-radius: 100px;
      width: 100%;
      height: 100%;
    }
  }
  .dealer {
    width: calc(var(--playerSize) / 1.5);
    position: absolute;
    z-index: 3;
    box-shadow: 0 0 4px -2px rgba(0,0,0,0.8);
    border-radius: 10px;
    top: calc(var(--playerSize) / 1.5);
  }
  .last_action {
    position: absolute;
    white-space: nowrap;
    bottom: calc(var(--playerSize) * -1);
  }
  &.right, &.left {
    .card.calledout {
      transform: scale(1.2) translateY(-6px) !important;
      z-index: 10;
      box-shadow: 0 0 0px 3px #d612dd;
    }
  }
  &.right {
    .dealer {
      right: calc(var(--playerSize) * -1.5);
    }
    .committed, .last_action {
      right: calc(var(--playerSize) * 1.25);
      text-align: right;
    }
    
  }
  &.left, &.middle {
    .dealer {
      left: calc(var(--playerSize) * -1.5);
    }
    
  }
  &.left {
    .committed, .last_action {
      left: calc(var(--playerSize) * 1.25); 
    }
  }
  &.middle {
    .cards {
      width: calc(var(--playerSize) * 3);
      .card {
        width: calc(var(--playerSize) * 2);
        &.calledout {
          transform: translateY(-50px) !important;
          z-index: 10;
          box-shadow: 0 0 0px 3px #d612dd;
        }
        &.card_0 {
          &.turned {
            transform: rotateZ(0) translate(-20px, -100px);
          }
        }
        &.card_1 {
          &.turned {
            transform: rotateZ(0) translate(20px, -100px);
          }
        }
      }
    }
    .profile_pic {
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
    .committed, .last_action {
      text-align: center;
      top: calc(var(--playerSize) * -1.7);
      left: calc(var(--playerSize) * -2.3);
    }
  }
}
</style>

<div class="table" style="--playerSize: {playerSize}px" class:callingout={state.calledOutCards.length > 0}>
  <div class="board">
    <div class="cards">
      {#each state.board as card, index}
        <img class="card" class:calledout={state.calledOutCards.indexOf(card) !== -1} in:deal="{{ seat: 0, card:index,y: -25, duration: zeroIfAnimationsDisabled(450) }}" src="/cards/{card.toLowerCase()}.png" alt={card}>
      {/each}
    </div>
    <div bind:this={pot} class="pot">
      Pot: {state.pot}
      <div class="committed">
        {totalCommitted}
      </div>
    </div>
  </div>
  <div class="pot">
  
  </div>
  {#each Array(state.seats.length) as _, index}
    <div class="seat {seatClass(index, heroIndex)}" style={seatCSS(index, heroIndex)} class:active={state.activeSeatIndex == index} bind:this={seatElements[index]}>
      {#if state.seats[index]}
        {#if state.seats[index].currentChatMessage}
          <p in:fade="{{ duration: 100 }}" out:fly="{{ y: -8, duration: 650 }}" class="bubble speech">{state.seats[index].currentChatMessage}</p>
        {/if}
        {#if state.dealerSeat == index}
          <img class="dealer" in:receive={'dealer'} out:send={'dealer'} src="/button.png" alt="DEALER">
        {/if}
        <!-- TODO: this is calling player.fetch a lot of times... why? -->
        <div class="cards">
          {#each state.seats[index].cards as card, cardIndex}
            <img class="card card_{cardIndex}" class:calledout={state.calledOutCards.indexOf(card) !== -1} class:turned={card !== '?'} alt="?" src="/cards/{card == '?' ? 'back' : card.toLowerCase()}.png" out:fly={{y: -60, x: cardIndex == 0 ? -20 : 20, duration: zeroIfAnimationsDisabled(600)}} in:deal|local={{rotate: cardIndex == 0 ? -5 : 12, card: cardIndex, seat: index, duration: zeroIfAnimationsDisabled(600)}}>  
          {/each}
        </div>
      
        {#await player.fetch(state.seats[index].player_id) then player}
          <div class="profile_pic">
            <img src={player.profile_pic} alt={player.nick} class="pic">
          </div>
          <div class="detailsbox">
            <div class="name">
              {player.nick}
            </div>
            <div class="stack">
              {state.seats[index].stack}
            </div>
          </div>
        {:catch}
          Error loading player...
        {/await}
        
        <div class="last_action">
          {state.seats[index].lastAction || ''}<br>
        </div>
        <div class="committed">
          {#if state.seats[index].committed > 0}
            <div out:vortex|local={{target: pot, duration: zeroIfAnimationsDisabled(700)}} class="chips">
              <Stack seatClass={seatClass(index)} seat={state.seats[index]}></Stack>
            </div>
          {/if}
        </div>
        {#if !state.seats[index].sitting_in}
          <br>Sitting Out
        {/if}
      {:else}
        <button class="empty_seat btn" on:click={() => dispatch('sitDown', index)}>Empty Seat</button>
      {/if}
    </div>
  {/each}
</div>
