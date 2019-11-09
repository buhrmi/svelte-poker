// TODO: THIS FILE IS A MESS.
import Dialog from './components/dialog.svelte'

import {writable} from 'svelte/store';

const player = writable({})

function buildQueryString(params) {
  let result = ''
  if (!params) return result
  result += '?'
  for (const param in params) {
    const value = params[param]
    result += param + '=' + encodeURIComponent(value) + '&'
  }
  return result
}

player.reload = async function(params) {
  try {
    let url = process.env.API_URL + '/me.json'
    url += buildQueryString(params)
    const playerData = await fetch(url, {credentials: 'include'}).then((res) => res.json())
    player.set(playerData);
  } 
  catch {

  }
}

player.login = async function(params) {
  let url = process.env.API_URL + '/session'
  url += buildQueryString(params)
  const playerData = await fetch(url, {method: 'POST', credentials: 'include'}).then((res) => res.json())
  player.set(playerData);
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
  dialog.$on('OK', dialog.$destroy)
  dialog.$on('dismiss', dialog.$destroy)
  return dialog
}


export {player, showDialog};