<script>
import {player, showDialog} from '@/shared'
import PlayerSettings from './player_settings.svelte'

export let text
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
{$player.nick}<br><br>
</p>

<p>
We have remembered you from last time. Please <span class="link" on:click={() => showDialog({component: PlayerSettings, title: 'Player Settings'})}>verify your account</span> so you can access it again later.
</p>