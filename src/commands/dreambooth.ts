import { Command } from "./runner";

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