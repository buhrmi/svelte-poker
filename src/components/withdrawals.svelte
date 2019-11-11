<script>
import { onDestroy, getContext } from 'svelte';
import {player} from '@/shared';
let promise = fetchWithdrawals()
async function fetchWithdrawals() {
  let url = process.env.API_URL+'/withdrawals.json'
  const res = await fetch(url, {
    credentials: 'include'
  })
  return res.json()
}

async function create() {

}

</script>


<p>
Withdraw / Exchange functions coming soon. Stay tuned.
</p>

