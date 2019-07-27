<script context="module">
  export async function preload(page, session) {
	  return {
      session: session
    }
	}
</script>

<script>
  import { stores } from '@sapper/app';
  let { session } = stores();

  export let segment;
</script>


<style>
nav {
  height: 35px;
  background: #101016;
}
</style>
<nav></nav>
<slot></slot>
