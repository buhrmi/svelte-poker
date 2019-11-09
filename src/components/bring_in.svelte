<script>
import {player, showDialog} from '@/shared'

export let min = 0;
export let max = $player.balances.BTC.available_balance;
export let value = min;
export let optionCaptions = {}

$: {
  optionCaptions['OK'] = `Bring in ${value.toLocaleString()} Chips`
}
</script>

<style>
p {
  text-align: center;
}
</style>

<p>
{#if min}
  You need to bring in at least {min.toLocaleString()} more chips.<br><br>
{/if}

{#if min < $player.balances.BTC.available_balance}
  <input type="range" bind:value min={min} max={$player.balances.BTC.available_balance}><br>
{/if}
</p>