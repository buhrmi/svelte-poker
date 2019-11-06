<script>
  const tables = fetch(process.env.API_URL+`/tables.json`).then((res) => res.json())
</script>

{#await tables then tables}
  <h2>Cash Games</h2>
  <table>
    <tr><th>Blinds</th></tr>
    {#each tables as table}
      <tr>
        <td>{table.settings.small_blind_amount}/{table.settings.big_blind_amount}</td>
      </tr>
    {/each}
  </table>
{/await}