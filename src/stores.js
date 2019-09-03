import {writable} from 'svelte/store';

const player = writable({})

player.reload = async function() {
  let url = process.env.API_URL+'/me.json'
  const res = await fetch(url, {
    credentials: 'include'
  })
  const json = await res.json()
  player.set(json);
}

if (typeof window !== 'undefined') {
  setInterval(player.reload, 10000)
}

export { player };