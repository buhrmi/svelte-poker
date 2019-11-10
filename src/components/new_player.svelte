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
You've been minding your own business, when suddenly <b>buhrmi</b> showed up. "Here are <b>{$player.balances.BTC.available_balance.toLocaleString()} Chips</b>", he said. "I hope this will help you on your quest". You don't know why, but for some reason, you remember clicking the "OK" button and picking a seat.<br>
{/if}
</p>

<p>
<b>You have {$player.balances.BTC.available_balance} Chips!</b>
</p>