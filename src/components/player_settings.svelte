<script>
import { onMount } from 'svelte';
import { player, showDialog } from '@/shared'

let loginButton

let loggingIn = false

onMount(function() {
  if (loginButton) {
    window.connectWithTelegram = async function(user) {
      user.telegram_id = user.id
      delete user.id
      // if we pass the telegram auth object to the API, the API will return the correct user (or create a new one).
      loggingIn = true
      await player.login(user) // TODO: handle case where player already had an account connected to telegram
      loggingIn = false
    }
    const script = document.createElement('SCRIPT')
    script.src = 'https://telegram.org/js/telegram-widget.js?7'
    script.dataset['telegramLogin'] = process.env.TELEGRAM_BOT_NAME
    script.dataset['size'] = 'large'
    script.dataset['requestAccess'] = 'write'
    script.dataset['onauth'] = 'connectWithTelegram(user)'
    loginButton.append(script)
  }
})


</script>

<style>
  p {
    text-align: center;
    margin-bottom: 20px;
  }
  div {
    text-align: center;
  }
</style>

{#if $player.verified_by}
  You are now playing as {$player.nick} (Telegram ID {$player.telegram_id}).
{:else}
  <p>Your account is not connected to Telegram. Please click the button below to connect your account. If there already is an account associated with your Telegram ID, we will automatically log you in with that account.</p>
  
  {#if loggingIn}
    Connecting to Telegram. Please wait...
  {:else}
    <div bind:this={loginButton}></div>
  {/if}
{/if}