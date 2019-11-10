<script>
  export let player

</script>

{#await player then player}
You don't know anything about {player.nick}. But this player seems to like you.
{/await}