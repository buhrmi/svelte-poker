<svelte:options accessors={true}/>

<script>
import player from '../stores/player';
import { fly, fade, crossfade } from 'svelte/transition';
import { quintOut, cubicOut } from 'svelte/easing';
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher();

const [send, receive] = crossfade({
  duration: d => Math.sqrt(d * 1000),

  fallback(node, params) {
    const style = getComputedStyle(node);
    const transform = style.transform === 'none' ? '' : style.transform;

    return {
      duration: 600,
      easing: quintOut,
      css: t => `
        transform: ${transform} scale(${t});
        opacity: ${t}
      `
    };
  }
});

export let state;
const defaultState = {
  seats: [],
	board: [],
	activeSeatIndex: null,
	dealerSeat: null,
	bet: 0,
	pot: 0
};

const initialState = JSON.parse(JSON.stringify(state || defaultState));

export let animations = true;
function duration(time) { return animations ? time : 0 }


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

export function startRound(round) {
  state.board = round.cards
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
    state.maxCommitted = state.seats[seat].committed
  }

  if (action.action == 'Post BB') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].committed += action.amount
    state.seats[seat].stack -= action.amount
    state.seats[seat].lastAction = 'Posted BB'
    state.maxCommitted = state.seats[seat].committed
  }

  if (action.action == 'Fold') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].cards = null
    state.seats[seat].lastAction = 'Folded'
  }

  if (action.action == 'Raise') {
    let seat = getSeatByPlayerId(action.player_id)
    
    // If a player faces a $50 bet and raises by $100 to $150, the amount is $150.
    let oldMaxCommited = state.maxCommitted
    state.seats[seat].committed += action.amount
    state.seats[seat].stack -= action.amount
    state.seats[seat].lastAction = 'Raise'
    state.maxCommitted = state.seats[seat].committed
    state.minRaise = state.maxCommitted - oldMaxCommitted
  }

  if (action.action == 'Check') {
    
  }

  if (action.action == 'Call') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].committed += action.amount
    state.seats[seat].stack -= action.amount
    state.seats[seat].lastAction = 'Called'
    state.maxCommitted = state.seats[seat].committed
  }

  if (action.action == 'Bet') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].committed += action.amount
    state.seats[seat].stack -= action.amount
    state.seats[seat].lastAction = 'Bet'
    state.maxCommitted = state.seats[seat].committed
    state.minRaise = action.amount
  }

}

function seatAlignment(index) {
  return [1,2,3].indexOf(index) == -1 ? 'left' : 'right'
}
</script>

<style lang="scss">
$profileSize: 50px;

.table {
  background-image: url('/felt.png');
  color: white;
  height: 100%;
  width: 100%;
  // background: radial-gradient(ellipse at center, rgba(0,0,0,0) 0%,rgba(0,0,0,0.1) 70%,rgba(0,0,0,0.3) 100%);
}
.seat {
  position: absolute;
  height: 0px;
  width: 0px;
  &.active {
    .profile_pic {
      box-shadow: 0 0 0px 2px yellow;
    }
    .lower_box {
      box-shadow: 0 0 0px 2px yellow;
    }
  }
  .dealer {
    width: $profileSize / 2;
    position: absolute;
    z-index: 3;
    box-shadow: 0 0 4px -2px rgba(0,0,0,0.8);
    border-radius: 10px;
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
    height: $profileSize;
    width: $profileSize * 2;
    bottom: 0;
    overflow: hidden;
    .card {
      width: $profileSize;
      position: absolute;
      &.card_1 {
        left: 0;
      }
      &.card_2 {
        right: 0;
      }
    }
  }
  .lower_box {
    position: absolute;
    width: 160px;
    background: rgba(0,0,0,0.4);
    z-index: 0;
    height: $profileSize / 2;
    bottom: - $profileSize / 2;
  }
  .committed {
    position: absolute;
    top: 0;
  }
  &.right {
    .committed {
      right: 170px;
    }
    .cards {
      right: $profileSize / 2 + 10px;
    }
    .lower_box {
      text-align: right;
      padding-right: $profileSize / 2 + 5px;
      right: 0;
      border-top-left-radius: 100px;
      border-bottom-left-radius: 100px;
    }
  }
  &.left {
    .committed {
      left: 170px;
    }
    .cards {
      left: $profileSize / 2 + 10px;
    }
    .lower_box {
      text-align: left;
      padding-left: $profileSize / 2 + 5px;
      left: 0;
      border-bottom-right-radius: 100px;
      border-top-right-radius: 100px;
    }
  }
  .profile_pic {
    z-index: 1;
    width: 50px;
    height: 50px;
    top: 0;
    left: 0;
    position: absolute;
    transform: translate(-50%, -50%);
    border-radius: 100px;
    vertical-align: middle;
    box-shadow: -1px 1px 2px rgba(0,0,0,0.5);
  }
  &.seat_0 {
    left: $profileSize / 2 + 20px;
    top: calc(0px + 120px);
  }
  &.seat_1 {
    right: $profileSize / 2 + 20px;
    top: calc(0px + 120px);
  }
  &.seat_2 {
    right: $profileSize / 2 + 20px;
    top: calc(120px + 120px);
  }
  &.seat_3 {
    right: $profileSize / 2 + 20px;
    top: calc(240px + 120px);
  }
  &.seat_4 {
    left: $profileSize / 2 + 20px;
    top: calc(240px + 120px);
  }
  &.seat_5 {
    left: $profileSize / 2 + 20px;
    top: calc(120px + 120px);
  }
}
</style>

<div class="table">
  Board: {state.board}<br>
  Committed: {totalCommitted}<br>
  Pot: {state.pot}

  <div class="board">
    {#each state.board as boardCard}
      <img in:fly="{{ y: -25, duration: duration(450) }}" src="/cards/{boardCard.toLowerCase()}.png" alt={boardCard}>
    {/each}
  </div>
  <div class="pot">
  
  </div>
  {#each Array(state.seats.length) as _, index}
    <div class="seat {seatAlignment(index)} seat_{index}" class:active={state.activeSeatIndex == index}>
      {#if state.dealerSeat == index}
        <img class="dealer" in:receive={'dealer'} out:send={'dealer'} src="/button.png" alt="DEALER">
      {/if}
      {#if state.seats[index]}
        {#await player.fetch(state.seats[index].player_id)}
          Loading Player {state.seats[index].player_id}...
        {:then player}
          {#if state.seats[index].cards}
            <div class="cards">
              {#each state.seats[index].cards as card}
                {#if card == '?'}
                  <img class="card" alt="?" src="/cards/back.png">
                {/if}
              {/each}
            </div>
          {/if}
          <img src={player.profile_pic} alt={player.nick} class="profile_pic">
          <div class="lower_box">
            <div class="name">
              {player.nick}
            </div>
            <div class="last_action">
              {state.seats[index].lastAction || ''}
            </div>
            <div class="stack">
              {state.seats[index].stack}
            </div>
          </div>
          <div class="committed">
            {state.seats[index].committed}
          </div>
        {:catch}
          Error loading player...
        {/await}
        {#if !state.seats[index].sitting_in}
          <br>Sitting Out
        {/if}
      {:else}
        <button class="empty_seat btn" on:click={() => dispatch('sitDown', index)}>Empty Seat</button>
      {/if}
    </div>
  {/each}
</div>