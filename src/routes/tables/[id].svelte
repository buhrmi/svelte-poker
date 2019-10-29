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
  let tableState = {
    settings: tableData.settings,
    seats: Array(tableData.settings.table_size),
    minRaiseTo: tableData.settings.big_blind_amount
  };

  let table;
  let history = {};
  let hands = []

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

  let tempActions = []
  function handleMessage(message) {
    console.log(message);

    // It's an action from https://hh-specs.handhistory.org/action-object/action
    if (message.action) {
      if (history.rounds[history.rounds.length-1]) {
        history.rounds[history.rounds.length-1].actions.push(message);
      }
      else {
        tempActions.push(message)
      }
      hands = hands
      table.perform(message);
    }

    // if the message has a "street" property, it's the beginning of a new round
    if (message.type == 'betting-round-started') {
      // Looks like there is a bug in svelte and reactivity does not work when setting tableState.seats directly.
      if (!history.rounds) history.rounds = []
      history.rounds.push({street: message.betting_round, actions: tempActions, cards: message.board})
      tempActions = []
      history.rounds = history.rounds
      tableState.board = message.board
      if (message.betting_round !== 'preflop') {
        tableState.minRaiseTo = tableState.settings.big_blind_amount
      }
    }

    if (message.type == 'betting-round-ended') {
      tableState.activeSeatIndex = null
      tableState.pot = message.total_gathered
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
      for (let i = 0; i < message.seats.length; i++) {
        const seat = message.seats[i];
        if (!seat) continue;
        tableState.seats[i] = Object.assign({}, tableState.seats[i], seat)
      }
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

    if (message.type == 'last-hand-id') {
      history.game_number = message.hand_id
      hands=hands
    }

    if (message.type == 'hand-started') {
      history = {rounds: []}
      hands.push(history)
      hands = hands
      tableState.pot = 0
      tableState.dealerSeat = message.dealer.seat
      ensureHolecards(message.participants)
    }

    if (message.type == 'hand-ended') {
      // TODO: win chips animation
      
    }

    if (message.type == 'player-secret') {
      let seat = table.getSeatByPlayerId($player.id)
      tableState.seats[seat].cards = message.secret
    }

    // It's partial hand history
    if (message.type == 'hand-state') {
      // got partial history
      history = message
      hands.push(history)
      hands = hands
      const initialTableState = {
        minRaiseTo: tableData.settings.small_blind_amount,
        settings: tableData.settings,
        seats: Array(history.table_size),
        dealerSeat: message.dealer_seat
      };
      for (const player of history.players) {
        player.stack = player.starting_stack;
        player.bet = 0;
        player.player_id = player.id
        player.cards = ['?','?']
        initialTableState.seats[player.seat] = player;
      }
      table.reset(initialTableState);
      
      for (let ri = 0; ri < history.rounds.length; ri++) {
        const round = history.rounds[ri];
        for (let ai = 0; ai < round.actions.length; ai++) {
          const action = round.actions[ai];
          tableState.animations = false;
          table.perform(action);
          tick().then(() => tableState.animations = true);
        }
      }
    }
  }

  function ensureHolecards(participants) {
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      if (!tableState.seats[p.seat].cards || tableState.seats[p.seat].cards.length == 0 ) {
        tableState.seats[p.seat].cards = ['?', '?']
      }
    }
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
  {#each hands as hand}
    <div class="hand">
      <div class="action">--- HAND {#if hand.game_number}{hand.game_number}{/if}STARTED ---</div>
    
      {#if hand && hand.rounds}
        {#each hand.rounds as round, roundIndex}
          <div class="round">
            <div class="action" class:active={currentRoundIndex == roundIndex && currentActionIndex == -1}>*** {round.street == 'preflop' ? 'HOLE CARDS' : round.street.toUpperCase()} ***</div>
            {#each round.actions as action, actionIndex}
              {#if action.action !== 'Deal Cards'}
                <div class="action" >
                  {#await player.fetch(action.player_id)}loading...{:then player}{player.nick}{/await}
                  {action.action} {action.amount ? action.amount : ''}
                </div>
              {/if}
            {/each}
          </div>
        {/each}
      {/if}
      {#if hand.game_number}
        <div class="action">
          <a href="/hands/{hand.game_number}" target="_blank">REVIEW HAND</a>
        </div>
      {/if}
    </div>
  {/each}
</div>

<div class="main_area">
  <Table bind:state={tableState} bind:heroIndex={playerIndex} bind:this={table} on:sitDown={(event) => sitDown(event.detail)}></Table>
  
  {#if !connected}
    Connecting. please wait
  {/if}

  <div class="panel">
    {#if playerIndex !== null}
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
      {#if playerIndex !== null}
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
        <!-- state: {JSON.stringify(tableState)} -->
      {:else}
        Not logged in...
      {/if}
    </div>
  </div>

</div>

