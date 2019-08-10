<script context="module">
  let count = 1
  export async function preload(page, session) {
    let playerData = null
    try {
      let url = process.env.API_URL+'/me.json'
      const res = await this.fetch(url, {
        credentials: 'include',
        headers: {
          Authorization: session.access_token
        }
      })
      playerData = await res.json()
    }
    catch (e) {
      console.log(e.error)
    }

	  return { playerData }
	}
</script>

<script>
  export let playerData;
  export let segment;

  import { stores } from '@sapper/app';
  import { player } from './_stores.js';
  
  $player = playerData;
  
  let { session } = stores();
</script>


<style type="text/sass">
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
  padding: 6px;
  z-index: 100;
  .profile_pic {
    border-radius: 100px;
    width: 25px;
    height: 25px;
    vertical-align: middle;
  }
}
</style>

<nav>
  <div class="player">
    {#if $player}
      {$player.nick}
      <img src="{$player.profile_pic}" alt="" class="profile_pic">
      | Balance (BTC): {$player.balances.BTC} Satoshi
    {:else}
      <a href={process.env.API_URL}>Sign up / Log In</a>
    {/if}
  </div>
</nav>

<slot></slot>
