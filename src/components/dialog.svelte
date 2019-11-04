<script>
import {createEventDispatcher} from 'svelte';
import {scale} from 'svelte/transition'

export let primaryButton = 'OK'
export let title = 'Notice'
export let text = 'Hello World'

export let x = 0
export let y = 0

const dispatch = createEventDispatcher()

let lastMouseX = 0
let lastMouseY = 0

let dragListener;

function handleDrag(e) {
  x += lastMouseX - e.clientX;
  y += lastMouseY - e.clientY;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
}

function dragStart(e) {
  console.log(e)
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
    right: 3px;
    top: 3px;
    padding: 3px;
    padding-top: 2px;
    position: absolute;
    border: 3px solid #1d1f2a;
    border-radius: 3px;
    cursor: pointer;
    color: black;
  }
  .close_btn:hover {
    background: #9c2828;
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
    min-width: 326px;
		max-width: 100%;
		top: 50%;
    left: 50%;
		position: absolute;
		transform: translate(-50%, -50%);
		display: inline-block;
		margin: auto;
		background: #1d1f2a;
		box-shadow: 10px 10px 30px rgba(0,0,0,0.4);
    @include narrow {
      top: 0;
      left: 0;
      transform: none;
      width: 100vw;
      height: 100vh;
    }
	}
	.content {
		box-shadow: 1px 1px 1px black inset;
		background: #0d0f1a;
		margin: 10px 6px;
		padding: 12px 12px;
		color: #eee;
	}
	.options {
		margin-top: 24px;
		text-align: center;
	}
  .btn {
    padding: 8px 30px;
  }
</style>


<!-- <div class="dialog" style="top: calc(50% - {y}px);left: calc(50% - {x}px);" transition:scale> -->
<div class="dialog" transition:scale>
  <div class="title glossy" on:mousedown={dragStart} on:mouseup={dragEnd}>
    <div class="glow"></div>
    <div class="close_btn" on:click={()=> dispatch('dismiss')}>
      🗙
    </div>
    <slot name="title">{title}</slot>
  </div>
  <div class="content">
    <slot>{text}</slot>
    <div class="options">
      <div class="btn" on:click={()=> dispatch('confirm')}>
        {primaryButton}
      </div>	
    </div>
  </div>
  

  <div class="options"></div>
</div>
