<script>
  import Chips from '../../components/chips.svelte';
  import { player } from '../../stores';
  import { onDestroy, tick, onMount } from 'svelte';
  import { stores } from '@sapper/app';
  import { fly, fade } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
	import { crossfade } from 'svelte/transition';

  let mycards = ['As', 'Kh']
  let dealt;

  onMount(function() {
    setInterval(function() {
      dealt ^= true
      if (!dealt) tableState.hand.button_seat++
    }, 3000)
    dealt = true
  })

  // A svelte transition that simulates cards being "dealt"
  function dealTransition(node, {rotate, card, seat}) {
    const style = getComputedStyle(node);
    const transform = style.transform === 'none' ? '' : style.transform;
    const dealingSeat = seatElements[tableState.hand.button_seat]
    const fromRect = dealingSeat.getBoundingClientRect()
    const fromX = fromRect.left + 28
    const fromY = fromRect.top + 60
    const targetRect = node.getBoundingClientRect()
    const deltaX = fromX - targetRect.left;
    const deltaY = fromY - targetRect.top;
    const seatsSittingIn = []
    const timeBetweenCards = 100
    for (let index = 0; index < tableState.seats.length; index++) {
      if (tableState.seats[index].seat_state == 'SittingIn') seatsSittingIn.push(index)
    }
    while(seatsSittingIn[0] !== tableState.hand.button_seat) {
      seatsSittingIn.push(seatsSittingIn.shift())
    }
    seatsSittingIn.push(seatsSittingIn.shift())
    
    // seatsSittingIn is now in the correct "dealing order"
    let delay = seatsSittingIn.indexOf(seat) * timeBetweenCards
    if (card == 2) delay += seatsSittingIn.length * timeBetweenCards

    const transition = {
      delay,
      duration: 1000,
      easing: quintOut,
      css: t => {
        return `
          transform: translate(${deltaX*(1-t)}px, ${deltaY*(1-t)}px) rotate(${rotate * t}deg);
        `
      }
    }
    return transition;
  }

  const actionsPastTense = {
    P: 'posted',
    F: 'folded',
    X: 'checked',
    C: 'called',
    B: 'bet',
    R: 'raised'
  }

	const [send, receive] = crossfade({
		duration: d => Math.sqrt(d * 1000),

		fallback(node, params) {
			const style = getComputedStyle(node);
			const transform = style.transform === 'none' ? '' : style.transform;

			return {
				duration: 600,
				easing: quintOut,
				css: t => `
					transform: ${transform} scale(${t});
					opacity: ${t}
				`
			};
		}
	});

  let { session, page } = stores();
  let lastChatMessages = []
  let chatMessagesTimeouts = []
  let pot;
  let seatElements = []

  function displayChatMessage(playerID, message) {
    let playerIndex = getSeatIndexFromID(playerID)
    lastChatMessages[playerIndex] = message
    clearTimeout(chatMessagesTimeouts[playerIndex])
    let timeout = 3000
    timeout += message.length * 50;
    timeout = Math.min(timeout, 6000)
    chatMessagesTimeouts[playerIndex] = setTimeout(function(){lastChatMessages[playerIndex] = ''}, timeout)
  }

  export let accessToken = $page.query.access_token || $session.access_token;
  export let tableId = $page.params.id;
  
  let socket
  let log = [];
  let sidebarOpened = false;
  let connected = false;
  let connecting = false
  let timerStroke = 339.292;
  let chatMessage = '';
  let tab = 'chat';
  let gameServer = process.env.GAME_SERVER_URL
  let chatLog = []
  let statusDiv

  // TODO: make these reactive
  let amountToCall = 0
  let stackSize = 10
  let raiseTo = 0
  let isDealt = []

  $: if (chatLog && statusDiv) statusDiv.scrollTop = statusDiv.scrollHeight;
  $: isMyTurn = tableState.hand && mySeatIndex() === tableState.hand.acting_player
  $: mySeat = tableState.seats && tableState.seats[mySeatIndex()]

  let chatInput
  let currency = 'BTC'
  let historyDiv
  let connectionString = ''
  let tableState = {
    seat_count: 0,
    seats: [],
    hand: {
      button_seat: 0,
      board: []
    },
    pot: 0,
    acting_player: 0,
    dealer: 0
  }
  tableState.seat_count = 6
  tableState.seats = [{
    seat_state: "SittingIn",
    committed: 19933,
    stack: 24566,
    player_id: 2},
    {
    seat_state: "SittingIn",
    committed: 19933,
    stack: 1204,
    player_id: 1}
    ,{
    seat_state: "SittingIn",
    committed: 0,
    stack: 0,
    player_id: 1}
    ,{
    seat_state: "SittingIn",
    committed: 0,
    stack: 0,
    player_id: 1}
    ,{
    seat_state: "SittingIn",
    committed: 0,
    stack: 0,
    player_id: 1}
    ,{
    seat_state: "SittingIn",
    committed: 0,
    stack: 0,
    player_id: 1}
  ]
  // lastChatMessages[1] = "YO BITCHES, calling all your shit 😅"

  onMount(connect)

  let timeOut = new Date().getTime() + 12000
  let timerStart = new Date().getTime()
  onMount(function() {
    let current = 0
 

    function updateTimeoutBar() {
      let ratio = (new Date().getTime() - timerStart) / (timeOut - timerStart)
      timerStroke = 2 * 3.141 * 22 * (1-ratio)
      requestAnimationFrame(updateTimeoutBar)
    }
    requestAnimationFrame(updateTimeoutBar)
  })

  let chipElements = []

  // TODO: extract this function into a util file
  // Make all the committed chips fly into the put via CSS transition
  function playSendToPotAnimation() {
    const potRect = pot.getBoundingClientRect();
    const potX = potRect.x + potRect.width / 2;
    const potY = potRect.y + potRect.height / 2;
    
    for (let i = 0; i < chipElements.length; i++) {
      const element = chipElements[i];
      const chipRect = element.getBoundingClientRect();
      const chipX = chipRect.x + chipRect.width / 2;
      const chipY = chipRect.y + chipRect.height / 2;
      const style = getComputedStyle(element);
      const prevX = parseInt(style.left) || 0;
      const prevY = parseInt(style.top) || 0;
      element.style.left = `${potX - chipX + prevX}px`;
      element.style.top = `${potY - chipY + prevY}px`;
    }
  }

  function getSeatsSittingIn() {
    const result = []
    for (let index = 0; index < tableState.seats.length; index++) {
      const seat = tableState.seats[index];
      if (seat.seat_state == 'SittingIn') result.push(seat)
    }
    return result
  }

  async function fetchPlayer(playerId) {
    if (typeof window == 'undefined') return
    const res = await fetch(process.env.API_URL+`/players/${playerId}.json`)
    const json = await res.json()
    cachedPlayerData[playerId] = json
  }
  
  let cachedPlayerData = {}
  function playerData(playerId) {
    if (!playerId) {
      return {nick: ''}
    }
    if (cachedPlayerData[playerId]) return cachedPlayerData[playerId];
    fetchPlayer(playerId)
    return {
      nick: 'Loading...'
    }
  }

  function getSeatIndexFromID(playerId) {
    for (let index = 0; index < tableState.seats.length; index++) {
      const element = tableState.seats[index];
      if (element.player_id == playerId) return index
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

  function connect() {
    connectionString = `${gameServer}?table_id=${tableId}`
    if (accessToken) connectionString += `&access_token=${accessToken}`

    connecting = true
    socket = new WebSocket(connectionString);
    chatLog.push({text: "Connecting... Please wait ⌛"})
    chatLog = chatLog

    socket.onopen = () => {
      chatLog.push({text: `Connected 🤗`})
      chatLog = chatLog
      connected = true
      connecting = false
    }

    socket.onmessage = (event) => {
      var data = JSON.parse(event.data)
      console.log(data)
      if (data.msg == 'table_state') {
        tableState = data
        if (data.hand && data.hand.timeout) {
          timeOut = new Date().getTime() + 12000 // data.hand.timeout
          timerStart = new Date().getTime()
        }
        if (data.hand && data.hand.minraise_to) {
          raiseTo = data.hand.minraise_to
        }
      }
      if (data.msg == 'holecards') {
        mycards = data.value;
      }
      if (data.echo && data.echo.message) {
        const echoMessage = JSON.parse(data.echo.message);
        if (data.echo.player_id == $player.id && echoMessage.msg == 'bring-in') player.reload()
        if (data.echo.player_id == $player.id && echoMessage.msg == 'stand-up') player.reload()
        chatLog.push({from: data.echo.player_id, text: echoMessage.msg})
        chatLog = chatLog
        
      }

      if (data.msg == "chat") {
        chatLog.push(data)
        chatLog = chatLog
        displayChatMessage(data.from, data.text)
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
        chatLog.push({text: 'Connection failed 😢'})
        chatLog = chatLog
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

  function sendChat() {
    socket.send(JSON.stringify({msg: 'chat', text: chatMessage}))
    chatMessage = '';
  }

</script>

<style lang="scss">
.game {
  overflow: hidden;
  position: relative;
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
.command_panel {
  background-color: rgba(0,0,0,0.3);
  text-align: center;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 20%;
  padding: 16px;
  // height: 20%;
  // width: 50%;
  .bet_settings {
    margin-bottom: 12px;
  }
  .card1, .card2 {
    width: 10%;
  }
  input {
    vertical-align: middle;
  }
  button {
    height: 35px;
    width: 90px;
    vertical-align: middle;
  }
  
}
.sidebar {
  z-index: 500;
  word-wrap: break-word;
  padding: 8px;
  box-shadow: 0px 0px 5px 0px black;
  position: fixed;
  right: 0;
  transform: translateX(100%);
  transition: all 0.3s;
  background: rgb(36, 37, 42);
  background-image: url('/wood.png');
  input {
    max-width: 100%;
  }
}
.sidebar-opened .sidebar {
  transform: translateX(0%);
}
.hamburger {
  transition: all 0.3s;
  position: absolute;
  top: 0;
  right: 0;
  z-index: 501;
}

.currency {
  font-size: 0.8em;
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
  .player {
    text-align: center;
    width: 80px;
    position: absolute;
    text-shadow: 0px 1px 1px rgba(0,0,0,0.5);
    .bubble {
      bottom: 63px;
      left: -13px;
    }
    .hole {
      .card1, .card2 {
        position: absolute;
        width: 23px;
        z-index: 1;
        box-shadow: -1px 1px 2px rgba(0,0,0,0.5);
      }
      .card1 {
        transform: rotate(-5deg);
        left: 65px;
        top: 35px;
      }
      .card2 {
        transform: rotate(12deg);
        left: 73px;
        top: 36px;
      }
    }
    .bet {
      position: absolute;
      left: 65px;
      top: 65px;
      font-size: 16px;
      white-space: nowrap; 
    }
    .chips {
      position: absolute;
      transition: all 1s;
      left: 0px;
      top: 20px;
      width: 100%;
    }
    .stack {
      width: 80%;
      margin: 0 auto;
      font-size: 0.9em;
      border-radius: 100px;
      line-height: 1.2em;
      color: rgb(240,200,100);
      background-color: rgba(0,0,0,0.3);
    }
  }
  .image {
    height: 48px;
    position: relative;
  }
  .profile_pic {
    margin-top: 4px;
    width: 40px;
    height: 40px;
    border-radius: 100px;
    vertical-align: middle;
    box-shadow: -1px 1px 2px rgba(0,0,0,0.5);
  }
  svg {
    position: relative;
    top: -44px;
    transform: rotate(-90deg) scaleY(-1);
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
    margin: 0 auto;
    max-width: 25%;
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
    width: 320px;
  }
  .sidebar-opened .table {
    margin-right: 320px;
  }
  .sidebar-opened .hamburger {
    right: 320px;
  }
}
.status {
  position: absolute;
  bottom: 7px;
  left: 7px;
  z-index: 502;
  max-height: 30%;
  overflow-y: auto;
  .log {
    img {
      border-radius: 12px;
      width: 14px;
      vertical-align: middle;
    }
    span {
      vertical-align: middle;
    }
  }
}

.tab_panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(100% - 32px);
  .tabs {
    top: -32px;
    position: absolute;
  }
  .tab {
    background: rgba(0,0,0,0.4);
    display: inline-block;
    padding: 1px 5px;
    height: 32px;
    &.active {
      font-weight: bold;
    }
  }
  .tab_content {
    background: rgba(0,0,0,0.4);
    height: calc(100% - 32px);
  }
  .history {
    height: calc(100% - 32px);
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


<div class="status" bind:this={statusDiv}>
  {#each chatLog as log}
    <p class="log" class:type={log.type}>
      {#if log.from}
        {#if log.type == 'action'}
          <img alt="" src={cachedPlayerData && playerData(log.from).profile_pic}>
          <span>{cachedPlayerData && playerData(log.from).nick} {log.text}</span>
        {:else}
          <img alt="" src={cachedPlayerData && playerData(log.from).profile_pic}>
          <span>{cachedPlayerData && playerData(log.from).nick}: {log.text}</span>
        {/if}
      {:else}
        {log.text}
      {/if}
    </p>
  {/each}
  <div class="chat_input" bind:this={chatInput}>
    <input on:keydown={e => {if (e.keyCode == 13 && connected) sendChat()}} bind:value={chatMessage}><button disabled={!connected} on:click={sendChat}>Send</button>
  </div>
</div>
<div on:keydown={e => {if (e.keyCode == 13) chatInput.focus()}} class="game" class:sidebar-opened={sidebarOpened}>
  <div class="sidebar">
    <div class="tab_panel">
      <div class="tabs">
        <div on:click="{() => tab = 'chat'}"     class="tab" class:active="{tab == 'chat'}">History</div>
        <div on:click="{() => tab = 'settings'}" class="tab" class:active="{tab == 'settings'}">Settings</div>
      </div>
      {#if tab == 'chat'}
        <div class="tab_content chat">
          <div class="history" bind:this={historyDiv}>
            {#each chatLog as log}
              <p>{cachedPlayerData && playerData(log.from).nick}: {log.text}</p>
            {/each}
          </div>
          <div class="chat_input" bind:this={chatInput}>
            <input on:keydown={e => {if (e.keyCode == 13) sendChat()}} bind:value={chatMessage}><button on:click={sendChat}>Send</button>
          </div>
        </div>
      {/if}
      {#if tab == 'settings'}
        <div class="tab_content settings">  
          <p>Please enter connection details:</p>
          Server:
          <input bind:value={gameServer}><br>
          Access Token:
          <input bind:value={accessToken}><br>
          Table ID:
          <input bind:value={tableId}><br>

          <button on:click={connect}>Connect</button><br>
        </div>
      {/if}
    </div>
  </div>

  <div class="hamburger hamburger--3dx" class:is-active={sidebarOpened} on:click={() => sidebarOpened = !sidebarOpened}>
    <div class="hamburger-box">
      <div class="hamburger-inner"></div>
    </div>
  </div>
  
  <div class="table">
    {#each Array(tableState.seat_count) as _, index}
      <div bind:this={seatElements[index]} class="seat seat_{index} {tableState.seats[index] && tableState.seats[index].seat_state || 'Empty'}">
        {#if tableState.seats[index] && seat(index)}
          {#if tableState.hand && tableState.hand.button_seat == index}
            <div class="dealer" in:receive={'dealer'} out:send={'dealer'}>DEALER</div>
          {/if}
          <div class:action="{tableState.seats[index].last_action}" class="player" transition:fly|local="{{ y: -15, duration: 350 }}">
            {#if lastChatMessages[index]}
              <p in:fade="{{ duration: 100 }}" out:fly="{{ y: -8, duration: 650 }}"class="bubble speech">{lastChatMessages[index]}</p>
            {/if}
            <div class="nick">
              {cachedPlayerData && playerData(tableState.seats[index].player_id).nick}
            </div>
            <div class="stack">
              {(tableState.seats[index].stack || 0).toLocaleString()}<span class="currency">元</span>
            </div>
            {#if tableState.seats[index].last_action !== 'F'}
              <div out:fly|local={{duration: 1000, y: 20}} class="hole">
                {#if dealt}
                  {#if mySeatIndex() == index && mycards}
                    <img in:dealTransition={{rotate: -5, card: 1, seat: index}} class="card1" alt="Card" src="/cards/{mycards[0]}.png">
                    <img in:dealTransition={{rotate: 12, card: 2, seat: index}} class="card2" alt="Card" src="/cards/{mycards[1]}.png">
                  {:else}
                    <img in:dealTransition={{rotate: -5, card: 1, seat: index}} class="card1" alt="Card" src="/cards/back.png">
                    <img in:dealTransition={{rotate: 12, card: 2, seat: index}} class="card2" alt="Card" src="/cards/back.png">
                  {/if}
                {/if}
              </div>
            {/if}
            <div class="image"  on:click={() => dealt ^= true}>
              <img alt="" class="profile_pic" src="{cachedPlayerData && playerData(tableState.seats[index].player_id).profile_pic}">
              {#if tableState.hand && tableState.hand.acting_player == index}
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle stroke-dasharray="{timerStroke} {2 * 3.141 * 22}" cx="24" cy="24" r="22" fill="none" stroke="#FFEE44" stroke-width="4" />
                </svg>
              {/if}
            </div>
            {#if tableState.seats[index].seat_state !== 'SittingIn'}
              {tableState.seats[index].seat_state}
            {/if}
            {#if tableState.seats[index].last_action}
              <div class="bet">
                {actionsPastTense[tableState.seats[index].last_action]}
                {#if tableState.seats[index].committed > 0}
                  {tableState.seats[index].committed.toLocaleString()}<span class="currency">元</span>
                {/if}
                <div class="chips" bind:this={chipElements[index]}>
                  <Chips amount="{tableState.seats[index].committed}"></Chips>
                </div>
              </div>
            {/if}
            
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
        {#if tableState.hand}
          {#each tableState.hand.board as card}
            <img in:fly="{{ y: -25, duration: 450 }}" src="/cards/{card[0].toLowerCase()}{card[1]}.png" class="card" alt="{card[0]}{card[1]}">
          {/each}
          {#each Array(5 - tableState.hand.board.length) as _}
            <img src="/cards/empty.png" class="card placeholder" alt="Placeholder">
          {/each}
        {/if}

        <div class="pot" bind:this={pot}>
          <p>Pot: {Number(tableState.hand && tableState.hand.amount_gathered || 0).toLocaleString()} Satoshi</p>
          <Chips amount={tableState.hand && tableState.hand.amount_gathered || 0}></Chips>
        </div>
        <button on:click={playSendToPotAnimation}>pot animation</button>
      </div>
    </div>
    <button on:click={() => standUp()}>Stand Up</button>
    <div class="command_panel">
      <!-- {#if sitting()} -->
        <div class="bet_settings">
          <label>
            {#each mycards as card}
              <img in:fly={{y: -20}} class="card1" alt="Card" src="/cards/{card}.png">
            {/each}          
            <input type=number bind:value={raiseTo} min={tableState.hand && tableState.hand.minraise_to} max={mySeat && mySeat.stack}>
            <!-- <button on:click={() => raiseTo = tableState.hand && tableState.hand.minraise_to}>Min</button> -->
            <input class="bet" type=range bind:value={raiseTo} min={tableState.hand && tableState.hand.minraise_to} max={mySeat && mySeat.stack}>
            <!-- <button on:click={() => raiseTo = mySeat && mySeat.stack}>Max</button> -->
          </label>
        </div>
        <!-- {#if tableState.hand && mySeatIndex() === tableState.hand.acting_player} -->
          <button on:click={() => fold()} disabled={!isMyTurn}>Fold</button>
          {#if tableState.hand && mySeat && tableState.hand.max_commitment == mySeat.committed}
            <button on:click={() => check()} disabled={!isMyTurn}>Check</button>
          {:else}
            <button on:click={() => call()} disabled={!isMyTurn}>Call {tableState.hand && tableState.hand.max_commitment}</button>
          {/if}
          {#if tableState.hand && tableState.hand.max_commitment == 0}
            <button on:click={() => bet(raiseTo)} disabled={!isMyTurn}>Bet {raiseTo}</button>
          {:else}
            <button on:click={() => raise(raiseTo)} disabled={!isMyTurn}>Raise To {raiseTo}</button>
          {/if}
          <!-- {/if} -->
        <!-- {#if tableState.seats[mySeatIndex()].seat_state == 'SittingOut'}
          <button on:click={() => sitIn()}>Sit In</button>
        {/if} -->
        
      <!-- {/if} -->
    </div>
  </div>
</div>
