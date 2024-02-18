import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "easy-c" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const compileC = vscode.commands.registerCommand('easy-c.compile-c', async () => {
    try {
      const cwd = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
      if (!cwd) {
        vscode.window.showErrorMessage('No workspace found');
        return;
      }
  
      const inputFiles = `${cwd}/**.c`
      const outputFile = `${cwd}/a.out`
      
      await execAsync(`cc ${inputFiles} -o ${outputFile}`)

      const task = new vscode.Task(
        { type: 'shell' },
        vscode.TaskScope.Workspace,
        'Run C',
        'Easy C',
        new vscode.ShellExecution(outputFile)
      );
      vscode.tasks.executeTask(task);

    } catch (error: any) {
      // TODO: Parse c compile error messages
      vscode.window.showErrorMessage(error?.message || 'An error occurred');
      console.error(error)
    }
	});

	context.subscriptions.push(compileC);
}

// This method is called when your extension is deactivated
export function deactivate() {}
