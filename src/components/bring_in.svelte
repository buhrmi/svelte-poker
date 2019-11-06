<script>
import {player, showDialog} from '@/shared'

let bringIn = $player.balances.BTC.available_balance
export let min = 0;
export let max = $player.balances.BTC.available_balance;

</script>

<style>
  
</style>

<p>
<input type="range" min={min} max={$player.balances.BTC.available_balance}>
</p>