<script>
  import Chips from '../../components/chips.svelte';
  import { onDestroy } from 'svelte';
  import { onMount } from 'svelte';
  import { gameServer } from 'settings';

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
  let logMessages = []
  let isMyTurn = false;
  let sittingAtTable = false;
  let connectionString = ''
  let tableState = {
    // players: []
    players: [{name: 'poopsy'}, {name: 'retard'}],
    board: ['as', 'kh', '2c', '4d'],
    pot: 46340,
    buy_in: 500,
    sb: 25,
    bb: 50
  }
  
  $: {
    isMyTurn = true
  }

  onMount(connect)

  function connect() {
    connectionString = `${$gameServer}?access_token=${accessToken}&table_id=${tableId}`

    connecting = true
    socket = new WebSocket(connectionString);

    socket.onopen = () => {
      connected = true 
      connecting = false
      isMyTurn = true;
      sittingAtTable = true;
      
      // clearInterval(demo);
      tableState = {
        players: [],
        board: [],
        pot: 0,
        buy_in: 0,
        sb: 0,
        bb: 0
      }
    }

    socket.onmessage = (event) => {
      logMessages = logMessages.push(`Data received: ${event.data}`);
      var data = JSON.parse(event.data)
      if (data.tableState) {
        tableState = data.tableState
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
    socket.send(JSON.stringify({command: 'chat', message: chatMessage}))
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
.player {
  position: absolute;
  &.player_0 {
    top: 50%;
    left: 10%;
  }
  &.player_1 {
    top: 15%;
    left: 10%;
  }
}
.middle {
  text-align: center;
  position: absolute;
  top: 30%;
  left: 25%;
  right: 25%;
  .board {
    .card {
      margin-right: 4px;
      width: calc(16% - 4px);
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
  left: 42px;
  right: 0;
}
</style>

<div class="hamburger hamburger--3dx" class:is-active={sidebarOpened} on:click={() => sidebarOpened = !sidebarOpened}>
  <div class="hamburger-box">
    <div class="hamburger-inner"></div>
  </div>
</div>
<div class="status">
  {#if !connecting}
    <span>Couldn't connect to the server 😢</span>
    
  {:else if !connected}
    <span>Connecting... Please wait ⌛</span>
  {:else}
    <span>Connected 🤗</span>
  {/if}
</div>

<div class="game" class:sidebar-opened={sidebarOpened}>

  <div class="sidebar">
    
    {#if !connected}
      <div class="connection">
        
        <p>Please connect to a <a href="https://github.com/buka-gaming/server">Buka game server</a></p>
        Server:
        <input bind:value={$gameServer}><br>
        Access Token:
        <input bind:value={accessToken}><br>
        Table ID:
        <input bind:value={tableId}><br>

        <button on:click={connect}>Connect</button><br>
      </div>
      <hr>
    {/if}

    <h2>Log</h2>
    {#each logMessages as log}
      <p>{log}</p>
    {/each}
    <input bind:value={chatMessage}><button on:click={sendChat}>Send</button>
  
  </div>
  <div class="table">
    
    {#each tableState.players as player, index}
      <div class="player player_{index}">
        <div class="hand">
          <div class="card1">
            <div class="playing_card back"><div class="card_back"></div></div>
          </div>
          <div class="card2">
            <div class="playing_card back"><div class="card_back"></div></div>
          </div>
        </div>
        <div class="name">
          {player.name}
        </div>
        <div class="bet">
          Bet: <Chips amount={player.bet || 16}></Chips>
        </div>
        {#if tableState.button == index} 
          <span>DEALER</span>
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
      <div class="commands">
        <button class="button large">Fold</button>
        <button class="button large">Call</button>
        <button class="button large">Raise</button>
      </div>
    </div>

    
  </div>
</div>