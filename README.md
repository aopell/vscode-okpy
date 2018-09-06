# vscode-okpy

Provides VS Code support for the [ok Python autograder](https://okpy.org)

## Extension Commands

This extension contributes the following commands:

![Commands](img/commands.png)

### `okpy.question` - OK: Grade Question
Grade a specific question only

Equivalent shell command: `python3 ok -q <question>`
### `okpy.all` - OK: Grade All
Grade entire assignment

Equivalent shell command: `python3 ok`

### `okpy.questionUnlock` - OK: Unlock Question
Unlock a question 
 
Equivalent shell command: `python3 ok -q <question> -u`
### `okpy.allUnlock` [OK: Unlock All]
Unlock entire assignment 
 
Equivalent shell command: `python3 ok -u`
### `okpy.submit` OK: Submit
Submit assignment 

Equivalent shell command: `python3 ok --submit`

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

### 1.0.0

Initial release