<script>
  export let segment;
  
  import { onMount } from 'svelte';
  import { stores } from '@sapper/app';
  import player from '../stores/player.js';

  import Dialog from '../components/dialog.svelte';
  import Modal from '../components/modal.svelte';
  import Deposit from '../components/deposit.svelte';
  import Withdrawals from '../components/withdrawals.svelte';

	let showDashboard = false;
  let {page} = stores()
  
  let hideNav = $page.query.frame;
  
  let { session } = stores();

  onMount(async function() {
    await player.reload()
    if ($player.notice) {
      const dialog = new Dialog({
        target: document.body,
        intro: true,
        props: {
          text: $player.notice
        }
      })
      dialog.$on('confirm', dialog.$destroy)
      dialog.$on('dismiss', dialog.$destroy)
    }
  })

function showComponent(component, props) {    
  const dialog = new component({
    target: document.body,
    intro: true,
    props
  })
}

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
    {$player.nick} • Balance: {$player.balances['BTC'].available_balance.toLocaleString()} • On Tables: {$player.balances['BTC'].stacks.toLocaleString()} <button class="btn" on:click={() => showComponent(Deposit)}>Get more</button>
  </div>
{/if}

<div class="copyright">
Copyright © 2019 <br><a target="_blank" href="https://rocksolid.dev">Rock Solid Development</a>
</div>