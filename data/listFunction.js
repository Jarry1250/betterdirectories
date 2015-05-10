/**
 * Better Directories (whitelist and blacklist functions)
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

function onLoad() {
	document.getElementById( "BDlist" ).height = 420;
	document.getElementById( "BDlist" ).width = 355;

	// Centre popup
	window.moveTo( (screen.width - 355)/2, (screen.height - 420)/2);

	var listbox = document.getElementById( "thelist" ),
		urls = window.arguments[0].urls.split( ',' );
	for ( var i = 0; i < urls.length; i++ ) {
		listbox.appendItem( urls[i] );
	}
	listbox.selectedIndex = 0;
}

function onAccept() {
	var listbox = document.getElementById( "thelist" ),
		urls = "";
	for ( var i = 0; i < listbox.getRowCount(); i++ ) {
		if ( urls != "" ) {
			urls += ",";
		}
		urls += listbox.getItemAtIndex( i ).label;
	}
	window.arguments[0].urls = urls;
	window.arguments[0].change = true;
}

function addNew() {
	var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService( Components.interfaces.nsIPromptService ),
		input = {value: null},
		message = "";

	if ( document.getElementById( "thelist" ).getAttribute( 'data-name' ) == "whitelist" ) {
		message = "NOT "
	}

	result = prompts.prompt( window, "Not a directory", "The page at this URL is " + message + "a directory:", input, null, {} );
	// input.value is the string user entered
	// result - whether user clicked OK (true) or Cancel
	if ( result ) {
		document.getElementById( "thelist" ).appendItem( input.value );
	}
}

function editCurrent() {
	var listbox = document.getElementById( "thelist" ),
		listboxSel = listbox.currentItem;

	listbox.clearSelection();
	listbox.addItemToSelection( listboxSel );

	var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService( Components.interfaces.nsIPromptService ),
		input = {value: listboxSel.label},
		message = "";

	if ( listbox.getAttribute( 'data-name' ) == "whitelist" ) {
		message = "NOT "
	}

	var result = prompts.prompt( window, message + "A Directory", "The page at this URL is " + message + "a directory:", input, null, {} );
	// input.value is the string user entered
	// result - whether user clicked OK (true) or Cancel
	if ( result ) {
		listboxSel.label = input.value;
	}
}

function removeSelected() {
	var listbox = document.getElementById( "thelist" ),
		listboxSels = listbox.selectedItems;
	for ( var i = 0; i < listboxSels.length; i++ ) {
		listbox.removeItemAt( listbox.getIndexOfItem( listboxSels[i] ) );
	}
}