/**
 *
 * history.js:
 *
 * - Back button to close gallery.
 * 
 * - Unique URL for each slide: example.com/&pid=1&gid=3
 *   (where PID is picture index, and GID and gallery index)
 *   
 * - Switch URL when slides change.
 * 
 */


var _historyDefaultOptions = {
	history: true,
	galleryUID: 1
};

var _historyUpdateTimeout,
	_fileChangeTimeout,
	_fileAnimCheckTimeout,
	_fileChangedByScript,
	_fileChangedByHistory,
	_fileNameReseted,
	_initialFileName,
	_historyChanged,
	_closedFromURL,
	_urlChangedOnce,
	_windowLoc,

	_supportsPushState,

	_isFile = function () {
		var filename = _windowLoc.pathname.substring(_windowLoc.pathname.lastIndexOf('/') + 1);
		return filename.includes('.')
	},
	_getFileName = function () {
		var filename = _windowLoc.pathname.substring(_windowLoc.pathname.lastIndexOf('/') + 1);
		return filename.includes('.') ? filename : '';
	},
	_getDirName = function () {
		var filename = _windowLoc.pathname.substring(_windowLoc.pathname.lastIndexOf('/') + 1);
		return filename.includes('.') ? _windowLoc.pathname.substring(0, _windowLoc.pathname.lastIndexOf('/')) : _windowLoc.pathname;
	},
	_cleanHistoryTimeouts = function () {

		if (_historyUpdateTimeout) {
			clearTimeout(_historyUpdateTimeout);
		}

		if (_fileAnimCheckTimeout) {
			clearTimeout(_fileAnimCheckTimeout);
		}
	},

	// pid - Picture index
	_parseItemIndexFromURL = function () {
		var filename = _getFileName();
		var params = {};
		if (!filename) {
			return params;
		}
		if (_options.galleryPIDs) {
			// detect custom pid in hash and search for it among the items collection
			var searchfor = filename;
			params.pid = 0; // if custom pid cannot be found, fallback to the first item
			for (i = 0; i < _items.length; i++) {
				if (_items[i].pid === searchfor) {
					params.pid = i;
					break;
				}
			}
		}
		if (params.pid < 0) {
			params.pid = 0;
		}
		return params;
	},
	_updateURL = function () {

		if (_fileAnimCheckTimeout) {
			clearTimeout(_fileAnimCheckTimeout);
		}


		if (_numAnimations || _isDragging) {
			// changing browser URL forces layout/paint in some browsers, which causes noticable lag during animation
			// that's why we update hash only when no animations running
			_fileAnimCheckTimeout = setTimeout(_updateURL, 500);
			return;
		}

		if (_fileChangedByScript) {
			clearTimeout(_fileChangeTimeout);
		} else {
			_fileChangedByScript = true;
		}


		var pid = (_currentItemIndex + 1);
		var item = _getItemAt(_currentItemIndex);
		if (item.hasOwnProperty('pid')) {
			// carry forward any custom pid assigned to the item
			pid = item.pid;
		}
		var newFile = _getDirName() + '/' + pid;

		if (!_historyChanged) {
			if (_windowLoc.pathname.indexOf(newFile) === -1) {
				_urlChangedOnce = true;
			}
			// first time - add new hisory record, then just replace
		}

		var newURL = _windowLoc.protocol + '//' + _windowLoc.host + '/' + newFile.replace(/^\/+|\/+$/g, '');;

		if (_supportsPushState) {
			history[_historyChanged ? 'replaceState' : 'pushState']('', document.title, newURL);
		} else {
			if (_historyChanged) {
				_windowLoc.replace(newURL);
			}
		}



		_historyChanged = true;
		_fileChangeTimeout = setTimeout(function () {
			_fileChangedByScript = false;
		}, 60);
	};





_registerModule('History', {



	publicMethods: {
		initHistory: function () {

			framework.extend(_options, _historyDefaultOptions, true);

			if (!_options.history) {
				return;
			}


			_windowLoc = window.location;
			_urlChangedOnce = false;
			_closedFromURL = false;
			_historyChanged = false;
			_initialFileName = _getFileName();
			_supportsPushState = ('pushState' in history);


			_listen('afterChange', self.updateURL);
			_listen('unbindEvents', function () {
				framework.unbind(window, 'popstate', self.onFileChange);
			});


			var returnToOriginal = function () {
				_fileNameReseted = true;
				if (!_closedFromURL) {

					if (_urlChangedOnce) {
						history.back();
					} else {

						if (_supportsPushState) {
							history.pushState('', document.title, _getDirName());
						}
					}

				}

				_cleanHistoryTimeouts();
			};


			_listen('unbindEvents', function () {
				if (_closedByScroll) {
					// if PhotoSwipe is closed by scroll, we go "back" before the closing animation starts
					// this is done to keep the scroll position
					returnToOriginal();
				}
			});
			_listen('destroy', function () {
				if (!_fileNameReseted) {
					returnToOriginal();
				}
			});
			_listen('firstUpdate', function () {
				_currentItemIndex = _parseItemIndexFromURL().pid;
			});

			setTimeout(function () {
				if (_isOpen) { // hasn't destroyed yet
					framework.bind(window, 'popstate', self.onFileChange);
				}
			}, 40);

		},
		onFileChange: function () {

			if (_getFileName() === _initialFileName) {

				_closedFromURL = true;
				self.close();
				return;
			}
			if (!_fileChangedByScript) {

				_fileChangedByHistory = true;
				self.goTo(_parseItemIndexFromURL().pid);
				_fileChangedByHistory = false;
			}

		},
		updateURL: function () {

			// Delay the update of URL, to avoid lag during transition, 
			// and to not to trigger actions like "refresh page sound" or "blinking favicon" to often

			_cleanHistoryTimeouts();


			if (_fileChangedByHistory) {
				return;
			}

			if (!_historyChanged) {
				_updateURL(); // first time
			} else {
				_historyUpdateTimeout = setTimeout(_updateURL, 800);
			}
		}

	}
});
