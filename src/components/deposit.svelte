<script>
import { onDestroy, onMount } from 'svelte';

import {player} from '@/shared';
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
})

onDestroy(() => {
  clearInterval(interval)
})

function copyToClipboard(text) {
  var temp = document.createElement('INPUT')
  temp.value = text
  document.body.append(temp)
  temp.select();
  temp.setSelectionRange(0, 99999); /*For mobile devices*/

  /* Copy the text inside the text field */
  document.execCommand("copy");

  /* Alert the copied text */
  document.body.removeChild(temp)
}


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


<h2>
  Pricing
</h2>
<p>
  100,000,000 Chips = 1 BTC<br>
  100,000 Chips = 0.001 BTC
</p>

<pre>
<a target="_blank" href="bitcoin:{$player.deposit_address.BTC}">{$player.deposit_address.BTC}</a><span class="link" on:click={() => copyToClipboard($player.deposit_address.BTC)}>Copy</span>
<img src="https://chart.googleapis.com/chart?cht=qr&chs=256x256&chld=|1&chl=bitcoin:{$player.deposit_address.BTC}" alt="{$player.deposit_address.BTC}">
</pre>

<p>
  <b>Your Balance: {($player.balances.BTC.stacks + $player.balances.BTC.available_balance).toLocaleString()} Chips </b>
</p>

<p>
  Waiting for deposits...
</p>
