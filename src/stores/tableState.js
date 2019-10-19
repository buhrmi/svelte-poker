import { writable } from 'svelte/store';

const defaultState = {
	seats: [],
	board: [],
	nextSeat: null,
	dealerSeat: null,
	bet: 0,
	pot: 0
};

function createTableState(options = {}) {
	// We deep clone the options object so we don't accidentally mutate child objects.
	let state = Object.assign({}, defaultState, JSON.parse(JSON.stringify(options)));

	const { subscribe, update, set } = writable(state);

	function getSeatByPlayerId(playerId) {
		for (let index = 0; index < state.seats.length; index++) {
      const seat = state.seats[index];
      if (seat && seat.player_id == playerId) return index
    }
	}

	// See https://hh-specs.handhistory.org/action-object/action for a list of possible actions
  function perform(action) {
		console.log('mutating with', action)

    if (action.action == 'Stands Up') {
			let seat = getSeatByPlayerId(action.player_id)	
			state.seats[seat] = {}
		}

		if (action.action == 'Sits Down') {
			let seat = getSeatByPlayerId(action.player_id)
			state.seats[seat] = {player_id: action.player_id, bet: 0, stack: 0, cards: null}
		}

		if (action.action == 'Added Chips') {
			let seat = getSeatByPlayerId(action.player_id)
			state.seats[seat].stack += action.amount
		}

		if (action.action == 'Post SB') {
			let seat = getSeatByPlayerId(action.player_id)
			state.seats[seat].bet += action.amount
			state.seats[seat].stack -= action.amount
			state.seats[seat].lastAction = 'Posted SB'
			state.bet = state.seats[seat].bet
			
		}

		if (action.action == 'Post BB') {
			let seat = getSeatByPlayerId(action.player_id)
			state.seats[seat].bet += action.amount
			state.seats[seat].stack -= action.amount
			state.seats[seat].lastAction = 'Posted BB'
			state.bet = state.seats[seat].bet
			
		}


		if (action.action == 'Fold') {
			let seat = getSeatByPlayerId(action.player_id)
			state.seats[seat].cards = null
			state.seats[seat].lastAction = 'Folded'
			
		}

		if (action.action == 'Raise') {
			let seat = getSeatByPlayerId(action.player_id)
			
			// If a player faces a $50 bet and raises by $100 to $150, the amount is $150.
			state.seats[seat].bet += action.amount
			state.seats[seat].stack -= action.amount
			state.seats[seat].lastAction = 'Raise'
			state.bet = state.seats[seat].bet
			
		}

		if (action.action == 'Check') {
			
		}

		if (action.action == 'Call') {
			let seat = getSeatByPlayerId(action.player_id)
			state.seats[seat].bet += action.amount
			state.seats[seat].stack -= action.amount
			state.seats[seat].lastAction = 'Called'
			state.bet = state.seats[seat].bet
			
		}

		if (action.action == 'Bets') {
			let seat = getSeatByPlayerId(action.player_id)
			state.seats[seat].bet += action.amount
			state.seats[seat].stack -= action.amount
			state.seats[seat].lastAction = 'Bet'			
		}

		// trigger subscribers
		set(state)
	}
	

	return {
		subscribe,
		perform,
		getSeatByPlayerId,
		reset: function() {
			state = Object.assign({}, defaultState, JSON.parse(JSON.stringify(options)));
			set(state);
		}
	};
}

export default createTableState;