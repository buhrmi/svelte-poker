<script context="module">
  
</script>

<script>
export let segment;

import { onMount } from 'svelte';
import { stores } from '@sapper/app';
import { player, showDialog } from '@/shared';

import Dialog from '../components/dialog.svelte';
import NewPlayer from '../components/new_player.svelte';
import PlayerSettings from '../components/player_settings.svelte';
import WelcomeBack from '../components/welcome_back.svelte';
import Deposit from '../components/deposit.svelte';
import Tables from '../components/tables.svelte';
import Withdrawals from '../components/withdrawals.svelte';

const {page} = stores()

onMount(async function() {
  await player.reload($page.query)
  
  // else showDialog({component: WelcomeBack, title: 'Welcome Back'})
  // showDialog({component: PlayerSettings, title: 'Pick a game', id: 'tables'})
})

</script>


<style lang="scss">
@mixin narrow {
  @media (max-width: 800px) { @content; }
}

.copyright {
  position: absolute;
  bottom: 3px;
  right: 3px;
  color: #eee;
  opacity: 0.3;
  text-align: right;
  font-size: 10px;
  @include narrow {
    // bottom: 7px;
    // right: 7px;
    // opacity: 0.2;
    display: none;
  }
}

</style>

  
<slot></slot>

<div class="copyright">
Copyright © 2019 <br><a target="_blank" href="https://rocksolid.dev">Rock Solid Development</a>
</div>