<script>
import { onMount } from 'svelte';
import { player, showDialog } from '@/shared'

let loginButton

onMount(function() {
  window.onTelegramAuth = function(user) {
    alert('Logged in as ' + user.first_name + ' ' + user.last_name + ' (' + user.id + (user.username ? ', @' + user.username : '') + ')');
  }
  const script = document.createElement('SCRIPT')
  script.src = 'https://telegram.org/js/telegram-widget.js?7'
  script.dataset['telegramLogin'] = 'burukadevbot'
  script.dataset['size'] = 'large'
  script.dataset['requestAccess'] = 'write'
  script.dataset['onauth'] = 'onTelegramAuth(user)'
  loginButton.append(script)
})


</script>

<style>
  
</style>

<div bind:this={loginButton}>

</div>