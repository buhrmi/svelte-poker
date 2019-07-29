<script context="module">
  let count = 1
  export async function preload(page, session) {
    let playerData = null
    try {
      let url = process.env.APEX_URL+'/me.json'
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


<style>
nav {
  height: 35px;
  background: #101016;
}
.player {
  position: absolute;
  right: 0;
  padding: 6px;
  z-index: 100;
}
</style>
<nav>
<div class="player">
{#if $player}
{$player.nick}
{:else}
<a href={process.env.APEX_URL}>Sign up / Log In</a>
{/if}
</div>
</nav>
<slot></slot>
