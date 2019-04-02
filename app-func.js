// tech: youtube api, closure; module pattern, object composition, IIFE, functional programming, regex

// TODO: MVC code architecture / organization / patterns
// TODO: use JSDoc @param
// TODO: unit tests, incl. for promises, invalid playlist URL / ID

(function() {
	let DOM = (() => {
		let form = document.getElementById('playlist-form');
		let input = document.getElementById('playlist-input');
		let example = document.getElementById('playlist-example');
		let result = document.getElementById('playlist-result');

		function addError() {
			input.classList.add('playlist__input--error');
			example.classList.add('playlist__subtitle--error');
		}

		function removeError() {
			input.classList.remove('playlist__input--error');
			example.classList.remove('playlist__subtitle--error');
		}

		return { 
			form, 
			input, 
			example, 
			result, 
			addError, 
			removeError
		};
	})();

	let playlistAPI = function(nextPageToken) {
		let playlistURL = getInputValue();
		let playlistId = extractIdFromUrl(playlistURL);

		if ( playlistId ) {
			DOM.result.textContent = '...';

			let key = 'AIzaSyB3Ilcfq4Td9PPgp9bTJphGuwivB5f-J4U';
			let options = {
				playlistId: playlistId,
				part: 'snippet,contentDetails',
				maxResults: 50,
			};

			// Next page
			if (nextPageToken) {
				options['pageToken'] = nextPageToken;
			}

			return { key, options };
		} else {
			return false;
		}
	};

	let videoAPI = function (id) {
		let options = {
			id: id,
			part: 'contentDetails',
		}

		return { options };
	}
	

	DOM.form.addEventListener('submit', processInput);
	
	function processInput(event) {
		event.preventDefault();
		if (DOM.input.value === '' || ! playlistAPI()) {
			DOM.addError();
			return false;
		} else {
			DOM.removeError();
			gapi.load('client', requestPlaylist);
		}
	}

	
	function requestPlaylist() {
		gapi.client.setApiKey(playlistAPI().key);

		let dataArr = [];

		function requestData(token) {
			gapi.client.load('youtube', 'v3', () => {
				let request = gapi.client.youtube.playlistItems.list(playlistAPI(token).options);
				request.execute((data) => {
					dataArr.push(data);
					if (data.nextPageToken) {
						requestData(data.nextPageToken);
					} else {
						processPlaylist(dataArr);
					}
				});
			});
		}

		requestData();
	}

	function processPlaylist(dataArr) {
		let idArr = [];
		let itemsArr = [];
		dataArr.forEach( data => data.result.items.forEach(item => itemsArr.push(item)));
		itemsArr.forEach( item => idArr.push(item.contentDetails.videoId) );

		requestVideos(idArr);
	}

	function requestVideos(idArr) {
		let timesArr = [];

		idArr.forEach( id => {
			gapi.client.load('youtube', 'v3', () => {
				let request = gapi.client.youtube.videos.list(videoAPI(id).options);
				request.execute((data) => {
					let duration = data.result.items[0].contentDetails.duration; 
					timesArr.push(duration);
				});
			});
		});

		// Check if all AJAX calls are finished
		let interval = setInterval(checkLength, 100);

		function checkLength() {
			// When finished, stop checking and proceed
			if (timesArr.length === idArr.length) {
				clearInterval(interval);
				processVideos(timesArr);
			}
		}
	}

	function processVideos(timesArr) {
		let secondsArr = timesArr.map( (time) => durationToSeconds(time));
		let totalSeconds = secondsArr.reduce( (acc, val) => acc + val );
		let getFormattedTime = formatSeconds(totalSeconds);

		DOM.result.textContent = getFormattedTime;
		DOM.result.classList.add('playlist__result--is-active');
	}

	function getInputValue() {
		let input = DOM.input;
		return input.value;
	}

	function extractIdFromUrl(url) {
		let pattern = /playlist\?list=(.*)(&.*)?$/;
		let match = url.match(pattern);
		if (match) {
			DOM.removeError();
			return match[1];
		} else {
			DOM.addError();
			return false;
		}
	}
	
	function durationToSeconds(duration) {
		let match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
		let units = match
			// Remove whole match
			.slice(1)
			// Process each match group
			.map( (unit) => {
				// Hours or minutes can be undefined
				if (unit) {
					// Remove non-numeric characters
					return unit.replace(/\D/, '');
				}
			});

		let hours = (Number(units[0]) || 0);
		let minutes = (Number(units[1]) || 0);
		let seconds = (Number(units[2]) || 0);
		
		let totalSeconds = hours * 3600 + minutes * 60 + seconds;

		return totalSeconds;
	}

	function formatSeconds(time) {
		let hours = Math.trunc(time / 3600 );
		let minutes = Math.trunc(time % 3600 / 60);
		let seconds = Math.trunc(time % 3600 % 60 );

		let hoursFormatted = ('0' + hours).slice(-2);
		let minutesFormatted = ('0' + minutes).slice(-2);
		let secondsFormatted = ('0' + seconds).slice(-2);

		return `${hoursFormatted}:${minutesFormatted}:${secondsFormatted}`;
	}
})();