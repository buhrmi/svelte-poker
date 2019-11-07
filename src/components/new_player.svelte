<script>
import {player, showDialog} from '@/shared'
import PlayerSettings from './player_settings.svelte'

</script>

<style>
img {
  width: 100px;
}
p  {
  
}
</style>

<img src={$player.profile_pic} alt="profile picture">


<p> 
{#if $player.balances.BTC.available_balance}
<b>Oh no, you're all out of money!</b> Suddenly, <b>buhrmi</b> shows up and gives you {$player.balances.BTC.available_balance.toLocaleString()} Satoshi. "Hope this will help you on your quest", he says.
{/if}
</p>