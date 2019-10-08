import {writable} from 'svelte/store';

const player = writable({})

player.reload = async function(params) {
  try {
    let url = process.env.API_URL+'/me.json'
    if (params) {
      url += '?'
      for (const param in params) {
        const value = params[param]
        url += param + '=' + encodeURIComponent(value)
      }
    }
    const res = await fetch(url, {
      credentials: 'include',
    })
    const json = await res.json()
    player.set(json);
  } 
  catch {

  }
}

if (typeof window !== 'undefined') {
  setInterval(player.reload, 10000)
}

export { player };