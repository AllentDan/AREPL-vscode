import { Buffer } from "buffer";
import { extensions, WorkspaceConfiguration } from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { userInfo } from "os";
import { join, sep } from "path";
import areplUtils from "./areplUtilities";
import { readFileSync } from "fs";

export default class Reporter {
    private reporter: TelemetryReporter
    private timeOpened: number
    private lastStackTrace: string
    numRuns: number
    numInterruptedRuns: number
    execTime: number
    totalPyTime: number
    totalTime: number
    pythonVersion: string

    constructor(private enabled: boolean) {
        const extensionId = "Allent.config-view";
        const extension = extensions.getExtension(extensionId)!;
        const extensionVersion = extension.packageJSON.version;

        let instrumentation_key = ''
        try {
            instrumentation_key = readFileSync(join(extension.extensionPath, "media", 'instrumentation_key.txt')).toString()
        } catch (error) {
            console.warn('no instrumentation key for ConfigView found - disabling telemetry')
            this.enabled = false;
            // TelemetryReporter raises error if falsy key so we need to escape before we hit it
            return
        }

        this.reporter = new TelemetryReporter(extensionId, extensionVersion, instrumentation_key);
        this.resetMeasurements()
    }

    sendError(error: Error, code: number = 0, category = 'typescript') {
        console.error(`${category} error: ${error.name} code ${code}\n${error.stack}`)
        if (this.enabled) {

            error.stack = this.anonymizePaths(error.stack)

            // no point in sending same error twice (and we want to stay under free API limit)
            if (error.stack == this.lastStackTrace) return

            this.reporter.sendTelemetryException(error, {
                code: code.toString(),
                category,
            })

            this.lastStackTrace = error.stack
        }
    }

    /**
     * sends various stats to azure app insights
     */
    sendFinishedEvent(settings: WorkspaceConfiguration) {
        if (this.enabled) {
            const measurements: { [key: string]: number } = {}
            measurements['timeSpent'] = (Date.now() - this.timeOpened) / 1000
            measurements['numRuns'] = this.numRuns
            measurements['numInterruptedRuns'] = this.numInterruptedRuns

            if (this.numRuns != 0) {
                measurements['execTime'] = this.execTime / this.numRuns
                measurements['totalPyTime'] = this.totalPyTime / this.numRuns
                measurements['totalTime'] = this.totalTime / this.numRuns
            }
            else { // lets avoid 0/0 NaN error
                measurements['execTime'] = 0
                measurements['totalPyTime'] = 0
                measurements['totalTime'] = 0
            }

            const properties: { [key: string]: string } = {}

            // no idea why I did this but i think there was a reason?
            // this is why you leave comments people
            const settingsDict = JSON.parse(JSON.stringify(settings))
            for (let key in settingsDict) {
                properties[key] = settingsDict[key]
            }

            return areplUtils.getPythonPath().then((path) => {
                properties['pythonPath'] = this.anonymizePaths(path)
                properties['pythonVersion'] = this.pythonVersion

                this.reporter.sendTelemetryEvent("closed", properties, measurements)

                this.resetMeasurements()
            })
        }
        return Promise.resolve()
    }

    private resetMeasurements() {
        this.timeOpened = Date.now()

        this.numRuns = 0
        this.numInterruptedRuns = 0
        this.execTime = 0
        this.totalPyTime = 0
        this.totalTime = 0
    }

    /**
     * replace username with anon
     */
    anonymizePaths(input: string) {
        if (input == null) return input
        return input.replace(new RegExp('\\' + sep + userInfo().username, 'g'), sep + 'anon')
    }

    dispose() {
        // reporter may be undefined if telemetry is disabled
        if (this.reporter !== undefined) this.reporter.dispose()
    }
}
