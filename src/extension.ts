'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as os from 'os';
import path = require('path');
import { readdirSync, readFileSync } from 'fs';

const TERM_NAME = "python - ok";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposables = [
        vscode.commands.registerCommand('okpy.question', async () => {
            let result = await getQuestion();
            let okterm = getTerminal();
            okterm.sendText(`python3 ok -q ${result}`);
        }),
        vscode.commands.registerCommand('okpy.questionUnlock', async () => {
            let result = await getQuestion(true);
            let okterm = getTerminal();
            okterm.sendText(`python3 ok -q ${result} -u`);
        }),
        vscode.commands.registerCommand('okpy.allUnlock', async () => {
            let okterm = getTerminal();
            okterm.sendText(`python3 ok -u`);
        }),
        vscode.commands.registerCommand('okpy.all', async () => {
            let okterm = getTerminal();
            okterm.sendText(`python3 ok`);
        }),
        vscode.commands.registerCommand('okpy.submit', async () => {
            let result = await vscode.window.showWarningMessage("Are you sure you want to submit your assignment?", { modal: true },
                {
                    title: "Cancel",
                    isCloseAffordance: true
                },
                {
                    title: "Submit",
                }
            );
            if (!result || result.title === "Cancel") {
                return;
            }
            let okterm = getTerminal();
            okterm.sendText(`python3 ok --submit`);
        }),
        vscode.commands.registerCommand('okpy.revise', async () => {
            let result = await vscode.window.showWarningMessage("Are you sure you want to submit a revision to your assignment?", { modal: true },
                {
                    title: "Cancel",
                    isCloseAffordance: true
                },
                {
                    title: "Revise",
                }
            );
            if (!result || result.title === "Cancel") {
                return;
            }
            let okterm = getTerminal();
            okterm.sendText(`python3 ok --revise`);
        })
    ];

    for (let d of disposables) {
        context.subscriptions.push(d);
    }
}

interface QuickPickTestItem extends vscode.QuickPickItem {
    test: string;
}

async function getQuestion(locked = false) {

    let dir = getCwd();
    if (!dir) {
        return;
    }
    let okFile = readdirSync(dir).find(x => x.endsWith(".ok"));

    let throwErr = false;
    try {
        if (okFile) {
            let obj = JSON.parse(readFileSync(path.join(dir, okFile), 'utf8'));
            let testStrings = Object.keys(obj.tests);
            let tests: QuickPickTestItem[] = testStrings.map(function (x) {
                return { label: x, description: " - ok test", test: x };
            });
            let additionalTests: QuickPickTestItem[] = [];
            for (let i = 0; i < tests.length; i++) {
                let matches: any = tests[i].label.match(/(.*\/)?(\w+|(\w*)\[(\d)-(\d)\]).py:?([\w\.]+)?/)!;
                /*
                    Apparently JS doesn't support named capture groups, so:
                    1: directory
                    2: file (filename without extension)
                    3: numPrefix (part of the filename before the number range)
                    4: rangeLower (inclusive lower bound of the range)
                    5: rangeUpper (inclusive upper bound of the range)
                    6: function (the specific function in a file to test)
                */
                if (matches[6]) {
                    tests[i].label = "$(code) " + matches[6];
                    tests[i].test = matches[6];
                    tests[i].description = matches[2] + ".py - doctest";
                } else if (matches[3] || (matches[4] && matches[5])) {
                    tests.splice(i, 1);
                    i--;
                    let min = Number.parseInt(matches[4]);
                    let max = Number.parseInt(matches[5]);
                    if (Number.isNaN(min) || Number.isNaN(max)) {
                        throw Error("Invalid range tests");
                    }
                    for (let j = min; j <= max; j++) {
                        let fName = `${matches[3]}${j}`;
                        let content = readFileSync(path.join(dir, `${(matches[1] || "") + fName}.py`), "utf8");
                        let testLocked = content.includes("'locked': True");
                        if (locked === testLocked) {
                            additionalTests.push({
                                label: (testLocked ? "$(lock) " : "$(list-unordered) ") + fName,
                                test: fName,
                                description: (matches[1] || "") + fName + ".py - ok test"
                            });
                        }
                    }

                } else if (matches[2] && obj.tests[tests[i].label] === "ok_test") {
                    let content = readFileSync(path.join(dir, `${(matches[1] || "") + matches[2]}.py`), "utf8");
                    let testLocked = content.includes("'locked': True");
                    if (locked === testLocked) {
                        additionalTests.push({
                            label: (testLocked ? "$(lock) " : "$(list-unordered) ") + matches[2],
                            test: matches[2],
                            description: (matches[1] || "") + matches[2] + ".py - ok test"
                        });
                    }
                    tests.splice(i, 1);
                    i--;
                } else {
                    let lines = readFileSync(path.join(dir, `${matches[2]}.py`), 'utf8').toString().split("\n");

                    let prevIndent = 0;
                    let currentClass = "";
                    for (let l of lines) {
                        let indent = (l.match(/^[ \t]+/) || [""])[0].length;
                        let className = (l.match(/class (\w+)/) || ["", ""])[1];
                        let funcName = (l.match(/def (\w+)/) || ["", ""])[1];
                        if (indent === 0) {
                            currentClass = "";
                            if (className) {
                                currentClass = className;
                            } else if (funcName) {
                                additionalTests.push({ label: "$(code) " + funcName, description: `${matches[2]}.py - doctest`, test: funcName });
                            }
                        } else if (prevIndent < indent && currentClass && funcName) {
                            additionalTests.push({ label: `$(code) ${currentClass}.${funcName}`, description: `${matches[2]}.py - doctest`, test: `${currentClass}.${funcName}` });
                        }

                        prevIndent = indent;
                    }
                    tests.splice(i, 1);
                    i--;
                }
            }

            tests.push(...additionalTests);

            if (tests.length > 0) {
                const test = await vscode.window.showQuickPick(tests, { matchOnDescription: true });
                if (!test) {
                    throwErr = true;
                    throw new Error("No question provided");
                }
                return test.test;
            } else {
                throw new Error(`There are no ${!locked ? "un" : ""}locked tests`);
            }
        }
    }
    catch (err) {
        if (throwErr) {
            throw err;
        } else {
            vscode.window.showErrorMessage(err.message);
        }
    }

    const result = await vscode.window.showInputBox({
        prompt: "Enter question name",
        value: ""
    });

    if (!result) {
        throw new Error("No question provided");
    }

    return result;
}

function getTerminal(name = TERM_NAME, setCwd = true, setFocus = true) {
    let term = vscode.window.terminals.find(x => x.name === name);
    term = term || vscode.window.createTerminal(name);
    if (setCwd) {
        setTerminalCwd(term);
    }
    if (setFocus) {
        term.show(false);
    }
    return term;
}

// ### Code from https://github.com/Tyriar/vscode-terminal-here ###

function kindOfShell(terminalSettings: vscode.WorkspaceConfiguration) {
    if (os.platform() !== 'win32') {
        return;
    }

    const windowsShellPath = terminalSettings.integrated.shell.windows;

    if (!windowsShellPath) {
        return undefined;
    }

    // Detect WSL bash according to the implementation of VS Code terminal.
    // For more details, refer to https://goo.gl/AuwULb
    const is32ProcessOn64Windows = process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
    const system32 = is32ProcessOn64Windows ? 'Sysnative' : 'System32';
    var shellKindByPath: any = {};
    shellKindByPath[path.join(process.env.windir!, system32, 'bash.exe').toLowerCase()] = "wslbash";
    shellKindByPath[path.join(process.env.windir!, system32, 'cmd.exe').toLowerCase()] = "cmd";

    // %windir% can give WINDOWS instead of Windows
    return shellKindByPath[windowsShellPath.toLowerCase()];
}

function setTerminalCwd(terminal: vscode.Terminal) {
    let dir = getCwd();
    if (!dir) {
        return;
    }

    switch (kindOfShell(vscode.workspace.getConfiguration('terminal'))) {
        case "wslbash":
            // c:\workspace\foo to /mnt/c/workspace/foo
            dir = dir.replace(/(\w):/, '/mnt/$1').replace(/\\/g, '/');
            break;
        case "cmd":
            // send 1st two characters (drive letter and colon) to the terminal
            // so that drive letter is updated before running cd
            terminal.sendText(dir.slice(0, 2));
    }

    terminal.sendText(`cd "${dir}"`);
}

function getCwd() {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    let document = editor.document;
    if (!document) {
        return;
    }

    let uri = document.uri;
    if (!uri) {
        return;
    }

    return path.dirname(uri.fsPath);
}

// ### END https://github.com/Tyriar/vscode-terminal-here ###

// this method is called when your extension is deactivated
export function deactivate() {
}