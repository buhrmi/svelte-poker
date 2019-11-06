// TODO: THIS FILE IS A MESS.
import Dialog from './components/dialog.svelte'

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
// TODO: this doesn't feel right.
player.fetch = function (playerId) {
  if (fetchPromises[playerId]) return fetchPromises[playerId];

  return fetchPromises[playerId] = new Promise(function(resolve) {
    // Why does svelte attempt to execute promises in await blocks during SSR if it doesnt even wait for the result?
    if (typeof fetch == 'undefined') return {}
    fetch(process.env.API_URL+`/players/${playerId}.json`).then((res) => resolve(res.json()))
  })
}

if (typeof setInterval !== 'undefined') {
  setInterval(player.reload, 10000)
}

function showDialog(props) {    
  const dialog = new Dialog({
    target: document.body,
    intro: true,
    props
  })
  dialog.$on('confirm', dialog.$destroy)
  dialog.$on('dismiss', dialog.$destroy)
  return dialog
}


export {player, showDialog};