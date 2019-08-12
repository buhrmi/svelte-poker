<script context="module">
  export async function preload(page, session) {
    const res = await this.fetch(process.env.API_URL+`/tables.json`)
    const tables = await res.json()
    return { tables }
  }
</script>

<script>
export let tables;

</script>

<style>
.lobby {
  background: url('/felt.png');
  height: calc(100% - 35px);
  text-align: center;
}
</style>

<div class="lobby">
  <h1>Tables</h1>
  {#each tables as table}
    <div class="table">
      <a href="/tables/{table.id}">Table {table.id} - {table.settings.small_blind} / {table.settings.big_blind}</a>
    </div>
  {/each}
</div>