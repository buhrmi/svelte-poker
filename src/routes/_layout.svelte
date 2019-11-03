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
</script>


<style lang="scss">
.playerinfo {
  position: absolute;
  right: 0;
  color: white;
}


</style>

  
  <slot></slot>

{#if $player.id}
  <div class="playerinfo">
    {$player.nick} | Available Balance: {$player.balances['BTC'].available_balance.toLocaleString()} | On Tables: {$player.balances['BTC'].stacks.toLocaleString()}
    <!-- state: {JSON.stringify(tableState)} -->
  </div>
{/if}