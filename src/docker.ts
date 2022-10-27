
import { shell } from "@tauri-apps/api";
import { exists } from "@tauri-apps/api/fs";
import { appDir, join } from "@tauri-apps/api/path";
import { State } from "./state";

export async function genTrainingCommandLine(state: State, trainingArgs: string[]): Promise<string[]> {
    if (!trainingArgs || !state.instancePrompt || !state.model || !state.outputDir) {
        return [];
    }
    const currentDir = await appDir();
    const classPromptDir = state.classPrompt ? await join(currentDir, state.classPrompt) : "";
    let args = [
        `--instance_prompt=${state.instancePrompt}`,
        `--instance_data_dir=/instance`
    ];
    if (state.classPrompt) {
        args.push(
            "--class_data_dir=/class",
            "--with_prior_preservation",
            "--prior_loss_weight=1.0",
            `--class_prompt=${state.classPrompt}`
        );
    }
    args.push(
        "--output_dir=/output",
        "--resolution=512",
        `--max_train_steps=${state.steps}`,
        `--learning_rate=${state.learningRate}`,
        "--lr_scheduler=constant",
        "--lr_warmup_steps=0",
        ...trainingArgs
    )
    let dockerCommand = [
        "run", "--pull=always", "-t", "--gpus=all", `-v=${currentDir}:/train`,
        `-v=${state.instanceDir}:/instance`,
        `-v=${state.outputDir}:/output`,
        '-e', `HUGGING_FACE_HUB_TOKEN=${state.token}`
    ]
    if (classPromptDir) {
        dockerCommand.push(`-v=${classPromptDir}:/class`);
    }
    if ((await exists(state.model)) as unknown as boolean) {
        args.push('--pretrained_model_name_or_path=/pretrained');
        dockerCommand.push(`-v=${state.model}:/pretrained`)
    } else {
        args.push(`--pretrained_model_name_or_path=${state.model}`);
    }
    dockerCommand.push(
        "smy20011/dreambooth:gpu_debug",
        "/start_training",
        "/train_dreambooth.py",
        ...args
    );
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