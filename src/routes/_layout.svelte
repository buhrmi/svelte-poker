<script context="module">
  let count = 1
  export async function preload(page, session) {
    let player = null
    try {
      let url = process.env.APEX_URL+'/me.json'
      const res = await this.fetch(url, {
        credentials: 'include',
        headers: {
          Authorization: session.access_token
        }
      })
      player = await res.json()
    }
    catch (e) {
      console.log(e.error)
    }

	  return { player }
	}
</script>

<script>
  import { stores } from '@sapper/app';
  let { session } = stores();
  export let player;
  export let segment;
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
{#if player}
{player.nick}
{:else}
<a href={process.env.APEX_URL}>Sign up / Log In</a>
{/if}
</div>
</nav>
<slot></slot>
