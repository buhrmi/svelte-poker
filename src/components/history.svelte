<script>
import {createEventDispatcher} from 'svelte';
import CardString from './card_string.svelte';
import player from '../stores/player'
import {writable} from 'svelte/store'

export let history = {rounds:[]};
export let position = writable({});

const dispatch = createEventDispatcher();
</script>

<style lang="scss">
  .pots {
    padding-left: 16px;
  }
  .action {
    padding: 2px;
    padding-left: 16px;
    position: relative;
    cursor: pointer;
    &:hover {
      background-color: rgba(255,255,255,0.1);
    }
    &.active:before {
      content: '▶';
      position: absolute;
      left: 0px;
    }
  }
</style>

{#each history.rounds as round, roundIndex}
  <div class="round">
    <div on:click={() => dispatch('jump', {roundIndex, actionIndex: -1})} class="action" class:active={$position.round == roundIndex && $position.action == -1}>*** {round.street == 'preflop' ? 'HOLE CARDS' : round.street.toUpperCase()} *** <CardString cards={round.cards}></CardString></div>
    {#each round.actions as action, actionIndex}
      <div on:click={() => dispatch('jump', {roundIndex, actionIndex})} class="action" class:active={$position.round == roundIndex && $position.action == actionIndex}>
        {#await player.fetch(action.player_id)}loading...{:then player}{player.nick}{/await}
        {action.action} {action.amount ? action.amount : ''}
        {#if action.cards}
          <CardString cards={action.cards}></CardString>
        {/if}
      </div>
    {/each}
  </div>
{/each}

<div class="pots">
  {#each history.pots || [] as pot}
    {#each pot.player_wins as win}
      {#if win.win_amount > 0}
        <div class="winnings">
          {#await player.fetch(win.player_id)}loading...{:then player}{player.nick} wins {win.win_amount}{/await}
        </div>
      {/if}
    {/each}
  {/each}
</div>