import {writable} from 'svelte/store';

const player = writable({})

player.reload = async function() {
  let url = process.env.APEX_URL+'/me.json'
  const res = await fetch(url, {
    credentials: 'include'
  })
  const json = await res.json()
  player.set(json);
}

export { player };