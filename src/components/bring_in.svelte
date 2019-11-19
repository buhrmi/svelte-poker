<script>
import {player, showDialog, currencies} from '@/shared'

export let currency
export let min = 0;
export let max = $player.balances[currency].available_balance;
export let value = min;
export let optionCaptions = {}

$: {
  optionCaptions['OK'] = value == 0 ? 'Cancel' : `Bring in ${value.toLocaleString()} ${currencies[currency].unitname}`
}
</script>

<style>
p {
  text-align: center;
}
</style>

{#if $player.balances[currency].available_balance <= 0}
<p>You don't have any {currencies[currency].unitname} to bring in. You have to deposit some first.</p>
{/if}

<p>
{#if min}
  You need to bring in at least {min.toLocaleString()} more {currencies[currency].unitname}.<br><br>
{/if}

{#if min < $player.balances[currency].available_balance}
  <input type="range" bind:value min={min} max={$player.balances[currency].available_balance}><br>
{/if}
</p>