<script>
  import Chips from '../../components/chips.svelte';
  import { player } from '../../stores';
  import { onDestroy, tick, onMount } from 'svelte';
  import { stores } from '@sapper/app';
  import { fly, fade } from 'svelte/transition';
  import { quintOut, cubicOut } from 'svelte/easing';
	import { crossfade } from 'svelte/transition';
  import { writable } from "svelte/store";
  import solver from 'pokersolver';
  const Hand = solver.Hand
  

  const defaultSettings = {
    cardSize: 33
  }
  
  

  if (typeof window !== 'undefined' && localStorage.getItem("settings")) {
    Object.assign(defaultSettings, JSON.parse(localStorage.getItem('settings')))
  }

  const settings = writable(defaultSettings)
  
  if (typeof window !== 'undefined') {
    window.solver = solver
    settings.subscribe(val => localStorage.setItem("settings", JSON.stringify(val)));
  }

  let oldButtonSeatIndex;
  let cardsDealt;
  let myCards = []

  // A svelte transition that simulates cards being "cardsDealt"
  function dealTransition(node, {rotate, card, seat}) {
    const style = getComputedStyle(node);
    const transform = style.transform === 'none' ? '' : style.transform;
    const dealingSeat = seatElements[handState.dealer.seat]
    const fromRect = dealingSeat.getBoundingClientRect()
    const fromX = fromRect.left + 32 - $settings.cardSize / 2.0
    const fromY = fromRect.top + 16
    const targetRect = node.getBoundingClientRect()
    const deltaX = fromX - targetRect.left;
    const deltaY = fromY - targetRect.top;
    const seatsSittingIn = []
    const timeBetweenCards = 100
    for (let index = 0; index < tableState.seats.length; index++) {
      if (tableState.seats[index].sitting_in) seatsSittingIn.push(index)
    }
    while(seatsSittingIn[0] !== handState.dealer.seat) {
      seatsSittingIn.push(seatsSittingIn.shift())
    }
    seatsSittingIn.push(seatsSittingIn.shift())
    
    // seatsSittingIn is now in the correct "dealing order"
    let delay = 300 + seatsSittingIn.indexOf(seat) * timeBetweenCards
    if (card == 2) delay += seatsSittingIn.length * timeBetweenCards

    const transition = {
      delay,
      duration: 1500,
      easing: quintOut,
      css: t => {
        return `
          transform: translate(${deltaX*(1-t)}px, ${deltaY*(1-t)}px) rotate(${rotate * Math.pow(t, 80)}deg) scale(${0.8 + (t / 5)});
          z-index: ${t < 0.7 ? 10000-delay : 3};
        `
      }
    }
    return transition;
  }

  // TODO: extract this function into a util file
  // Make all the heap chips fly into the put via CSS transition
  function flyIntoPotTransition(node) {
    const potRect = pot.getBoundingClientRect();
    const potX = potRect.x + potRect.width / 2;
    const potY = potRect.y + potRect.height / 2;
    
    const style = getComputedStyle(node);
    const transform = style.transform === 'none' ? '' : style.transform;

    const chipRect = node.getBoundingClientRect();
    const chipX = chipRect.x + chipRect.width / 2;
    const chipY = chipRect.y + chipRect.height / 2;
  
    const prevX = parseInt(style.left) || 0;
    const prevY = parseInt(style.top) || 0;
    const deltaX = potX - chipX
    const deltaY = potY - chipY

    return {
      duration: 1000,
      easing: cubicOut,
      css: t => {
        return `
          transform: translate(${deltaX*(1-t)}px, ${deltaY*(1-t)}px);
        `
      }
    }
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
  let wasConnected = false;
  let timerStroke = 339.292;
  let chatMessage = '';
  let tab = 'chat';
  let gameServer = process.env.ENGINE_URL
  let chatLog = []
  let statusDiv

  let amountToCall = 0
  let stackSize = 10
  let raiseTo = 0
  let isDealt = []
  let mySeatIndex = null;
  let winningCards = [];
  let winningSeat;
  let myHand;
  let rotatedSeatIndicies
  let minRaiseTo = 0;

  $: if (chatLog && statusDiv) statusDiv.scrollTop = statusDiv.scrollHeight;
  
  $: isMyTurn = handState.action_at && mySeatIndex === handState.action_at.seat
  $: mySeat = tableState.seats && tableState.seats[mySeatIndex]
  $: sittingIn = mySeat && mySeat.sitting_in
  $: seatsWithHolecards = handState && handState.participants.filter((p) => p.has_holecards).map((p) => p.seat)
  $: raiseTo = Math.max(minRaiseTo, raiseTo)

  let largestHeap;
  $: {
    if (tableState.seats) {
      largestHeap = 0
      for (let index = 0; index < tableState.seats.length; index++) {
        const element = tableState.seats[index];
        if (element.heap > largestHeap) largestHeap = element.heap
      }
    }
  }
  

  // rotate seat indicies based on player's seat index
  $: {
    // make an array [0, 1, 2, ..., numSeats-1]
    const initial = [...Array(tableState.seats.length).keys()]
    rotatedSeatIndicies = initial.slice(initial.length - mySeatIndex, initial.length).concat(initial.slice(0, initial.length - mySeatIndex));
  }
  
  // find my seat index
  $: {
    mySeatIndex = null
    if ($player) {
      for (let index = 0; index < tableState.seats.length; index++) {
        const element = tableState.seats[index];
        if (element.player_id == $player.id) mySeatIndex = index
      }
    }
  }
  
  $: {
    let cards = handState.board.concat(myCards)
    if (cards.length >= 2) {
      myHand = Hand.solve(cards)
    }
    else {
      myHand = null
    }

  }
  let chatInput
  
  let currency = 'BTC'
  let historyDiv
  let isShowDown = false
  let highlightMyHand = false
  let connectionString = `${gameServer}?table_id=${tableId}`
  if (accessToken) connectionString += `&access_token=${accessToken}`
    
  let tableState = {};
  let handState = {
    participants: [],
    board: [],
    action_at: {}
  }
  tableState = {
    seats: [],
    pot: 0,
    acting_player: 0,
    dealer: 0
  }

  if (false) {
    handState.board = ['Ks', '3h']
    handState.participants = [
      {player_id:1, seat: 0, has_holecards:true}
    ]
    myCards = ['As', 'Kh', 'Ah', 'Kc']
    tableState.seats = [
      {
        player_id: 2,
        heap: 20,
        stack: 200
      },
      {
        player_id: 2,
        heap: 20,
        stack: 200
      },
      {
        player_id: 1,
        heap: 20,
        stack: 200
      },
      {
        player_id: 2,
        heap: 20,
        stack: 200
      },
      {
        player_id: 2,
        heap: 20,
        stack: 200
      },
      {
        player_id: 2,
        heap: 20,
        stack: 200
      }
    ]

    onMount(function() {
      let nextIndex = 1
      setInterval(function() {
        tableState.seats[nextIndex].player_id = 2
        nextIndex++
        if (nextIndex > 5) nextIndex = 0
        tableState.seats[nextIndex].player_id =1
        
      }, 800)

    })
    // onMount(function() {
    //   setInterval(function() {
    //     cardsDealt = false
    //     if (tableState.seats[1].heap == 0) tableState.seats[1].heap = 3000
    //     else tableState.seats[1].heap = 0
    //     tick().then(() => cardsDealt = true)
    //     if (!cardsDealt) tableState.hand.dealer_seat++
    //     if (tableState.hand.dealer_seat > 5) tableState.hand.dealer_seat = 0
    //   }, 3000)
    //   cardsDealt = true
    // })
    // lastChatMessages[1] = "YO BITCHES, calling all your shit 😅"
  }

  
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

  function getSeatsSittingIn() {
    const result = []
    for (let index = 0; index < tableState.seats.length; index++) {
      const seat = tableState.seats[index];
      if (seat.sitting_in) result.push(seat)
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
    if (tableState.seats[index] && tableState.seats[index].player_id) {
      return tableState.seats[index]
    }
    else return null
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

  function sitOut() {
    socket.send(JSON.stringify({msg: "sit-out"}))
  }

  function connect() {
    connecting = true
    socket = new WebSocket(connectionString);
    chatLog.push({text: "Connecting... Please wait ⌛"})
    chatLog = chatLog

    socket.onopen = () => {
      chatLog.push({text: `Connected 🤗`})
      chatLog = chatLog
      wasConnected = true
      connected = true
      connecting = false
    }

    socket.onmessage = (event) => {
      var data = JSON.parse(event.data)
      console.log(data)
      if (data.type == 'table-state') {
        tableState = data 
      }

      if (data.type == 'hand-state') {
        handState = data
        if (data.participants.length > 0) {
          cardsDealt = true
        }
        handState.big_blind
        minRaiseTo = data.min_raise_to
      }

      if (data.type == 'hand-ended') {
        const contestingHands = []
        if (data.pot_contestants.length > 1) {
          chatLog.push({type: 'action', text: '*** SHOW DOWN ***'})  
          isShowDown = true
          
          for (let index = 0; index < data.pot_contestants.length; index++) {
            const contestant = data.pot_contestants[index];  
            const cards = handState.board.concat(contestant.secret)
            tableState.seats[contestant.seat].secret = contestant.secret
            const hand = Hand.solve(cards)
            contestingHands.push(hand)
            chatLog.push({type: 'action', from: contestant.player_id, text: `shows ${contestant.secret}: ${hand.descr}`})
          }
          winningCards = Hand.winners(contestingHands).toString()

        }
        for (let index = 0; index < data.sidepots.length; index++) {
          const sidepot = data.sidepots[index]
          for (const playerId in sidepot.payout_table) {
            const seatIndex = getSeatIndexFromID(playerId)
            const winnings = sidepot.payout_table[playerId]
            if (!winnings) continue;
            if (typeof seatIndex == 'number') {
              tableState.seats[seatIndex].stack += sidepot.payout_table[playerId]
            }
            chatLog.push({type: 'action', from: playerId, text: `collected ${winnings} from pot`})
            chatLog = chatLog
          }
        }
        
        chatLog.push({type: 'action', text: ' '})  
      }

      if (data.type == 'stand-up') {
        tableState.seats[data.seat] = {}
        if (data.seat == mySeatIndex) myCards = []
        tableState.seats = tableState.seats
      }

      if (data.type == 'sit-down') {
        tableState.seats[data.seat] = {player_id: data.player_id, heap: 0, stack: 0}
        tableState.seats = tableState.seats
      }

      if (data.type == 'bring-in') {
        tableState.seats[data.seat].stack = data.amount
        tableState.seats = tableState.seats
      }

      if (data.type == 'sit-in') {
        tableState.seats[data.seat].sitting_in = true 
      }

      if (data.type == 'sit-out') {
        tableState.seats[data.seat].sitting_in = false
      }

      if (data.type == 'hand-started') {
        isShowDown = false
        winningCards = []
        winningSeat = null
        handState.dealer = data.dealer
        handState.participants = data.participants
        tableState.seats.map((seat) => seat.secret = null)
        cardsDealt = false
        tick().then(() => cardsDealt = true)
        chatLog.push({type: 'action', text: `--- HAND 1 --- Seat #${data.dealer.seat} is the button`})
      }

      if (data.type == 'player-secret') {
        myCards = data.secret
        chatLog.push({type: 'action', from: $player.id, text: `was dealt ${data.secret}`})
      }

      if (data.type == 'post-sb') {
        tableState.seats[data.seat].heap += data.amount
        tableState.seats[data.seat].stack -= data.amount
        tableState.seats[data.seat].lastAction = 'Posted SB: '
        chatLog.push({type: 'action', from: data.player_id, text: `posts small blind ${data.amount}`})
        chatLog = chatLog
      }

      if (data.type == 'post-bb') {
        tableState.seats[data.seat].heap += data.amount
        tableState.seats[data.seat].stack -= data.amount
        tableState.seats[data.seat].lastAction = 'Posted BB: '
        chatLog.push({type: 'action', from: data.player_id, text: `posts big blind ${data.amount}`})
        chatLog = chatLog
      }

      if (data.type == 'betting-round-started') {
        handState.board = data.board
        handState.participants = data.participants
        tableState.total_gathered = data.total_gathered
        let round = data.betting_round == 'preflop' ? 'HOLE CARDS' : data.betting_round.toUpperCase()
        chatLog.push({type: 'action', text: `*** ${round} *** ${handState.board}`})
        chatLog = chatLog
        raiseTo = 0
        minRaiseTo = data.min_raise_to
      }

      if (data.type == 'action-is-on') {
        handState.action_at = data
        timerStart = new Date().getTime()
        timeOut = Date.parse(data.timeout)
      }

      if (data.type == 'betting-round-ended') {
        // set heap to 0 on all seats. setting heap to 0 will trigger the "move to pot" out-transition on the chips
        handState.action_at = {}
        tableState.seats.map((s) => s.lastAction = null)
        tableState.seats.map((seat) => seat.heap = 0)
      }

      if (data.type == 'fold') {
        // If we get a fold message, 
        for (let i = 0; i < handState.participants.length; i++) {
          const p = handState.participants[i];
          if (p && p.seat == data.seat) handState.participants[i].has_holecards = false
        }
        tableState.seats[data.seat].lastAction = 'Folded'
        if (data.seat == mySeatIndex) myCards = []
        chatLog.push({type: 'action', from: data.player_id, text: `folded`})
        chatLog = chatLog
      }

      if (data.type == 'raise') {
        let diff = data.heap - tableState.seats[data.seat].heap
        tableState.seats[data.seat].heap = data.heap
        tableState.seats[data.seat].stack -= diff
        tableState.seats[data.seat].lastAction = 'Raised: '
        minRaiseTo = data.amount + data.heap
        chatLog.push({type: 'action', from: data.player_id, text: `raises ${data.amount}`})
        chatLog = chatLog
      }

      if (data.type == 'check') {
        chatLog.push({type: 'action', from: data.player_id, text: `checks`})
        chatLog = chatLog
      }

      if (data.type == 'call') {
        tableState.seats[data.seat].heap += data.amount
        tableState.seats[data.seat].stack -= data.amount
        tableState.seats[data.seat].lastAction = 'Called: '
        chatLog.push({type: 'action', from: data.player_id, text: `calls ${data.amount}`})
        chatLog = chatLog
      }

      if (data.type == 'bet') {
        tableState.seats[data.seat].heap = data.heap
        tableState.seats[data.seat].stack -= data.heap
        tableState.seats[data.seat].lastAction = 'Bet: '
        chatLog.push({type: 'action', from: data.player_id, text: `bets ${data.heap}`})
        chatLog = chatLog
        minRaiseTo = data.heap * 2
      }

      if (data.type == 'waiting-for-next-round-to-start') {
        
      }

      if (data.msg == "chat") {
        chatLog.push(data)
        chatLog = chatLog
        displayChatMessage(data.from, data.text)
        tick().then(() => historyDiv.scrollTop = historyDiv.scrollHeight);
        chatLog.push({from: data.player_id, text: data.text})
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
  height: calc(100%);
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
  right: 0%;
  // transform: translateX(-50%);
  bottom: 0%;
  padding: 16px;
  max-width: 50%;
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
.cog {
  transition: all 0.3s;
  position: absolute;
  opacity: 0.4;
  top: 8px;
  right: 8px;
  z-index: 501;
  height: 20px;
  width: 20px;
  background-image: url('/cog.png');
  background-size: cover;
  cursor: pointer;
  &:hover {
    opacity: 1;
  }
}

.currency {
  font-size: 0.8em;
}

.seat {
  position: absolute;
  transition: all 0.5s;
  .dealer {
    position: absolute;
    width: 28px;
    top: 33px;
    z-index: 1;
    box-shadow: 1px 1px 3px rgba(0,0,0,0.3);
    border-radius: 20px;
  }
  &.seat_0 {
    top: 60%;
    left: 37%;
  }
  &.seat_1 {
    top: 55%;
    left: 5%;
  }
  &.seat_2 {
    top: 8%;
    left: 5%;
  }
  &.seat_3 {
    top: 2%;
    left: 37%;
  }
  &.seat_4 {
    top: 8%;
    left: 70%;
  }
  &.seat_5 {
    top: 55%;
    left: 70%;
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
        z-index: 3;
        box-shadow: -1px 1px 2px rgba(0,0,0,0.5);
      }
      .card1 {
        transform: rotate(-5deg);
        left: 65px;
        top: 35px;
      }
      .card2 {
        transform: rotate(12deg);
        left: 76px;
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
      max-width: 80px;
      width: calc(14%);
      min-width: 40px;
      display: inline-block;
      box-shadow: 0 1px 4px -2px rgba(0,0,0,0.8);
    }
  }
  .pot {
    margin: 0 auto;
    max-width: 25%;
  }
  
}
// Narrow styling
@media screen and (max-width: 576px) {
  .sidebar {
    width: 100%;
  }
  .command_panel {
    max-width: 100%;
    width: 100%;
  }
  .status {
    display: none;
  }
}
// Wide styling
@media screen and (min-width: 577px) {
  .sidebar {
    width: 320px;
  }
  .sidebar-opened .table {
    margin-right: 320px;
  }
  .sidebar-opened .cog {
    right: 328px;
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
.card, .card1, .card2 {
   position: relative;
    top: 0px;
    transition: all 0.5s;
}


.card, .card1, .card2 {
  &.winning_card {
    box-shadow: 0 0 3px 3px yellow !important;
    position: relative;
    top: -14px;
  }
}


</style>


<div class="status" bind:this={statusDiv}>
  {#each chatLog as log}
    <p class="log" class:type={log.type}>
      {#if log.from}
        {#if log.type == 'action'}
          <img alt="" src={cachedPlayerData && playerData(log.from).profile_pic}>
          <span>{cachedPlayerData && playerData(log.from).nick} {@html log.text}</span>
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
    <div class="settings">  
      Card Size:<br>
      <input bind:value={$settings.cardSize} type="range" min="20" max="60">
      <br><br>
      Websocket URL:<br>
      <input bind:value={connectionString}>

      <button on:click={connect}>Connect</button><br>
    </div>
  </div>

  <div class="cog" class:is-active={sidebarOpened} on:click={() => sidebarOpened = !sidebarOpened}></div>

  <div class="table {highlightMyHand ? 'highlighting_my_best' : ''}">
    {#each Array(tableState.seats.length) as _, index}
      <div bind:this={seatElements[index]} class="seat seat_{rotatedSeatIndicies[index]}">
        {#if tableState.seats[index] && seat(index)}
          {#if handState.dealer && handState.dealer.seat == index}
            <img class="dealer" in:receive={'dealer'} out:send={'dealer'} src="/button.png" alt="DEALER">
          {/if}
          <div class:action="{tableState.seats[index].lastAction}" class="player" transition:fly|local="{{ y: -15, duration: 350 }}">
            {#if lastChatMessages[index]}
              <p in:fade="{{ duration: 100 }}" out:fly="{{ y: -8, duration: 650 }}"class="bubble speech">{lastChatMessages[index]}</p>
            {/if}
            <div class="nick">
              {cachedPlayerData && playerData(tableState.seats[index].player_id).nick}
            </div>
            <div class="stack">
              {(tableState.seats[index].stack || 0).toLocaleString()}<span class="currency">元</span>
            </div>
            {#if seatsWithHolecards.indexOf(index) !== -1}
              <div out:fly|local={{duration: 1000, y: 20}} class="hole">
                {#if cardsDealt && mySeatIndex == index && myCards && myCards.length > 0}
                  <img in:dealTransition|local={{rotate: -5, card: 1, seat: index}} style="width: {$settings.cardSize}px" class="card1 {winningCards.indexOf(myCards[0]) !== -1 ? 'winning_card' : ''} {myHand && myHand.cards.toString().indexOf(myCards[0]) !== -1 ? 'best_card' : ''}" alt="Card" src="/cards/{myCards[0].toLowerCase()}.png">
                  <img in:dealTransition|local={{rotate: 12, card: 2, seat: index}} style="width: {$settings.cardSize}px" class="card2 {winningCards.indexOf(myCards[1]) !== -1 ? 'winning_card' : ''} {myHand && myHand.cards.toString().indexOf(myCards[1]) !== -1 ? 'best_card' : ''}" alt="Card" src="/cards/{myCards[1].toLowerCase()}.png">
                {:else if cardsDealt && tableState.seats[index].secret}
                  <img style="width: {$settings.cardSize}px" class="card1 {winningCards.indexOf(tableState.seats[index].secret[0]) !== -1 ? 'winning_card' : ''}" alt="Card" src="/cards/{tableState.seats[index].secret[0].toLowerCase()}.png">
                  <img style="width: {$settings.cardSize}px" class="card2 {winningCards.indexOf(tableState.seats[index].secret[1]) !== -1 ? 'winning_card' : ''}" alt="Card" src="/cards/{tableState.seats[index].secret[1].toLowerCase()}.png">
                {:else if cardsDealt}
                  <img in:dealTransition|local={{rotate: -5, card: 1, seat: index}} style="width: {$settings.cardSize}px" class="card1" alt="Card" src="/cards/back.png">
                  <img in:dealTransition|local={{rotate: 12, card: 2, seat: index}} style="width: {$settings.cardSize}px" class="card2" alt="Card" src="/cards/back.png">
                {/if}
              </div>
            {/if}
            <div class="image">
              <img alt="" class="profile_pic" src="{cachedPlayerData && playerData(tableState.seats[index].player_id).profile_pic}">
              {#if handState.action_at.seat == index}
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle stroke-dasharray="{timerStroke} {2 * 3.141 * 22}" cx="24" cy="24" r="22" fill="none" stroke="#FFEE44" stroke-width="4" />
                </svg>
              {/if}
            </div>
            {#if !tableState.seats[index].sitting_in}
              Sitting Out
            {/if}
            <div class="bet" style="top: {$settings.cardSize * 1.4 + 34}px">
              {#if tableState.seats[index].lastAction}
                {tableState.seats[index].lastAction}
              {/if}
              {#if tableState.seats[index].heap > 0}
                {tableState.seats[index].heap.toLocaleString()}<span class="currency">元</span>
                <div out:flyIntoPotTransition|local class="chips" bind:this={chipElements[index]}>
                  <Chips amount="{tableState.seats[index].heap}"></Chips>
                </div>
              {/if}
            </div>
          </div>
        {:else}
          {#if mySeatIndex == null}
            {#if $player}
              <button on:click={() => sitDown(index)}>Sit here 😊</button>
            {:else}
              Log in to sit here
            {/if}
          {/if}
        {/if}
      </div>
    {/each}
    <div class="middle">
      <div class="board">
        {#each (handState.board || []) as card}        
          <img in:fly="{{ y: -25, duration: 450 }}" src="/cards/{card.toLowerCase()}.png" class="card {winningCards.indexOf(card) !== -1 ? 'winning_card' : ''} {myHand && myHand.cards.toString().indexOf(card) !== -1 ? 'best_card' : ''}" alt="{card}">
        {/each}
        {#each Array(5 - (handState.board && handState.board.length || 0)) as _}
          <img src="/cards/empty.png" class="card placeholder" alt="Placeholder">
        {/each}
        <div class="pot" bind:this={pot}>
          <p>Pot: {Number(tableState.total_gathered || 0).toLocaleString()} Satoshi</p>
          <Chips amount={tableState.total_gathered || 0}></Chips>
        </div>
      </div>
    </div>
    <!-- Participating: { JSON.stringify(seatsWithHolecards) }, LargestHeap: { largestHeap }, {myHand.cards} -->
    {#if mySeat}
      {#if sittingIn}
        <button on:click={() => sitOut()}>Sit Out</button>
      {:else}
        <button on:click={() => sitIn()}>Sit In</button>
      {/if}
      <button on:click={() => standUp()}>Stand Up</button>
    {/if}

    {#if mySeat}
      <div class="command_panel">
        {#if myHand}
          <p on:mouseenter={() => highlightMyHand = true} on:mouseout={() => highlightMyHand = false}>{ myHand.descr }</p>
        {/if}
        <!-- {#if sitting()} -->
          <div class="bet_settings">
            <label>
              <!-- {#each myCards as card}
                <img in:fly={{y: -20}} class="card1 {myHand.cards.toString().indexOf(card) !== -1 ? 'best_card' : ''}" alt="Card" src="/cards/{card.toLowerCase()}.png">
              {/each}<br>    -->
              <input type=number bind:value={raiseTo} min={minRaiseTo} max={mySeat && mySeat.stack}>
              <!-- <button on:click={() => raiseTo = minRaiseTo}>Min</button> -->
              <input class="bet" type=range bind:value={raiseTo} min={minRaiseTo} max={mySeat && mySeat.stack}>
              <!-- <button on:click={() => raiseTo = mySeat && mySeat.stack}>Max</button> -->
            </label>
          </div>
          <!-- {#if tableState.hand && mySeatIndex === tableState.hand.acting_player} -->
            <div class="btn {isMyTurn ? '' : 'disabled'} fold" on:click={() => fold()}>Fold</div>
            {#if mySeat && largestHeap == mySeat.heap}
              <div class="btn {isMyTurn ? '' : 'disabled'} check" on:click={() => check()}>Check</div>
            {:else}
              <div class="btn {isMyTurn ? '' : 'disabled'} call" on:click={() => call()}>Call {largestHeap - mySeat.heap}</div>
            {/if}
            
            {#if largestHeap == 0}
              <div class="btn {isMyTurn ? '' : 'disabled'} bet" on:click={() => bet(raiseTo)}>Bet {raiseTo} {#if mySeat && raiseTo == mySeat.stack}(All-In){/if}</div>
            {:else}
              <div class="btn {isMyTurn ? '' : 'disabled'} raise" on:click={() => raise(raiseTo)}>Raise To {raiseTo}</div>
            {/if}
            <!-- {/if} -->
        <!-- {/if} -->
      </div>
    {/if}
  </div>
</div>
