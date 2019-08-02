<script>
  import Chips from '../../components/chips.svelte';
  import { onDestroy, tick, onMount } from 'svelte';
  import { player } from '../_stores';
  import { stores } from '@sapper/app';
  let { session, page } = stores();

  export let accessToken = $page.query.access_token || $session.access_token;
  export let tableId = $page.params.id;
  
  let socket
  let log = [];
  let sidebarOpened = false;
  let connected = false;
  let connecting = false
  let chatMessage = '';
  let gameServer = 'ws://buka-benj.dyndns.org:3000'
  let logMessages = []
  let chatInput
  let currency = 'BTC'
  let historyDiv
  let connectionString = ''
  let tableState = {
    seat_count: 0,
    seats: [],
    board: [],
    pot: 0
  }

  onMount(connect)

  async function fetchPlayer(playerId) {
    const res = await fetch(process.env.APEX_URL+`/players/${playerId}.json`)
    const json = await res.json()
    cachedPlayerData[playerId] = json
  }
  
  let cachedPlayerData = {}
  function playerData(playerId) {
    if (cachedPlayerData[playerId]) return cachedPlayerData[playerId];
    fetchPlayer(playerId)
    return {
      nick: 'Loading...'
    }
  }

  function seat(index) {
    if (tableState.seats[index] && tableState.seats[index].seat_state != 'Empty') {
      return tableState.seats[index]
    }
    else return null
  }

  function mySeatIndex() {
    if (!$player) return null
    for (let index = 0; index < tableState.seats.length; index++) {
      const element = tableState.seats[index];
      if (element.player_id == $player.id) return index
    }
    return null
  }

  function sitting() {
    return mySeatIndex() !== null;
  }

  async function sitDown(index) {
    await socket.send(JSON.stringify({msg: "sit-down", seat: index}))
    await bringIn($player.balances[currency]);
  }


  async function bringIn(amount) {
    await socket.send(JSON.stringify({msg: "bring-in", amount: -1000}))
  }

  function standUp() {
    socket.send(JSON.stringify({msg: "stand-up"}))
  }

  function connect() {
    connectionString = `${gameServer}?table_id=${tableId}`
    if (accessToken) connectionString += `&access_token=${accessToken}`

    connecting = true
    socket = new WebSocket(connectionString);

    socket.onopen = () => {
      connected = true 
      connecting = false
    }

    socket.onmessage = (event) => {
      var data = JSON.parse(event.data)
      console.log(data)
      if (data.seats) tableState.seats = data.seats
      if (data.seat_count) tableState.seat_count = data.seat_count
      if (data.poker_variant) tableState.poker_variant = data.poker_variant

      if (data.echo && data.echo.message) {
        const echoMessage = JSON.parse(data.echo.message);

        if (data.echo.player_id == $player.id && echoMessage.msg == 'bring-in') player.reload()
        if (data.echo.player_id == $player.id && echoMessage.msg == 'stand-up') player.reload()
      }

      if (data.msg == "chat") {
        logMessages.push(data)
        logMessages = logMessages
        tick().then(() => historyDiv.scrollTop = historyDiv.scrollHeight);
      }
    };

    socket.onclose = (event) => {
      if (event.wasClean) {
        console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
      } else {
        // e.g. gameServer process killed or network down
        // event.code is usually 1006 in this case
        console.log('[close] Connection died');
      }
      connected = false
      connecting = false
    };

    socket.onerror = (error) => {
      console.log(`[error] ${error.message}`);
      connecting = false
      connected = false
    };
  }

  // let demo = setInterval((() => tableState.pot = Math.floor(Math.random() * 100000)), 100)

  function buyIn() {}

  function sendChat() {
    socket.send(JSON.stringify({msg: 'chat', text: chatMessage}))
    logMessages = logMessages
    chatMessage = '';
  }

</script>

<style type="text/sass">
.game {
  width: 100%;
  height: calc(100% - 35px);
  background: url('/felt.png');
}
.sidebar, .table {
  height: 100%;
}
.table {
  position: relative;
  transition: all 0.3s;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0) 0%,rgba(0,0,0,0.1) 70%,rgba(0,0,0,0.3) 100%);
}

.sidebar {
  z-index: 500;
  word-wrap: break-word;
  position: fixed;

  transform: translateX(-100%);
  transition: all 0.3s;
  background: rgb(36, 37, 42);
  input {
    max-width: 100%;
  }
}
.sidebar-opened .sidebar {
  transform: translateX(0%);
}
.hamburger {
  position: fixed;
  top: 0;
  z-index: 1;
}
.seat {
  position: absolute;
  &.seat_0 {
    top: 15%;
    left: 5%;
  }
  &.seat_1 {
    top: 5%;
    left: 37%;
  }
  &.seat_2 {
    top: 15%;
    left: 70%;
  }
  &.seat_3 {
    top: 55%;
    left: 70%;
  }
  &.seat_4 {
    top: 65%;
    left: 37%;
  }
  &.seat_5 {
    top: 55%;
    left: 5%;
  }
}
.middle {
  text-align: center;
  position: absolute;
  width: 100%;
  top: 30%;
  .board {
    width: 100%;
    display: inline-block;
    .card {
      margin-right: 4px;
      max-width: 120px;
      width: calc(14%);
      min-width: 40px;
      display: inline-block;
    }
  }
  .pot {

  }
  .commands {

  }
}
// Narrow styling
@media screen and (max-width: 520px) {
  .sidebar {
    width: 100%;
  }
}
// Wide styling
@media screen and (min-width: 521px) {
  .sidebar {
    width: 40%;
  }
  .sidebar-opened .table {
    margin-left: 40%;
  }
}
.status {
  position: absolute;
  top: 7px;
  left: 34px;
  right: 0;
}

.tab_panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 22%;
  .tab {
    background: rgba(0,0,0,0.4);
    display: inline-block;
    padding: 1px 5px;
    position: absolute;
    top: -23px;
  }
  .tab_content {
    background: rgba(0,0,0,0.4);
    height: 100%;
  }
  .history {
    height: calc(100% - 28px);
    overflow: hidden;
    overflow-y: scroll;
  }
  .chat_input {
    width: 100%;
    height: 28px;
    button {
      width: 15%;
      min-width: 50px;
      height: 27px;
      border: none;
    }
    input {
      height: 28px;
      width: calc(100% - 15%);
      max-width: calc(100% - 50px);
      background: rgba(0, 0, 0, 0.2);
      border: none;
      padding: 3px;
      border-bottom: 1px solid rgba(0, 0, 200, 0.2);
      cursor: text;
      color: white;
      &:focus {
        outline: none;
        border-bottom: 1px solid rgba(100, 100, 255, 0.6);
      }
    }
  }
}
</style>

<div class="hamburger hamburger--3dx" class:is-active={sidebarOpened} on:click={() => sidebarOpened = !sidebarOpened}>
  <div class="hamburger-box">
    <div class="hamburger-inner"></div>
  </div>
</div>
<div class="status">
  {#if connected}
    <span>{tableState.poker_variant} 🤗</span>
  {:else if connecting}
    <span>Connecting... Please wait ⌛</span>
  {:else}
    <span>Not connected 😢</span>
  {/if}
</div>

<div on:keydown={e => {if (e.keyCode == 13) chatInput.focus()}} class="game" class:sidebar-opened={sidebarOpened}>

  <div class="sidebar">
    
    {#if !connected}
      <div class="connection">
        
        <p>Please connect to a <a href="https://github.com/buka-gaming/server">Buka game server</a></p>
        Server:
        <input bind:value={gameServer}><br>
        Access Token:
        <input bind:value={accessToken}><br>
        Table ID:
        <input bind:value={tableId}><br>

        <button on:click={connect}>Connect</button><br>
      </div>
      <hr>
    {/if}

  </div>
  <div class="table">
    {#each Array(tableState.seat_count) as _, index}
      <div class="seat seat_{index}">
        {#if tableState.seats[index] && seat(index)}
          <div class="player">
            {tableState.seats[index].nick}<br>
            {tableState.seats[index].seat_state}<br>
            Stack: {tableState.seats[index].stack}
            <div class="bet">
              Bet: {tableState.seats[index].committed} <Chips amount="{tableState.seats[index].committed}"></Chips>
            </div>
          </div>
        {:else}
          {#if !sitting()}
            <br><button on:click={() => sitDown(index)}>Sit here 😊</button>
          {/if}
        {/if}
      </div>
    {/each}
    <div class="middle">
      <div class="board">
        {#each tableState.board as card}<img src="/cards/{card[0]}{card[1]}.png" class="card" alt="{card[0]}{card[1]}">{/each}{#each Array(5 - tableState.board.length) as _}<img src="/cards/empty.png" class="card placeholder" alt="Placeholder">{/each}
        <div class="pot">
          <Chips amount={tableState.pot}></Chips>
          <p>Pot: {Number(tableState.pot).toLocaleString()} Satoshi</p>
        </div>
      </div>
    </div>
    {#if sitting()}
      <div class="commands">
        <button on:click={() => standUp()}>Stand Up</button>
      </div>
    {/if}
    <div class="tab_panel">
      <div class="tab">History</div>
      <div class="tab_content chat">
        <div class="history" bind:this={historyDiv}>
          {#each logMessages as log}
            <p>{cachedPlayerData && playerData(log.from).nick}: {log.text}</p>
          {/each}
        </div>
        <div class="chat_input" bind:this={chatInput}>
          <input on:keydown={e => {if (e.keyCode == 13) sendChat()}} bind:value={chatMessage}><button on:click={sendChat}>Send</button>
        </div>
      </div>
    </div>
  </div>
</div>