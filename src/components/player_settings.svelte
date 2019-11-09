<script>
import { onMount } from 'svelte';
import { player, showDialog } from '@/shared'

let loginButton


onMount(function() {
  if (loginButton) {
    window.connectWithTelegram = async function(user) {
      user.telegram_id = user.id
      delete user.id
      // if we pass the telegram auth object to the API, the API will return the correct user (or create a new one).
      await player.login(user) // TODO: handle case where player already had an account connected to telegram
    }
    const script = document.createElement('SCRIPT')
    script.src = 'https://telegram.org/js/telegram-widget.js?7'
    script.dataset['telegramLogin'] = 'burukadevbot'
    script.dataset['size'] = 'large'
    script.dataset['requestAccess'] = 'write'
    script.dataset['onauth'] = 'connectWithTelegram(user)'
    loginButton.append(script)
  }
})


</script>

<style>
  
</style>

{#if $player.verified_by}
  You are now playing as {$player.nick} (Telegram ID {$player.telegram_id}).
{:else}
  <p>Please connect your account. If there already is an account associated with your Telegram ID, we will automatically log you in with that account.</p>
  <div bind:this={loginButton}>

  </div>
{/if}