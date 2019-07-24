<script>
  import Chips from './chips.svelte';
  import { onDestroy } from 'svelte';
  import { onMount } from 'svelte';
  import { gameServer } from 'settings';

  export let accessToken = 'its-me';
  export let tableId = 1;
  
  
  let socket
  let log = [];
  let connected = false;
  let connecting = false
  let chatMessage = '';
  let isMyTurn = false;
  let sittingAtTable = false;
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
    let url = `${$gameServer}?access_token=${accessToken}&table_id=${tableId}`

    connecting = true
    socket = new WebSocket(url);

    socket.onopen = () => {
      connected = true 
      connecting = false
      isMyTurn = true;
      sittingAtTable = true;
      
      clearInterval(demo);
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
      console.log(`Data received: ${event.data}`);
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

  let demo = setInterval((() => tableState.pot = Math.floor(Math.random() * 100000)), 100)

  function buyIn() {}
  function sendChat() {}

onMount(() => {
    console.log('hello')
  })

onDestroy(() => {
  console.log('bye')
})
</script>

<style>

</style>


<div class="table-container">
  <div id="table">

    {#if !connected}
      <div class="connection">
        <p>Please connect to a <a href="/about">Buka</a>-compatible game server</p>
        Server:
        <input bind:value={$gameServer}><br>
        Access Token:
        <input bind:value={accessToken}><br>
		    Table ID:
        <input bind:value={tableId}><br>

        <button on:click={connect}>Connect</button>
        {#if !connecting}
          <span>NOT CONNECTED</span>
        {:else}
          <span>Connecting... Please wait.</span>
        {/if}
      </div>
      <hr>
    {/if}
    
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
          Bet: {(player.bet || 0)} Satoshi
        </div>
        {#if tableState.button == index} 
          <span>DEALER</span>
        {/if}
      </div>
    {/each}

    <div class="board">
      {#each tableState.board as card}
        <img src="/cards/{card[0]}{card[1]}.png" class="playing_card" alt="{card[0]}{card[1]}">
      {/each}
    </div>
    
    <div class="pot">
      <Chips amount={tableState.pot}></Chips>
      <p>Pot: {Number(tableState.pot).toLocaleString()} Satoshi</p>
    </div>

    <button class="button large">Fold</button>
    <button class="button large">Call</button>
    <button class="button large">Raise</button>
    
    <div class="chat">
      <h2>Log</h2>
      <input bind:value={chatMessage}><button on:click={sendChat}>Send</button>
    </div>
  </div>
</div>