<script>
 import {gameServer} from 'settings';
</script>

<style>

</style>

<svelte:head>
	<title>About</title>
</svelte:head>

<h1>Welcome to the world of Buka</h1>

<p>Buka is building the world's most amazing poker community. And with the <a href="https://github.com/buka-gaming/spec" target="_blank">Buka protocol</a>, you can plug right into our games.</p>

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

<p>For more information, check out our <a href="https://github.com/buka-gaming/spec" target="_blank">Protocol Specification</a>.</p>