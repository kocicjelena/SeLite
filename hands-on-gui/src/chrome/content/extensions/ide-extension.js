"use strict";

XulUtils.TreeViewHelper.prototype.isEditable= TreeView.prototype.isEditable= function isEditable( row, col ) { return true;};

/** There are a few basic scenarios/sequences:
 * 
 *  A) Simple sequence: edit, focus out
 *    1. click at a cell to edit-in-place
 *    2. finish editing by pressing Enter, or by moving focus out (but not to another cell). When that triggers setCellText(), editor.treeView.currentCommand is still the command that has just been edited in-place. setCellText() calls updateCurrentCommand(), which updates the test case. Then I call selectCommand(), which updates the command details area.
 *    
 *  B) Simple sequence: edit, edit another cell of the same command (or comment)
 *    1. click at a cell to edit-in-place
 *    2. finish editing by clicking at another cell of the same command/comment (in the same row). That calls setCellText() before tree's onClick().
 *  
 *  C) Simple sequence: start editing without a click:
 *    1. select a command (without starting to edit in-place, e.g. by right click)
 *    2. hit Enter (to edit the comment, or Target, in-place), edit the cell
 *    3. finish editing in any other way than cancelling (i.e. by hiting Enter, TAB, clicking somewhere else)
 *    
 *  D) Complex (like a concurrent race)
 *    1. click at a cell to edit-in-place
 *    2. finish editing by clicking at another cell (regardless of whether it's possible to edit that other cell in-place, or not). That triggers:
 *    2.1 tree's onSelect(), which calls editor.treeView.selectCommand(), so now editor.treeView.currentCommand is the command from the newly selected cell!
 *    2.2 setCellText()
 *    2.3 tree's onClick() in handlers.js
 *    Therefore, in onClick() I save this.tree.currentIndex in this.seLiteTreePreviousIndex, which I then compare to current this.tree.currentIndex in setCellText(). If they are different, that means that onSelect() has already selected the newly clicked command. Then I update the previously edited command in the test case, instead of calling updateCurrentCommand(). Also, I don't update the command details area - I don't call selectCommand() - because it already shows the newly edited command.
 *    
 *  E) Medium Complext: Edit, modify, cancel (no change)
 *    1. edit a cell
 *    2. stop editing (and revert any modifications) by pressing ESC. That doesn't trigger setCellText(), but only onBlur. So we need an onBlur handler to revert any changes in Command details area (i.e. one of wide inputs Command, Target or Value) that were made by previous typing (as was captured by a sequence of onInput events).
 *    
 *  We have an onInput handler, so that we update Command details area (wide inputs Command, Target or Value) as the user types in the cell (rather than updating it only after 'committing' the change by e.g. ENTER). However, all event sequences that accept the change (i.e. except for ones where the user hits ESC) trigger setCellText() first and only then they trigger onBlur(). Therefore onBlur handles that specially.
 * */

XulUtils.TreeViewHelper.prototype.setCellText= TreeView.prototype.setCellText= function setCellText( row, col, value, original) {
    //original is undefined, so I don't call original.setCellText( row, col, value );
    var tree= document.getElementById('commands');
    var key= col===tree.columns[0] // What field of the command/comment to update
        ? 'command'
        : (col===tree.columns[1]
            ? 'target'
            : 'value'
        );
    var decodedValue= col===tree.columns[0]
        ? value
        : window.editor.treeView.decodeText(value);
    
    if( this.tree.currentIndex===this.seLiteTreePreviousIndex || this.seLiteTreePreviousIndex===undefined ) { // Handling one of the three simple sequences (see above)
        window.editor.treeView.updateCurrentCommand( key, decodedValue);
        window.editor.treeView.selectCommand();
    }
    else { // Handling the complex sequence
        // See TreeView.UpdateCommandAction.prototype -> execute()
        if( col===tree.columns[0] ) {
            key= 'comment';
        }
        window.editor.treeView.getCommand( this.seLiteTreePreviousIndex )[ key ]= decodedValue;
        this.seLiteTreePreviousIndex= undefined;
    }
    return true;
};

( function() {
    // Adjust top 'Edit' menu and context menu: Inject 'key' attribute for menu items that insert new command/comment.
    var menusToUpdate= [ document.getElementById('treeContextMenu'), document.getElementById('menu_edit') ];
    for( var i=0; i<2; i++ ) { //@TODO var(..of..) once NetBeans like it
        //I've tried XPath and it didn't work:
        //var nsResolver = document.createNSResolver( treeContextMenu.ownerDocument == null ? treeContextMenu.documentElement : treeContextMenu.ownerDocument.documentElement ); // From https://developer.mozilla.org/en/docs/Introduction_to_using_XPath_in_JavaScript#Implementing_a_Default_Namespace_Resolver
        //var insertCommandMenuItem= window.document.evaluate( '//menuitem', treeContextMenu, nsResolver, XPathResult.ANY_UNORDERED_NODE_TYPE, null ).singleNodeValue;
        var menuItems= menusToUpdate[i].getElementsByTagName('menuitem');
        for( var j=0; j<menuItems.length; j++ ) {//@TODO for(..of..) once NetBeans like it
            var item= menuItems[j];
            if( item.getAttribute('accesskey')==='I' ) {
                item.setAttribute('key', 'insert-command-key');
            }
            if( item.getAttribute('accesskey')==='M' ) {
                item.setAttribute('key', 'insert-comment-key');
            }
        }
    }
    
    var originalInitialize= TreeView.prototype.initialize;
    TreeView.prototype.initialize= function initialize(editor, document, tree) {
        originalInitialize.call( this, editor, document, tree );
        var controllers= this.tree.controllers;
        var originalController= controllers.getControllerAt( controllers.getControllerCount()-1 );
        controllers.removeController( originalController );
        
        var self= this;
        // Add handling for 'cmd_insert_command' and 'cmd_insert_comment', by head override of controller object that was registered through appendController() in Selenium's chrome/content/treeView.js. Otherwise I couldn't register shortcut keys with those two commands, even though they were listed in Selenium's chrome/content/selenium-ide-common.xul >> <commandset id="seleniumIDECommands">
        // For that I set head override of three handler functions. I can't replace functions in originalController itself (since object originalController is protected).
        var newController= {
            supportsCommand: function supportsCommand(cmd ) {
                return cmd==='cmd_insert_command' || cmd==='cmd_insert_comment' || originalController.supportsCommand.call(originalController, cmd);
            },

            isCommandEnabled: function isCommandEnabled(cmd ) {
                return cmd==='cmd_insert_command' || cmd==='cmd_insert_comment' || originalController.isCommandEnabled.call(originalController, cmd);
            },
            
            doCommand: function doCommand(cmd ) {
                if( cmd==='cmd_insert_command' ) {
                    self.insertCommand();
                }
                else if( cmd==='cmd_insert_comment' ) {
                    self.insertComment();
                }
                else {
                    originalController.doCommand.call(originalController, cmd);
                }
            },
            onEvent: originalController.onEvent
        };        
        controllers.appendController( newController );
    };
    
    /** When editing-in place Command's Target (but not for comments), on hitting TAB make it shift focus to Value. Also, in reverse: when editing Value, on hitting Shift+TAB shift focus to Target.
 * */
    // This function is set up and/or extended by both Clipboard and Indent, and Hands-on GUI. See also another override of this at hands-on-gui/src/chrome/content/extensions/ide-extension.js
    var originalSeLiteTreeOnKeyPress= TreeView.seLiteTreeOnKeyPress;
    TreeView.seLiteTreeOnKeyPress= function seLiteTreeOnKeyPress( event ) {
        if( originalSeLiteTreeOnKeyPress ) {
            originalSeLiteTreeOnKeyPress.call( null, event );
        }
        
        if( event.keyCode===KeyEvent.DOM_VK_TAB ) {
            var tree= event.currentTarget;
            
            if( tree.getAttribute('editing') ) {
                var targetColumn= tree.columns.getColumnAt(1);
                var valueColumn= tree.columns.getColumnAt(2);

                if( tree.editingColumn===targetColumn && !event.shiftKey
                ||  tree.editingColumn===valueColumn && event.shiftKey ) {
                    event.preventDefault();
                    var otherColumn= tree.editingColumn===targetColumn
                        ? valueColumn
                        : targetColumn;
                    var editingRow= tree.editingRow;

                    tree.stopEditing(/*shouldAccept:*/true );
                    tree.startEditing( editingRow, otherColumn );
                }
            }
        }
        else
        if( event.keyCode===KeyEvent.DOM_VK_RETURN ) {
            var tree= event.currentTarget;
            var editing= tree.getAttribute('editing');
            if( !tree.getAttribute('editing') && tree.currentIndex>=0 ) {
                var commandOrComment= window.editor.treeView.getCommand( tree.currentIndex );
                var firstColumnEditableInPlace= commandOrComment.comment!==undefined
                    ? tree.columns.getColumnAt(0) // comment (i.e. 'Command' column)
                    : tree.columns.getColumnAt(1); // Target
                tree.startEditing( tree.currentIndex, firstColumnEditableInPlace );
            }
        }
    };
} ) ();