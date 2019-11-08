<script>
  import {goto} from '@sapper/app';

  export let dispatch;

  const tables = fetch(process.env.API_URL+`/tables.json`).then((res) => res.json())

  function gotoTable(id) {
    goto('/tables/' + id)
    if (dispatch) dispatch('dismiss')
  }
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
</style>

{#await tables}
  Loading Tables...
{:then tables}
  <h2>Cash Games</h2>
  {#each tables as table}
    <a href="/tables/{table.id}" class="table glossy">
      <div class="name">{table.name}</div>
      <div class="blinds">
        Blinds: {table.settings.small_blind_amount}/{table.settings.big_blind_amount}
      </div>
      <div class="players">
        Players: {table.settings.table_size - table.open_seats}/{table.settings.table_size}<br>
      </div>
      <div class="rake">
        Rake: {table.settings.rake / 100}%
      </div>
    </a>
  {/each}
{/await}

<h2>Adventure mode</h2>
<p>Coming soon</p>