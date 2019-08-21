<script>
  export let player;

  async function fakeDeposit() {
    let url = process.env.API_URL+'/deposits'
    const res = await fetch(url, {
      credentials: 'include',
      method: 'POST'
    })
    // const json = await res.json()
    player.reload()
  }
</script>

<h1>Top Up</h1>
<h2>Bitcoin</h2>
{#if $player.deposit_address}
<p>Current Balance: {$player.balances.BTC} Satoshi</p>
<p>Your Top-Up address:</p>
  <pre>{$player.deposit_address.BTC}</pre>
{/if}
<button on:click={fakeDeposit}>Make fake deposit</button>

