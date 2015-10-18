var $ = global.jQuery = require('jquery');
var _ = global._ = require('underscore');
var Backbone = require('backbone');
require('gridstack/dist/gridstack');

var Header = require('./views/header');
var vizwit = require('./vizwit');
var config = require('./sample.json');

var vent = _.clone(Backbone.Events);
var fields = {};

if( ! config.version) console.error('No version specified in config');

// Render header
if(config.header) {
	var header = new Header(config.header);
	$('#page-header').append(header.render().el);
	
	// Update <title> tag
	if(config.header.title) {
		var originalTitle = $('title').text();
		$('title').text(config.header.title + ' - ' + originalTitle);
	}
}

var container = $('#page-content');
var heightInterval = 60; // from gridstack.js
var current = {x: null, y: null};
var row;

config.cards.forEach(function(config) {
	// If y suggests we're on a new row (including the first item), create a new row
	if(config.y !== current.y) {
		row = $('<div class="row"></div>');
		container.append(row);
		current.y = config.y;
		current.x = 0;
	}
	
	var column = $('<div/>');
	
	// Add width class
	column.addClass('col-sm-' + config.width);
	
	// If x is not the same as our current x position, add offset class
	if(config.x !== current.x) {
		column.addClass('col-sm-offset-' + (config.x - current.x));
	}
	// Set height of new div
	column.css('min-height', config.height * heightInterval);
	
	// Increment current.x to new starting position
	current.x += config.width;
	
	// Add the div to the current row
	row.append(column);
	
	// Initialize vizwit on new div
	vizwit.init(column, config.vizwit, {
		vent: vent,
		fields: fields
	});
});