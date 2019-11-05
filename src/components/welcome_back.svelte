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
{text}
</p>

<p>
You can change your profile image and name in the <span class="link" on:click={() => showDialog({component: PlayerSettings, title: 'Player Settings'})}>player settings</span>.
</p>

