# Svelte Poker [![Deploy to now](https://deploy.now.sh/static/button.svg)](https://deploy.now.sh/?repo=https://github.com/buhrmi/svelte-poker&env=API_URL&env=GAME_SERVER_URL)

A poker frontend to try out [Svelte](https://svelte.dev)/[Sapper](https://sapper.svelte.dev). Currently it only works with servers running a proprietary backend, but support for different backends might be added in the future. It can also be used to visualize games played by various poker AIs (more on that soon).

## Progress

2019-08-14

![](https://i.imgur.com/hH1Q1it.png)

2019-08-10

![](https://i.imgur.com/gGChJZK.png)

2019-07-31

![](https://i.imgur.com/842wRNF.png)

2019-07-29

![](https://i.imgur.com/dsLydcL.png)

2019-07-27

![](https://i.imgur.com/rfNev4u.png)

# Run locally

1. Set your `API_URL` and `GAME_SERVER_URL` environment variables.

2. 
```bash
npx degit "buhrmi/svelte-poker" viewer
cd viewer
npm install # or yarn!
npm run dev
```

3. Open up [localhost:3000](http://localhost:3000) and have fun.
