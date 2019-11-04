<script>
import { onDestroy, onMount } from 'svelte';

import player from '../stores/player.js';
import Dialog from './dialog.svelte'

async function fakeDeposit() {
  let url = process.env.API_URL+'/deposits'
  const res = await fetch(url, {
    credentials: 'include',
    method: 'POST'
  })
  // const json = await res.json()
  player.reload()
}

let interval;
let dialog;

onMount(function() {
  interval = setInterval(() => player.reload({scan_deposits: true}), 10000)
  dialog.$on('confirm', dialog.$destroy)
  clearInterval(interval)
})

onDestroy(() => {
  clearInterval(interval)
})

</script>
<style>
* {
  text-align: center;
}
pre {
  margin: 12px 0px;
  padding: 8px 5px;
  border: 1px solid #446;
}
</style>

<Dialog bind:this={dialog}>
  <div slot="title">Deposit</div>
  
  <h2>
    Pricing
  </h2>
  <p>
    100,000,000 Chips = 1 BTC<br>
    100,000 Chips = 0.001 BTC
  </p>

  <pre>
<a href="bitcoin:{$player.deposit_address.BTC}">{$player.deposit_address.BTC}</a>
<img src="https://chart.googleapis.com/chart?cht=qr&chs=256x256&chld=|1&chl=bitcoin:{$player.deposit_address.BTC}" alt="{$player.deposit_address.BTC}">
  </pre>

  <p>
    <b>Your Balance: {($player.balances.BTC.stacks + $player.balances.BTC.available_balance).toLocaleString()} Chips </b>
  </p>

  <p>
    Waiting for deposits...
  </p>

</Dialog>