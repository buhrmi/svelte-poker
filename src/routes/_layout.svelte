<script>
export let segment;

import { onMount } from 'svelte';
import { stores } from '@sapper/app';
import { player, showDialog } from '@/shared';

import Dialog from '../components/dialog.svelte';
import NewPlayer from '../components/new_player.svelte';
import WelcomeBack from '../components/welcome_back.svelte';
import Deposit from '../components/deposit.svelte';
import Withdrawals from '../components/withdrawals.svelte';

onMount(async function() {
  await player.reload()
  if ($player.is_new) showDialog({component: NewPlayer, title: `Welcome ${$player.nick}`})
  else showDialog({component: WelcomeBack, title: 'Welcome Back'})
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
  bottom: 5px;
  right: 5px;
  color: #eee;
  opacity: 0.3;
  text-align: right;
  font-size: 10px;
  @include narrow {
    display: none;
  }
}

</style>

  
<slot></slot>

{#if $player.id}
  <div class="playerinfo">
    {$player.nick} • Balance: {$player.balances['BTC'].available_balance.toLocaleString()} • On Tables: {$player.balances['BTC'].stacks.toLocaleString()} <button class="btn" on:click={() => showDialog({component: Deposit, title: 'Get more chips'})}>Get more</button>
  </div>
{/if}

<div class="copyright">
Copyright © 2019 <br><a target="_blank" href="https://rocksolid.dev">Rock Solid Development</a>
</div>