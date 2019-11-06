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
{#if $player.balances.BTC.available_balance}
<strong>Here are {$player.balances.BTC.available_balance.toLocaleString()} Satoshi on us!</strong><br>Pick a table and have fun 😊
{/if}
<p>
<img src={$player.profile_pic} alt="profile picture">
</p>

<p>
You can change your profile image and name in your <span class="link" on:click={() => showDialog({component: PlayerSettings, title: 'Player Settings'})}>player settings</span>.
</p>

