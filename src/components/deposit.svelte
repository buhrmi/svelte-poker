<script>
 
  export let player;
</script>

<h1>Top Up</h1>
<h2>Bitcoin</h2>
{#if $player.deposit_address}
<p>Current Balance: {$player.balances.BTC} Satoshi</p>
<p>Your Top-Up address:</p>
  <pre>{$player.deposit_address.BTC}</pre>
{/if}

