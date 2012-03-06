/*
 * Copyright (C) 1999-2011 Jive Software. All rights reserved.
 *
 * This software is the proprietary information of Jive Software. Use is subject to license terms.
 */

// Jive SelectionUtil
(function() {
    //private utility predicates
    function isTextNode(n) {
        return n && n.nodeType == 3;
    }

    function isTextPos(treePos) {
        return isTextNode(treePos.c);
    }

    function isBody(treePos){
        return treePos && treePos.c && treePos.c.nodeType == 1 && treePos.c.nodeName.toLowerCase() == "body";
    }

    function isTerminal(treePos){
        if(isTextPos(treePos)) {
            return treePos.off == treePos.c.nodeValue.length;
        }else{
            return treePos.off == treePos.c.childNodes.length;
        }
    }

    function isEmptyTextNodePos(treePos){
        return isTextPos(treePos) && treePos.c.nodeValue.length == 0;
    }

    function isNonTerminalTextPos(treePos){
        var n = nodeAt(treePos);
        return (isTextPos(treePos) && !isTerminal(treePos)) || (n && n.nodeName.toLowerCase() == "br");
    }

    function getIsNodeNameAt(nodeName){
        nodeName = nodeName.toLowerCase();
        return function(treePos){
            var n = nodeAt(treePos);
            return n && n.nodeName && n.nodeName.toLowerCase() == nodeName;
        }
    }

    function getIsContainerName(elementName){
        elementName = elementName.toLowerCase();
        return function(treePos){
            return treePos && treePos.c.nodeType == 1 && treePos.c.nodeName.toLowerCase() == elementName;
        }
    }

    function getSameContainer(targetNode){
        return function sameContainer(treePos){
            return treePos.c == targetNode;
        }
    }

    //get node at position
    function nodeAt(treePos){
        if(treePos.c && treePos.off >= 0 && treePos.c.childNodes && treePos.c.childNodes.length > treePos.off){
            return treePos.c.childNodes[treePos.off];
        }
        return null;
    }

    function charAtPos(treePos){
        if(treePos && isNonTerminalTextPos(treePos)){
            return treePos.c.nodeValue.charAt(treePos.off);
        }
        return null;
    }

    function posFor(node){
        var dom = tinymce.activeEditor.dom;
        return {c: node.parentNode, off: dom.nodeIndex(node)};
    }

    function posAfter(node){
        var dom = tinymce.activeEditor.dom;
        return {c: node.parentNode, off: dom.nodeIndex(node)+1};
    }

    function setRangeStart(rng, treePos){
        rng.setStart(treePos.c, treePos.off);
    }

    function setRangeEnd(rng, treePos){
        rng.setEnd(treePos.c, treePos.off);
    }

    function startPos(rng){
        return {c: rng.startContainer, off: rng.startOffset};
    }

    function endPos(rng){
        return {c: rng.endContainer, off: rng.endOffset};
    }

    //Node name pretty printer
    function nodeName(n){
        var ret = n.nodeName;
        if(ret == "#text"){
            ret = "#" + n.nodeValue;
        }
        return ret;
    }

    tinymce.SelectionUtil = function(editor) {
        this.ed = editor;
        var methods = {
            /**
             * Debug logging for the selection.
             * @param msg Optional log message that gets prepended to the log info.
             */
            logSelection: function(msg){
                var rng = this.ed.selection.getRng(true).cloneRange();
                if(!msg){
                    msg = "";
                }

                var sel = this.ed.selection.getSel();
                if(sel.rangeCount == 0){
                    //DON'T Comment out these log statements
                    console.log(msg + "No selection.");
                }else{
                    var direction = this.isForwardSelection() ? "->" : "<-";
                    console.log(msg + "current selection range: " + this.posStr(rng.startContainer, rng.startOffset) + " - " + this.posStr(rng.endContainer, rng.endOffset) + " Direction " + direction , rng);
                    if(sel.anchorNode){
                        console.log("Anchor-focus" + (sel.baseNode != null ? ", base-extent: " : ": ") + this.posStr(sel.anchorNode, sel.anchorOffset) + " - " +
                            this.posStr(sel.focusNode, sel.focusOffset) +
                            (sel.baseNode != null ? ", " + this.posStr(sel.baseNode, sel.baseOffset) + " - " + this.posStr(sel.extentNode, sel.extentOffset) : ""));
                    }
                }
            },

            posStr: function posStr(n, off){
                var nodeIndex = tinymce.activeEditor.dom.nodeIndex;
                var pstr = "";
                if(n.parentNode && n.parentNode.nodeName != "HTML"){
                    pstr = posStr(n.parentNode, nodeIndex(n)) + "/";
                }
                return pstr + nodeName(n) + (off != null ? "[" + off + "]" : "");
            },

            /**
             * Debug logging for arbitrary ranges.
             * @param msg Log message that gets prepended to the log info.
             * @param rng The range to log.
             */
            logRange: function(msg, rng){
                if(!msg){
                    msg = "";
                }
                //DON'T Comment out this log statement
                console.log(msg + ": range: " + this.posStr(rng.startContainer, rng.startOffset) + " - " + this.posStr(rng.endContainer, rng.endOffset), rng);
            },

            normalizeSelection: function(){
                if(!tinymce.isIE || tinymce.isIE9){
                    var selection = this.ed.selection;
                    var sel = selection.getSel();
                    if(!sel){
                        return; //we got called too early, nothing to do.
                    }
                    if(sel.rangeCount == 0){
                        //console.log("range count was 0 when attempting to normalize selection");
                        return;
                    }

    //                this.logSelection("Before: ");

                    var isForward = this.isForwardSelection(sel);
                    var origRng = selection.getRng(true);
                    var fooRng = origRng;

                    if(fooRng.startContainer == fooRng.endContainer &&
                            fooRng.startOffset == fooRng.endOffset &&
                            fooRng.startContainer.nodeName.toLowerCase() == "body"){
                        var offset = fooRng.startOffset;
                        if(offset < fooRng.startContainer.childNodes.length){
                            var newNode = fooRng.startContainer.childNodes[offset];
                            fooRng = this.ed.dom.createRng();
                            fooRng.setStart(newNode, 0);
                            fooRng.setEnd(newNode, 0);
                        }
                    }

                    var newRng = this.normalizeRange(fooRng);
                    if(newRng.compareBoundaryPoints(newRng.START_TO_START, origRng) != 0 || newRng.compareBoundaryPoints(newRng.END_TO_END, origRng) != 0){
                        this.setSelection(newRng, isForward);
                    }

    //                this.logSelection("After: ");
                }
            },

            isForwardSelection: function(sel){
                if(!sel){
                    sel = this.ed.selection.getSel();
                }

                if(sel.anchorNode == null || sel.focusNode == null){
                    return true; //no real support for directional selections
                }

                var anchorRange = this.ed.dom.createRng();
                anchorRange.setStart(sel.anchorNode, sel.anchorOffset);
                anchorRange.collapse(true);
                var focusRange = this.ed.dom.createRng();
                focusRange.setStart(sel.focusNode, sel.focusOffset);
                focusRange.collapse(true);

                //isForward if anchor is before or equal to focus
                return anchorRange.compareBoundaryPoints(anchorRange.START_TO_START, focusRange) <= 0;
            },

            setSelection: function(rng, isForward){
                var sel = this.ed.selection.getSel();

                if(sel.collapse != null && sel.extend != null){ //Mozilla selection API
                    if(isForward){
                        sel.collapse(rng.startContainer, rng.startOffset);
                        sel.extend(rng.endContainer, rng.endOffset);
                    }else{
                        sel.collapse(rng.endContainer, rng.endOffset);
                        sel.extend(rng.startContainer, rng.startOffset);
                    }
                }else{
                    this.ed.selection.setRng(rng);
                }
            },

            getInfo : function() {
                return {
                    longname : 'Jive Selection',
                    author : 'Jive Software',
                    authorurl : 'http://jivesoftware.com',
                    infourl : 'http://jivesoftware.com',
                    version : tinyMCE.majorVersion + "." + tinyMCE.minorVersion
                };
            },

            isBookmark: function(nodeOrId){
                var n = this.ed.dom.get(nodeOrId);
                return n && n.nodeName.toLowerCase() == "span"
                        && this.ed.dom.getAttrib(n, "data-mce-type") == "bookmark";
            },

            removeBookmark: function(bookmark){
                if(bookmark.id != null){
                    var dom = this.ed.dom;
                    function removeMarker(markerId){
                        // Remove marker but keep children if for example contents were inserted into the marker
                        // Also remove duplicated instances of the marker for example by a split operation or by WebKit auto split on paste feature
                        var marker;
                        while (marker = dom.get(markerId)){
                            // Clear all marker text nodes, which consist of the BOM char
                            tinymce.each(tinymce.grep(marker.childNodes), function(node) {
                                if (node.nodeType == 3)
                                    node.nodeValue = node.nodeValue.replace(/\uFEFF/g, '');
                            });

                            dom.remove(marker, 1);
                        }
                    }

                    removeMarker(bookmark.id + "_start");
                    removeMarker(bookmark.id + "_end");
                }
            },

            /**
             * Moves the selection endpoints to be before or after the markers, not inside them.
             * @param rng The range to be modified
             * @param includeMarkers Whether to include the markers in the range.  Default true.
             */
            adjustForBookmark: function(rng, includeMarkers){
                if(includeMarkers == null){
                    includeMarkers = true;
                }

    //            this.logRange("before adjustForBookmark: ", rng);

                var self = this;
                function findMark(pos) {
                    var mark = nodeAt(pos);
                    if(self.isBookmark(mark)){
                        return mark;
                    }

                    mark = pos.c;
                    if(self.isBookmark(mark)){
                        return mark;
                    }

                    mark = pos.c.parentNode;
                    if(self.isBookmark(mark)){
                        return mark;
                    }
                    return null;
                }

                var changed = false;
                var mark = findMark(startPos(rng));
                if (mark) {
                    if (includeMarkers) {
                        setRangeStart(rng, posFor(mark));
                    } else {
                        setRangeStart(rng, posAfter(mark));
                    }
                    changed = true;
                }

                mark = findMark(endPos(rng));
                if (mark) {
                    if (includeMarkers) {
                        setRangeEnd(rng, posAfter(mark));
                    } else {
                        setRangeEnd(rng, posFor(mark));
                    }
                    changed = true;
                }
                return changed;
            },

            /**
             * If the start or end pos of the range is at the beginning or end of an anchor, move it so that the
             * endpoint is outside the anchor.
             * @param rng The range to manipulate
             * @return whether or not the range was modified.
             */
            adjustForAnchorEdges: function(rng){
                var changed = false;
                var collapsed = rng.collapsed;

                var startA = this.ed.dom.getParent(rng.startContainer, "a");
                if(startA){
                    if(this.atStartOf(startA, startPos(rng))){
                        //start at start of a
                        rng.setStartBefore(startA);
                        changed = true;
                    }else if(this.atEndOf(startA, startPos(rng))){
                        //start at end of a
                        rng.setStartAfter(startA);
                        changed = true;
                    }
                }

                if(collapsed){
                    if(changed){
                        rng.collapse(true);
                    }
                }else{
                    var endA = this.ed.dom.getParent(rng.endContainer, "a");
                    if(endA){
                        if(this.atStartOf(endA, endPos(rng))){
                            //end at start of a
                            rng.setEndBefore(endA);
                            changed = true;
                        }else if(this.atEndOf(endA, endPos(rng))){
                            //end at end of a
                            rng.setEndAfter(endA);
                            changed = true;
                        }
                    }
                }
                return changed;
            },

            /**
             * A node is effectively empty if it contains only whitespace text nodes and BR elements.
             *
             * @param n node to examine
             * @return true IFF there's nothing but white space in this node.
             */
            isEffectivelyEmpty: function (n){
                if(n.childNodes && n.childNodes.length > 0){
                    var c = n.firstChild;
                    while(c){
                        if(c.nodeType != 3 && c.nodeName.toLowerCase() != "br" ||
                           c.nodeType == 3 && tinymce.trim(c.nodeValue).length > 0){
                            return false;
                        }
                        c = c.nextSibling;
                    }
                }
                return true;
            },

            /**
             * A list is effectively empty if it contains nothing but ul, ol, li, br and empty or whitespace text nodes.
             *
             * @param n node to examine
             * @return true IFF the list is effectively empty
             */
            isEffectivelyEmptyList: function (n){
                var listRe = /^(?:ul|ol|li)$/i;
                if(listRe.test(n.nodeName)){
                    var c = n.firstChild;
                    while(c){
                        if(listRe.test(c.nodeName)){
                            if(!this.isEffectivelyEmptyList(c)){
                                return false;
                            }
                        }else if(c.nodeType != 3 && c.nodeName.toLowerCase() != "br" ||
                           c.nodeType == 3 && tinymce.trim(c.nodeValue).length > 0){
                            return false;
                        }
                        c = c.nextSibling;
                    }
                    return true;
                }
                return false;
            },

            /**
             * Split the range's commonAncestorContainer at both endpoints, and return a new range selecting the middle
             * segment.
             * @param rng The range to operate on.
             * @param stopPredicate(node) determines whether it's safe to split the given node, otherwise we stop there.  Defaults to stop on body/pre/td.
             */
            splitAtEndpoints: function(rng, stopPredicate) {
                var ed = this.ed, dom = ed.dom, that = this;
                //create endpoint markers
                function placeNewMarker(pos) {
                    if (isTextPos(pos)) {
                        if (pos.off == 0) {
                            pos = posFor(pos.c);
                        } else if (pos.off == pos.c.nodeValue.length) {
                            pos = posFor(pos.c);
                            pos.off += 1;
                        }
                        else {
                            pos = posFor(pos.c.splitText(pos.off));
                        }
                    }
                    var marker = dom.create("br", {id: dom.uniqueId()});
                    var refNode = nodeAt(pos);
                    pos.c.insertBefore(marker, refNode);
                    return marker;
                }

                var endMarker = placeNewMarker(endPos(rng));
                var startMarker = null;
                if(!rng.collapsed){
                    startMarker = placeNewMarker(startPos(rng));
                }

                rng = dom.createRng();
                if(startMarker){
                    rng.setStartBefore(startMarker);
                    rng.setEndAfter(endMarker);
                }else{
                    rng.selectNode(endMarker);
                }

                if (!stopPredicate) {
                    stopPredicate = "body, pre, td";
                }
                if (typeof stopPredicate == "string") {
                    var selector = stopPredicate;
                    stopPredicate = function(n) {
                        return ed.dom.is(n,selector);
                    }
                }
                //split on markers until you reach the target container's level
                function deepSplit(targetContainer, splitOn) {
                    while (splitOn.parentNode != targetContainer && !stopPredicate(splitOn.parentNode)) {
                        dom.split(splitOn.parentNode, splitOn);
                    }
                    if (splitOn.nextSibling && splitOn.nextSibling.nodeType == 1 && (that.isEffectivelyEmpty(splitOn.nextSibling) || that.isEffectivelyEmptyList(splitOn.nextSibling))) {
                        dom.remove(splitOn.nextSibling);
                    }
                }

                var stopNode = null;
                if (rng.commonAncestorContainer.nodeName.toLowerCase() == "li") {
                    //if we're selecting things inside a single LI, stop there
                    stopNode = rng.commonAncestorContainer;
                } else if (rng.commonAncestorContainer.parentNode.nodeName.toLowerCase() == "ul" || rng.commonAncestorContainer.parentNode.nodeName.toLowerCase() == "ol") {
                    //never stop splitting at the ul/ol level
                    stopNode = rng.commonAncestorContainer.parentNode.parentNode;
                }
                else {
                    stopNode = rng.commonAncestorContainer.parentNode;
                }

                deepSplit(stopNode, endMarker);
                if(startMarker){
                    deepSplit(stopNode, startMarker);
                }

                //return a range selecting the middle bit
                if(startMarker){
                    var pos = posFor(startMarker);
                    dom.remove(startMarker);
                    setRangeStart(rng, pos);

                    pos = posFor(endMarker);
                    dom.remove(endMarker);
                    setRangeEnd(rng, pos);
                }else{
                    pos = posFor(endMarker);
                    dom.remove(endMarker);
                    setRangeStart(rng, pos);
                    rng.collapse(true);
                }

                return rng;
            },

            /**
             * Given a range that selects partial block(s), return a new range that selects entire blocks.
             * Basically, round up.  Idempotent.  Handles bookmarked selections, by including the marker.
             * If it doesn't return null, startContainer == endContainer.
             * @param rng The range to be rounded up.
             * @param blockSelector CSS selector or function(node) to find blocks.  Defaults to dom.isBlock.
             * @param blockContainerSelector CSS selector or function(node) to find block containers. Defaults to "body".
             */
            getExpandedBlockRange: function(rng, blockSelector, blockContainerSelector) {
                var dom = this.ed.dom;
                var ret = dom.createRng();

                rng = this.normalizeRange(rng);
                this.adjustForBookmark(rng, true);

                if(blockSelector == null){
                    blockSelector = function(n){
                        return dom.isBlock(n);
                    };
                }

                if(blockContainerSelector == null){
                    blockContainerSelector = "body, td, pre";
                }

                var startBlockContainer = dom.getParent(rng.startContainer, blockContainerSelector);
                var endBlockContainer = dom.getParent(rng.endContainer, blockContainerSelector);
                if (!startBlockContainer || !endBlockContainer || startBlockContainer != endBlockContainer) {
                    //refuse to deal with this situation
                    return null;
                }

                try{
                    var startBlock;
                    if (startBlockContainer == rng.startContainer) {
                        startBlock = rng.startContainer.childNodes[rng.startOffset];
                    } else {
                        startBlock = dom.getParent(rng.startContainer, blockSelector);
                    }

                    var endBlock;
                    if (endBlockContainer == rng.endContainer) {
                        endBlock = rng.endContainer.childNodes[Math.max(0, rng.endOffset - 1)];
                    } else {
                        endBlock = dom.getParent(rng.endContainer, blockSelector);
                    }

                    if(startBlock == null && endBlock == null && rng.collapsed){
                        //we're in an empty block; return an empty range.
                        ret.setStart(rng.startContainer, rng.startOffset);
                        ret.setEnd(rng.endContainer, rng.endOffset);
                        return ret;
                    }

                    if(startBlock.parentNode != endBlock.parentNode){
                        return null;
                    }

                    ret.setStart(startBlock.parentNode, dom.nodeIndex(startBlock));
                    ret.setEnd(endBlock.parentNode, dom.nodeIndex(endBlock) + 1);

    //                this.logRange("Expanded block range: ", ret);
                    return ret;
                }catch(ex){
                    //some sort of indexing problem; bail out
                    console.log("error expanding range: ", ex, rng);
                    return null;
                }
            },

            getShrunkenBlockRange: function getShrunkenBlockRange(rng, blockSelector){
                var dom = this.ed.dom;
                var ret = rng.cloneRange();

                rng = this.normalizeRange(rng);
                this.adjustForBookmark(rng, true);

                if(blockSelector == null){
                    blockSelector = function(n){
                        return dom.isBlock(n);
                    };
                }

                if(rng.startContainer == rng.endContainer && rng.startOffset + 1 == rng.endOffset){
                    //one node is selected
                    var selectedNode = nodeAt(startPos(rng));
                    if(dom.is(selectedNode, blockSelector)){
                        //it's a block.  So select it's contents instead.
                        ret.surroundContents(selectedNode);
                        ret = getShrunkenBlockRange(ret, blockSelector); //keep shrinking as necessary.
                    }
                }
                return ret;
            },

            dfsNext: function (treePos, isForward, isRoot){
                var dom = this.ed.dom;
                function hasNullParent(treePos){
                    return treePos.c.parentNode == null;
                }

                if(!isRoot){
                    isRoot = hasNullParent;
                }

                function childOf(treePos){
                    if(isTextPos(treePos)){
                        return null;
                    }

                    if(isForward){
                        var n = nodeAt(treePos);
                        if(!n){
                            return null;
                        }
                    }else{
                        //we're in a terminal node. Find the previous sibling's terminal node.
                        treePos = siblingOf(treePos);
                        if(!treePos){
                            return null;
                        }
                        n = nodeAt(treePos);
                        if(!n){
                            return null;
                        }
                    }

                    if(isTextNode(n)){
                        return {c: n, off: isForward ? 0 : n.nodeValue.length};
                    }else{
                        return {c: n, off: isForward ? 0 : n.childNodes.length};
                    }
                }

                function siblingOf(treePos){
                    var ret;
                    if(isTextPos(treePos)){
                        ret = {c: treePos.c, off: isForward ? treePos.off+1 : treePos.off-1};
                        if(0 <= ret.off && ret.off <= ret.c.nodeValue.length){
                            return ret;
                        }
                        return null;
                    }else{
                        ret = {c: treePos.c, off: isForward ? treePos.off+1 : treePos.off-1};
                        if(0 <= ret.off && ret.off <= ret.c.childNodes.length){
                            return ret;
                        }
                        return null;
                    }
                }

                function nextRootward(treePos){
                    if(isRoot(treePos) || !treePos.c || !treePos.c.parentNode){
                        return null;
                    }

                    var n = treePos.c.parentNode;
                    return {c: n, off: dom.nodeIndex(treePos.c) + (isForward ? 1 : 0)};
                }

                //child, sibling, parent
                //child
                var ret = childOf(treePos);
                if(ret){
                    return ret;
                }

                //sibling
                ret = siblingOf(treePos);
                if(ret){
                    return ret;
                }

                //parent
                return nextRootward(treePos);
            },

            atStartOf: function(n, treePos){
                var self = this;
                if(treePos == null){
                    var rng = this.ed.selection.getRng(true);
                    treePos = startPos(rng);
                }
                function edgeTraverseUp(treePos, pred){
                    var lastTreePos = null;
                    while(treePos && treePos.off == 0 && (!lastTreePos || lastTreePos.c.parentNode == treePos.c)){
                        lastTreePos = treePos;
                        if(pred(treePos)){
                            return treePos;
                        }
                        treePos = self.dfsNext(treePos, false, isBody);
                    }
                    return null;
                }

                return !!edgeTraverseUp(treePos, getSameContainer(n));
            },

            atEndOf: function(n, treePos){
                var self = this;
                if(treePos == null){
                    var rng = this.ed.selection.getRng(true);
                    treePos = startPos(rng);
                }
                function terminalTraverse(treePos, pred){
                    var lastTreePos = null;

                    function isBr(treePos){
                        var n = nodeAt(treePos);
                        return treePos.c.nodeName.toLowerCase() == "br" || (n && n.nodeName.toLowerCase() == "br");
                    }
                    function isET(treePos){
                        var n = nodeAt(treePos);
                        return isEmptyTextNodePos(treePos) || (n && n.nodeType == 3 && n.nodeValue == "");
                    }
                    //skip over BR elements and empty text nodes
                    while(isBr(treePos) || isET(treePos)){
                        treePos = self.dfsNext(treePos, true, isBody);
                    }
                    while(treePos && isTerminal(treePos) && (!lastTreePos || lastTreePos.c.parentNode == treePos.c)){
                        lastTreePos = treePos;
                        if(pred(treePos)){
                            return treePos;
                        }
                        do{
                            treePos = self.dfsNext(treePos, true, isBody);
                            //skip over BR elements and empty text nodes
                        }while(isBr(treePos) || isET(treePos));
                    }
                    return null;
                }

                return !!terminalTraverse(treePos, getSameContainer(n));
            },

            /**
             * Normalize the range's commonAncestorContainer, and preserve the ranges's semantics, across browsers.
             * Gecko has a bug that makes this not automatic.
             * @param rng
             */
            safeNormalize: function(rng, n){
                var self = this;
                if(n == null){
                    n = rng.commonAncestorContainer;
                }

                if(n.nodeType == 3){
                    return rng; //normalizing a single text node is a no-op
                }

                rng = rng.cloneRange();

                if(!tinymce.isGecko && !tinymce.isIE9){
                    var selRng = this.ed.selection.getRng(true);
                    var isForward = this.isForwardSelection();
                    if(n.normalize){
                        n.normalize();
                    }
                    if(this.ed.selection.getSel().rangeCount === 0){
                        //webkit loses the selection if its container disapprears, but preserves range semantics
                        this.setSelection(selRng, isForward);
                    }
                }else{
                    /**
                     * Find a position reference point that will remain constant under text normalization.
                     *
                     * @param treePos The position to consider
                     * @returns Either a treePos representing the normalized position (possibly with -1 as an offset to
                     * indicate the terminal position), or a non-text node to look at.
                     */
                    function normalizedPos(treePos){
                        var ret = nodeAt(treePos);
                        if(!ret){
                            //either a terminal position, or a text node position
                            if(isTextPos(treePos)){
                                //find this position's normalized offset
                                var text = treePos.c;
                                var off = treePos.off;
                                while(text.previousSibling && text.previousSibling.nodeType == 3){
                                    text = text.previousSibling;
                                    off += text.nodeValue.length;
                                }
                                ret = {c: text, off: off, cPrevSib: text.previousSibling, cParent: text.parentNode};
                            }else{
                                ret = {c: treePos.c, off: -1};
                            }
                        }else if(isTextNode(ret)){
                            //looking at a text node, which may disappear
                            if(treePos.off == 0){
                                //offset 0 is always valid
                                return treePos;
                            }else if(ret.nodeValue.length == 0){
                                //empty text node, consider the next sibling position
                                return normalizedPos({c: treePos.c, off: treePos.off+1});
                            }else if(ret.previousSibling && ret.previousSibling.nodeType == 3){
                                //this guy is going to get normalized out, treat as text position
                                return normalizedPos({c: ret, off: 0});
                            }
                        }
                        return ret;
                    }

                    function normalizedPosToTreePos(nPos){
                        //nPos is one of several things: a node that we should be looking at, a valid position,
                        //a terminal position indicator (off == -1) or a position within a text node that
                        //may not still exist.
                        var c, off;
                        if(nPos.c != null && nPos.off != null){
                            //a terminal position, extant text position, or invalid text position
                            if(nPos.c.parentNode != null){
                                //valid container, good.
                                c = nPos.c;
                            }else{
                                //invalid container.  We belong in a text node.  Recover using extra info.
                                if(nPos.cPrevSib != null){
                                    //our container had a previous sibling; we should be just after that.
                                    c = nPos.cPrevSib.nextSibling;
                                    if(c == null){
                                        //we should be the terminal pos of our former container's parent
                                        c = nPos.cParent;
                                        nPos.off = -1;
                                    }else if(c.nodeType != 3){
                                        //we should be looking at c.
                                        return normalizedPosToTreePos(c);
                                    }
                                    //otherwise, c is our container, so fall through
                                }else{
                                    //our former container was the first node of it's container
                                    c = nPos.cParent.firstChild;
                                    if(c == null){
                                        //we should be the terminal pos of our former container's parent
                                        c = nPos.cParent;
                                        nPos.off = -1;
                                    }else if(c.nodeType != 3){
                                        //we should be looking at c.
                                        return normalizedPosToTreePos(c);
                                    }
                                    //otherwise, c is our container, so fall through
                                }
                            }
                            if(nPos.off == -1){
                                //terminal position
                                off = c.childNodes.length;
                            }else{
                                off = nPos.off;
                            }
                            return {c: c, off: off};
                        }else{
                            c = nPos.parentNode;
                            off = self.ed.dom.nodeIndex(nPos);
                            return {c: c, off: off};
                        }
                    }

                    var start = normalizedPos({c: rng.startContainer, off: rng.startOffset});
                    var end = normalizedPos({c: rng.endContainer, off: rng.endOffset});

                    if(n != rng.commonAncestorContainer){
                        rng.commonAncestorContainer.normalize(); //since we're recalculating end points, we need to normalize ourselves, regardless of n's position.
                    }
                    n.normalize();

                    start = normalizedPosToTreePos(start);
                    end = normalizedPosToTreePos(end);

                    setRangeStart(rng, start);
                    setRangeEnd(rng, end);
                }
                return rng;
            },

            /**
             * The browser UI maps many possible selection endpoints onto individual character positions.
             * This utility function normalizes the selection, so that it's endpoints are in a text node if possible,
             * and the selection range endpoints share a common container node.
             *
             * @param rng The range to normalize.
             */
            normalizeRange: function(rng) {
                var dom = this.ed.dom,
                    isCollapsed = rng.collapsed,
                    self = this;
                rng = rng.cloneRange();

                //Predicate functions
                function isBlockNode(n){
                    if(n && n.nodeType == 1){
                        var disp = dom.getStyle(n, "display", true);
                        return disp != "inline" && disp != "none";
                    }
                    return false;
                }

                function isBlocklike(treePos){
                    var n = nodeAt(treePos);
                    return isBlockNode(n) || isBlockNodeTerminalChild(treePos);
                }

                function isInBlock(treePos){
                    return isBlockNode(treePos.c);
                }

                function isBlockNodeTerminalChild(treePos){
                    return isBlockNode(treePos.c) && !nodeAt(treePos);
                }

                function isBlockOrNull(treePos){
                    return treePos == null || isBlocklike(treePos);
                }


                /**
                 * Depth-first search of a DOM subtree starting at treePos.
                 * @param treePos The start node; the root of the subtree.
                 * @param pred Predicate.  function(treePos): boolean
                 * @param isForward If true, search forward.
                 * @param stopPredicate function(treePos): boolean.  When it returns true, the search is unsuccessful.
                 * @return The first range position that satisfies the predicate function, or false if no such node exists.
                 */
                function rangeDepthFirst(treePos, pred, isForward, stopPredicate, isRoot){
                    while(treePos && !stopPredicate(treePos)){
                        if(pred(treePos)){
                            return treePos;
                        }
                        treePos = self.dfsNext(treePos, isForward, isRoot);
                    }
                    return null;
                }

                function lookBothWays(treePos, forwardPred, backwardPred, forwardFirst, stop, isRoot){
                    var pred = forwardFirst ? forwardPred : backwardPred;
                    var ret = rangeDepthFirst(treePos, pred, forwardFirst, stop, isRoot);
                    if(!ret){
                        pred = !forwardFirst ? forwardPred : backwardPred;
                        ret = rangeDepthFirst(treePos, pred, !forwardFirst, stop, isRoot);
                    }
                    return ret;
                }

                function isNonEdgeTextPos(treePos){
                    return isTextPos(treePos) && treePos.off > 0;
                }

                function predicateAnd(){
                    var preds = Array.prototype.slice.apply(arguments);
                    return function andPred(treePos){
                        var result = true;
                        for(var i = 0; result && i < preds.length; ++i){
                            result = result && preds[i](treePos);
                        }
                        return result;
                    }
                }

                function predicateOr(){
                    var preds = Array.prototype.slice.apply(arguments);
                    return function orPred(treePos){
                        var result = false;
                        for(var i = 0; !result && i < preds.length; ++i){
                            result = result || preds[i](treePos);
                        }
                        return result;
                    }
                }

                function predicateNot(pred){
                    return function notPred(treePos){
                        return !pred(treePos);
                    }
                }

                var isAnchor = getIsContainerName("a");
                var isBodyOrA = predicateOr(isBody, isAnchor);
                var isBlockOrNullOrA = predicateOr(isBlockOrNull, isAnchor);
                var isInBr = getIsContainerName("br");
                var isInImg = getIsContainerName("img");

                function adjustCursorPosition(c, off) {
                    var treePos = lookBothWays({c: c, off: off}, isNonTerminalTextPos, isNonEdgeTextPos, false, predicateOr(isBlockOrNullOrA, isInBr, isInImg), isBodyOrA);
                    if (treePos) {
                        return treePos;
                    } else {
                        //there's no nearby text node, select the nearest block node.
                        treePos = lookBothWays({c: c, off: off}, predicateOr(isInBlock, isBlocklike), predicateOr(isInBlock, isBlockNodeTerminalChild), false, predicateOr(isBodyOrA, isInImg), isBodyOrA);
                        if (treePos) {
                            return treePos;
                        }
                        return {c: c, off: off };
                    }
                }

                rng = this.safeNormalize(rng);

                if(isCollapsed){
                    var cursorContainer = rng.startContainer;
                    if(cursorContainer.nodeType == 1 && !isBlockNode(rng.startContainer) && rng.startContainer.childNodes.length == 0){
                        //don't exit an empty style tag (em, strong, span, etc.)
                        return rng;
                    }else{
                        var treePos = adjustCursorPosition(rng.startContainer, rng.startOffset);
                        setRangeStart(rng, treePos);

                        rng.collapse(true);
                    }
                }else{
                    //normalize the extended range as WebKit would.
                    function webkitifyRange(rng){
                        //this predicate is true for positions looking at text, images, or BR tags
                        var isInlineContent = predicateOr(predicateAnd(isTextPos, predicateNot(isTerminal)), isInImg, getIsNodeNameAt("img"), isInBr, getIsNodeNameAt("br"));
                        function shrinkEndpoint(treePos, isForward){
                            while(true){
                                var nextPos = self.dfsNext(treePos, isForward, isBody);
                                if((nextPos == null) ||
                                        (nextPos.c == treePos.c.parentNode && dom.isBlock(treePos.c)) ||
                                        (isForward && isInlineContent(treePos)) ||
                                        (!isForward && isInlineContent(nextPos))){
                                    return treePos;
                                }
                                treePos = nextPos;
                            }
                        }

                        setRangeStart(rng, shrinkEndpoint(startPos(rng), true));
                        setRangeEnd(rng, shrinkEndpoint(endPos(rng), false));
                    }

                    webkitifyRange(rng);
                }
                return rng;
            }

        };
        tinymce.extend(this, methods);
    };
})();
