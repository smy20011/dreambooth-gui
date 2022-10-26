import { atom } from "jotai";
import { loadable } from "jotai/utils"
import { genTrainingCommandLine } from "./docker";
import { GpuInfo } from "./Gpu";

export interface State {
    // Dir of images.
    instanceDir: string;
    // Prompt of dir.
    instancePrompt: string;
    // Train dreambooth with class images.
    classPrompt: string;
    // User defined additional arguments to train the model.
    additionalArguments?: string[];
    // Model name or local model path.
    model: string;
    // Huggingface Token
    token: string;
    // GPU State
    gpuInfo: GpuInfo;
    // Max training steps
    steps: number;
    // Learning rate.
    learningRate: string;
    // Model output dir
    outputDir: string
    // Tab index
    tab: string
    // Should generate ckpt file in the end
    genCkpt: boolean;
}

// Global state for the application.
export let stateAtom = atom<State>({
    instanceDir: "",
    instancePrompt: "sks",
    classPrompt: "",
    model: "CompVis/stable-diffusion-v1-4",
    token: "",
    gpuInfo: {
        name: "unknown",
        meminfo: {
            free: 0,
            total: 0,
            used: 0,
        }
    },
    steps: 600,
    learningRate: "1e-5",
    outputDir: "",
    tab: "pick_image",
    genCkpt: true
});

function recordToArgs(obj: Record<string, any>): string[] {
    return Object.entries(obj)
        .map(([key, value]) => {
            if (typeof value == "boolean") {
                return value ? `--${key}` : null;
            }
            return `--${key}=${value}`;
        })
        .filter(v => v !== null) as string[];
}

function getTrainingArgsByGpu(gpuInfo: GpuInfo) {
    const GIB = 1024 * 1024 * 1024;
    if (gpuInfo.name == "unknown") {
        return [];
    }
    // Config for GPU with < 10GB varm
    let config = {
        mixed_precision: 'fp16',
        train_batch_size: 1,
        gradient_accumulation_steps: 1,
        gradient_checkpointing: true,
        use_8bit_adam: true,
    };
    if (gpuInfo.meminfo.free > 13.7 * GIB) {
        // Train with better quality and disable checkpoint.
        config.gradient_accumulation_steps = 2;
        config.gradient_checkpointing = false;
    } else if (gpuInfo.meminfo.free > 11.2 * GIB) {
        // Disbale gradient checkpoint for faster training.
        config.gradient_checkpointing = false;
    } else if (gpuInfo.meminfo.free > 10.4 * GIB) {
        // Increase batch size for better training quality.
        config.train_batch_size = 2;
    }
    return recordToArgs(config);
}

// Dreambooth training arguments.
export let trainingArgsAtom = atom<string[]>((get) => {
    const s = get(stateAtom);
    if (s.additionalArguments) {
        return s.additionalArguments;
    }
    if (s.gpuInfo) {
        return getTrainingArgsByGpu(s.gpuInfo);
    }
    return [];
});

// Training command for dreambooth.
export let trainingDockerCommandAtom = loadable(atom(async (get) => genTrainingCommandLine(get(stateAtom), get(trainingArgsAtom))));

function verifyState(state: State): string {
    if (!state.instanceDir) {
        return "Please select instance images in the image tab.";
    }
    if (!state.instancePrompt) {
        return "Please set your instance prompt in the training tab.";
    }
    if (!state.model) {
        return "Please select your based model in the training tab.";
    }
    if (!state.steps || state.steps < 0) {
        return "Steps cannot be negative."
    }
    if (!state.outputDir) {
        return "Please select output dir.";
    }
    if (!state.token) {
        return "Please set your hugging face token.";
    }
    return "";
}

export let verificationMessageAtom = atom((get) => verifyState(get(stateAtom)));