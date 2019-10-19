<script>
import player from '../stores/player';

export let tableState;

let playerSeatIndex;
$: {
  for (let index = 0; index < $tableState.seats.length; index++) {
    const seat = $tableState.seats[index];
    if (seat && seat.player_id == $player.id) playerSeatIndex = index;
  }
}

// $: playersCards = playerSeatIndex ? $tableState.players[playerSeatIndex].cards : null


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
tableState: {JSON.stringify($tableState)}

<div class="table">  
  <div class="board">
    Board: {JSON.stringify($tableState.board)}, Pot: {$tableState.pot}
  </div>
  {#each Array($tableState.seats.length) as _, index}
    <div class="seat {$tableState.nextSeat == index ? 'active' : ''}">
      {#if $tableState.dealerSeat == index}
        <div class="button">DEALER</div>
      {/if}
      {#if $tableState.seats[index]}
        {#await playerData($tableState.seats[index].player_id)}
          loading...
        {:then player}
          <img src={player.profile_pic} alt={player.nick} class="profile_pic"> {player.nick}
        {:catch}
          error
        {/await}
        {$tableState.seats[index].lastAction || ''}
        Bet: {$tableState.seats[index].bet}, Stack: {$tableState.seats[index].stack}, 
      {:else}
        Seat {index}
      {/if}
    </div>
  {/each}
</div>