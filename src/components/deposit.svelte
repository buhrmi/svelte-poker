<script>
import { onDestroy, onMount } from 'svelte';

import {player} from '@/shared';
import Dialog from './dialog.svelte'

let interval;
let dialog;
let addresses = fetch(process.env.API_URL + '/addresses.json', {credentials: 'include'}).then((res) => res.json())

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

{#await addresses then addresses}
<pre>
<a target="_blank" href="bitcoin:{addresses.BTC}">{addresses.BTC}</a><span class="link" on:click={() => copyToClipboard(addresses.BTC)}>Copy</span>
<img src="https://chart.googleapis.com/chart?cht=qr&chs=256x256&chld=|1&chl=bitcoin:{addresses.BTC}" alt="{addresses.BTC}">
</pre>
{/await}

<p>
  <b>Your Balance: {($player.balances.BTC.stacks + $player.balances.BTC.available_balance).toLocaleString()} Chips </b>
</p>

<p>
  Waiting for deposits...
</p>
