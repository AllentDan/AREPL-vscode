import { EOL } from "os";
import * as assert from "assert";

//////////////////////////////////////////////
// below thanks to https://github.com/rokucommunity/vscode-brightscript-language
let Module = require('module');
import { vscodeMock } from './mockVscode.spec';
//override the "require" call to mock certain items
const { require: oldRequire } = Module.prototype;
Module.prototype.require = function hijacked(file) {
    if (file === 'vscode') {
        return vscodeMock;
    } else {
        return oldRequire.apply(this, arguments);
    }
};
//////////////////////////////////////////////

import { ToConfigViewLogic } from '../src/toConfigViewLogic'

suite("toConfigViewLogic tests", () => {

    const mockPythonEvaluator: any = {
        execCode: () => { }
    }

    const toConfigViewLogic = new ToConfigViewLogic(mockPythonEvaluator, null);

    test("arepl not ran when just end section is changed", function () {
        let returnVal = toConfigViewLogic.onUserInput(`#$end${EOL}bla`, "", EOL)
        assert.strictEqual(returnVal, true)
        returnVal = toConfigViewLogic.onUserInput(`#$end${EOL}foo`, "", EOL)
        assert.strictEqual(returnVal, false)
    });

    test("unsafe keyword not allowed", function () {
        assert.strictEqual(toConfigViewLogic.scanForUnsafeKeywords("os.rmdir('bla')", ["rmdir"]), true)
    });

    test("safe keyword allowed", function () {
        assert.strictEqual(toConfigViewLogic.scanForUnsafeKeywords("bla bla bla", ["rmdir"]), false)
    });

    test("unsafe keyword allowed in comment", function () {
        assert.strictEqual(toConfigViewLogic.scanForUnsafeKeywords("#rmdir", ["rmdir"]), false)
    });

    test("unsafe keywords not allowed", function () {
        assert.strictEqual(toConfigViewLogic.scanForUnsafeKeywords("DELETE * FROM", ["rmdir", "DELETE"]), true)
    });
})