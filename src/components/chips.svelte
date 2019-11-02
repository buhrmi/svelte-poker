<script>
  export let amount = 0;
  export let width = 30;
  let stacks = {};
  
  let denominations = [100000, 50000, 10000, 5000, 1000, 500, 100, 50, 10]
  let displayedAmount = 0
  $: {
    if (amount < displayedAmount) {
      stacks = {}
      displayedAmount = 0
    }
    let amountToAdd = amount - displayedAmount
    
    denominations.forEach(denomination => {
      let numToAdd = Math.floor(amountToAdd / denomination)
      if (numToAdd > 0) {
        if (!stacks[denomination]) stacks[denomination] = 0
        stacks[denomination] += numToAdd
        displayedAmount += numToAdd * denomination
      }
      amountToAdd = amountToAdd % denomination
    });
  }
</script>

<style lang="scss">
.stacks {
  display: inline-block;
  padding: 3px;
  .stack {
    display: inline-block;
    position: relative;
    vertical-align: top;
    .chip {
      position: absolute;
      img {
        width: 100%;
      }
    }
  }
}
</style>

<div class="stacks" style="height: {width + 6}px">
  {#each Object.keys(stacks) as denomination}
    <div class="stack" style="width: {width}px">
      {#each Array(stacks[denomination]) as _, n}
        <div class="chip" style="top: -{n *4}px">
          <img src="/chips/{denomination}.png" alt={denomination}/>
        </div>
      {/each}
    </div>
  {/each}
</div>