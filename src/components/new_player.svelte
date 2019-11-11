<script>
import {player, showDialog} from '@/shared'
import PlayerSettings from './player_settings.svelte'

</script>

<style>
img {
  width: 100px;
}
p  {
 text-align: center; 
}
</style>

<p> 
<img src={$player.profile_pic} alt="profile picture"><br>
{#if $player.balances.BTC.available_balance}
You're minding your own business, when suddenly <b>buhrmi</b> shows up.<br> "Here are <b>{$player.balances.BTC.available_balance.toLocaleString()} Chips</b>", he says.
{/if}
</p>