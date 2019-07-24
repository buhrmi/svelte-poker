<script>
 import {gameServer} from 'settings';
</script>

<style>

</style>

<svelte:head>
	<title>About</title>
</svelte:head>

<h1>Welcome to the world of Buka</h1>

<p>With the Buka protocol you can plug right into our games.</p>

<h2>Buka Protocol</h2>

<p>Establishing a connection</p>

<ul>
<li>
	As a spectator:<br>
	Simply establish a websocket connection to <pre>{$gameServer}?table_id=[tableId]</pre>
</li>
<li>
	As a player:<br>
	Establish a websocket connection to <pre>{$gameServer}?table_id=[tableId]&access_token=[yourAccessToken]</pre> where access token is an access token belonging to your user id.
</li>
</ul>
