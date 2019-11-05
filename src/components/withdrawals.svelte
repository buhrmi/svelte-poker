<script>
import { onDestroy, getContext } from 'svelte';
import {player} from '@/shared';
let promise = fetchWithdrawals()
async function fetchWithdrawals() {
  let url = process.env.API_URL+'/withdrawals.json'
  const res = await fetch(url, {
    credentials: 'include'
  })
  return res.json()
}

async function create() {

}

</script>



<h1>Withdraw</h1>
{#await promise }
  <p>Loading...</p>
{:then withdrawals}
  {withdrawals}
{/await}

<p>Current Balance: {$player.balances.BTC.available_balance.toLocaleString()} Satoshi</p>
<input placeholder="Amount">
<input placeholder="Receiver">
<button on:click={create}>Request Withdrawal</button>

