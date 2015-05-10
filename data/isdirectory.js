/**
 * Better Directories (injected tester script)
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
function isDirectory( page ) {
	if ( page.getElementsByTagName( "iframe" ).length > 0 ) {
		return false;
	}
	if ( page.getElementsByTagName( "frame" ).length > 0 ) {
		return false;
	}

	if ( page.getElementsByTagName( "pre" ).length === 0 && page.getElementsByTagName( "table" ).length === 0 ) {
		return false;
	}
	if ( page.getElementsByTagName( "title" ).length === 0 ) {
		return false;
	}
	var firstNodeName = page.getElementsByTagName( "body" )[0].getElementsByTagName( "*" )[0].nodeName.toLowerCase();
	if ( firstNodeName != "h1" && firstNodeName != "table" ) {
		return false;
	}
	if ( page.getElementsByTagName( "h1" ).length === 0 ) {
		if ( firstNodeName != "table" ) {
			return false;
		}
		if ( page.getElementsByTagName( "table" )[0].firstChild.childNodes.length !== 1 ) {
			return false;
		}
		if ( page.getElementsByTagName( "table" )[0].getElementsByTagName( "font" ).length !== 1 ) {
			return false;
		}
		if ( page.getElementsByTagName( "table" )[0].getElementsByTagName( "font" )[0].getElementsByTagName( "b" ).length !== 1 ) {
			return false;
		}
	} else {
		if ( page.getElementsByTagName( "h1" )[0].childNodes.length > 1 ) {
			return false;
		}
		if ( page.getElementsByTagName( "h1" )[0].innerHTML.toLowerCase().indexOf( page.getElementsByTagName( "title" )[0].innerHTML.toLowerCase() ) == -1 ) {
			if ( page.getElementsByTagName( "title" )[0].innerHTML.toLowerCase().substring( 0, 8 ) != "index of" ) {
				return false;
			}
		}
		if ( page.getElementsByTagName( "h1" )[0].getAttribute( "class" ) !== null ) {
			return false;
		}
	}
	for ( var x = 0; x < page.getElementsByTagName( "meta" ).length; x++ ) {
		if ( page.getElementsByTagName( "meta" )[x].getAttribute( "name" ) !== null ) {
			var metaName = page.getElementsByTagName( "meta" )[x].getAttribute( "name" ).toLowerCase();
			if ( metaName == "keywords" || metaName == "description" || metaName == "author" ) {
				return false;
			}
		}
	}
	if ( self.options.notags && !testTags( page ) ) {
		return false;
	}
	if ( self.options.nocomments && !testComments( page ) ) {
		return false;
	}
	if ( self.options.nodoctype && !testDoctype( page ) ) {
		return false;
	}
	return true;
}


function testTags( page ) {
	if ( page.getElementsByTagName( "link" ).length > 0 ) {
		return false;
	}
	if ( page.getElementsByTagName( "script" ).length > 0 ) {
		return false;
	}
	return ( page.getElementsByTagName( "form" ).length === 0 );
}

function testComments( page ) {
	return ( page.getElementsByTagName( "html" )[0].innerHTML.toLowerCase().indexOf( "<!--" ) === -1 );
}

function testDoctype( page ) {
	return ( page.doctype === null );
}
self.port.emit( "isDirectory", isDirectory( content.document ) );
