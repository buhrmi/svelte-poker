<script>
import {player, showDialog} from '@/shared'
import PlayerSettings from './player_settings.svelte'

</script>

<style>
img {
  width: 140px;
}
p  {
 text-align: center; 
}
</style>

<p> 
<img src="/baby2.png" alt="babybuhrmi"><br>
{#if $player.balances.BTC.available_balance}
You're minding your own business, when suddenly <b>buhrmi</b> appears.<br> "Here are <b>{$player.balances.BTC.available_balance.toLocaleString()} Satoshi</b>", he says. Have fun!
{/if}
</p>