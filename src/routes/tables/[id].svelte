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
  import BringIn from '../../components/bring_in.svelte'
  import Deposit from '../../components/deposit.svelte'
  import { onMount, onDestroy, tick } from 'svelte';
  import {player, showDialog} from '@/shared'
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
  let currentRoundIndex = 0;
  let currentActionIndex = 0;
  let playerIndex;
  let showHistory = true;
  let betSlider = 0;
  let raiseTo = tableData.settings.big_blind_amount
  $: {
    // only keep the last 20 hands because rendering will be slow
    if (hands.length > 20) {
      hands.shift()
      hands = hands
    }
  }
  $: {
    // Player can only go all-in
    if (tableState.seats[playerIndex]) {
      if (tableState.minRaiseTo > tableState.seats[playerIndex].stack + tableState.seats[playerIndex].committed) {
        raiseTo = tableState.seats[playerIndex].stack + tableState.seats[playerIndex].committed;
      }
      else {
        raiseTo = tableState.minRaiseTo + Math.round((tableState.seats[playerIndex].stack + tableState.seats[playerIndex].committed - tableState.minRaiseTo + 1) ** (betSlider / 1000) - 1)
      }
    }
    else raiseTo = tableData.settings.big_blind_amount
  }
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
  let connectingTo = false;
  let connectedTo = false;
  let wasConnected = false;

  $: {
    // Establishing the connection inside a reactive block makes us automatically reconnect when tableData.id changes. Sapper is pretty cool, indeed.
    let connectionString = `${process.env.ENGINE_URL}?table_id=${tableData.id}`
    const accessToken = $player.access_token // TODO: use cookie-based auth when connectingTo the engine. dont transfer access token in player object!
    if (accessToken) connectionString += `&access_token=${accessToken}`

    if ($player.access_token && connectingTo !== tableData.id) {
      if (socket) socket.close()
      
      wasConnected = false
      connectedTo = null

      // INIT STUFF
      if (table) table.reset({seats: Array(tableData.settings.table_size)}) // TODO: this feels awkward..
      history = {rounds: []};
      hands = [];
      connectingTo = tableData.id;
      socket = new WebSocket(connectionString);
      console.log('Connecting to', connectionString)
      
      socket.onopen = () => {
        console.log('Connected!')
        wasConnected = true
        connectedTo = tableData.id
      }

      socket.onclose = () => {
        console.log('Connection closed!')
        connectedTo = null
      }

      socket.onmessage = (event) => handleMessage(JSON.parse(event.data))
    }
  }

  onDestroy(function() {
    if (socket) socket.close()
  })

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
        // tableState.seats.filter(n=>n).map((s) => s.lastAction = null)
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
      tableState.activeSeatIndex = message.seat
      tableState.actionStarted = new Date().getTime()
      tableState.seats[message.seat].lastAction = null
      tableState.actionTimeout = tableState.actionStarted + message.timeout
    }

    // It's a table state
    if (message.type == 'table-state') {
      for (let i = 0; i < message.seats.length; i++) {
        const seat = message.seats[i];
        if (!seat) {
          // if there is nobody sitting in the tableState, remove the player when a new hand starts
          if (tableState.seats[i]) {
            tableState.seats[i].sitting_in = false
            tableState.seats[i].remove_after_hand_ended = true
          }
          continue;
        }
        tableState.seats[i] = Object.assign({}, tableState.seats[i], seat)
      }
    }

    if (message.type == 'sit-down') {
      if (!tableState.handRunning) {
        const seat = table.getSeatByPlayerId(message.player_id)
        tableState.seats[seat] = null
      }
      tableState.seats[message.seat] = {sitting_in: false, player_id: message.player_id, committed: 0, stack: 0, chips: []}
      tableState.seats[message.seat].remove_after_hand_ended = false
    }

    if (message.type == 'stand-up') {
      if (tableState.handRunning && message.seat !== playerIndex) {
        tableState.seats[message.seat].sitting_in = false
        tableState.seats[message.seat].remove_after_hand_ended = true
      }
      else {
        tableState.seats[message.seat] = null
      }
      if (message.player_id == $player.id) player.reload()
    }

    if (message.type == 'sit-in') {
      tableState.seats[message.seat].sitting_in = true 
      tableState.seats[message.seat].remove_after_hand_ended = false
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
      tableState.handRunning = true
      history = {rounds: []}
      hands.push(history)
      history.game_number = message.uuid
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
      tableState.handRunning = false
      history.ended = true
      // table.isShowDown = true
      setTimeout(function() {
        for (let i = 0; i < tableState.seats.length; i++) {
          const seat = tableState.seats[i];

          if (seat) {
            if (seat.remove_after_hand_ended) tableState.seats[i] = null
            else seat.cards = []
          }
        }
        tableState.board = []
        table.winningSeats = []
        table.isShowDown = false

      }, tableData.settings.start_hand_delay * 0.8) 
    }

    // It's partial hand history
    if (message.type == 'hand-state') {
      // got partial history
      history = message
      hands.push(history)
      tableState.handRunning = true
      const initialTableState = {
        minRaiseTo: tableData.settings.small_blind_amount,
        settings: tableData.settings,
        seats: tableState.seats,
        dealerSeat: message.dealer_seat
      };
      for (const player of history.players) {
        player.stack = player.starting_stack;
        player.committed = 0;
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

    // Trigger reactivity
    history = history
    hands=hands
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
    betSlider = 0;
  }
  function raise(amount) {
    socket.send(JSON.stringify({msg: 'raise', amount}))
    betSlider = 0;
  }
  async function sitDown(index) {
    await socket.send(JSON.stringify({msg: "sit-down", seat: index}))
    // await bringIn(100);
    // await bringIn($player.balances[tableData.currency].available_balance);
    const minBringIn = tableData.settings.min_bring_in
    if ($player.balances[tableData.currency].available_balance < minBringIn) {
      showDialog({component: Deposit, title: 'Not enough chips', requiredAmount: minBringIn})
      // const bringInDialog = showDialog({component: BringIn, title: 'Bring in', min: tableData.settings.min_bring_in})
      // bringInDialog.$on('confirm', async function(ev) {
      //   await bringIn(ev.detail);
      //   await sitIn();
      // })
    }
    else {
      await bringIn(tableData.settings.min_bring_in || minBringIn);
      await sitIn();
    }

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
@mixin narrow {
  @media (max-width: 800px) { @content; }
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
  top: 0;
  left: -86px;
  bottom: 110%;
  button {
    height: 24px;
    width: 75px;
    display: block;
    box-shadow: none;
  }
  @include narrow {
    left: 50px;
    top: -34px;
    button {
      
      display: inline-block;
    }
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
    #{tableData.id} • {tableData.name} • {#if tableData.ruleset == 'texas'}Texas Hold'em{/if}
  </div>

  <div slot="left">
    {#each hands as hand, i (hand.game_number)}
      <History history={hand}></History>
    {/each}
  </div>

  {#if connectedTo}
    <Table currentHand={history} {tableData} bind:state={tableState} bind:heroIndex={playerIndex} bind:this={table} on:sitDown={(event) => sitDown(event.detail)}></Table>
  {/if}

  <div slot="controls">
    {#if !connectedTo}
      {#if wasConnected}
      Connection lost. Reconnecting to Table... ⏳
      {:else}
      Connecting to Table... ⏳
      {/if}
    {:else if $player.id && playerIndex == null}
      You can pick any open seat 😊
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
          <input type="range" bind:value={betSlider} min="0" max="1000">
        </div>
      </div>
      <button class="btn red {isPlayersTurn ? '' : 'disabled'} fold" disabled={!isPlayersTurn} on:click={() => fold()}>Fold</button>
      {#if tableState.seats[playerIndex] && tableState.maxCommitment == tableState.seats[playerIndex].committed}
        <button class="btn {isPlayersTurn ? '' : 'disabled'} check" disabled={!isPlayersTurn} on:click={() => check()}>Check</button>
      {:else}
        <button class="btn {isPlayersTurn ? '' : 'disabled'} call" disabled={!isPlayersTurn} on:click={() => call()}>Call {tableState.maxCommitment - tableState.seats[playerIndex].committed}</button>
      {/if}
      
      {#if isPlayersTurn}
        {#if raiseTo >= tableState.seats[playerIndex].stack + tableState.seats[playerIndex].committed}
          <button class="btn orange bet" on:click={() => bet(raiseTo)}>All-In {raiseTo.toLocaleString()}</button>
        {:else if tableState.maxCommitment == 0}
          <button class="btn orange bet" on:click={() => bet(raiseTo)}>Bet {raiseTo.toLocaleString()}</button>
        {:else}
          <button class="btn orange raise" on:click={() => raise(raiseTo)}>Raise to {raiseTo.toLocaleString()}</button>
        {/if}
      {:else}
        <button class="btn orange disabled bet" disabled>Raise</button>
      {/if}
    {/if}
  </div>
</SplitLayout>