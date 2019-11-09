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
You're just walking around, minding your own business. Suddenly, <b>buhrmi</b> shows up and gives you <b>{$player.balances.BTC.available_balance.toLocaleString()} Satoshi</b>. "Hope this will help you on your quest", he says.
{/if}
</p>