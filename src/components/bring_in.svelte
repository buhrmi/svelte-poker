<script>
import {player, showDialog} from '@/shared'

export let min = 0;
export let max = $player.balances.BTC.available_balance;
export let value = min;
</script>

<style>
p {
  text-align: center;
}
</style>

<p>
The minimum bring-in for this table is {min} chips.<br><br>
<input type="range" bind:value min={min} max={$player.balances.BTC.available_balance}><br>
Bring in {value} Chips
</p>