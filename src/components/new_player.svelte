<script>
import {player, showDialog, currencies} from '@/shared'
import PlayerSettings from './player_settings.svelte'
import {getContext} from 'svelte';
const tableData = getContext('tableData')
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
{#if $player.balances[tableData.currency].available_balance}
You're minding your own business, when suddenly <b>buhrmi</b> appears.<br> "Here are <b>{$player.balances[tableData.currency].available_balance.toLocaleString()} {currencies[tableData.currency].unitname}</b>", he says. Have fun!
{/if}
</p>