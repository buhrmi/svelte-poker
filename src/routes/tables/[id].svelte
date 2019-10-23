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
  let tableState = {settings: tableData.settings, seats: Array(tableData.settings.table_size)};
  let table;
  let history = {rounds: []};
  let hands = [{history}]

  let currentRoundIndex = 0;
  let currentActionIndex = 0;
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
  $: isPlayersTurn = playerIndex == tableState.activeSeatIndex
  $: isPlayerSittingIn = playerIndex && tableState.seats[playerIndex].sitting_in
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

    // It's an action from https://hh-specs.handhistory.org/action-object/action
    if (message.action) {
      if (history.rounds[history.rounds.length-1]) history.rounds[history.rounds.length-1].actions.push(message);
      if (!replayingHistory) {
        currentActionIndex++;
        table.perform(message);
      }
    }
    // if the message has a "street" property, it's the beginning of a new round
    if (message.type == 'betting-round-started') {
      // Looks like there is a bug in svelte and reactivity does not work when setting tableState.seats directly.
      history.rounds.push({street: message.betting_round, actions: [], cards: message.board})
      tableState.board = message.board
    }

    if (message.type == 'betting-round-ended') {
      tableState.activeSeatIndex = null
      tableState.seats.filter(n=>n).map((s) => s.lastAction = null)
      tableState.seats.filter(n=>n).map((seat) => seat.committed = 0)
    }

    if (message.type == 'action-is-on') {
      // Looks like there is a bug in svelte and reactivity does not work when setting tableState.seats directly.
      tableState.activeSeatIndex = message.seat
      tableState.actionStarted = new Date().getTime()
      tableState.actionTimeout = new Date(message.timeout).getTime()
    }

    // It's a table state
    if (message.type == 'table-state') {
      // Looks like there is a bug in svelte and reactivity does not work when setting tableState.seats directly.
      tableState.seats = message.seats
    }

    if (message.type == 'sit-down') {
      tableState.seats[message.seat] = {player_id: message.player_id, committed: 0, stack: 0, chips: []}
    }

    if (message.type == 'stand-up') {
      tableState.seats[message.seat] = null
    }

    if (message.type == 'sit-in') {
      tableState.seats[message.seat].sitting_in = true 
    }

    if (message.type == 'sit-out') {
      tableState.seats[message.seat].sitting_in = false
    }

    if (message.type == 'bring-in') {
      tableState.seats[message.seat].stack += message.amount
    }

    if (message.type == 'hand-started') {
      history = {rounds: []}
      hands.push({id: null, history})
    }

    // It's partial hand history
    if (message.type == 'history') {
      // got partial history
      history = message
      table.reset(buildTableStateFromHistory(history));
      // TODO: replay hand
    }
  }

  function buildTableStateFromHistory(history) {
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

  async function fakeDeposit() {
    let url = process.env.API_URL+'/deposits'
    const res = await fetch(url, {
      credentials: 'include',
      method: 'POST'
    })
    // const json = await res.json()
    player.reload()
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
  {#each hands as hand, handIndex}
    <div class="hand">
      <div class="action">--- NEW HAND ---</div>
      {#each hand.history.rounds as round, roundIndex}
        <div class="round">
          <div on:click={() => {performTo(roundIndex, -1)}} class="action" class:active={currentRoundIndex == roundIndex && currentActionIndex == -1}>*** {round.street == 'preflop' ? 'HOLE CARDS' : round.street.toUpperCase()} ***</div>
          {#each round.actions as action, actionIndex}
            <div on:click={() => {performTo(roundIndex, actionIndex)}} class="action" class:active={currentRoundIndex == roundIndex && currentActionIndex == actionIndex}>
              {#await player.fetch(action.player_id)}loading...{:then player}{player.nick}{/await}
              {action.action} {action.amount ? action.amount : ''}
            </div>
          {/each}
        </div>
      {/each}
      {#if hand.id}
        <div class="action">
          <a href="/hands/{hand.id}" target="_blank">REVIEW HAND</a>
        </div>
      {/if}
    </div>
  {/each}
</div>

<div class="main_area">
  <Table bind:state={tableState} bind:heroIndex={playerIndex} bind:this={table} on:sitDown={(event) => sitDown(event.detail)}></Table>

  <div class="panel">
    {#if playerIndex}
      {#if isPlayerSittingIn}
        <button on:click={() => sitOut()}>Sit Out</button>
      {:else}
        <button on:click={() => sitIn()}>Sit In</button>
      {/if}
      <button on:click={() => standUp()}>Stand Up</button>
    {/if}
    {#if replayingHistory}
      <button class="btn" on:click={performToPreviousAction}>&lt; Rewind</button>
      <button class="btn" on:click={performNextAction}>Next &gt;</button> (Round: {history.rounds[currentRoundIndex].street}, Action: {currentActionIndex})
    {:else}
      {#if playerIndex}
        <div class="btn {isPlayersTurn ? '' : 'disabled'} fold" on:click={() => fold()}>Fold</div>
        {#if tableState.seats[playerIndex] && tableState.maxCommitment == tableState.seats[playerIndex].committed}
          <div class="btn {isPlayersTurn ? '' : 'disabled'} check" on:click={() => check()}>Check</div>
        {:else}
          <div class="btn {isPlayersTurn ? '' : 'disabled'} call" on:click={() => call()}>Call {tableState.maxCommitment - tableState.seats[playerIndex].committed}</div>
        {/if}
        
        {#if tableState.maxCommitment == 0}
          <div class="btn {isPlayersTurn ? '' : 'disabled'} bet" on:click={() => bet(tableState.minRaiseTo)}>Bet {tableState.minRaiseTo} {#if tableState.seats[playerIndex] && tableState.minRaiseTo == tableState.seats[playerIndex].stack}(All-In){/if}</div>
        {:else}
          <div class="btn {isPlayersTurn ? '' : 'disabled'} raise" on:click={() => raise(tableState.minRaiseTo)}>Raise to {tableState.minRaiseTo}</div>
        {/if}
      {/if}
    {/if}
    <div class="debug">
      {#if $player.id}
        Player: {$player.nick}, Balance {$player.balances[tableData.currency]} <button on:click={fakeDeposit}>Make fake deposit</button><br>
        state: {JSON.stringify(tableState)}
      {/if}
    </div>
  </div>

</div>

