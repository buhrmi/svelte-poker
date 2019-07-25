<script context="module">
  export async function preload(page, session) {
	  return {
      session: session
    }
	}
</script>

<script>
  import { user } from 'stores';

  export let session;
  export let segment;

  $user = session.user;
</script>

<main>
  <slot></slot>
</main>