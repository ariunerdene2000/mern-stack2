'use strict';

var Day = require('./Day');
var modulo = require('./modulo');

// https://ecma-international.org/ecma-262/5.1/#sec-15.9.1.6

module.exports = function WeekDay(t) {
	return modulo(Day(t) + 4, 7);
};
