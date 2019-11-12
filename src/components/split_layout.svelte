<style lang="scss">
@mixin narrow {
  @media (max-width: 800px) { @content; }
}
.main_frame {
  background: radial-gradient(ellipse at center, rgba(0,0,0,0) 0%,rgba(0,0,0,0.25) 70%,rgba(0,0,0,0.45) 100%);
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
  position: fixed;
  height: 100vh;
  width: 30vw;
  color: white;
  top: 0;
  background: #1d1f2a;
  @include narrow {
    width: 75vw;
    left: -75vw;
    transition: left 0.3s;
    &.shown {
      left: 0;
      box-shadow: 2px 2px 5px rgba(0,0,0,0.4);
    }
  }
  .title {
    height: 26px;
    padding: 4px;
  }
  .inner {
    position: relative;
    height: calc(100% - 34px);
    padding: 4px;
    margin: 4px 4px;
    background: #0d0f1a;
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
  cursor: pointer;
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 20px;
  display: none;
  padding-top: 3px;
  &:hover {
    box-shadow: 1px 1px 2px black inset;
  }
  @include narrow {
    top: -34px;
    left: 6px;
    display: block;
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
.tables {
  position: absolute;
  top: 6px;
  left: 6px;
}
.hamburger {
  width: 28px;
  div {
    box-shadow: 3px 3px 6px -3px black;
    height: 4px;
    margin-bottom: 5px;
    background: white;
    opacity: 0.7;
    border-radius: 5px;
  }
  &:hover {
    div {
      opacity: 1;
    }
  }
}
</style>

<script>
import {onMount, onDestroy} from 'svelte';
import {showDialog} from '@/shared'
import Tables from './tables.svelte';
let leftSideShown = false;

let leftContent = {}


</script>


<div class="main_frame">
  <slot></slot>
  <div class="tables">
    <div class="link hamburger" on:click={() => showDialog({component: Tables, title: 'Choose a Table 😊', options: null})}>
      <div></div>
      <div></div>
      <div></div>
    </div>
  </div>
  <div class="controls glossy">
    <div class="toggle_left glossy" on:click={() => leftSideShown ^= true}>📜</div>
    <div class="inner">
      <slot name="controls"></slot>
    </div>
  </div>
</div>

{#if leftSideShown}
  <div class="overlay" on:click={() => leftSideShown = false}></div>
{/if}

<div class="left_frame" class:shown={leftSideShown}>
  <div class="glossy title">
    <slot name="title"></slot>
  </div>
  <div class="inner">
    <slot name="left"></slot>
  </div>
</div>

