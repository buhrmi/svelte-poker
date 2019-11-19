<script context="module">
export async function preload(page, session) {
  const tableData = await this.fetch(process.env.API_URL + '/tables/' + page.params.id + '.json').then((res) => res.json())
  let referrerData
  if (page.query.referrer) {
    referrerData = await this.fetch(process.env.API_URL + '/players/' + page.query.referrer + '.json').then((res) => res.json())
  }
  return { tableData, referrerData }
}
</script>

<script>
  import Dialog from '../../components/dialog.svelte'
  import Table from '../../components/table.svelte';
  import SplitLayout from '../../components/split_layout.svelte';
  import History from '../../components/history.svelte';
  import BringIn from '../../components/bring_in.svelte'
  import Deposit from '../../components/deposit.svelte'
  import Withdrawals from '../../components/withdrawals.svelte'
  import PlayerSettings from '../../components/player_settings.svelte'
  import { onMount, onDestroy, tick, setContext } from 'svelte';
  import { player, showDialog, currencies } from '@/shared'
  import { stores } from '@sapper/app';
  import { fly, scale } from 'svelte/transition';

  let { session, page } = stores();
  export let referrerData;
  export let tableData;

  setContext('tableData', {tableData})

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
  let showHistory = true;
  let betSlider = 0;
  let gotTableState = false;
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
  let playerIndex;
  let playersSittingIn = []
  $: {
    playerIndex = null
    playersSittingIn = []
    if ($player) {
      for (let index = 0; index < tableState.seats.length; index++) {
        const seat = tableState.seats[index];
        if (seat && seat.player_id == $player.id) playerIndex = index
        if (seat && seat.sitting_in) playersSittingIn.push(seat)
      }
    }
    playersSittingIn = playersSittingIn
  }
  $: isPlayersTurn = playerIndex == tableState.activeSeatIndex
  $: isPlayerSittingIn = tableState.seats[playerIndex] && tableState.seats[playerIndex].sitting_in
  
  let socket;
  let connectingTo = false;
  let connectedTo = false;
  let wasConnected = false;
  let potObjects = []
  let chatMsg = ''
  let connectedAs;
  $: {
    // Establishing the connection inside a reactive block makes us automatically reconnect when tableData.id changes. Sapper is pretty cool, indeed.
    let connectionString = `${process.env.ENGINE_URL}?table_id=${tableData.id}`
    const accessToken = $player.access_token // this is only in dev- or telegram mode
    if (accessToken) connectionString += `&access_token=${accessToken}`

    if ($player.id && (connectingTo !== tableData.id || connectedAs !== $player.id)) {
      if (socket) socket.close()
      
      wasConnected = false
      connectedTo = null

      // INIT STUFF
      if (table) table.reset({seats: Array(tableData.settings.table_size)}) // TODO: this feels awkward..
      history = {rounds: []};
      hands = [];
      connectingTo = tableData.id;
      connectedAs = $player.id;
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

    if (message.type == 'bring-in-required') {
      if ($player.balances[tableData.currency].available_balance + tableState.seats[playerIndex].stack < message.amount) {
        const depositDialog = showDialog({component: Deposit, currency: tableData.currency, title: "Bring in required", requiredAmount: message.amount, text: message.text, options: null})
        depositDialog.$on('OK', async function() {
          await bringIn(message.amount);
          await sitIn();
        })
      }
      else {
        const bringInDialog = showDialog({component: BringIn, currency: tableData.currency, title: "Bring in required", min: message.amount - tableState.seats[playerIndex].stack})
        bringInDialog.$on('OK', async function(ev) {
          await bringIn(ev.detail);
          await sitIn();
        })
      }
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
      tick().then(() => gotTableState = true)
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
      dialog.$on('OK', () => dialog.$destroy())
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
        wins.seat_id = seat
      }
      potObjects.push(message)
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
      setTimeout(function() {
        table.playWinningAnimation(potObjects);
        potObjects = []
      }, 1000)
      
      setTimeout(function() {
        for (let i = 0; i < tableState.seats.length; i++) {
          const seat = tableState.seats[i];

          if (seat) {
            if (seat.remove_after_hand_ended) tableState.seats[i] = null
            else if (!tableState.handRunning) seat.cards = []
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

    if (message.type == "chat") {
      displayChatMessage(message.from, message.text)
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

  let chatMessagesTimeouts = {}
  function displayChatMessage(playerId, message) {
    let playerIndex = table.getSeatByPlayerId(playerId)
    tableState.seats[playerIndex].currentChatMessage = message
    clearTimeout(chatMessagesTimeouts[playerIndex])
    let timeout = 3000
    timeout += message.length * 50;
    timeout = Math.min(timeout, 6000)
    chatMessagesTimeouts[playerIndex] = setTimeout(function() {
      tableState.seats[playerIndex].currentChatMessage = ''
      }, timeout
    )
  }

  function sendChat() {
    socket.send(JSON.stringify({type: 'chat', text: chatMsg}))
    chatMsg = '';
  }

  function tip(amount) {
    socket.send(JSON.stringify({type: 'tip', amount}))
  }
  function fold() {
    socket.send(JSON.stringify({type: 'fold'}))
  }
  function check() {
    socket.send(JSON.stringify({type: 'check'}))
  }
  function call() {
    socket.send(JSON.stringify({type: 'call'}))
  }
  function bet(amount) {
    socket.send(JSON.stringify({type: 'bet', amount}))
    betSlider = 0;
  }
  function raise(amount) {
    socket.send(JSON.stringify({type: 'raise', amount}))
    betSlider = 0;
  }
  async function sitDown(index) {
    await socket.send(JSON.stringify({type: "sit-down", seat: index}))
    const minBringIn = tableData.settings.min_bring_in
    if ($player.balances[tableData.currency].available_balance < minBringIn) {
      showDialog({component: Deposit, currency: tableData.currency, title: 'Not enough chips', requiredAmount: minBringIn, options: null})
    }
    else {
      await bringIn(tableData.settings.min_bring_in || minBringIn);
      await sitIn();
    }

  }
  async function sitIn() {
    return await socket.send(JSON.stringify({type: "sit-in"}))
  }
  async function bringIn(amount) {
    if (!amount) {
      const bringInDialog = showDialog({component: BringIn, currency: tableData.currency, title: "Bring in"})
      bringInDialog.$on('OK', async function(ev) {
        if (ev.detail) await bringIn(ev.detail);
      })
    }
    else {
      await socket.send(JSON.stringify({type: "bring-in", amount}))
    }
  }
  function standUp() {
    socket.send(JSON.stringify({type: "stand-up"}))
  }
  function sitOut() {
    socket.send(JSON.stringify({type: "sit-out"}))
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

// TODO: sticky scrolling should be done somewhere else
let historyEl;
let sticky = true
function stickOrUnstick(e) {
  sticky = historyEl.scrollTop === (historyEl.scrollHeight - historyEl.offsetHeight)
}

let interval
onMount(function() {
  interval = setInterval(function() {
    if (sticky) historyEl.scrollTop = historyEl.scrollHeight;
  }, 100)
})

onDestroy(function() {
  clearInterval(interval)
})

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
  bottom: 6px;
  left: 6px;
  white-space: nowrap;
  button {
    height: 24px;
    width: 75px;
    display: block;
    box-shadow: none;
  }
  @include narrow {
    left: 36px;
    bottom: 66px;
    button {
      font-size: 12px;
      width: 64px;
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

.invite_box {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50%;
  position: absolute;
  text-align: center;
  color: white;
  box-shadow: 10px 10px 30px -10px black;
  .inner {
    margin: 5px;
    padding: 5px;
    box-shadow: 1px 1px 1px black inset;
    background: #0d0f1a;
  }
}
.left {
  position: relative;
  height: 100%;
  width: 100%;
  .history {
    height: calc(100% - 33px);
    overflow-y: auto;
  }
  .chatbox {
    position: absolute;
    height: 29px;
    bottom: 0;
    width: 100%;
    input {
      width: calc(100% - 50px);
      height: 25px;
      vertical-align: bottom;
      color: #dde;
      padding: 4px;
      font-size: 1.1em;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      
      outline: none;
    }
    button {
      width: 50px;
      height: 25px;
      vertical-align: bottom;
    }
  }
}
.playerinfo {
  position: absolute;
  right: 5px;
  top: 5px;
  color: white;
}
</style>

<svelte:head>
  {#if referrerData}
    <title>{referrerData.nick} invites you to {tableData.name}</title>
    <meta property="og:title" content="{referrerData.nick} invites you to {tableData.name}">
    <meta name="twitter:title" content="{referrerData.nick} invites you to {tableData.name}">
  {:else}
    <title>{tableData.name}</title>
    <meta property="og:title" content="{tableData.name}">
    <meta name="twitter:title" content="{tableData.name}">
  {/if}
</svelte:head>


<SplitLayout>
  <div slot="title">
    {tableData.name} • {#if tableData.ruleset == 'texas'}Texas Hodl'em{/if} • {tableData.currency}
  </div>

  <div slot="left" class="left">
    <div class="history" bind:this={historyEl}>
      {#each hands as hand, i (hand.game_number)}
        <History history={hand}></History>
      {/each}
    </div>
    <div class="chatbox">
      <input type="text" disabled={!connectedAs} on:keydown={e => {if (e.keyCode == 13 && connectedAs) sendChat()}} bind:value={chatMsg}><button disabled={!connectedAs} class="btn" on:click={() => sendChat(chatMsg)}>Send</button>
    </div>
  </div>

  {#if connectedTo}
    <Table currentHand={history} {tableData} bind:state={tableState} bind:heroIndex={playerIndex} bind:this={table} on:sitDown={(event) => sitDown(event.detail)}></Table>
  {/if}

  {#if !tableState.handRunning && gotTableState && playersSittingIn.length < 2 && typeof playerIndex == 'number' && isPlayerSittingIn}
    <div out:scale in:scale={{delay: 1000}} class="invite_box glossy">
      <div class="inner">
        Waiting for a worthy opponent...<br>Invite some friends, and they'll receive 1,000 {currencies[tableData.currency].unitname} on the House.<br>
        <a href="/tables/{tableData.id}?referrer={$player.id}">Invitation Link</a>
      </div>
    </div>
  {/if}
  {#if typeof playerIndex == 'number'}
    <div class="seat_buttons" transition:scale>
      {#if isPlayerSittingIn}
        <button class="btn alt" on:click={() => sitOut()}>Sit Out</button>
      {:else}
        <button class="btn alt" on:click={() => sitIn()}>Sit In</button>
      {/if}
      <button class="btn alt" on:click={() => bringIn()}>Bring In</button>
      <button class="btn alt" on:click={() => standUp()}>Stand Up</button>
    </div>
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
      <div class="bet_slider glossy">
        <div class="inner">
          <input type="range" bind:value={betSlider} min="0" max="1000">
        </div>
      </div>
      <button class="btn red {isPlayersTurn ? '' : 'disabled'} fold" disabled={!isPlayersTurn} on:click={() => fold()}>Fold</button>
      {#if tableState.seats[playerIndex] && tableState.maxCommitment == tableState.seats[playerIndex].committed}
        <button class="btn {isPlayersTurn ? '' : 'disabled'} check" disabled={!isPlayersTurn} on:click={() => check()}>Check</button>
      {:else}
        <button class="btn {isPlayersTurn ? '' : 'disabled'} call" disabled={!isPlayersTurn} on:click={() => call()}>Call {(tableState.maxCommitment - tableState.seats[playerIndex].committed).toLocaleString()}</button>
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
  
  <div class="playerinfo">

    {#if $player.id}
        <span class="link" on:click={() => showDialog({component: PlayerSettings, title: 'Player Settings', options: []})}>{$player.nick}</span> • <span class="link" on:click={() => showDialog({component: Withdrawals})}>{currencies[tableData.currency].unitname}: {$player.balances[tableData.currency].available_balance.toLocaleString()}</span> • On Tables: {$player.balances[tableData.currency].stacks.toLocaleString()} <button class="btn" on:click={() => showDialog({component: Deposit, currency: tableData.currency, title: 'Deposit ' + currencies[tableData.currency].unitname, options: null})}>Deposit {currencies[tableData.currency].unitname}</button>
    {/if}
  </div>