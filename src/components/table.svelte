<svelte:options accessors={true}/>

<script>
import player from '../stores/player';

const defaultState = {
	seats: [],
	board: [],
	nextSeat: null,
	dealerSeat: null,
	bet: 0,
	pot: 0
};

export let state;

const initialState = JSON.parse(JSON.stringify(state));

export function reset() {
  state = Object.assign({}, defaultState, JSON.parse(JSON.stringify(initialState)));
}

reset();

export function getSeatByPlayerId(playerId) {
  for (let index = 0; index < state.seats.length; index++) {
    const seat = state.seats[index];
    if (seat && seat.player_id == playerId) return index
  }
}

let playerSeatIndex;
$: {
  for (let index = 0; index < state.seats.length; index++) {
    const seat = state.seats[index];
    if (seat && seat.player_id == $player.id) playerSeatIndex = index;
  }
}
$: playersCards = playerSeatIndex ? state.seats[playerSeatIndex].cards : null


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
    state.seats[seat].bet += action.amount
    state.seats[seat].stack -= action.amount
    state.seats[seat].lastAction = 'Posted SB'
    state.bet = state.seats[seat].bet
  }

  if (action.action == 'Post BB') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].bet += action.amount
    state.seats[seat].stack -= action.amount
    state.seats[seat].lastAction = 'Posted BB'
    state.bet = state.seats[seat].bet 
  }


  if (action.action == 'Fold') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].cards = null
    state.seats[seat].lastAction = 'Folded'
  }

  if (action.action == 'Raise') {
    let seat = getSeatByPlayerId(action.player_id)
    
    // If a player faces a $50 bet and raises by $100 to $150, the amount is $150.
    state.seats[seat].bet += action.amount
    state.seats[seat].stack -= action.amount
    state.seats[seat].lastAction = 'Raise'
    state.bet = state.seats[seat].bet
  }

  if (action.action == 'Check') {
    
  }

  if (action.action == 'Call') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].bet += action.amount
    state.seats[seat].stack -= action.amount
    state.seats[seat].lastAction = 'Called'
    state.bet = state.seats[seat].bet
    
  }

  if (action.action == 'Bets') {
    let seat = getSeatByPlayerId(action.player_id)
    state.seats[seat].bet += action.amount
    state.seats[seat].stack -= action.amount
    state.seats[seat].lastAction = 'Bet'			
  }

  // trigger reactivity
  state = state
}



const cachedPlayerData = {}
async function playerData(playerId) {
  if (typeof window == 'undefined') return
  if (cachedPlayerData[playerId]) return cachedPlayerData[playerId];
  const res = await fetch(process.env.API_URL+`/players/${playerId}.json`)
  const json = await res.json()
  return cachedPlayerData[playerId] = json
}

</script>

<style lang="scss">
.table {
  background-image: url('/felt.png');
  color: white;
}
.seat {
  padding: 4px 12px;
  border: 1px solid black;
  &.active {
    border: 1px solid yellow;
  }
}
.profile_pic {
  margin-top: 4px;
  width: 50px;
  height: 50px;
  border-radius: 100px;
  vertical-align: middle;
  box-shadow: -1px 1px 2px rgba(0,0,0,0.5);
}
</style>

Player: {$player.nick}<br>
state: {JSON.stringify(state)}

<div class="table">  
  <div class="board">
    Board: {JSON.stringify(state.board)}, Pot: {state.pot}
  </div>
  {#each Array(state.seats.length) as _, index}
    <div class="seat {state.nextSeat == index ? 'active' : ''}">
      {#if state.dealerSeat == index}
        <div class="button">DEALER</div>
      {/if}
      {#if state.seats[index]}
        {#await playerData(state.seats[index].player_id)}
          loading...
        {:then player}
          <img src={player.profile_pic} alt={player.nick} class="profile_pic"> {player.nick}
        {:catch}
          error
        {/await}
        {state.seats[index].lastAction || ''}
        Bet: {state.seats[index].bet}, Stack: {state.seats[index].stack}, 
      {:else}
        Seat {index}
      {/if}
    </div>
  {/each}
</div>