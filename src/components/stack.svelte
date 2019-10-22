<script>
  export let amount = 0;

  let chips = []
  let denominations = [100000, 50000, 10000, 5000, 1000, 500, 100, 50, 10]

  $: {
    let remaining = amount
    chips = []
    denominations.forEach(denomination => {
      let numChipsToAdd = Math.floor(remaining / denomination)
      for (let index = 0; index < numChipsToAdd; index++) {
        chips.push(denomination);
      }
      remaining = remaining % denomination
    });
    chips = chips
    // chips = chips.reverse()
  }
</script>

<style lang="scss">
.stack {
  width: 100%;
  position: absolute;
  bottom: 0;
  .chip {
    width: 100%;
    position: relative;
    margin-bottom: -90%;
    img {
      position: relative;
      display: block;
      width: 100%;
    }
  }
}

</style>

<div class="stack" >
  {amount}
  {#each chips as chip, n}
    <div class="chip">
      <img src="/chips/{chip}.png" alt={chip} style="z-index: {50-n}"/>
    </div>
  {/each}
</div>