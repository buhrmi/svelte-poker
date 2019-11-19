<script>
import {player, showDialog, currencies} from '@/shared'
import PlayerSettings from './player_settings.svelte'
export let currency;
console.log('derp4')
</script>

<style>
img {
  width: 140px;
}
p {
 text-align: center; 
}
</style>

<p> 
<img src="/baby2.png" alt="babybuhrmi"><br>
{#if $player.balances[currency].available_balance}
You're minding your own business, when suddenly <b>buhrmi</b> appears.<br> "Here are <b>{$player.balances[currency].available_balance.toLocaleString()} {currencies[currency].unitname}</b>", he says. Have fun!
{/if}
</p>