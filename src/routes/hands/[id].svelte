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
  import { onMount } from 'svelte';
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
    if (currentAction == lastAction) {
      nextAction == null
    }
    if (currentActionIndex == currentRound.actions.length) {
      nextAction == history.rounds[currentRoundIndex + 1].actions[0]
    }
    else {
      nextAction = currentRound.actions[currentActionIndex + 1]
    }
  }
  $: {
    if (nextAction) {      
      if (table) table.state.nextSeat = table.getSeatByPlayerId(nextAction.player_id)
    }
    else {
      if (table) table.state.nextSeat = null
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
      currentActionIndex = 0;
    }

    table.perform(history.rounds[currentRoundIndex].actions[currentActionIndex]);
  }

  function prevAction() {
    // Dont do anything if on the first action in the history
    if (currentRoundIndex == 0 && currentActionIndex == 0) return;

    currentActionIndex--;
    if (currentActionIndex == -1) {
      currentRoundIndex--;
      currentActionIndex = currentRound.actions.length - 1;
    }
    performTo(currentRoundIndex, currentActionIndex)
  }

  // Resets the table state and performs every action until we reach roundIndex, actionIndex
  function performTo(roundIndex, actionIndex) {
    table.reset();
    for (let ri = 0; ri <= roundIndex; ri++) {
      const round = history.rounds[ri];
      for (let ai = 0; ai <= (ri == roundIndex ? actionIndex : round.actions.length - 1); ai++) {
        const action = round.actions[ai];
        table.perform(action);
      }
    }
  }

</script>

<button disabled={currentAction == firstAction} on:click={prevAction}>&lt;</button>
<button disabled={currentAction == lastAction} on:click={performNextAction}>&gt;</button> (Round: {currentRound.street}, Action: {currentActionIndex})

<Table bind:this={table} state={initialTableState}></Table>