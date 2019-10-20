<svelte:options accessors={true}/>

<script>
import player from '../stores/player';
import { fly, fade } from 'svelte/transition';
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher();

export let state;
const defaultState = {
  seats: [],
	board: [],
	nextSeat: null,
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
    if (seat && seat.id == playerId) return index
  }
}

let playerSeatIndex;
$: {
  for (let index = 0; index < state.seats.length; index++) {
    const seat = state.seats[index];
    if (seat && seat.id == $player.id) playerSeatIndex = index;
  }
}
$: playersCards = playerSeatIndex ? state.seats[playerSeatIndex].cards : null


export function startRound(round) {
  state.board = round.cards
}

export function setSeats(seats) {
  state.seats = seats
}

// See https://hh-specs.handhistory.org/action-object/action for a list of possible actions
export function perform(action) {
  console.log('mutating with', action)

  if (action.action == 'Stands Up') {
    let seat = getSeatByPlayerId(action.player_id)	
    state.seats[seat] = {}
  }

  if (action.action == 'Sits Down') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat] = {player_id: action.player_id, bet: 0, stack: 0, cards: null}
  }

  if (action.action == 'Added Chips') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].stack += action.amount
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

</script>

<style lang="scss">
.table {
  background-image: url('/felt.png');
  color: white;
  height: 100%;
  width: 100%;
  // background: radial-gradient(ellipse at center, rgba(0,0,0,0) 0%,rgba(0,0,0,0.1) 70%,rgba(0,0,0,0.3) 100%);
}
.seat {
  position: absolute;
  &.active {
    border: 1px solid yellow;
  }
  .profile_pic {
    width: 50px;
    height: 50px;
    border-radius: 100px;
    vertical-align: middle;
    box-shadow: -1px 1px 2px rgba(0,0,0,0.5);
  }
  &.seat_0 {
    left: 15px;
    top: calc(0px + 120px);
  }
  &.seat_1 {
    right: 15px;
    top: calc(0px + 120px);
  }
  &.seat_2 {
    right: 15px;
    top: calc(90px + 120px);
  }
  &.seat_3 {
    right: 15px;
    top: calc(180px + 120px);
  }
  &.seat_4 {
    left: 15px;
    top: calc(180px + 120px);
  }
  &.seat_5 {
    left: 15px;
    top: calc(90px + 120px);
  }
}
</style>

<div class="table">  
  <div class="board">
    {#each state.board as boardCard}
      <img in:fly="{{ y: -25, duration: duration(450) }}" src="/cards/{boardCard.toLowerCase()}.png">
    {/each}
  </div>
  <div class="pot">
  </div>
  {#each Array(state.seats.length) as _, index}
    <div class="seat seat_{index}" class:active={state.nextSeat == index}>
      {#if state.dealerSeat == index}
        <div class="button">DEALER</div>
      {/if}
      {#if state.seats[index]}
        {#await player.fetch(state.seats[index].id)}
          loading...
        {:then player}
          <img src={player.profile_pic} alt={player.nick} class="profile_pic"> {player.nick}
        {:catch}
          error
        {/await}
        {state.seats[index].lastAction || ''}
        Bet: {state.seats[index].committed}, Stack: {state.seats[index].stack}, 
      {:else}
        <button class="btn" on:click={() => dispatch('sitDown', index)}>Empty Seat</button>
      {/if}
    </div>
  {/each}
</div>