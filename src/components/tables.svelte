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
table {
  width: 100%;
  border-collapse: collapse;
}
td {
  padding: 2px;
}
th.number, td.number {
  text-align: right;
}
tr.game:hover {
  cursor: pointer;
  background: rgba(255,255,255,0.2);
}

</style>

{#await tables}
  Loading Tables...
{:then tables}
  <h2>Cash Games</h2>
  <table>
    <tr>
      <th></th>
      <th></th>
      <th class="number">Blinds</th>
      <th class="number">Players</th>
      <th></th>
    </tr>
    {#each tables as table}
      <tr class="game">
        <td on:click={() => gotoTable(table.id)}>{table.id}</td>
        <td on:click={() => gotoTable(table.id)}>{table.name}</td>
        <td class="number" on:click={() => gotoTable(table.id)}>{table.settings.small_blind_amount}/{table.settings.big_blind_amount}</td>
        <td class="number" on:click={() => gotoTable(table.id)}>{table.settings.table_size - table.open_seats}/{table.settings.table_size}</td>
        <td><a href="/tables/{table.id}" target="_blank"><img width="14" src="/external.png" alt="Open in new window"></a></td>
      </tr>
    {/each}
  </table>
{/await}

<h2>Adventure mode</h2>
<p>Coming soon</p>