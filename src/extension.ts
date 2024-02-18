import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { glob } from 'glob';
import os from 'os';
const execAsync = promisify(exec);

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const diagnosticsMap = vscode.languages.createDiagnosticCollection('Easy C')
  
  const configuration = {
    cCompiler: 'cc',
    tmpFolder: os.tmpdir()
  };

  async function compile() {
    // Clear old errors
    diagnosticsMap.clear()
    
    const cwd = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!cwd)
      throw new Error('No workspace found');

    const inputFiles = `${cwd}/**/*.c`
    const outputFile = `${configuration.tmpFolder}/a.out`

    const files = await glob(inputFiles)
    if (files.length === 0)
      throw new Error('No .c files found');
    const filePaths = files.join(' ')
    
    await execAsync(`cc ${filePaths} -o ${outputFile} -fno-diagnostics-fixit-info -fno-caret-diagnostics -fno-color-diagnostics`)
    
    return outputFile
  }

  function handleErrors(error: any) {
    const errors = error.stderr.split('\n').filter((line: string) => line.includes('error:'));
    const diagnostics = errors.map((error: string) => {
      const [file, line, column, _, message] = error.split(':');
      const range = new vscode.Range(
        new vscode.Position(parseInt(line) - 1, parseInt(column) - 1),
        new vscode.Position(parseInt(line) - 1, parseInt(column) - 1)
      );
      return { file, range, message: message.trim(), severity: vscode.DiagnosticSeverity.Error }
    })

    const fileDiagnostics: { [file: string]: any[] } = {}
    for (const { file, range, message, severity } of diagnostics) {
      const existing = (fileDiagnostics[file] ??= [], fileDiagnostics[file])
      existing.push(new vscode.Diagnostic(range, message, severity))
    }

    for (const [file, diagnostic] of Object.entries(fileDiagnostics)) {
      diagnosticsMap.set(vscode.Uri.file(file), diagnostic)
    }

    const onSave = vscode.workspace.onDidSaveTextDocument((document) => {
      if (diagnosticsMap.has(document.uri)) {
        diagnosticsMap.delete(document.uri)
      }
    })
    context.subscriptions.push(onSave)
    
    if (diagnostics.length === 0) {
      vscode.window.showErrorMessage(error?.message || 'An error occurred');
      console.error(error)
    }
  }

	const compileC = vscode.commands.registerCommand('easy-c.compile-c', async () => {
    try {
      const outputFile = await compile()

      const task = new vscode.Task(
        { type: 'shell' },
        vscode.TaskScope.Workspace,
        'Run C',
        'Easy C',
        new vscode.ShellExecution(outputFile)
      );
      task.presentationOptions.echo = false;
      task.presentationOptions.focus = true;
      vscode.tasks.executeTask(task);

    } catch (error: any) {
      handleErrors(error)
    }
	});
	context.subscriptions.push(compileC);

	const debugC = vscode.commands.registerCommand('easy-c.debug-c', async () => {
    try {
      const outputFile = await compile()

      const task = new vscode.Task(
        { type: 'shell' },
        vscode.TaskScope.Workspace,
        'Debug C',
        'Easy C',
        new vscode.ShellExecution(outputFile)
      );
      task.presentationOptions.echo = false;
      task.presentationOptions.focus = true;
      vscode.tasks.executeTask(task);

    } catch (error: any) {
      handleErrors(error)
    }
	});
	context.subscriptions.push(debugC);
}

// This method is called when your extension is deactivated
export function deactivate() {}
