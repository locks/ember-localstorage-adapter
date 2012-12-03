var fs = require('fs'),
	system = require('system'),
	page = require('webpage').create(),
	file = fs.absolute((system.args.length > 1 && system.args[1]) || 'test/index.html');

page.onConsoleMessage = function (msg) {
	console.log(msg);
	if (/^Tests completed in/.test(msg)) {
		phantom.exit(page.evaluate(function () {
			if (window.QUnit && QUnit.config && QUnit.config.stats) {
				return QUnit.config.stats.bad || 0;
			}
			return 1;
		}));
	}
};

page.open('file://' + file, function (status) {
  page.evaluate(addLogging);

	if (status !== 'success') {
		console.log('FAIL to load the address');
		phantom.exit(1);
	}
});

function addLogging() {
  var current_test_assertions = [];

  QUnit.testDone = function(result) {
    var name = result.module + ': ' + result.name;
    var i;

    if (result.failed) {
      console.log('Assertion Failed: ' + name);

      for (i = 0; i < current_test_assertions.length; i++) {
        console.log('    ' + current_test_assertions[i]);
      }
    } else {
      console.log(name);
    }

    current_test_assertions = [];
  };

  QUnit.log = function(details) {
    var response;

    if (details.result) {
      return;
    }

    response = details.message || '';

    if (typeof details.expected !== 'undefined') {
      if (response) {
        response += ', ';
      }

      response += 'expected: ' + details.expected + ', but was: ' + details.actual;
    }

    current_test_assertions.push('Failed assertion: ' + response);
  };

  var timer;
  QUnit.done = function( result ) {
    console.log('Tests completed in ' + result.runtime +  'ms to run ' + result.total + ' tests. ' + result.passed + ' passed, ' + result.failed + ' failed.');
  };
}
