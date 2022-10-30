import _ from "lodash";
import { GpuInfo } from "../Gpu";
import { Command } from "./runner";

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

function pickTrainingArgs(gpuInfo: GpuInfo) {
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



export default class Dreambooth {
    constructor(
        // Prompt of dir.
        public instancePrompt: string,
        // Train dreambooth with class images.
        public classPrompt: string = "",
        // User defined additional arguments to train the model.
        public additionalArguments: string[] = [],
        // Max training steps
        public steps: number = 600,
        // Learning rate.
        public learningRate: string = "1e-5",
        // Model dir or name.
        public model: string = "CompVis/stable-diffusion-v1-4",
        // Model output dir
        public outputDir = "/output",
        // Class image directory.
        public classDir = "/class",
        // Dir of images.
        public instanceDir = "/instance",
        // Script location
        public scriptLocation: string = "/train_dreambooth.py",
        // Additional training arguments
        public extraTrainingArgs: string[] = [],
        // Token
        public token = "",
    ) { }

    public withGpu(gpuInfo: GpuInfo): Dreambooth {
        let newDb = _.clone(this);
        newDb.additionalArguments = pickTrainingArgs(gpuInfo);
        return newDb;
    }

    public verifyState(): string {
        if (!this.instanceDir) {
            return "Please select instance images in the image tab.";
        }
        if (!this.instancePrompt) {
            return "Please set your instance prompt in the training tab.";
        }
        if (!this.model) {
            return "Please select your based model in the training tab.";
        }
        if (!this.steps || this.steps < 0) {
            return "Steps cannot be negative."
        }
        if (!this.outputDir) {
            return "Please select output dir.";
        }
        if (!this.token) {
            return "Please set your hugging face token.";
        }
        return "";
    }

    public getTrainingCommand(): Command {
        return {
            executable: "docker",
            arguments: [
                "python",
                "-u",
                this.scriptLocation,
                `--pretrained_model_name_or_path=${this.model}`,
                ...this.getInstantArguments(),
                ...this.getClassArguments(),
                ...this.getTrainingArguments(),
                ...this.getOutputArguments()
            ],
            environment: {
                "HUGGING_FACE_HUB_TOKEN": this.token,
            }
        };
    }

    private getInstantArguments(): string[] {
        return [
            `--instance_prompt=${this.instancePrompt}`,
            `--instance_data_dir=${this.instanceDir}`
        ];
    }

    private getClassArguments(): string[] {
        if (this.classPrompt) {
            return [
                `--class_data_dir=${this.classDir}`,
                "--with_prior_preservation",
                "--prior_loss_weight=1.0",
                `--class_prompt=${this.classPrompt}`
            ];
        }
        return [];
    }

    private getTrainingArguments(): string[] {
        return [
            `--max_train_steps=${this.steps}`,
            `--learning_rate=${this.learningRate}`,
            "--lr_scheduler=constant",
            "--lr_warmup_steps=0",
            ...this.extraTrainingArgs
        ];
    }

    private getOutputArguments(): string[] {
        return [
            "--resolution=512",
            `--output_dir=${this.outputDir}`,
        ]
    }
}