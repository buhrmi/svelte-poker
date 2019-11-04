<script context="module">
export async function preload(page, session) {
  const tableData = await this.fetch(process.env.API_URL + '/tables/' + page.params.id + '.json').then((res) => res.json())
  return { tableData }
}
</script>

<script>
  import Dialog from '../../components/dialog.svelte'
  import Table from '../../components/table.svelte';
  import SplitLayout from '../../components/split_layout.svelte';
  import History from '../../components/history.svelte';

  import { onMount, tick } from 'svelte';
  import player from '../../stores/player';
  import { stores } from '@sapper/app';
  import { fly, scale } from 'svelte/transition';

  let { session, page } = stores();

  export let tableData;
  let tableState = {
    settings: tableData.settings,
    seats: Array(tableData.settings.table_size),
    minRaiseTo: tableData.settings.big_blind_amount
  };

  let table;
  let history = {rounds: []};
  let hands = []
  let tipAmount = tableData.settings.big_blind_amount
  let handRunning = false;
  let currentRoundIndex = 0;
  let currentActionIndex = 0;
  let playerIndex;
  let showHistory = true;
  let raiseTo = tableData.settings.big_blind_amount
  $: raiseTo = Math.max(tableState.minRaiseTo || 0, raiseTo || 0)
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
  $: isPlayerSittingIn = tableState.seats[playerIndex] && tableState.seats[playerIndex].sitting_in
  let socket;
  let connecting = false;
  let connected = false;
  let wasConnected = false;

  $: {
    if ($player.access_token && connected !== $player.id) {
      if (socket) socket.close()
      connecting = true
      let connectionString = `${process.env.ENGINE_URL}?table_id=${$page.params.id}`
      const accessToken = $player.access_token // TODO: use cookie-based auth when connecting to the engine
      if (accessToken) connectionString += `&access_token=${accessToken}`
      socket = new WebSocket(connectionString);
      console.log('Connecting to', connectionString)
      socket.onopen = () => {
        console.log('Connected!')
        wasConnected = true
        connected = $player.id
        connecting = false
      }
      socket.onmessage = (event) => handleMessage(JSON.parse(event.data))
    }
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
      tableState.round = message.betting_round
      if (message.betting_round !== 'preflop') {
        tableState.seats.filter(n=>n).map((s) => s.lastAction = null)
        tableState.minRaiseTo = tableState.settings.big_blind_amount
      }
    }

    if (message.type == 'tip') {
      tableState.seats[message.seat].stack -= message.amount
    }

    if (message.type == 'betting-round-ended') {
      tableState.activeSeatIndex = null
      setTimeout(function() {
        tableState.pot = message.total_gathered 
        table.totalCommitted = 0
      }, 500)

      tableState.seats.filter(n=>n).map((seat) => seat.committed = 0)
    }

    if (message.type == 'action-is-on') {
      // Looks like there is a bug in svelte and reactivity does not work when setting tableState.seats directly.
      tableState.activeSeatIndex = message.seat
      tableState.actionStarted = new Date().getTime()
      tableState.actionTimeout = message.time_remaining || (tableState.actionStarted + tableData.settings.player_timeout)
    }

    // It's a table state
    if (message.type == 'table-state') {
      // Looks like there is a bug in svelte and reactivity does not work when setting tableState.seats directly.
      for (let i = 0; i < message.seats.length; i++) {
        const seat = message.seats[i];
        if (!seat) {
          // if there is nobody sitting in the tableState, remove the player when a new hand starts
          if (tableState.seats[i]) {
            tableState.seats[i].sitting_in = false
            tableState.seats[i].remove_when_hand_starts = true
          }
          continue;
        }
        tableState.seats[i] = Object.assign({}, tableState.seats[i], seat)
      }
    }

    if (message.type == 'sit-down') {
      tableState.seats[message.seat] = {sitting_in: false, player_id: message.player_id, committed: 0, stack: 0, chips: []}
      tableState.seats[message.seat].remove_when_hand_starts = false
    }

    if (message.type == 'stand-up') {
      if (handRunning) {
        tableState.seats[message.seat].sitting_in = false
        tableState.seats[message.seat].remove_when_hand_starts = true
      }
      else {
        tableState.seats[message.seat] = null
      }
      if (message.player_id == $player.id) player.reload()
    }

    if (message.type == 'sit-in') {
      tableState.seats[message.seat].sitting_in = true 
      tableState.seats[message.seat].remove_when_hand_starts = false
    }

    if (message.type == 'sit-out') {
      tableState.seats[message.seat].sitting_in = false
    }

    if (message.type == 'bring-in') {
      tableState.seats[message.seat].stack += message.amount
      if (message.player_id == $player.id) player.reload()
    }

    if (message.type == 'last-hand-id') {
      history.game_number = message.hand_id
      hands=hands
    }

    if (message.type == 'info' || message.type == 'error') {
      let dialog = new Dialog({
        target: document.body,
        intro: true,
        props: {
          text: message.text,
          title: message.type
        }
      })
      dialog.$on('confirm', () => dialog.$destroy())
      dialog.$on('dismiss', () => dialog.$destroy())
    }

    if (message.type == 'pot-object') {
      if (!history.pots) history.pots = []
      history.pots.push(message)
      history.pots = history.pots
      for (let i = 0; i < message.player_wins.length; i++) {
        const wins = message.player_wins[i];
        const seat = table.getSeatByPlayerId(wins.player_id)
        tableState.seats[seat].stack += wins.win_amount
      }
      setTimeout(function() {
        table.playWinningAnimation([message])
      }, 1000)
    }

    if (message.type == 'hand-started') {
      handRunning = true
      history = {rounds: []}
      hands.push(history)
      hands = hands
      table.isShowDown = false
      tableState.pot = 0
      tableState.dealerSeat = message.dealer.seat
      tableState.seats.filter(n=>n).map((s) => s.lastAction = null)
      dealHiddenCards(message.participants)
    }

    if (message.type == 'player-secret') {
      let seat = table.getSeatByPlayerId($player.id)
      tableState.seats[seat].cards = message.secret
    }

    if (message.type == 'hand-ended') {
      handRunning = false
      // table.isShowDown = true
      setTimeout(function() {
        for (let i = 0; i < tableState.seats.length; i++) {
          const seat = tableState.seats[i];

          if (seat) {
            if (seat.remove_when_hand_starts) tableState.seats[i] = null
            // else seat.cards = []
          }
        }
        tableState.board = []
        table.winningSeats = []
        table.isShowDown = false

      }, tableData.settings.start_hand_delay) 
    }

    // It's partial hand history
    if (message.type == 'hand-state') {
      // got partial history
      history = message
      hands.push(history)
      hands = hands
      handRunning = true
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
        initialTableState.seats[player.seat] = Object.assign({}, tableState.seats[player.seat], player);
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

  function dealHiddenCards(participants) {
    // First remove all cards, then set new cards in new tick, to trigger the deal animation
    for (let i = 0; i < tableState.seats.length; i++) {
      const seat = tableState.seats[i];
      if (seat) seat.cards = []
    }
    tick().then(function(){ 
      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        tableState.seats[p.seat].cards = ['?', '?']
      }
    })
  }
  function tip(amount) {
    socket.send(JSON.stringify({msg: 'tip', amount}))
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
    // await bringIn(100);
    await bringIn($player.balances[tableData.currency].available_balance);
    await sitIn();
  }
  async function sitIn() {
    return await socket.send(JSON.stringify({msg: "sit-in"}))
  }
  async function bringIn(amount) {
    await socket.send(JSON.stringify({msg: "bring-in", amount}))
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

.connecting {
  color: #ddd;
  font-size: 20px;
  text-align: center;  
  padding: 7px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 10px 10px 90px rgba(0,0,0,0.6);
  text-shadow: 0 2px 0 black;
  .inner {
    padding: 8px 30px;
    background: #0d0f1a;
    box-shadow: 1px 1px 1px black inset;
  }
}
.bet_slider {
  padding: 6px;
  padding-bottom: 0px;
  position: absolute;
  right: calc(50% - 190px);
  bottom: 100%;
  input {
    width: 120px;
  }
  .inner {
    padding: 3px;
  }
}
.seat_buttons {
  padding: 6px;
  padding-bottom: 0px;
  position: absolute;
  right: calc(50% - 40px);
  bottom: 110%;
  button {
    height: 24px;
    width: 75px;
  }
}
button {
  height: 40px;
  width: 120px;
  vertical-align: middle;
}
.name {
  padding: 3px 8px;
}
</style>

<SplitLayout>
  <div slot="title">
    {tableData.name} • {#if tableData.ruleset == 'texas'}Texas Hold'em{/if}
  </div>

  <div slot="left">
    {#each hands as hand}
      <div class="hand">
        <div class="action">--- HAND STARTED ---</div>

        <History history={hand}></History>

        {#if hand.game_number}
          <div class="action">
            <a href="/hands/{hand.game_number}" target="_blank">REVIEW HAND</a>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  {#if connected}
    <Table {tableData} bind:state={tableState} bind:heroIndex={playerIndex} bind:this={table} on:sitDown={(event) => sitDown(event.detail)}></Table>
  {/if}
  
  <div class="tip">
    <button on:click={() => tip(tipAmount)}>Tip {tipAmount} ❤️</button>
  </div>

  <div slot="controls">
    {#if !connected}
      Connecting to Table...
    {:else if $player.id && playerIndex == null}
      Please pick a seat 😊
    {:else}
      <div class="seat_buttons">
        {#if isPlayerSittingIn}
          <button class="btn alt" on:click={() => sitOut()}>Sit Out</button>
        {:else}
          <button class="btn alt" on:click={() => sitIn()}>Sit In</button>
        {/if}
        <button class="btn alt" on:click={() => standUp()}>Stand Up</button>
      </div>
      <div class="bet_slider glossy">
        <div class="inner">
          <input type="range" bind:value={raiseTo} min={tableState.minRaiseTo} max={tableState.seats[playerIndex].stack}>
        </div>
      </div>
      <button class="btn red {isPlayersTurn ? '' : 'disabled'} fold" disabled={!isPlayersTurn} on:click={() => fold()}>Fold</button>
      {#if tableState.seats[playerIndex] && tableState.maxCommitment == tableState.seats[playerIndex].committed}
        <button class="btn {isPlayersTurn ? '' : 'disabled'} check" disabled={!isPlayersTurn} on:click={() => check()}>Check</button>
      {:else}
        <button class="btn {isPlayersTurn ? '' : 'disabled'} call" disabled={!isPlayersTurn} on:click={() => call()}>Call {tableState.maxCommitment - tableState.seats[playerIndex].committed}</button>
      {/if}
      
      {#if raiseTo >= tableState.seats[playerIndex].stack}
        <button class="btn orange {isPlayersTurn ? '' : 'disabled'} bet" disabled={!isPlayersTurn} on:click={() => bet(raiseTo)}>All-In</button>
      {:else if tableState.maxCommitment == 0}
        <button class="btn orange {isPlayersTurn ? '' : 'disabled'} bet" disabled={!isPlayersTurn} on:click={() => bet(raiseTo)}>Bet {raiseTo.toLocaleString()}</button>
      {:else}
        <button class="btn orange {isPlayersTurn ? '' : 'disabled'} raise" disabled={!isPlayersTurn} on:click={() => raise(raiseTo)}>Raise to {raiseTo.toLocaleString()}</button>
      {/if}
    {/if}
  </div>
</SplitLayout>