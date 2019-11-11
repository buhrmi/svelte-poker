<script>
import {createEventDispatcher} from 'svelte';
import CardString from './card_string.svelte';
import {player, showDialog} from '@/shared'
import {writable} from 'svelte/store'
import {fly, slide} from 'svelte/transition';
import Player from './player.svelte';
export let history = {rounds:[]};
export let position = writable({});

const dispatch = createEventDispatcher();
</script>

<style lang="scss">
  .pots {
    padding-left: 16px;
  }

  .pots {
    padding: 6px;
    padding-left: 16px;
    position: relative;
    text-align: center;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    border-left: 1px solid rgba(255,255,0,0.6);
    transition: all 0.3s;
  }
  .review {
    transition: all 0.3s;
    padding: 6px;
    padding-left: 16px;
    position: relative;
    text-align: center;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    border-left: 1px solid rgba(255,255,255,0.6);
  }  
  .action {
    transition: all 0.3s;
    padding: 6px;
    padding-left: 16px;
    position: relative;
    text-align: center;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    border-left: 1px solid rgba(0,255,0,0.6);
    cursor: pointer;
    &:hover {
      background-color: rgba(255,255,255,0.1);
    }
    &.active:before {
      content: '▶';
      position: absolute;
      left: 0px;
    }
    &.Fold {
      border-left: 1px solid rgba(255,0,0,0.6);
    }
    &.Bet, &.Raise {
      border-left: 1px solid rgba(255,200,0,0.6);
    }
  }
  .hand {
    margin-bottom: 4px;
    border-radius: 4px;
    background: #1d1f2a;
    color: #99A;
    &:last-of-type, &:hover {
      .action {
        box-shadow: 10px 0 10px -10px rgba(0,255,0,0.6) inset;
        &.Bet, &.Raise {
          box-shadow: 10px 0 10px -10px rgba(255,200,0,0.6) inset;
        }
        &.Fold {
          box-shadow: 10px 0 10px -10px rgba(255,0,0,0.6) inset;
        }
      }
      .pots {
        box-shadow: 10px 0 10px -10px rgba(255,255,0,0.6) inset;
      }
      color: #EEF;
      a, .link {
        color: #EEF;
      }
    }
    a, .link {
      transition: all 0.3s;
      color: #99A;
    }
  }
  .player, .activity {
    display: inline-block;
    text-align: left;
  }
  .player {
    width: 45%;
  }
  .activity {
    width: 45%;
  }
</style>

<div class="hand">
  {#each history.rounds as round, roundIndex}
    <div class="round">
      {#if round.street !== 'preflop'}
        <div on:click={() => dispatch('jump', {roundIndex, actionIndex: -1})} class="action" class:active={$position.round == roundIndex && $position.action == -1}>
          {round.street.toUpperCase()} <CardString cards={round.cards}></CardString>
        </div>
      {/if}
      {#each round.actions as action, actionIndex}
        <div in:fly={{x:-10}} on:click={() => dispatch('jump', {roundIndex, actionIndex})} class="action {action.action}" class:active={$position.round == roundIndex && $position.action == actionIndex}>
          {#await player.fetch(action.player_id) then player}
            <div class="player link" on:click={(ev) => {showDialog({component: Player, title: player.nick, player});ev.stopPropagation()}}>
              {player && player.nick}
            </div>
          {/await}
          <div class="activity">
            {action.action} {action.amount ? action.amount : ''}
          </div>
          {#if action.cards}
            <CardString cards={action.cards}></CardString>
          {/if}
        </div>
      {/each}
    </div>
  {/each}

  {#if history.pots}
    <div class="pots" in:fly={{x:-10}}>
      {#each history.pots as pot}
        {#each pot.player_wins as win}
          {#if win.win_amount > 0}
            <div class="winnings">
              {#await player.fetch(win.player_id)}loading...{:then player}{player && player.nick} wins {win.win_amount.toLocaleString()}{/await}
            </div>
          {/if}
        {/each}
      {/each}
    </div>
  {/if}

  {#if history.game_number && history.ended}
    <div class="review">
      <a target="_blank" href="/hands/{history.game_number}">REVIEW HAND</a>
    </div>
  {/if}
</div>