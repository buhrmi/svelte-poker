<script>
import { onDestroy, onMount } from 'svelte';

import {player} from '@/shared';
import Dialog from './dialog.svelte'

let interval;
let dialog;
let addresses = fetch(process.env.API_URL + '/addresses.json', {credentials: 'include'}).then((res) => res.json())

export let requiredAmount = 0;

onMount(function() {
  interval = setInterval(() => player.reload({scan_deposits: true}), 30000)
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
.copy {
  padding: 3px 5px;
  display: inline-block;
}
table {
  width: 100%;
}
th, td {
  width: 50%;
}
</style>


{#if requiredAmount}
  <table>
    <tr>
      <th><h2>Required Chips</h2></th>
      <th><h2>You have</h2></th>
    </tr>
    <tr>
      <td><h1>{requiredAmount.toLocaleString()}</h1></td>
      <td><h1>{$player.balances.BTC.available_balance.toLocaleString()}</h1></td>
    </tr>
  </table>
  <p>Purchase {(requiredAmount - $player.balances.BTC.available_balance).toLocaleString()} Chips for only {(requiredAmount - $player.balances.BTC.available_balance) / 100000000} BTC!</p>
{:else}
  <h2>
    Pricing
  </h2>
  <p>
    100,000,000 Chips = 1 BTC<br>
    100,000 Chips = 0.001 BTC
  </p>
{/if}

<p>
You can use the <a href="https://coinfaucet.eu/en/btc-testnet/" target="_blank">Bitcoin Testnet3 Faucet</a> to get free Bitcoin for testing.
</p>

{#await addresses then addresses}
<pre>
<a target="_blank" href="bitcoin:{addresses.BTC}">{addresses.BTC}</a> <span class="copy btn" on:click={() => copyToClipboard(addresses.BTC)}>Copy Address</span>
</pre>
<p>
<img src="https://chart.googleapis.com/chart?cht=qr&chs=200x200&chld=|1&chl=bitcoin:{addresses.BTC}" alt="{addresses.BTC}">
</p>
{/await}


{#if !requiredAmount}
  <h2>Your Balance: {$player.balances.BTC.available_balance.toLocaleString()}</h2>
{/if}
<p>
  Your balance will automatically increase after 1 confirmation. Please leave this window open while waiting.
</p>
