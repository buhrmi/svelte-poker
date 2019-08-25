<script>
  export let amount = 0;
  
  let chips = {};
  let denominations = [100000, 50000, 10000, 5000, 1000, 500, 100, 50, 10]

  $: {
    let remaining = amount
    let result = {}
    denominations.forEach(denomination => {
      result[denomination] = Math.floor(remaining / denomination)
      if (result[denomination] == 0) delete result[denomination] 
      remaining = remaining % denomination
    });
    chips = result
  }
</script>

<style lang="scss">
.chips {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  // margin-bottom: 8%;
  .stack {
    max-width: 25%;
    .chip {
      position: relative;
      margin-bottom: -93%;
      img {
        display: block;
        width: 100%;
      }
    }
  }
}
</style>

<div class="chips">
  {#each Object.keys(chips) as denomination}
    <div class="stack">
      {#each Array(chips[denomination]) as _, n}
        <div class="chip" style="z-index: {10-n}">
          <img src="/chips/{denomination}.png" alt={denomination}/>
        </div>
      {/each}
    </div>
  {/each}
</div>