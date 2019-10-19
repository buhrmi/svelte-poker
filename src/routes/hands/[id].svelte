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
  import createTableState from '../../stores/tableState.js'

  export let history;
  
  // Build initial table state from hand history object
  const initial = {seats: Array(history.table_size)}
  for (const player of history.players) {
    player.stack = player.starting_stack;
    player.bet = 0;
    initial.dealerSeat = history.dealer_seat;
    initial.seats[player.seat] = player;
  }

  const tableState = createTableState(initial);

  let currentRoundIndex = 0;
  let currentActionIndex = 0;
  let nextAction;
  $: currentRound = history.rounds[currentRoundIndex];
  $: currentAction = currentRound.actions[currentActionIndex];
  $: firstAction = history.rounds[0].actions[0];
  $: lastRound = history.rounds[history.rounds.length-1];
  $: lastAction = lastRound.actions[lastRound.actions.length-1];
  $: { // nextAction =
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
  $: { // $tableState.nextSeat =
    if (nextAction) {
      // currently crashes with an error on the console.
      // $tableState.nextSeat = tableState.getSeatByPlayerId(nextAction.player_id)
    }
    else {
      // $tableState.nextSeat = null
    }
  }
  
  // Automatically perform the very first action in hand history
  onMount(function() {
    tableState.perform(currentAction);  
  });

  function performNextAction() {
    currentActionIndex++;
    if (currentActionIndex == currentRound.actions.length) {
      currentRoundIndex++;
      currentActionIndex = 0;
    }

    tableState.perform(history.rounds[currentRoundIndex].actions[currentActionIndex]);
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
    tableState.reset();
    for (let ri = 0; ri <= roundIndex; ri++) {
      const round = history.rounds[ri];
      for (let ai = 0; ai <= (ri == roundIndex ? actionIndex : round.actions.length - 1); ai++) {
        const action = round.actions[ai];
        tableState.perform(action);
      }
    }
  }

</script>

<button disabled={currentAction == firstAction} on:click={prevAction}>&lt;</button>
<button disabled={currentAction == lastAction} on:click={performNextAction}>&gt;</button> (Round: {currentRound.street}, Action: {currentActionIndex})

<Table {tableState}></Table>