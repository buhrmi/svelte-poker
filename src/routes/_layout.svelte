<script context="module">
  export async function preload(page, session) {
    let playerData = null
    try {
      const url = process.env.API_URL+'/me.json'
      const res = await this.fetch(url, {
        credentials: 'include',
        headers: {
          Authorization: session.access_token
        }
      })
      playerData = await res.json()
    }
    catch (e) {
      console.log(e.message)
    }

	  return { playerData }
	}
</script>

<script>
  export let playerData;
  export let segment;

  import { stores } from '@sapper/app';
  import { player } from '../stores.js';
  import Modal from '../components/modal.svelte';
  import Deposit from '../components/deposit.svelte';

	let showDeposits = false;
  let page = stores.page

  $player = playerData;
  
  let { session } = stores();
</script>


<style lang="scss">
nav {
  height: 35px;
  background: #101016;
  background-image: url('/border.png');
  box-shadow: 0px 0px 5px 0px black;
  position: relative;
  z-index: 501;
}
.player {
  position: absolute;
  right: 0;
  top: 0;
  padding: 6px;
  z-index: 100;
  
  .profile_pic {
    border-radius: 100px;
    width: 25px;
    height: 25px;
    vertical-align: middle;
  }
}
.menu {
  padding: 6px;
}
</style>

<nav>
  <div class="menu">
    {#if segment}
      <a href="/">Tables</a> / BTC Satoshi / Texas Holdem
    {/if}
  </div>
  <div class="player">
    {#if $player}
      {$player.nick}
      <img src="{$player.profile_pic}" alt="" class="profile_pic">
      <div on:click={() => showDeposits ^= true}>Balance (BTC): {$player.balances.BTC} Satoshi</div>
    {:else}
      <a href={process.env.API_URL}>Sign up / Log In</a>
    {/if}
  </div>
</nav>

<slot></slot>

{#if showDeposits}
	<Modal on:close="{() => showDeposits = false}">
    <Deposit player={player}></Deposit>
	</Modal>
{/if}