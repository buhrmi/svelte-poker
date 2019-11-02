<script>
import { onDestroy } from 'svelte';
import player from '../stores/player.js';
import Dialog from './dialog.svelte'

async function fakeDeposit() {
  let url = process.env.API_URL+'/deposits'
  const res = await fetch(url, {
    credentials: 'include',
    method: 'POST'
  })
  // const json = await res.json()
  player.reload()
}

let interval;

if (typeof window !== 'undefined') {
  interval = setInterval(() => player.reload({scan_deposits: true}), 10000)
}

onDestroy(() => {
  clearInterval(interval)
})

</script>


