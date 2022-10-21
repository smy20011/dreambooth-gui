
import { shell } from "@tauri-apps/api";
import { appDir, join } from "@tauri-apps/api/path";
import { State } from "./state";

export async function genTrainingCommandLine(state: State, trainingArgs: string[]): Promise<string[]> {
    if (!trainingArgs || !state.instancePrompt || !state.model || !state.outputDir) {
        return [];
    }
    const currentDir = await appDir();
    const classPromptDir = state.classPrompt ? await join(currentDir, state.classPrompt) : "";
    const accelerateCommand = `
python -u /train_dreambooth.py
--pretrained_model_name_or_path='${state.model}'
--instance_prompt='${state.instancePrompt}'
--instance_data_dir=/instance
${state.classPrompt ? "--class_data_dir=/class --with_prior_preservation --prior_loss_weight=1.0" : ""}
${state.classPrompt ? "--class_prompt='" + state.classPrompt + "'" : ""}
--output_dir=/output
--resolution=512
--max_train_steps=${state.steps}
--learning_rate=5e-6
--lr_scheduler='constant'
--lr_warmup_steps=0
${trainingArgs.join("\n")}
`.replaceAll("\n", " ");
    let dockerCommand = [
        "run", "-t", "--gpus=all", `-v=${currentDir}:/train`,
        `-v=${state.instanceDir}:/instance`,
        `-v=${state.outputDir}:/output`,
        '-e', `HUGGING_FACE_HUB_TOKEN=${state.token}`
    ]
    if (classPromptDir) {
        dockerCommand.push(`-v=${classPromptDir}:/class`);
    }
    dockerCommand = dockerCommand.concat([
        "smy20011/dreambooth:latest",
        "bash",
        "-c",
        `${accelerateCommand} 2>&1 | tr '\\\\r' '\\\\n'`
    ]);
    return dockerCommand;
}

// Kill all running instance of docker.
export async function killDocker() {
    const process = new shell.Command("docker", ["ps", "-f", "ancestor=smy20011/dreambooth", "-q"]);
    const dockerIds = (await process.execute()).stdout;
    const futures = dockerIds.split("\n").map(async (id) => {
        const killProcess = new shell.Command("docker", ["kill", id]);
        const ret = await killProcess.execute();
        console.log(`Killed docker image ${id}, retcode=${ret.code}`);
    });
    await Promise.all(futures);
}

// Run docker with command, pipe output to outputCallback and returns the exit value.
export async function runDocker(command: string[], outputCallback: (line: string) => void): Promise<number> {
    return new Promise((resolve, reject) => {
        const process = new shell.Command("docker", command);
        process.on("close", payload => resolve(payload.code));
        process.on("error", reject);
        process.stdout.on("data", outputCallback);
        process.stderr.on("data", outputCallback);
        process.spawn().catch(reject);
    })
}