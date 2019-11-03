<style lang="scss">
@mixin narrow {
  @media (max-width: 800px) { @content; }
}
.main_frame {
  background-image: url('/felt.png');
  position: fixed;
  height: 100vh;
  width: 70vw;
  left: 30vw;
  @include narrow {
    width: 100vw;
    left: 0;
  }
}
.left_frame {
  padding: 4px;
  position: fixed;
  height: 100vh;
  width: 30vw;
  color: white;
  top: 0;
  @include narrow {
    width: 75vw;
    transition: left 0.3s;
    left: -75vw;
    display: none;
    &.shown {
      display: initial;
      left: 0;
      box-shadow: 2px 2px 5px rgba(0,0,0,0.4);
    }
  }
  .inner {
    overflow-y: auto;
  }
}
.controls {
  color: white;
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px;
  white-space: nowrap;
  text-align: center;
  @include narrow {
    width: 100%;
  }
}
.toggle_left {
  position: absolute;
  @include narrow {
    bottom: 80px;
    left: 0;
  }
}
.overlay {
  @include narrow {
    background: rgba(0,0,0,0.5);
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    position: fixed;
  }
}
</style>

<script>
import {onMount} from 'svelte';

let leftSideShown = true;

let leftContent = {}
let sticky = true
function stickOrUnstick() {
  sticky = leftContent.scrollTop === (leftContent.scrollHeight - leftContent.offsetHeight)
}

onMount(function() {
  setInterval(function() {
    if (sticky) leftContent.scrollTop = leftContent.scrollHeight;
  }, 100)
})
</script>


<div class="main_frame">
  <slot></slot>
  <div class="controls glossy">
    <div class="inner">
      <slot name="controls"></slot>
    </div>
  </div>
</div>

{#if leftSideShown}
  <div class="overlay" on:click={() => leftSideShown = false}></div>
{/if}

<div class="left_frame glossy" class:shown={leftSideShown}>
  <div bind:this={leftContent} class="inner" on:scroll={stickOrUnstick}>
    <slot name="left"></slot>
  </div>
</div>

<div class="toggle_left" on:click={() => leftSideShown ^= true}>Show History</div>
