/*
 * $Revision$
 * $Date$
 *
 * Copyright (C) 1999-2011 Jive Software. All rights reserved.
 *
 * This software is the proprietary information of Jive Software. Use is subject to license terms.
 */
module("Jive @ Mention Plugin", {
	autostart: false
});

test("cursor immediately before @", function() {
	ed.setContent('<p>first </p>');

	var first = ed.getBody().firstChild.firstChild;
	var second = ed.getDoc().createTextNode("@second ");
	var third = ed.getDoc().createTextNode("third");

	ed.getBody().firstChild.appendChild(second);
	ed.getBody().firstChild.appendChild(third);

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, second, 0);
	equals(info, null);

	equals(ed.getContent(), '<p>first @second third</p>');
});


test("text node ends at space", function() {
	ed.setContent('<p>first </p>');

	var first = ed.getBody().firstChild.firstChild;
	var second = ed.getDoc().createTextNode("@second ");
	var third = ed.getDoc().createTextNode("third");

	ed.getBody().firstChild.appendChild(second);
	ed.getBody().firstChild.appendChild(third);

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, second, 1);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.searchText, "second");

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, second, 7);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.searchText, "second");

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, second, 8);
	equals(info, null);

	equals(ed.getContent(), '<p>first @second third</p>');
});


test("text node ends at @ mention", function() {
	ed.setContent('<p>first </p>');

	var first = ed.getBody().firstChild.firstChild;
	var second = ed.getDoc().createTextNode("@second");
	var third = ed.getDoc().createTextNode(" third");

	ed.getBody().firstChild.appendChild(second);
	ed.getBody().firstChild.appendChild(third);

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, second, 7);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.searchText, "second");

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, third, 0);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.searchText, "second");

	equals(ed.getContent(), '<p>first @second third</p>');
});


test("@ mention nested inside nodes", function() {
	ed.setContent('<p>first <span>@awe</span></p>');


	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, $j(ed.getBody()).find("p").get(0), 2);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.searchText, "awe");

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, $j(ed.getBody()).find("span").get(0), 1);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.searchText, "awe");

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, $j(ed.getBody()).find("span").get(0), 0);
	equals(info, null);

	equals(ed.getContent(), '<p>first <span>@awe</span></p>');
});


test("@mention w/o surrounding text nodes", function() {
	ed.setContent('<p>@awe</p>');


	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, ed.getBody().firstChild, 1);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.searchText, "awe");

	equals(ed.getContent(), '<p>@awe</p>');
});



test("@ mention split by nodes", function() {
	ed.setContent('<p>first </p>');

	var first = ed.getBody().firstChild.firstChild;
	var second = ed.getDoc().createTextNode("@sec");
	var third = ed.getDoc().createTextNode("ond third");

	ed.getBody().firstChild.appendChild(second);
	ed.getBody().firstChild.appendChild(third);

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, second, 1);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.searchText, "second");

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, third, 0);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.searchText, "second");

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, third, 2);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.searchText, "second");

	equals(ed.getContent(), '<p>first @second third</p>');
});



test("@mention positioned for first line of text", function() {
	ed.plugins.jivemention.hideThePopup(true);
	ed.setContent('<p>and this is more text @awe</p>');

	var p = $j(ed.getBody()).find("p");
	p = p[p.length-1];

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, p, 1);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.offset, 22);
	equals(info.searchText, "awe");


	var position = ed.plugins.jivemention.positionThePopUp(ed, info.node, info.offset, info.searchText);

	near(position.top, 35, 5, "top offset is correct");
	near(position.left, 125, 5, "left offset is correct");
});



test("@mention positioned on last line of text", function() {
	ed.plugins.jivemention.hideThePopup(true);
	ed.setContent('<p></p><p></p><p>and this is more text @awe</p>');

	var p = $j(ed.getBody()).find("p");
	p = p[p.length-1];

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, p, 1);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.offset, 22);
	equals(info.searchText, "awe");

	var position = ed.plugins.jivemention.positionThePopUp(ed, info.node, info.offset, info.searchText);

	near(position.top, 78, 5, "top offset is correct");
	near(position.left, 125, 5, "left offset is correct");
});


test("@mention positioned after a macro link", function() {
	ed.plugins.jivemention.hideThePopup(true);
	ed.setContent('<p><a class="jive_macro default_title jive_macro_document" href="javascript:;" jivemacro="document" ___default_attr="1001">awesome!!</a> @awe</p>');

	var p = $j(ed.getBody()).find("p");
	p = p[p.length-1];

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, p, 2);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.offset, 1);
	equals(info.searchText, "awe");

	var position = ed.plugins.jivemention.positionThePopUp(ed, info.node, info.offset, info.searchText);

	near(position.top, 35, 5, "top offset is correct");
	near(position.left, 87, 5, "left offset is correct");
});

test("@mention positioned in a quote", function() {
	ed.plugins.jivemention.hideThePopup(true);
	ed.setContent('<pre class="jive_text_macro jive_macro_quote" jivemacro="quote"><p>@awe</p></pre>');

	var p = $j(ed.getBody()).find("pre p");
	p = p[p.length-1];

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, p, 1);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.offset, 0);
	equals(info.searchText, "awe");

	var position = ed.plugins.jivemention.positionThePopUp(ed, info.node, info.offset, info.searchText);

	near(position.top, 60, 7, "top offset is correct");
	near(position.left, 45, 5, "left offset is correct");
});

test("@mention positioned in a table", function() {
	ed.plugins.jivemention.hideThePopup(true);
	ed.setContent('<table border="1" cellpadding="3" cellspacing="0" class="jiveBorder" style="width: 100%; border: 1px solid #000000;"><tbody><tr><th align="center" style="background-color:#6690BC;" valign="middle"><span style="color: #ffffff;"><strong>Header 1</strong></span></th><th align="center" style="background-color:#6690BC;" valign="middle"><span style="color: #ffffff;"><strong>Header 2</strong></span></th></tr><tr><td>asdf asdf asdf @awe</td><td></td></tr><tr><td></td><td></td></tr></tbody></table>');

	var p = $j(ed.getBody()).find("td");
	p = p[0];

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, p, 1);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.offset, 15);
	equals(info.searchText, "awe");

	var position = ed.plugins.jivemention.positionThePopUp(ed, info.node, info.offset, info.searchText);

	near(position.top, 63, 5, "top offset is correct");
	near(position.left, 94, 5, "left offset is correct");
});

test("@mention positioned in a table with _", function() {
	ed.plugins.jivemention.hideThePopup(true);
	ed.setContent('<table border="1" cellpadding="3" cellspacing="0" class="jiveBorder" style="width: 100%; border: 1px solid #000000;"><tbody><tr><th align="center" style="background-color:#6690BC;" valign="middle"><span style="color: #ffffff;"><strong>Header 1</strong></span></th><th align="center" style="background-color:#6690BC;" valign="middle"><span style="color: #ffffff;"><strong>Header 2</strong></span></th></tr><tr><td>asdf asdf asdf @awe_some</td><td></td></tr><tr><td></td><td></td></tr></tbody></table>');

	var p = $j(ed.getBody()).find("td");
	p = p[0];

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, p, 1);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.offset, 15);
	equals(info.searchText, "awe_some");

	var position = ed.plugins.jivemention.positionThePopUp(ed, info.node, info.offset, info.searchText);

	near(position.top, 63, 5, "top offset is correct");
	near(position.left, 94, 5, "left offset is correct");
});


test("@mention positioned after long line of text", function() {
	ed.plugins.jivemention.hideThePopup(true);
	ed.setContent('<p><a class="jive_macro default_title jive_macro_message" href="javascript:;" jivemacro="message" ___default_attr="1031">How awesome can awesome be?</a><span> </span></p><p> </p><p><span>lsakdfjlskafjlskafjlskadf @</span></p>');

	var p = $j(ed.getBody()).find("p");
	p = p[p.length-1];

	var info = ed.plugins.jivemention.findNodeAndOffsetForPopup(ed, p, 1);
	equals(typeof info, "object");
	equals(info.type, "@");
	equals(info.offset, 26);
	equals(info.searchText, "");

	var position = ed.plugins.jivemention.positionThePopUp(ed, info.node, info.offset, info.searchText);

	near(position.top, 80, 5, "top offset is correct");
	near(position.left, 140, 5, "left offset is correct");
});

