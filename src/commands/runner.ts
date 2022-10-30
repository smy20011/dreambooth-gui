import { shell } from "@tauri-apps/api";

export interface Command {
    executable: string;
    arguments: string[];
    environment?: Record<string, string>;
}

// Run docker with command, pipe output to outputCallback and returns the exit value.
export async function run(command: Command, outputCallback: (line: string) => void): Promise<number> {
    return new Promise((resolve, reject) => {
        const process = new shell.Command(command.executable, command.arguments, { env: command.environment });
        process.on("close", payload => resolve(payload.code));
        process.on("error", reject);
        process.stdout.on("data", outputCallback);
        process.stderr.on("data", outputCallback);
        process.spawn().catch(reject);
    })
}