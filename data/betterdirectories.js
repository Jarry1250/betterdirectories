/**
 * Better Directories (injected script)
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
(function( page ) {
	var heading;
	if ( page.getElementsByTagName( "h1" ).length === 0 ) {
		heading = page.getElementsByTagName( "b" )[0];
	} else {
		heading = page.getElementsByTagName( "h1" )[0];
	}

	/* Global Variables */
	var head = page.getElementsByTagName( "head" )[0],
		body = page.getElementsByTagName( "body" )[0],
		pre,
		table,
		type = 1,
		tbody,
		cutoff = 25,
		i = 0,
		j = 0,
		dates = [],
		sizes = [],
		times = [],
		names = [],
		otherinfo = false,
		nolink = -1,
		gOrderBy,
		gTable,
		gTbody,
		gRows, gUI_showHidden;

	/* Helper Functions */
	var insertAfter = function( newNode, referenceNode ) {
		// This function inserts newNode after referenceNode
		referenceNode.parentNode.insertBefore( newNode, referenceNode.nextSibling );
	};

	var charIs = function( target, string, number ) {
		// Target is the character, string is the string you need analysing and number the zero based index of which character to test
		var subSection = string.charAt( number ).toLowerCase();
		return (subSection == target);
	};

	var trim = function( stringToTrim ) {
		// Remove whitespace from both ends of string
		return stringToTrim.replace( /^\s+|\s+$/g, "" );
	};

	var isDate = function( t ) {
		// 3rd or 5th Character should be a space or hyphen, the first a 0,1,2 or 3
		return ((charIs( " ", t, 2 ) || charIs( "-", t, 2 ) || charIs( "-", t, 4 ) || charIs( "-", t, 4 )) && (charIs( "0", t, 0 ) || charIs( "1", t, 0 ) || charIs( "2", t, 0 ) || charIs( "3", t, 0 )));
	};

	var isSize = function( t ) {
		// The first char should be a '<' or a '-' indicating a directory, or a numerical character not equal to 0, unless length is 1.
		return ((charIs( "<", t, 0 ) || charIs( "-", t, 0 ) || (charIs( "0", t, 0 ) && t.length == 1) || charIs( "1", t, 0 ) || charIs( "2", t, 0 ) || charIs( "3", t, 0 ) || charIs( "4", t, 0 ) || charIs( "5", t, 0 ) || charIs( "6", t, 0 ) || charIs( "7", t, 0 ) || charIs( "8", t, 0 ) || charIs( "9", t, 0 )));
	};

	var isTime = function( t ) {
		//3rd Character should be a colon, the first a 0, 1 or a 2;
		return (charIs( ":", t, 2 ) && (charIs( "0", t, 0 ) || charIs( "1", t, 0 ) || charIs( "2", t, 0 )));
	};

	var parseTime = function( time ) {
		// Convert hh:mm to epoch milliseconds for sorting purposes
		var hours = parseInt( time.substring( 0, 2 ), 10 );
		var minutes = parseInt( time.substring( 3, 5 ), 10 );
		return ((hours * 60) + minutes) * 60 * 1000;
	};

	var parseDate = function( date, time ) {
		// Convert date to epoch milliseconds, then add those contributed by time. For sorting purposes.
		date = date.replace( /-/g, " " ); // Replace all
		var d = Date.parse( date );
		d += parseTime( time );
		return d;
	};

	var parseFS = function( bytes, number_of_bytes ) {
		var modifier = 1;
		if ( bytes === "" ) {
			return "";
		}
		if ( bytes.substr( -1 ).toLowerCase() == "k" ) {
			bytes = bytes.substring( 0, bytes.length - 1 );
			modifier = 1024;
		}
		if ( bytes.substr( -1 ).toLowerCase() == "m" ) {
			bytes = bytes.substr( 0, bytes.length - 1 );
			modifier = 1024 * 1024;
		}
		bytes = parseInt( bytes, 10 ) * modifier;
		if ( number_of_bytes ) {
			return bytes;
		}
		var units = [' bytes', ' KB', ' MB', ' GB'],
			converted = bytes + units[0];
		for ( j = 0; j < units.length; j++ ) {
			if ( ( bytes / Math.pow( 1024, j ) ) >= 2 ) {
				// i.e. if there are 2 (thousand) or more of the current unit, upgrade to the next
				converted = Math.round( ( bytes / Math.pow( 1024, j ) ) ) + units[j];
			} else {
				break;
			}
		}
		return converted;
	};

	var getFileExt = function( filename ) {
		// Simple var for = function getting everything after the first full stop in a filename
		return filename.split( "." ).slice( 1 ).join( "." );
	};

	var lastBit = function( filename ) {
		// Very simple var for = function getting everything after the last "/" unless that is the last character
		if ( filename.substr( -1 ) == "/" ) {
			filename = filename.substring( 0, filename.length - 1 );
		}
		return filename.split( "/" ).pop();
	};

	var stripParams = function( filename ) {
		// Very simple var for = function getting everything before the '?' in a filename
		return filename.split( "?" )[0];
	};

	var zeroPad = function ( num, width ) {
		// helper var to = function add required zero characters to fixed length fields
		num = num.toString();
		while ( num.length < width ) {
			num = "0" + num;
		}
		return num;
	};

	var convertToken = function ( theDate, str ) {
		// Very cut down to only use the tokens I need
		switch ( str.charAt( 0 ) ) {
			case 'y': // set year
				return theDate.getFullYear().toString().substring( 2 );
			case 'd': // set date
				return zeroPad( theDate.getDate(), str.length );
			case 'M': // set month
				return zeroPad( theDate.getMonth() + 1, str.length );
			default:
				return str;
		}
	};

	var formatDate = function ( theDate, formatString ) {
		// For formatting a date. e.g. date.format(dd/MM/yy) outputs 01/01/08 etc
		var out = "";
		var token = "";
		for ( j = 0; j < formatString.length; j++ ) {
			if ( formatString.charAt( j ) == token.charAt( 0 ) ) {
				token = token.concat( formatString.charAt( j ) );
				continue;
			}
			out = out.concat( convertToken( theDate, token ) );
			token = formatString.charAt( j );
		}
		return out + convertToken( theDate, token );
	};

	var reformatDate = function( date ) {
		// Get epoch milliseconds of date and feed to Date object
		var ms = parseDate( date, "00:00" ),
			theDate = new Date();
		theDate.setTime( ms );
		switch ( self.options.dateformat ) {
			case "en-us":
				return formatDate( theDate, "MM/dd/yyyy" );
			case "en-gb":
				return formatDate( theDate, "dd/MM/yyyy" );
			default:
				return formatDate( theDate, "yyyy/MM/dd" );
		}
	};

	var splitDates = function( string ) {
		var parts = string.split( " " );
		dates.push( parts[0] );
		times.push( parts[1] );
	};

	var setFavicon = function() {
		var links = head.getElementsByTagName( "link" );
		for ( i = 0; i < links.length; i++ ) {
			var theLink = links[i];
			if ( theLink.rel == "shortcut icon" ) {
				return; // Favicon is in place
			}
		}

		var newLink = document.createElement( "link" );
		newLink.type = "image/x-icon";
		newLink.rel = "shortcut icon";
		var split1 = page.location.toString().split( "://" )[1];
		var split2 = split1.split( "/" )[0];
		newLink.href = "http://" + split2 + "/favicon.ico";
		var newLink2 = document.createElement( "link" );
		newLink2.type = "image/x-icon";
		newLink2.rel = "shortcut icon";
		newLink2.href = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8%2F9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAeBJREFUeNqcU81O20AQ%2FtZ2AgQSYQRqL1UPVG2hAUQkxLEStz4DrXpLpD5Drz31Cajax%2Bghhx6qHIJURBTxIwQRwopCBbZjHMcOTrzermPipsSt1Iw03p3ZmW%2B%2B2R0TxhgOD34wjCHZlQ0iDYz9yvEfhxMTCYhEQDIZhkxKd2sqzX2TOD2vBQCQhpPefng1ZP2dVPlLLdpL8SEMcxng%2Fbs0RIHhtgs4twxOh%2BHjZxvzDx%2F3GQQiDFISiRBLFMPKTRMollzcWECrDVhtxtdRVsL9youPxGj%2FbdfFlUZhtDyYbYqWRUdai1oQRZ5oHeHl2gNM%2B01Uqio8RlH%2BnsazJzNwXcq1B%2BiXPHprlEEymeBfXs1w8XxxihfyuXqoHqpoGjZM04bddgG%2F9%2B8WGj87qDdsrK9m%2BoA%2BpbhQTDh2l1%2Bi2weNbSHMZyjvNXmVbqh9Fj5Oz27uEoP%2BSTxANruJs9L%2FT6P0ewqPx5nmiAG5f6AoCtN1PbJzuRyJAyDBzzSQYvErf06yYxhGXlEa8H2KVGoasjwLx3Ewk858opQWXm%2B%2Fib9EQrBzclLLLy89xYvlpchvtixcX6uo1y%2FzsiwHrkIsgKbp%2BYWFOWicuqppoNTnStHzPFCPQhBEBOyGAX4JMADFetubi4BSYAAAAABJRU5ErkJggg%3D%3D";
		head.appendChild( newLink2 );
		head.appendChild( newLink );
	};

	var choosePreTable = function() {
		var secLastNode = body.childNodes[body.childNodes.length - 2];
		if ( secLastNode.nodeName.toLowerCase() == "pre" ) {
			if ( secLastNode.childNodes.length === 1 ) {
				//i.e. only one element: a text nodes most likely
				var newAddress = document.createElement( "address" );
				newAddress.appendChild( secLastNode.firstChild );
				body.removeChild( secLastNode );
				body.appendChild( newAddress );
			}
		}
		if ( page.getElementsByTagName( "pre" ).length !== 0 ) {
			pre = page.getElementsByTagName( "pre" )[0];
			if ( page.getElementsByTagName( "pre" ).length === 2 ) {
				if ( pre.getElementsByTagName( "a" ).length < 1 ) {
					pre = page.getElementsByTagName( "pre" )[1];
					body.removeChild( page.getElementsByTagName( "pre" )[0] );
				}
			}
		} else {
			if ( page.getElementsByTagName( "table" ).length !== 0 ) {
				table = page.getElementsByTagName( "table" )[0];
				tbody = table.getElementsByTagName( "tbody" )[0];
				type = 2;
			}
		}
	};

	var changeTitle = function() {
		// Change Titles
		var headingisH1 = (heading.nodeName.toLowerCase() == "h1"),
			name = "Index of " + stripParams( page.location.toString() ),
			text = document.createTextNode( name );
		document.title = name;
		if ( headingisH1 === true ) {
			heading.appendChild( text );
			heading.removeChild( heading.firstChild );
		} else {
			var newHeading = document.createElement( "h1" );
			newHeading.appendChild( text );
			body.insertBefore( newHeading, page.getElementsByTagName( "table" )[0] );
			body.removeChild( page.getElementsByTagName( "table" )[0] );
		}
	};

	var moveAddress = function() {
		if ( page.getElementsByTagName( "address" ).length == 1 ) {
			var address = page.getElementsByTagName( "address" )[0];
			body.removeChild( address );
			body.appendChild( address );
		}
	};

	var swapGoUp = function() {
		// Swap Go Up links
		var divider = Math.min( page.getElementsByTagName( "a" ).length, 5 );
		for ( i = 0; i < divider; i++ ) {
			if ( page.getElementsByTagName( "a" )[i].firstChild.nodeValue.toLowerCase().indexOf( "parent" ) !== -1 ) {
				nolink = i;
			}
		}
		if ( nolink > -1 ) {
			var a_to_parent = page.getElementsByTagName( "a" )[nolink],
				para = document.createElement( "p" );
			if ( a_to_parent.firstChild.nodeValue.toLowerCase().indexOf( "directory" ) !== -1 ) {
				para.setAttribute( "id", "UI_goUp" );
				var link = document.createElement( "a" );
				link.setAttribute( "class", "up" );
				link.setAttribute( "href", a_to_parent.getAttribute( "href" ) );
				link.appendChild( document.createTextNode( "Up to a higher level directory" ) );
				para.appendChild( link );
				if ( type !== 2 ) {
					pre.removeChild( a_to_parent );
				}
			}
			if ( type == 2 ) {
				body.insertBefore( para, table );
			} else {
				body.insertBefore( para, pre );
			}
		}
	};

	var cleanUp = function() {
		if ( pre ) {
			for ( i = 0; i < 2; i++ ) {
				if ( pre.getElementsByTagName( "hr" ).length > 0 ) {
					pre.removeChild( pre.getElementsByTagName( "hr" )[0] );
				} else {
					if ( body.getElementsByTagName( "hr" ).length > 0 ) {
						body.removeChild( body.getElementsByTagName( "hr" )[0] );
					}
				}
			}
		}
		if ( type == 2 ) {
			var numberTRs = tbody.getElementsByTagName( "tr" ).length;
			for ( i = 0; i < 3; i++ ) {
				if ( numberTRs > 0 ) {
					tbody.removeChild( tbody.getElementsByTagName( "tr" )[0] );
					numberTRs--;
				}
			}
			numberTRs = tbody.getElementsByTagName( "tr" ).length;
			tbody.removeChild( tbody.getElementsByTagName( "tr" )[numberTRs - 1] );
		}
		if ( type == 1 ) {
			for ( i = 0; i < nolink; i++ ) {
				if ( pre.getElementsByTagName( "a" ).length > 0 ) {
					pre.removeChild( pre.getElementsByTagName( "a" )[0] );
				}
			}
			for ( i = 0; i < 2; i++ ) {
				if ( pre.getElementsByTagName( "img" ).length > 0 ) {
					pre.removeChild( pre.getElementsByTagName( "img" )[0] );
				}
			}
		}
	};

	var changeDesc = function() {
		if ( !table && page.getElementsByTagName( "table" ).length > 0 ) {
			var tableOther = page.getElementsByTagName( "table" )[0];
			for ( i = 0; i < 5; i++ ) {
				if ( body.childNodes[i].nodeType == 3 ) {
					if ( body.childNodes[i].nodeValue.length > 1 ) {
						var bottom_para = document.createElement( "p" ).appendChild( body.childNodes[i] );
						insertAfter( bottom_para, heading );
						break;
					}
				}
			}
			var tableOtherTags = tableOther.getElementsByTagName( 'td' );
			if ( tableOtherTags.length > 0 ) {
				var temp = document.createElement( "div" );
				var foundH1 = false;
				for ( i = 0; i < tableOtherTags.length; i++ ) {
					if ( tableOtherTags[i].innerHTML.indexOf( "<h1>" ) != -1 ) {
						var parts = tableOtherTags[i].innerHTML.split( "<h1>" ),
							endparts = tableOtherTags[i].innerHTML.split( "</h1>" );
						temp.innerHTML += parts[0] + endparts[1];
						foundH1 = true;
					} else {
						temp.innerHTML += tableOtherTags[i].innerHTML;
					}
				}
				if ( foundH1 ) {
					body.removeChild( tableOther );
					body.insertBefore( heading, body.firstChild );
				}
				if ( body.getElementsByTagName( "div" ).length > 0 ) {
					otherinfo = true;
				}
				body.appendChild( temp );
			}
		}
	};

	var getSnippets = function() {
		var txt = "";
		if ( type == 2 ) {
			for ( i = 0; i < tbody.childNodes.length; i++ ) {
				for ( j = 0; j < tbody.childNodes[i].childNodes.length; j++ ) {
					var cell = tbody.childNodes[i].childNodes[j];
					if ( cell.firstChild.nodeType == 3 ) {
						txt += cell.firstChild.nodeValue;
						txt += "  ";
					}
					if ( cell.firstChild.nodeType == 1 ) {
						if ( cell.firstChild.nodeName.toLowerCase() == "a" ) {
							names.push( unescape( lastBit( cell.firstChild.getAttribute( "href" ) ) ) );
						}
					}
				}
			}
		} else {
			for ( i = 0; i < pre.childNodes.length; i++ ) {
				if ( pre.childNodes[i].nodeType == 3 ) {
					txt += pre.childNodes[i].nodeValue;
				}
				if ( pre.childNodes[i].nodeType == 1 ) {
					if ( pre.childNodes[i].nodeName.toLowerCase() == "a" ) {
						names.push( unescape( lastBit( pre.childNodes[i].getAttribute( "href" ) ) ) );
					}
				}
			}
		}
		return txt.split( "  " );
	};

	var sortSnippets = function( thesnippets, split ) {
		for ( i = 0; i < thesnippets.length; i++ ) {
			var item = trim( thesnippets[i] );
			if ( item.length === 0 ) {
				continue;
			}
			if ( isDate( item ) ) {
				if ( split ) {
					splitDates( item );
				} else {
					dates.push( item );
				}
				continue;
			}
			if ( !split ) {
				if ( isTime( item ) ) {
					times.push( item );
					continue;
				}
			}
			if ( isSize( item ) ) {
				if ( item == "<dir>" || item == "-" ) {
					sizes.push( "" );
				} else {
					sizes.push( item );
				}
			}
		}
		if ( dates.length === 0 && sizes.length === 0 && times.length === 0 ) {
			names = [];
			names.push( "No records found." );
			sizes.push( "0" );
			dates.push( "0-0-00" );
			times.push( "00" );
		}

		if ( ( dates.length - 1 ) === names.length ) {
			dates.shift();
		}
		if ( ( sizes.length - 1 ) === names.length ) {
			sizes.shift();
		}
		while ( names.length > dates.length ) {
			names.shift();
		}
	};

	var getTHead = function() {
		var thead = document.createElement( "thead" ),
			tr = document.createElement( "tr" ),
			th_names = ["Name", "Size", "Last Modified"],
			link, linktext, th;
		for ( i = 0; i < 3; i++ ) {
			th = document.createElement( "th" );
			link = document.createElement( "a" );
			link.setAttribute( "href", "" );
			linktext = document.createTextNode( th_names[i] );
			link.appendChild( linktext );
			th.appendChild( link );
			if ( i == 2 ) {
				th.setAttribute( "colspan", "2" );
			}
			tr.appendChild( th );
		}
		thead.appendChild( tr );
		return thead;
	};

	var getTBody = function() {
		var tbody = document.createElement( "tbody" ),
			name, time, size, date,
			td = [];
		for ( i = 0; i < dates.length; i++ ) {
			name = names[i];
			time = times[i];
			size = sizes[i];
			date = dates[i];
			var tr2 = document.createElement( "tr" );
			td = [];
			for ( j = 0; j < 4; j++ ) {
				td[j] = document.createElement( "td" );
			}
			td[0].setAttribute( "sortable-data", ("2" + name) );
			var thename = document.createTextNode( name );
			if ( name != "No records found." ) {
				var a = document.createElement( "a" );
				var totalhref = stripParams( page.location.toString() );
				var indexOfLast = (totalhref.length - 1);
				if ( totalhref.charAt( indexOfLast ) != "/" ) {
					totalhref += "/";
				}
				totalhref += name;
				if ( size === "" ) {
					a.setAttribute( "class", "dir" );
				} else {
					a.setAttribute( "class", "file" );
					var img = document.createElement( "img" );
					img.setAttribute( "alt", "File:" );
					img.setAttribute( "src", "moz-icon://." + getFileExt( name ) + "?size=16" );
					a.appendChild( img );
					if ( name.length > (cutoff + 5) ) {
						name = name.substring( 0, cutoff - getFileExt( name ).length ) + "[...]." + getFileExt( name );
					}
				}
				a.setAttribute( "href", totalhref );
				a.appendChild( thename );
				td[0].appendChild( a );
			} else {
				td[0].appendChild( thename );
			}
			var parsedFS = parseFS( size, true );
			td[1].setAttribute( "sortable-data", ( parsedFS === "" ) ? "-1" : parsedFS );
			var text = document.createTextNode( parseFS( size, false ) );
			td[1].appendChild( text );
			td[2].setAttribute( "sortable-data", parseDate( date, time ) );
			var text2 = document.createTextNode( reformatDate( date ) );
			td[2].appendChild( text2 );
			var text3 = document.createTextNode( time + ":00" );
			td[3].appendChild( text3 );
			for ( j = 0; j < td.length; j++ ) {
				tr2.appendChild( td[j] );
			}
			tr2.appendChild( td[3] );
			tbody.appendChild( tr2 );
		}
		return tbody;
	};

	var doSort = function( event ) {
		event.preventDefault();
		var i = event.currentTarget.getAttribute( 'data-index' );
		if ( !gRows ) {
			gRows = Array.slice( gTbody.rows );
		}
		var order;
		if ( gOrderBy == i ) {
			order = gTable.getAttribute( "order" ) == "asc" ? "desc" : "asc";
		} else {
			order = "asc";
			gOrderBy = i;
			gTable.setAttribute( "order-by", i );
			gRows.sort( function ( rowA, rowB ) {
				var a = rowA.cells[gOrderBy].getAttribute( "sortable-data" ) || "";
				var b = rowB.cells[gOrderBy].getAttribute( "sortable-data" ) || "";
				var intA = +a;
				var intB = +b;
				if ( a == intA && b == intB ) {
					a = intA;
					b = intB;
				} else {
					a = a.toLowerCase();
					b = b.toLowerCase();
				}
				if ( a < b )  return -1;
				if ( a > b )  return 1;
				return 0;
			} );
		}
		gTable.removeChild( gTbody );
		gTable.setAttribute( "order", order );
		if ( order == "asc" ) {
			for ( j = 0; j < gRows.length; j++ ) {
				gTbody.appendChild( gRows[j] );
			}
		} else {
			for ( j = gRows.length - 1; j >= 0; j-- ) {
				gTbody.appendChild( gRows[j] );
			}
		}
		gTable.appendChild( gTbody );
	};

	var makeSortable = function() {
		gTable = page.getElementsByTagName( "table" )[0];
		gTbody = gTable.tBodies[0];
		if ( gTbody.rows.length < 2 )  return;
		gUI_showHidden = page.getElementById( "UI_showHidden" );
		var headCells = gTable.tHead.rows[0].cells, hiddenObjects = false;

		for ( var i = headCells.length - 1; i >= 0; i-- ) {
			headCells[i].setAttribute( "data-index", i );
			headCells[i].addEventListener( "click", doSort, true );
		}
		if ( gUI_showHidden ) {
			gRows = Array.slice( gTbody.rows );
			hiddenObjects = gRows.some( function ( row ) {
				return row.className == "hidden-object"
			} );
		}
		gTable.setAttribute( "order", "" );
		if ( hiddenObjects ) {
			gUI_showHidden.style.display = "block";
			gTable.className = gUI_showHidden.getElementsByTagName( "input" )[0].checked ? "" : "remove-hidden";
		}
	};

	/* Runtime */
	setFavicon();
	choosePreTable();

	if ( type === 1 ) {
		// Preserve type 2s regardless
		if ( body.innerHTML.toLowerCase().indexOf( "[to parent directory]" ) != -1 ) {
			type = 0;
		}
	}
	swapGoUp();
	changeTitle();
	changeDesc();
	cleanUp();

	// Parse Data
	var snippets = getSnippets();
	sortSnippets( snippets, type );

	// Change over main data
	var newTable = document.createElement( "table" );
	newTable.setAttribute( "order", "" );
	newTable.appendChild( getTHead() );
	newTable.appendChild( getTBody() );
	if ( otherinfo ) {
		insertAfter( newTable, body.getElementsByTagName( "p" )[0] );
	} else {
		body.appendChild( newTable );
	}
	if ( type === 2 && table ) {
		body.removeChild( table );
	} else if ( pre ) {
		body.removeChild( pre );
	}
	moveAddress();
	makeSortable();

})( content.document );