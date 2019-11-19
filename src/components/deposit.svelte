<script>
import { onDestroy, onMount } from 'svelte';

import {player, currencies} from '@/shared';
import Dialog from './dialog.svelte'

let interval;
let dialog;
let addresses = fetch(process.env.API_URL + '/addresses.json', {credentials: 'include'}).then((res) => res.json())

export let currency;
export let requiredAmount = 0;

onMount(function() {
  interval = setInterval(() => player.reload({scan_deposits: currency}), 30000)
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
      <th><h2>Required {currencies[currency].unitname}</h2></th>
      <th><h2>You have</h2></th>
    </tr>
    <tr>
      <td><h1>{requiredAmount.toLocaleString()}</h1></td>
      <td><h1>{$player.balances[currency].available_balance.toLocaleString()}</h1></td>
    </tr>
  </table>
{/if}

{#if currency == 'BTC'}
<p>
  You can use the <a href="https://coinfaucet.eu/en/btc-testnet/" target="_blank">Bitcoin Testnet3 Faucet</a> to get testnet Bitcoins.
</p>
{:else if currency == 'XLM'}
<p>
  You can use the <a href="https://www.stellar.org/laboratory/#account-creator?network=test" target="_blank">FriendBot</a> to get free tesnet Lumens.
</p>
{/if}

{#await addresses then addresses}
<pre>
<a target="_blank" href="{currencies[currency].name}:{addresses[currency]}">{addresses[currency]}</a> <span class="copy btn" on:click={() => copyToClipboard(addresses[currency])}>Copy Address</span>
</pre>
<p>
<img src="https://chart.googleapis.com/chart?cht=qr&chs=200x200&chld=|1&chl={currencies[currency].name}:{addresses[currency]}" alt="{addresses[currency]}">
</p>
{/await}


{#if !requiredAmount}
  <h2>Your Balance: {$player.balances[currency].available_balance.toLocaleString()} {currencies[currency].unitname}</h2>
{/if}
<p>
  Your balance will automatically increase after 1 confirmation. Please leave this window open while waiting.
</p>
