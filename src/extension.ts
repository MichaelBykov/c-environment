import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { glob } from 'glob';
const execAsync = promisify(exec);

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const diagnosticsMap = vscode.languages.createDiagnosticCollection('Easy C')

	const compileC = vscode.commands.registerCommand('easy-c.compile-c', async () => {
    try {
      // Clear old errors
      diagnosticsMap.clear()

      const cwd = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
      if (!cwd) {
        vscode.window.showErrorMessage('No workspace found');
        return;
      }
  
      const inputFiles = `${cwd}/**/*.c`
      const outputFile = `${cwd}/a.out`

      const files = await glob(inputFiles)
      if (files.length === 0) {
        vscode.window.showErrorMessage('No .c files found');
        return;
      }
      const filePaths = files.join(' ')
      
      await execAsync(`cc ${filePaths} -o ${outputFile} -fno-diagnostics-fixit-info -fdiagnostics-print-source-range-info -fno-caret-diagnostics -fno-color-diagnostics`)

      const task = new vscode.Task(
        { type: 'shell' },
        vscode.TaskScope.Workspace,
        'Run C',
        'Easy C',
        new vscode.ShellExecution(outputFile)
      );
      vscode.tasks.executeTask(task);

    } catch (error: any) {
      const errors = error.stderr.split('\n').filter((line: string) => line.includes('error:'));
      const diagnostics = errors.map((error: string) => {
        const [file, line, column, _, message] = error.split(':');
        const range = new vscode.Range(
          new vscode.Position(parseInt(line) - 1, parseInt(column) - 1),
          new vscode.Position(parseInt(line) - 1, parseInt(column) - 1)
        );
        return { file, range, message, severity: vscode.DiagnosticSeverity.Error }
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
	});

	context.subscriptions.push(compileC);
}

// This method is called when your extension is deactivated
export function deactivate() {}
