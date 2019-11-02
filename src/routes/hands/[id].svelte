<script context="module">
export async function preload(page, session) {
  const url = process.env.API_URL + '/hands/' + page.params.id + '.json'
  const res = await this.fetch(url, {
    credentials: 'include',
    headers: {
      Authorization: session.access_token
    }
  })
  let history = await res.json()
  return { history }
}
</script>

<script>
  import { onMount, tick } from 'svelte';
  import { writable } from 'svelte/store'
  import player from '../../stores/player';
  import Table from '../../components/table.svelte';
  import CardString from '../../components/card_string.svelte'

  export let history;
  let table;

  // Build initial table state from hand history object
  let tableState = {seats: Array(history.table_size)}
  for (const player of history.players) {
    player.stack = player.starting_stack;
    player.chips = []
    player.cards = []
    // player.currentChatMessage = 'shitcoins looool buy some love. free handjobs'
    player.committed = 0;
    player.player_id = player.id
    player.sitting_in = true
    tableState.dealerSeat = history.dealer_seat;
    tableState.seats[player.seat] = player;
  }
  const historyPosition = writable({round: 0, action: 0});
  onMount(function() {
    if (window.location.hash) {
      let str = window.location.hash.substr(1)
      // for some reason, calling performTo during the mount process, results in an error
      tick().then(() => performTo(parseInt(str.split(',')[0]), parseInt(str.split(',')[1])))
    }
    else {
      tick().then(() => performTo(0,0))
    }
    historyPosition.subscribe(function(position) {
      window.location.hash = "#" + position.round + ',' + position.action
    })
  })

  let nextAction;
  $: currentRound = history.rounds[$historyPosition.round];
  $: currentAction = currentRound.actions[$historyPosition.action];
  $: firstAction = history.rounds[0].actions[0];
  $: lastRound = history.rounds[history.rounds.length-1];
  $: lastAction = lastRound.actions[lastRound.actions.length-1];
  $: {
    if ($historyPosition.round == history.rounds.length-1 && $historyPosition.action == history.rounds[history.rounds.length - 1].actions.length -1) {
      nextAction = null
    }
    else if ($historyPosition.action == history.rounds[$historyPosition.round].actions.length-1) {
      nextAction == history.rounds[$historyPosition.round + 1].actions[0]
    }
    else {
      nextAction = history.rounds[$historyPosition.round].actions[$historyPosition.action + 1]
    }
    if (table) {
      if (nextAction) tableState.activeSeatIndex = table.getSeatByPlayerId(nextAction.player_id)
      else tableState.activeSeatIndex = null
    }
  }
  
  let playerIndex;
  $: {
    playerIndex = null
    if ($player) {
      for (let index = 0; index < tableState.seats.length; index++) {
        const seat = tableState.seats[index];
        if (seat && seat.player_id == $player.id) playerIndex = index
      }
    }
  }

  function performNextAction() {
    $historyPosition.action++;
    if ($historyPosition.action == currentRound.actions.length && currentRound == lastRound) {
      table.playWinningAnimation(history.pots)
    }
    else if ($historyPosition.action == currentRound.actions.length) {
      $historyPosition.round++;
      $historyPosition.action = -1;
      table.startRound(history.rounds[$historyPosition.round]);
    }
    else {
      table.perform(history.rounds[$historyPosition.round].actions[$historyPosition.action]);
    }

  }

  function performToPreviousAction() {
    // Dont do anything if on the first action in the history
    if ($historyPosition.round == 0 && $historyPosition.action == 0) return;

    $historyPosition.action--;
    if ($historyPosition.action < -1) {
      $historyPosition.round--;
      $historyPosition.action = history.rounds[$historyPosition.round].actions.length - 1;
    }
    performTo($historyPosition.round, $historyPosition.action)
  }

  // Resets the table state and performs every action until we reach roundIndex, actionIndex
  function performTo(roundIndex, actionIndex) {
    table.reset();
    table.animations = false;
    for (let ri = 0; ri <= roundIndex; ri++) {
      const round = history.rounds[ri];
      table.startRound(round);
      for (let ai = 0; ai <= (ri == roundIndex ? actionIndex : round.actions.length - 1); ai++) {
        const action = round.actions[ai];
        table.perform(action);
      }
    }
    $historyPosition.round = roundIndex;
    $historyPosition.action = actionIndex;
    tick().then(() => table.animations = true)
  }

</script>

<style lang="scss">
@mixin narrow {
  @media (max-width: 800px) { @content; }
}
.game_area {
  background-image: url('/felt.png');
  position: fixed;
  height: 100vh;
  width: 70vw;
  left: 30vw;
  @include narrow {
    width: 100vw;
    left: 0;
  }
}
.history {
  position: fixed;
  height: 100vh;
  width: 30vw;
  left: 0;
  background-image: url('/wood.png');
  color: white;
  @include narrow {
    display: none;
  }
  overflow-y: auto;
  .pots {
    padding-left: 16px;
  }
  .action {
    padding: 2px;
    padding-left: 16px;
    position: relative;
    cursor: pointer;
    &:hover {
      background-color: rgba(255,255,255,0.1);
    }
    &.active:before {
      content: '▶';
      position: absolute;
      left: 0px;
    }
  }
}
.panel {
  z-index: 10;
  background: url('/wood.png');
  position: absolute;
  bottom: 0;
  width: 100%;
  text-align: center;
  height: 10%;
  .btn {
    width: 40%;
    height: 100%;
  }
}

</style>

<div class="history">
  {#each history.rounds as round, roundIndex}
    <div class="round">
      <div on:click={() => {performTo(roundIndex, -1)}} class="action" class:active={$historyPosition.round == roundIndex && $historyPosition.action == -1}>*** {round.street == 'preflop' ? 'HOLE CARDS' : round.street.toUpperCase()} *** <CardString cards={round.cards}></CardString></div>
      {#each round.actions as action, actionIndex}
        <div on:click={() => {performTo(roundIndex, actionIndex)}} class="action" class:active={$historyPosition.round == roundIndex && $historyPosition.action == actionIndex}>
          {#await player.fetch(action.player_id)}loading...{:then player}{player.nick}{/await}
          {action.action} {action.amount ? action.amount : ''}
          {#if action.cards}
            <CardString cards={action.cards}></CardString>
          {/if}
        </div>
      {/each}
    </div>
  {/each}
  <div class="pots">
    {#each history.pots as pot}
      {#each pot.player_wins as win}
        {#if win.win_amount > 0}
          <div class="winnings">
            {#await player.fetch(win.player_id)}loading...{:then player}{player.nick} wins {win.win_amount}{/await}
          </div>
        {/if}
      {/each}
    {/each}
  </div>
</div>

<div class="game_area">
  <Table bind:state={tableState} bind:this={table} bind:heroIndex={playerIndex}></Table>
  
  <div class="panel">
    <button class="btn" on:click={performToPreviousAction}>&lt; Back</button>
    <button class="btn" on:click={performNextAction}>Next &gt;</button>
    <div class="debug">
      <!-- Player: {$player.nick}<br> -->
      <!-- state: {JSON.stringify(tableState)} -->
    </div>
  </div>
</div>

