"use strict"
import * as path from "path";
import * as vscode from "vscode"
import { Limit } from "./throttle"
import Utilities from "./utilities"
import { settings } from "./settings"

/**
 * shows ConfigView output (variables, errors, timing, and stdout/stderr)
 * https://code.visualstudio.com/docs/extensions/webview
 */
export default class PythonPanelPreview {

    static readonly scheme = "pythonPanelPreview"
    static readonly PREVIEW_URI = PythonPanelPreview.scheme + "://authority/preview"
    public throttledUpdate: () => void

    private _onDidChange: vscode.EventEmitter<vscode.Uri>;
    private lastTime: number = 999999999;

    private html;
    private css: string
    private jsonRendererScript: string;
    private errorContainer = ""
    private jsonRendererCode = `<script></script>`;
    private emptyPrint = `<br><h3>Print Output:</h3><div id="print"></div>`
    private printContainer = this.emptyPrint;
    private timeContainer = ""
    private panel: vscode.WebviewPanel
    private customCSS = ""

    constructor(private context: vscode.ExtensionContext, htmlUpdateFrequency = 50) {
        this._onDidChange = new vscode.EventEmitter<vscode.Uri>();

        if (htmlUpdateFrequency != 0) {
            // refreshing html too much can freeze vscode... lets avoid that
            const l = new Limit()
            this.throttledUpdate = l.throttledUpdate(this.updateContent, htmlUpdateFrequency)
        }
        else this.throttledUpdate = this.updateContent
    }

    start(linkedFileName: string) {
        this.panel = vscode.window.createWebviewPanel("arepl", "ConfigView - " + linkedFileName, vscode.ViewColumn.Two, {
            enableScripts: true
        });

        this.css = `<link rel="stylesheet" type="text/css" href="${this.getMediaPath("pythonPanelPreview.css", this.panel.webview)}">`
        this.jsonRendererScript = `<script src="${this.getMediaPath("jsonRenderer.js", this.panel.webview)}"></script>`
        this.panel.webview.html = this.html
        return this.panel;
    }

    public updateLinkedFileName(linkedFileName: string) {
        this.panel.title = "ConfigView - " + linkedFileName
    }

    public updateVars(vars: object) {
        let userVarsCode = `userVars = ${JSON.stringify(vars)};`

        // escape end script tag or else the content will escape its container and WREAK HAVOC
        userVarsCode = userVarsCode.replace(/<\/script>/g, "<\\/script>")

        this.jsonRendererCode = `<script>
            window.onload = function(){
                ${userVarsCode}
                let jsonRenderer = renderjson.set_icons('+', '-') // default icons look a bit wierd, overriding
                    .set_show_to_level(${settings().get("show_to_level")}) 
                    .set_max_string_length(${settings().get("max_string_length")});
                document.getElementById("results").appendChild(jsonRenderer(userVars));
            }
            </script>`
    }

    public updateTime(time: number) {
        let color: "green" | "red";

        time = Math.floor(time) // we dont care about anything smaller than ms

        if (time > this.lastTime) color = "red"
        else color = "green"

        this.lastTime = time;

        this.timeContainer = `<p style="position:fixed;left:90%;top:90%;color:${color};">${time} ms</p>`;
    }

    /**
     * @param refresh if true updates page immediately.  otherwise error will show up whenever updateContent is called
     */
    public updateError(err: string, refresh = false) {
        // escape the <module>
        err = Utilities.escapeHtml(err)

        err = this.makeErrorGoogleable(err)

        this.errorContainer = `<div id="error">${err}</div>`

        if (refresh) this.throttledUpdate()
    }

    public injectCustomCSS(css: string, refresh = false) {
        this.customCSS = css
        if (refresh) this.throttledUpdate()
    }

    public handlePrint(printResults: string) {
        // escape any accidental html
        printResults = Utilities.escapeHtml(printResults);

        this.printContainer = `<br><div class="print"><pre><code class="python">${printResults}</code></pre></div>`
        this.throttledUpdate();
    }

    clearPrint() {
        this.printContainer = this.emptyPrint
    }

    public displayProcessError(err: string) {
        let errMsg = `Error in the ConfigView extension!\n${err}`
        if (err.includes("ENOENT") || err.includes("9009")) { // NO SUCH FILE OR DIRECTORY
            // user probably just doesn't have python installed
            errMsg = errMsg + `\n\nAre you sure you have installed python 3 and it is in your PATH?
            You can download python here: https://www.python.org/downloads/`
        }

        this.updateError(errMsg, true)
    }

    private makeErrorGoogleable(err: string) {
        if (err && err.trim().length > 0) {
            let errLines = err.split("\n")

            // exception usually on last line so start from bottom
            for (let i = errLines.length - 1; i >= 0; i--) {

                // most exceptions follow format ERROR: explanation
                // ex: json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)
                // so we can identify them by a single word at start followed by colon
                const errRegex = /(^[\w\.]+): /

                if (errLines[i].match(errRegex)) {
                    const googleLink = "https://www.google.com/search?q=python "
                    errLines[i] = errLines[i].link(googleLink + errLines[i])
                }
            }

            return errLines.join("\n")
        }
        else return err
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    private getMediaPath(mediaFile: string, webview: vscode.Webview) {
        const onDiskPath = vscode.Uri.file(path.join(this.context.extensionPath, "media", mediaFile));
        return webview.asWebviewUri(onDiskPath)
    }

    private updateContent() {

        const printPlacement = settings().get<string>("printResultPlacement")
        const showFooter = settings().get<boolean>("showFooter")
        const variables = '<h3>Variables:</h3><div id="results"></div>'

        // todo: handle different themes.  check body class: https://code.visualstudio.com/updates/June_2016
        this.html = `<!doctype html>
        <html lang="en">
        <head>
            <title>ConfigView</title>
            ${this.css}
            <style>${this.customCSS}</style>
            ${this.jsonRendererScript}
            ${this.jsonRendererCode}
            <link rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/10.0.3/styles/default.min.css">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/10.0.3/highlight.min.js"></script>
            <script>hljs.initHighlightingOnLoad();</script>
        </head>
        <body>
            ${this.errorContainer}
            ${this.printContainer}
            ${this.timeContainer}
            <div id="${Math.random()}" style="display:none"></div>
        </body>
        </html>`
        // the weird div with a random id above is necessary
        // if not there weird issues appear

        try {
            this.panel.webview.html = this.html;
        } catch (error) {
            if (error instanceof Error && error.message.includes("disposed")) {
                // swallow - user probably just got rid of webview inbetween throttled update call
                console.warn(error)
            }
            else throw error
        }

        this._onDidChange.fire(vscode.Uri.parse(PythonPanelPreview.PREVIEW_URI));
    }
}
