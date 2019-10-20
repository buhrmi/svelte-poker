<script context="module">
export async function preload(page, session) {
  const url = process.env.API_URL + '/tables/' + page.params.id + '.json'
  const res = await this.fetch(url, {
    credentials: 'include',
    headers: {
      Authorization: session.access_token
    }
  })
  let tableData = await res.json()
  return { tableData }
}
</script>

<script>
  import { onMount, tick } from 'svelte';
  import player from '../../stores/player';
  import Table from '../../components/table.svelte';
  import { stores } from '@sapper/app';
  let { session, page } = stores();

  export let tableData;
  const initialTableState = {seats: Array(tableData.settings.table_size)};
  let history = {rounds: []};
  let table;

  let currentRoundIndex = 0;
  let currentActionIndex = 0;
  let nextAction;
  $: {
    if (history.rounds[currentRoundIndex]) { // if a round exists.
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
  }
  $: {
    if (table) {
      if (nextAction) table.state.nextSeat = table.getSeatByPlayerId(nextAction.player_id)
      else table.state.nextSeat = null
    }
  }

  let playerIndex;
  $: {
    playerIndex = null
    if ($player && table) {
      for (let index = 0; index < table.state.seats.length; index++) {
        const seat = table.state.seats[index];
        if (seat && seat.id == $player.id) playerIndex = index
      }
    }
  }
  $: isPlayersTurn = table && playerIndex == table.actionIndex
  $: tableState = table && table.state

  let socket;
  let connecting = false;
  let connected = false;
  let wasConnected = false;

  let replayingHistory = false;
  
  onMount(connect)

  function connect() {
    connecting = true
    let connectionString = `${process.env.ENGINE_URL}?table_id=${$page.params.id}`
    const accessToken = $page.query.access_token || $session.access_token;
    if (accessToken) connectionString += `&access_token=${accessToken}`
    socket = new WebSocket(connectionString);
    console.log('Connecting to', connectionString)
    socket.onopen = () => {
      console.log('Connected!')
      wasConnected = true
      connected = true
      connecting = false
    }

    socket.onmessage = (event) => handleMessage(JSON.parse(event.data))
  }

  function handleMessage(message) {
    console.log(message);

    // It's an action 
    if (message.action) {
      history.rounds[history.rounds.length-1].actions.push(message);
      if (!replayingHistory) {
        currentActionIndex++;
        table.perform(message);
      }
    }
    // TODO: It's a new round

    // It's a table state
    if (message.type == 'table-state') {
      // Looks like there is a bug in svelte and reactivity does not work when setting the seats on table.state from outside
      table.setSeats(message.seats)
      table.state.seats = message.seats
    }

    // It's partial hand history
    if (message.rounds) {
      history = message
      table.reset(buildInitialStateFromHistory(history));
    }
  }

  function buildInitialStateFromHistory(history) {
    initialTableState = {seats: Array(history.table_size)};
    for (const player of history.players) {
      player.stack = player.starting_stack;
      player.bet = 0;
      initialTableState.dealerSeat = history.dealer_seat;
      initialTableState.seats[player.seat] = player;
    }
    return initialTableState;
  }

  function fold() {
    socket.send(JSON.stringify({msg: 'fold'}))
  }
  function check() {
    socket.send(JSON.stringify({msg: 'check'}))
  }
  function call() {
    socket.send(JSON.stringify({msg: 'call'}))
  }
  function bet(amount) {
    socket.send(JSON.stringify({msg: 'bet', amount}))
  }
  function raise(amount) {
    socket.send(JSON.stringify({msg: 'raise', amount}))
  }
  async function sitDown(index) {
    await socket.send(JSON.stringify({msg: "sit-down", seat: index}))
    await bringIn($player.balances[tableData.currency]);
    await sitIn();
  }
  async function sitIn() {
    return await socket.send(JSON.stringify({msg: "sit-in"}))
  }
  async function bringIn(amount) {
    return await socket.send(JSON.stringify({msg: "bring-in", amount}))
  }
  function standUp() {
    socket.send(JSON.stringify({msg: "stand-up"}))
  }
  function sitOut() {
    socket.send(JSON.stringify({msg: "sit-out"}))
  }

  function performNextAction() {
    currentActionIndex++;
    if (currentActionIndex == history.rounds[currentRoundIndex].actions.length) {
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
  width: 75vw;
  left: 25vw;
}
.history {
  position: fixed;
  height: 100vh;
  width: 25vw;
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

.panel {
  color: white;
  position: absolute;
  bottom: 0;
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
  <Table bind:this={table} state={initialTableState} on:sitDown={(event) => sitDown(event.detail)}></Table>
    

  <div class="panel">
    {#if replayingHistory}
      <button class="btn" on:click={performToPreviousAction}>&lt; Rewind</button>
      <button class="btn" on:click={performNextAction}>Next &gt;</button> (Round: {history.rounds[currentRoundIndex].street}, Action: {currentActionIndex})
    {:else}
      {#if table && playerIndex}
        <div class="btn {isPlayersTurn ? '' : 'disabled'} fold" on:click={() => fold()}>Fold</div>
        {#if table.state.seats[playerIndex] && table.state.bet == table.state.seats[playerIndex].bet}
          <div class="btn {isPlayersTurn ? '' : 'disabled'} check" on:click={() => check()}>Check</div>
        {:else}
          <div class="btn {isPlayersTurn ? '' : 'disabled'} call" on:click={() => call()}>Call {table.state.bet - table.state.seats[playerIndex].bet}</div>
        {/if}
        
        {#if table.state.bet == 0}
          <div class="btn {isPlayersTurn ? '' : 'disabled'} bet" on:click={() => bet(table.state.minRaise)}>Bet {table.state.minRaise} {#if table.state.seats[playerIndex] && table.state.minRaise == table.state.seats[playerIndex].stack}(All-In){/if}</div>
        {:else}
          <div class="btn {isPlayersTurn ? '' : 'disabled'} raise" on:click={() => raise(state.minRaise)}>Raise {state.minRaise}</div>
        {/if}
      {/if}
    {/if}
    <div class="debug">
      Player: {$player.nick}<br>
      state: {JSON.stringify(table ? table.state : {})}
    </div>
  </div>

</div>

