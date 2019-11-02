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
  color: white;
}
</style>

<slot></slot>

<div class="playerinfo">
{#if $player.id}
  {$player.nick} | Available Balance: {$player.balances['BTC'].available_balance.toLocaleString()} | On Tables: {$player.balances['BTC'].stacks.toLocaleString()}
  <!-- state: {JSON.stringify(tableState)} -->
{:else}
  Not logged in...
{/if}
</div>

{#if showDashboard}
	<!-- <Modal on:close="{() => showDashboard = false}">
    <Deposit></Deposit>
	</Modal> -->
{/if}