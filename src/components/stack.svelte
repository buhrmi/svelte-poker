<script>
  import { fly } from 'svelte/transition';
  import { onMount } from 'svelte';
  export let seatClass;
  export let seat;

  let totalChips = 0;
  let alreadyExisted = 0
  let denominations = [100000, 50000, 10000, 5000, 1000, 500, 100, 50, 10]
  let displayedCommited = 0
  function flyFrom(index) {
    if (seatClass == 'left') {
      return {x: -30}
    }
    else if (seatClass == 'right') {
      return {x: 30}
    }
    return {y: 50, x: -20}
  }

  onMount(function() {
    setInterval(function() {
      if (displayedCommited < seat.committed) {
        displayedCommited += Math.round(seat.committed / 20)
      }
      if (displayedCommited > seat.committed) displayedCommited = seat.committed
    }, 10)
  })
  $: {
    if (!seat.chips || seat.committed == 0) seat.chips = [];
  }
  $: {

    // If there are more chips outside than committed, start from the beginning
    let currentlyOut = 0;
    for (let i = 0; i < seat.chips.length; i++) {
      currentlyOut += seat.chips[i];
    }
    if (currentlyOut > seat.committed) seat.chips = []


    let remaining = seat.committed
    alreadyExisted = seat.chips.length
    for (let i = 0; i < seat.chips.length; i++) {
      remaining -= seat.chips[i]
    }
    denominations.forEach(denomination => {
      let numChipsToAdd = Math.floor(remaining / denomination)
      for (let index = 0; index < numChipsToAdd; index++) {
        seat.chips.push(denomination);
      }
      remaining = remaining % denomination
    });
    seat.chips = seat.chips
    
  }
</script>

<style lang="scss">
.amount {
  position: relative;
  transition: all 0.5s;
}
.stack {
  width: 100%;
  position: absolute;
  bottom: 0;
  z-index: 10;
  .chip {
    width: 100%;
    position: absolute;
    img {
      position: relative;
      width: 100%;
    }
  }
}

</style>

<div class="stack" >
  {#if seat.chips}
    {#each seat.chips.reverse() as chip, n}
      <div class="chip">
        <img in:fly={{ ...flyFrom(), delay: (n - alreadyExisted) * 170, duration: 400 }} src="/chips/{chip}.png" alt={chip} style="z-index: {n};top: -{n * 4}px"/>
      </div>
    {/each}
    {#if displayedCommited}
      <div class="amount" style="top: -{seat.chips.length * 4 + 20}px">
        {displayedCommited.toLocaleString()}
      </div>
    {/if}
  {/if}
</div>