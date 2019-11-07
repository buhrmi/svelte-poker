<script context="module">
  export async function preload(page, session) {
    const tables = await this.fetch(process.env.API_URL+`/tables.json`).then((res) => res.json())
    tables.forEach(table => {
      if (table.open_seats > 0) return this.redirect(301, '/tables/' + table.id)
    });
  }
</script>





<script>


</script>