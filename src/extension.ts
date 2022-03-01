'use strict';
import * as vscode from "vscode";
import PreviewManager from "./PreviewManager"
import vscodeUtils from "./vscodeUtilities";
import { _openFileFromPath } from "./openFilePath";

let previewManager: PreviewManager = null;

export function activate(context: vscode.ExtensionContext) {

    const openFileFromPath = vscode.commands.registerCommand('extension.openConfigFilePath', () => _openFileFromPath());

    previewManager = new PreviewManager(context);

    // Register the commands that are provided to the user
    const configView = vscode.commands.registerCommand("extension.currentConfigViewSession", () => {
        previewManager.startArepl();
    });

    const newAreplSession = vscode.commands.registerCommand("extension.newConfigViewSession", () => {
        vscodeUtils.newUnsavedPythonDoc(vscodeUtils.getHighlightedText())
            .then(() => { previewManager.startArepl() });
    });

    const closeArepl = vscode.commands.registerCommand("extension.closeConfigView", () => {
        previewManager.dispose()
    });

    // exact same as above, just defining command so users are aware of the feature
    const configViewOnHighlightedCode = vscode.commands.registerCommand("extension.newConfigViewSessionOnHighlightedCode", () => {
        vscodeUtils.newUnsavedPythonDoc(vscodeUtils.getHighlightedText())
            .then(() => { previewManager.startArepl() });
    });

    const executeConfigView = vscode.commands.registerCommand("extension.executeConfigView", () => {
        previewManager.runArepl()
    });

    const executeConfigViewBlock = vscode.commands.registerCommand("extension.executeConfigViewBlock", () => {
        previewManager.runAreplBlock()
    });

    const printDir = vscode.commands.registerCommand("extension.printDir", () => {
        previewManager.printDir()
    });

    // push to subscriptions list so that they are disposed automatically
    context.subscriptions.push(...[
        configView,
        newAreplSession,
        closeArepl,
        configViewOnHighlightedCode,
        executeConfigView,
        executeConfigViewBlock,
        printDir,
        openFileFromPath
    ]);
}