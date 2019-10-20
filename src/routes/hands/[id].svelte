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
  import player from '../../stores/player';
  import Table from '../../components/table.svelte';

  export let history;
  let table;

  // Build initial table state from hand history object
  const initialTableState = {seats: Array(history.table_size)}
  for (const player of history.players) {
    player.stack = player.starting_stack;
    player.bet = 0;
    initialTableState.dealerSeat = history.dealer_seat;
    initialTableState.seats[player.seat] = player;
  }

  let currentRoundIndex = 0;
  let currentActionIndex = 0;
  let nextAction;
  $: currentRound = history.rounds[currentRoundIndex];
  $: currentAction = currentRound.actions[currentActionIndex];
  $: firstAction = history.rounds[0].actions[0];
  $: lastRound = history.rounds[history.rounds.length-1];
  $: lastAction = lastRound.actions[lastRound.actions.length-1];
  $: {
    if (currentRoundIndex == history.rounds.length-1 && currentActionIndex == history.rounds[history.rounds.length - 1].actions.length -1) {
      nextAction = null
    }
    else if (currentActionIndex == history.rounds[currentRoundIndex].actions.length-1) {
      nextAction == history.rounds[currentRoundIndex + 1].actions[0]
    }
    else {
      nextAction = history.rounds[currentRoundIndex].actions[currentActionIndex + 1]
    }
  }
  $: {
    if (table) {
      if (nextAction) table.state.nextSeat = table.getSeatByPlayerId(nextAction.player_id)
      else table.state.nextSeat = null
    }
  }
  
  // Automatically perform the very first action in hand history
  onMount(function() {
    table.perform(currentAction);
  });

  function performNextAction() {
    currentActionIndex++;
    if (currentActionIndex == currentRound.actions.length) {
      currentRoundIndex++;
      currentActionIndex = -1;
      table.startRound(history.rounds[currentRoundIndex]);
    }
    else {
      table.perform(history.rounds[currentRoundIndex].actions[currentActionIndex]);
    }

  }

  function performToPreviousAction() {
    // Dont do anything if on the first action in the history
    if (currentRoundIndex == 0 && currentActionIndex == 0) return;

    currentActionIndex--;
    if (currentActionIndex < -1) {
      currentRoundIndex--;
      currentActionIndex = history.rounds[currentRoundIndex].actions.length - 1;
    }
    performTo(currentRoundIndex, currentActionIndex)
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
    currentRoundIndex = roundIndex;
    currentActionIndex = actionIndex;
    tick().then(() => table.animations = true)
  }

</script>

<style lang="scss">
.main_area {
  position: fixed;
  height: 100vh;
  width: 70vw;
  left: 30vw;
}
.history {
  position: fixed;
  height: 100vh;
  width: 30vw;
  left: 0;
  background-image: url('/wood.png');
  color: white;
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
.ui_layer {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  color: white;
  .panel {
    position: absolute;
    bottom: 0;
  }
}
</style>

<div class="history">
  {#each history.rounds as round, roundIndex}
    <div class="round">
      <div on:click={() => {performTo(roundIndex, -1)}} class="action" class:active={currentRoundIndex == roundIndex && currentActionIndex == -1}>*** {round.street == 'preflop' ? 'HOLE CARDS' : round.street.toUpperCase()} ***</div>
      {#each round.actions as action, actionIndex}
        <div on:click={() => {performTo(roundIndex, actionIndex)}} class="action" class:active={currentRoundIndex == roundIndex && currentActionIndex == actionIndex}>
          {#await player.fetch(action.player_id)}{:then player}{player.nick}{/await}
          {action.action} {action.amount ? action.amount : ''}
        </div>
      {/each}
    </div>
  {/each}
</div>

<div class="main_area">
  <Table bind:this={table} state={initialTableState}></Table>
  
  <div class="ui_layer">
    <div class="panel">
      <button class="btn" on:click={performToPreviousAction}>&lt; Rewind</button>
      <button class="btn" on:click={performNextAction}>Next &gt;</button> (Round: {currentRound.street}, Action: {currentActionIndex})
      <div class="debug">
        Player: {$player.nick}<br>
        state: {JSON.stringify(table ? table.state : {})}
      </div>
    </div>
  </div>
</div>

