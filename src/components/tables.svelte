<script>
  import {goto} from '@sapper/app';
  import {player, showDialog} from '@/shared'
  import {createEventDispatcher} from 'svelte';
  import CreateTable from './create_table.svelte';

  export let dispatch = createEventDispatcher();

  const tables = fetch(process.env.API_URL+`/tables.json`).then((res) => res.json())

</script>

<style>
a {
  display: block;
  margin: 6px;
  padding: 12px;
  border-radius: 6px;
  text-decoration: none;
}
.name {
  font-weight: bold;
}
.host, .rake {
  float: right;
}
.create {
  position: absolute;
  top: 5px;
  padding: 4px 8px;
}
</style>

<div on:click={() => {showDialog({component: CreateTable, title: 'Create Table'});dispatch('dismiss')}} class="create btn">Create Table</div>

{#await tables}
  Loading Tables...
{:then tables}
  {#each tables as table}
    <a href="/tables/{table.id}" class="table glossy" on:click={() => dispatch('dismiss')}>
      <div class="host">
        Host: {#await player.fetch(table.creator_id) then player}{player.nick}{/await}
      </div>
      <div class="name">{table.name}</div>
      <div class="currency">{table.currency}</div>
      <div class="blinds">
        Blinds: {table.settings.small_blind_amount}/{table.settings.big_blind_amount}
      </div>
      <div class="players">
        Players: {table.settings.table_size - table.open_seats}/{table.settings.table_size}<br>
      </div>
      <div class="rake">
        Rake: {table.settings.rake / 100}%
      </div>
      <div class="rules">
        Rules: {table.ruleset}
      </div>
    </a>
  {/each}
{/await}

<h2>Adventure mode</h2>
<p>Coming soon</p>