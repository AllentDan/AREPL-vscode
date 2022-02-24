import { workspace } from "vscode"

/**
 * simple alias for workspace.getConfiguration("ConfigView")
 */
export function settings() {
    return workspace.getConfiguration("ConfigView")
}