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
  if ($player.is_new) showDialog({component: NewPlayer, title: `Welcome ${$player.nick}`})
  // else showDialog({component: WelcomeBack, title: 'Welcome Back'})
  showDialog({component: Tables, title: 'Pick a game', id: 'tables'})
})

</script>


<style lang="scss">
@mixin narrow {
  @media (max-width: 800px) { @content; }
}
.playerinfo {
  position: absolute;
  right: 5px;
  top: 5px;
  color: white;
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

{#if $player.id}
  <div class="playerinfo">
    <span class="link" on:click={() => showDialog({component: PlayerSettings, title: 'Player Settings'})}>{$player.nick}</span> • Satoshis: {$player.balances['BTC'].available_balance.toLocaleString()} • On Tables: {$player.balances['BTC'].stacks.toLocaleString()} <button class="btn" on:click={() => showDialog({component: Deposit, title: 'Get more chips'})}>Get more</button>
  </div>
{/if}

<!-- <div class="copyright">
Copyright © 2019 <br><a target="_blank" href="https://rocksolid.dev">Rock Solid Development</a>
</div> -->