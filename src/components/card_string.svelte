<script>
export let cards;

function symbol(suit) {
  if (suit == 'd') return '♦';
  if (suit == 'c') return '♣';
  if (suit == 's') return '♠';
  if (suit == 'h') return '♥';
}
</script>

<style>
.d {
  color: red;
}
.c {
  color: white;
}
.s {
  color: white;
}
.h {
  color: red;
}
.suit {
  font-size: 1.2em;
}
</style>

{#each cards as card}
  <span class="card_string">
    {#if card[0] !== '?'}
      {card[0]}<span class="suit {card[1]}">{symbol(card[1])} </span>
    {/if}
  </span>
{/each}
