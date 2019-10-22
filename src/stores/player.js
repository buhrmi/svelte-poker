import {writable} from 'svelte/store';

const player = writable({})

player.reload = async function(params) {
  try {
    let url = process.env.API_URL + '/me.json'
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

const fetchPromises = {}
// TODO: this should be static or something...
// Maybe this can be abstracted and return a svelte store?
player.fetch = async function (playerId) {
  if (typeof fetch == 'undefined') return
  if (fetchPromises[playerId]) return fetchPromises[playerId];
  return fetchPromises[playerId] = new Promise(function(resolve) {
    fetch(process.env.API_URL+`/players/${playerId}.json`).then((res) => resolve(res.json()))
  })

}

if (typeof setInterval !== 'undefined') {
  setInterval(player.reload, 10000)
}

export default player;