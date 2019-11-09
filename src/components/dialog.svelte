<svelte:options accessors/>

<script context="module">
  import {writable} from 'svelte/store'
  export const activeEl = writable();
</script>

<script>
import {createEventDispatcher, onMount} from 'svelte';
import {scale} from 'svelte/transition'

// If component is given, it will use it as the dialog's content
export let component
export let title = 'Notice'
export let text;
export let optionCaptions = {}
export let options = ['OK']

export let x = 0
export let y = 0

export let value;

const dispatch = createEventDispatcher()


let el;
let lastMouseX = 0
let lastMouseY = 0

let dragListener;

onMount(() => $activeEl = el)

function handleDrag(e) {
  x += lastMouseX - e.clientX;
  y += lastMouseY - e.clientY;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
}

function dragStart(e) {
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  dragListener = document.body.addEventListener('mousemove', handleDrag)
}

function dragEnd(e) {
  document.body.removeEventListener('mousemove', handleDrag);
}

</script>

<style lang="scss">
	* {
		box-sizing: border-box;
	}

@mixin narrow {
  @media (max-width: 800px) { @content; }
}

  .close_btn {
    right: 5px;
    top: 5px;
    padding: 3px;
    padding-top: 2px;
    position: absolute;
    border: 3px solid #1d1f2a;
    border-radius: 3px;
    cursor: pointer;
    color: black;
    transition: all 0.3s;
  }
  .close_btn:hover {
    background: #9c2828;
    box-shadow: 0 0 10px #9c2828;
  }
  .wrap {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: rgba(0,0,0,0.4);
  }

	.title {
    user-select: none;
    cursor: default;
		font-size: 17px;
    line-height: 17px;
		text-shadow: 0px 0px 16px black;
		color: #ddf;
		text-transform: uppercase;
		height: 40px;
		text-align: center;
		position: relative;
		padding: 11px;
		box-shadow: 0 3px 3px -3px black;
	}

	.dialog {
    width: 526px;
		top: 50%;
    left: 50%;
		position: absolute;
		transform: translate(-50%, -50%);
		display: inline-block;
		margin: auto;
		background: #1d1f2a;
		box-shadow: 10px 10px 30px rgba(0,0,0,0.4);
    @include narrow {
      top: 0 !important;
      left: 0 !important;
      transform: none;
      max-width: 100%;
      width: 100vw;
      height: 100vh;
    }
	}
	.content {
		box-shadow: 1px 1px 1px black inset;
		background: #0d0f1a;
		margin: 10px 6px;
    padding: 12px 12px;
    height: 100%;
		color: #eee;
	}
	.options {
		margin-top: 24px;
    text-align: center;
    clear: both;
	}
  .btn {
    padding: 8px 30px;
  }
  .baby {
    position: absolute;
    width: 21%;
    left: 3%;
    bottom: 30%;
  }
</style>

<div class="wrap" style="{$activeEl == el ? 'z-index: 1;' : ''}">
  <div bind:this={el} on:mousedown={() => $activeEl = el} class="dialog" style="top: calc(50% - {y}px);left: calc(50% - {x}px);" transition:scale>
  <!-- <div class="dialog" transition:scale> -->
    <div class="title glossy" on:mousedown={dragStart} on:mouseup={dragEnd}>
      <div class="glow"></div>
      <!-- <img class="baby" src="/baby1.png" alt="Baby"> -->
      <div class="close_btn" on:click={()=> dispatch('dismiss')}>
        🗙
      </div>
      <slot name="title">{title}</slot>
    </div>
    <div class="content">
      {#if component}
        <svelte:component {dispatch} bind:optionCaptions bind:value this={component} {...$$props}></svelte:component>
      {:else}
        <slot>{text}</slot>
      {/if}
      {#if options}
        <div class="options">
          {#each options as option}
            <div class="btn" on:click={()=> dispatch(option, value)}>{optionCaptions[option] || option}</div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
