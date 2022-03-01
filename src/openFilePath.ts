/* jshint esversion: 6 */

//Required modules
import * as vscode from "vscode"
import * as path from "path"
import * as recursive from "recursive-readdir"
import vscodeUtils from "./vscodeUtilities"

//Get preferences
const preferences = vscode.workspace.getConfiguration('ConfigView.openConfigFilePath');
const startingPath: string = preferences.get('startingPath');
const searchExclusion = preferences.get('searchExclusion');
const custRegExp = new RegExp(preferences.get('regExp'));
const matchFileName = preferences.get('matchFileName');

//Set error view
const showError = message => vscode.window.showErrorMessage(`Open file from path: ${message}`);

export function _openFileFromPath() {

    //Check to see if workspace is open
    if (!vscode.workspace.workspaceFolders) {
        return showError('You must have a workspace opened.');
    }

    let editor = vscode.window.activeTextEditor;
    //Get the selection starting from the cursor position and searching for a regular expression (default search between quotes or double quotes)
    let range = editor.document.getWordRangeAtPosition(editor.selection.active, custRegExp);

    //If range is empty throw error
    if (typeof range === 'undefined') {
        showError("Current cursor position is not valid, check the 'open-file-from-path.regExp' option to configure your RegExp match");
        return false;
    }

    var currentlyOpenTabfilePath = editor.document.fileName;
    let currentWorkspaceFolder: string = '';
    for (let i = 0; i < vscode.workspace.workspaceFolders.length; i++) {
        const index_out = currentlyOpenTabfilePath.indexOf(vscode.workspace.workspaceFolders[i].uri.path);
        if (index_out == 0) {
            currentWorkspaceFolder = vscode.workspace.workspaceFolders[i].uri.path;
            break;
        }
    }
    //Get the pure match against the regualr expression
    let matchArray = editor.document.getText(range).match(custRegExp);

    //Loop to search for a defined match (skipping index 0 because regex will return an Array containing the entire matched string as the first element)
    let found: number = 0;
    for (var i = 1; i < matchArray.length; i++) {
        if (typeof matchArray[i] !== 'undefined') {
            found = i;
            break;
        }
    }

    if (found == 0) {
        showError("No match found");
        return false;
    }

    //Get the last part to compare if "matchFileName" is true, otherwise search the entire path
    let lastPart = (matchFileName) ? matchArray[found].split('/').pop() : matchArray[found].trim();
    lastPart = lastPart.replace(/^.+\.\//, '');
    if (lastPart.indexOf('./') != -1) lastPart = lastPart.replace('./', '');

    let searchPath = folderPath => {
        //Get absolute path
        let folderFullPath = path.join(currentWorkspaceFolder, folderPath);
        let foundList = [];

        //Recursive search into absolute path
        recursive(folderFullPath, searchExclusion, (readErr, files) => {

            for (var index in files) {
                //Convert backslashes to forward slashes
                let filePathConverted = files[index].replace(/\\/g, '/');

                //If matchFileName is true, check the last part of the path to match
                //If matchFileName is false, check the entire path to match
                if ((matchFileName && filePathConverted.split('/').pop() == lastPart) || (!matchFileName && filePathConverted.indexOf(lastPart) > 0)) {
                    //Get only the relative path to show, otherwise it will be too long.
                    let relativePath = files[index].replace(currentWorkspaceFolder, '').replace(/\\/g, '/');
                    foundList.push({
                        label: lastPart,
                        description: relativePath,
                        path: filePathConverted
                    });
                }
            }

            if (foundList.length == 0) {
                //If no matches -> throw error
                showError("Warning, no matches were found.");
            } else if (foundList.length == 1) {
                //If 1 match -> open file
                //Check for a starting slash to remove
                let file = foundList[0].path;
                if (file.charAt(0) === '/') file = file.substr(1);
                let url = vscode.Uri.parse('file:///' + file);
                vscode.commands.executeCommand('vscode.open', url);
            } else {
                //If multiple matches -> open quick pick
                vscode.window.showQuickPick(foundList).then(selected => {
                    if (typeof selected !== 'undefined' && selected) {
                        //Check for a starting slash to remove
                        let file = selected.path;
                        if (file.charAt(0) === '/') file = file.substr(1);
                        //If selection is valid open file
                        let url = vscode.Uri.parse('file:///' + file);
                        vscode.commands.executeCommand('vscode.open', url);
                    }
                });
            }

        });
    };

    const startingPathes = startingPath.split(",");
    for (var index in startingPathes) {
        if (currentlyOpenTabfilePath.startsWith(path.join(currentWorkspaceFolder, startingPathes[index]))) {
            //Init everything
            searchPath(startingPathes[index]);
            break;
        }
    }
}
