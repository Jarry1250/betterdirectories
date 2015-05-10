/**
 * Better Directories (controller)
 *
 * @author Harry Burt
 * @license MIT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 */

var tabs = require( "sdk/tabs" );
var sp = require( "sdk/simple-prefs" );
var preferences = sp.prefs;
var urls = require( "sdk/url" );
var { attachTo, detachFrom } = require( "sdk/content/mod" );
var pageMod = require( "sdk/page-mod" );
var contextMenu = require( "sdk/context-menu" );
var wu = require( "sdk/window/utils" );
const { Cu, Ci }  = require( 'chrome' );
Cu.import( 'resource://gre/modules/Services.jsm' );
var cache = {};

/* Section 1: PageMod */
var regexify = function( string ) {
	// @todo: consider escaping level
	return new RegExp( ".*" + string + ".*" );
};

var regexifyWithLookaheads = function( string ) {

	// Better Directories implements a "best match" algorithm (see currentStatus), but PageMod
	// gives priority to the whitelist. So we ensure our whitelist entries are silently restricted
	// using lookaheads.

	var urls = preferences.blacklisturls.split( "," ),
		lookaheads = [];
	for ( var i = 0; i < urls.length; i++ ) {
		if ( urls[i].indexOf( string ) === 0 ) {
			lookaheads.push( urls[i].substring( string.length ) );
		}
	}
	if( lookaheads.length > 0 ) {
		return new RegExp( ".*" + string + "(?:(?!" + lookaheads.join('|') + ").)*" );
	}
	return regexify( string );
};

var pM = pageMod.PageMod( {
	include:preferences.blacklisturls.split( ',' ).map( regexify ),
	exclude: preferences.whitelisturls.split( ',' ).map( regexifyWithLookaheads ),
	attachTo: ["existing", "top"],
	contentScriptFile: './betterdirectories.js',
	contentScriptOptions: preferences,
	contentStyleFile: ["./betterdirectories.css", "chrome://global/skin/dirListing/dirListing.css"]
} );

/* Section 2: testing each page */
var matchAgainst = function( needle, haystack ) {
	var tempLeader = "",
		urls = haystack.split( "," );
	for ( var i = 0; i < urls.length; i++ ) {
		if ( needle.indexOf( urls[i] ) !== -1 ) {
			if ( urls[i].length > tempLeader.length ) {
				tempLeader = urls[i];
			}
		}
	}
	return ( tempLeader !== "" ) ? tempLeader : false;
};

var currentStatus = function( url ) {
	var protocol = urls.URL( url ).protocol;
	if ( protocol != "http:" && protocol != "https:" && protocol != "file:" ) {
		return "ineligible";
	}

	var blackStatus = matchAgainst( url, preferences.blacklisturls ),
		whiteStatus = matchAgainst( url, preferences.whitelisturls );

	if ( blackStatus !== false && whiteStatus !== false ) {
		blackStatus = ( fblackStatus.length > whiteStatus.length );
		whiteStatus = !blackStatus;
	}
	if( blackStatus !== false ) return "blacklist";
	if( whiteStatus !== false ) return "whitelist";
	return "clear";
};

var test = function( tab ) {
	// Main function that determines whether a tab should be transformed or not. Note that
	// PageMod may already have operated on the page.
	if ( cache[tab.url.split( "?" )[0]] !== undefined )
		return;

	var status = currentStatus( tab.url );
	if ( status == "ineligible" || status == "blacklist" || status == "whitelist" ) {
		// No need to cache, pretty speedy check anyway
		return;
	}

	if ( preferences.onlywithslash && tab.url[tab.url.length - 1] == '/' ) {
		// No need to cache, pretty speedy check anyway
		return;
	}

	// Okay, final test is a suite of heuristics
	var worker = tab.attach( {
		contentScriptFile: './isdirectory.js',
		contentScriptOptions: preferences
	} );
	worker.port.on( "isDirectory", function ( isDirectory ) {
		if ( isDirectory ) {
			pM.include.add( tab.url.split( "?" )[0] );
			cache[tab.url.split( "?" )[0]] = true;
			tab.reload();
		} else {
			cache[tab.url.split( "?" )[0]] = false;
		}
	} )
};

var registerListenersForTab = function( tab ) {
	tab.on( "pageshow", test );
};
for ( var i = 0; i < tabs.length; i++ ) {
	registerListenersForTab( tabs[i] );
}
tabs.on( 'open', registerListenersForTab );

/* Section 3: Context Menu */
var cM = contextMenu.Menu( {
	// Establish context menu, to be modified later
	label: "Better Directories",
	context: contextMenu.URLContext( /^disabled$/ ),
	contentScript: 'self.on("click", function (node, data) { self.postMessage( data ); });' +
		'self.on("context", function () { self.postMessage( window.document.location.href ); return "Better Directories"; });',
	items: [
		contextMenu.Item( {label: "This is a directory", data: "isdir"} ),
		contextMenu.Item( {label: "Not a directory", data: "isnotdir"} )
	],
	onMessage: function ( data ) {
		switch ( data ) {
			case "isdir":
				addNew( "blacklist", tabs.activeTab.url );
				break;
			case "isnotdir":
				addNew( "whitelist", tabs.activeTab.url );
				break;
			default:
				// Data is href
				switch( currentStatus( data ) ) {
					case "blacklist":
						cM.items[0].label = "Confirm this is a directory";
						cM.items[1].label = "Not a directory";
						break;
					case "whitelist":
						cM.items[0].label = "This is a directory";
						cM.items[1].label = "Confirm this is not a directory";
						break;
					default:
						cM.items[0].label = "This is a directory";
						cM.items[1].label = "This is not a directory";
						break;
				}
				break;
		}
	}
} );

var setMenuContext = function () {
	cM.context.remove( cM.context[0] );
	if ( preferences.contextmenu ) {
		cM.context.add( contextMenu.URLContext( /^(http|https|file):\/\/.*/ ) );
	} else {
		cM.context.add( contextMenu.URLContext( /^disabled$/ ) );
	}
};

setMenuContext();
sp.on( "contextmenu", setMenuContext );

var addNew = function( name, url ) {
	var current = preferences[name + "urls"],
		message = "", extra = "", extra2 = "",
		removeFromOtherList = false,
		status = currentStatus( url ),
		other = "whitelist";

	if ( name == "whitelist" ) {
		other = "blacklist";
		extra = "not ";
	} else {
		extra2 = "not "
	}

	switch ( status ) {
		case name:
			// Already on the right list
			return;
		case "whitelist": // fall through
		case "blacklist":
			message = "This page was already designated [" + extra2 + "a directory]. Are you sure you want to overwrite this, declaring it [" + extra + "a directory]?";
			removeFromOtherList = true;
			break;
		case "clear":
			message = "Are you sure you want to designate this page [" + extra + "a directory]?";
			break;
		default: // should never happen
			alert( "Better Directories: unknown error!" );
			break;
	}
	if( !Services.prompt.confirm( null, "Confirm", message ) ) return;

	// Update blacklist and whitelist themselves
	if ( current !== "" ) {
		current += ",";
	}
	current += url;
	preferences[name + "urls"] = current;
	if ( removeFromOtherList ) {
		var currentOthers = preferences[other + "urls"].split( "," );
		while( currentOthers.indexOf( url ) > -1 ) {
			currentOthers.splice( currentOthers.indexOf( url ), 1 );
		}
		preferences[other + "urls"] = currentOthers.join( "," );
	}

	// Update pageMod
	if( name == "blacklist" ) {
		// Update pageMod's include list...
		pM.include.add( regexify( url.split( "?" )[0] ) );

		// ...then regenerate the exclude list (as lookaheads may have changed)
		while( pM.exclude.length > 0 ) {
			pM.exclude.remove( pM.exclude[0] );
		}
		var newIncludes = preferences.whitelisturls.split( ',' ).map( regexifyWithLookaheads );
		for( var j = 0; j < newIncludes.length; j++ ) {
			pM.exclude.add( newIncludes[j] );
		}
	} else {
		// Update pageMod's exclude list
		pM.exclude.add( regexifyWithLookaheads( url.split( "?" )[0] ) );
	}

	// @todo: don't reload if we don't need to
	tabs.activeTab.reload();
};

/* Section 4: Blacklist/Whitelist panels (activated from Options panel */

sp.on( "showblacklist", function() {
	var params = { "urls": preferences.blacklisturls, "change": false };
	wu.openDialog( {
		"url" : "chrome://betterdirectories/content/blacklist.xul",
		"features": "chrome, dialog, modal, resizable=yes, left=100, top=100",
		"args": [ params ]
	} ).focus();
	if( params["change"] ) preferences.blacklisturls = params["urls"];
} );

sp.on( "showwhitelist", function() {
	var params = { "urls": preferences.whitelisturls, "change": false };
	wu.openDialog( {
		"url" : "chrome://betterdirectories/content/whitelist.xul",
		"features": "chrome, dialog, modal, resizable=yes, left=100, top=100",
		"args": [ params ]
	} ).focus();
	if( params["change"] ) preferences.whitelisturls = params["urls"];
} );

// Test invocation: cfx run --binary-args "-url \"https://ftp.mozilla.org/pub/\" \"http://download.bitdefender.com/\" -jsconsole"