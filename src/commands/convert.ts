import { Command } from "./runner";

export default class Converter {
    constructor(
        public source: string,
        public dest: string,
        public script = "/diffusers/scripts/convert_diffusers_to_original_stable_diffusion.py",
    ) { }

    public getDiffuserToCkptCommand(): Command {
        return {
            executable: this.script,
            arguments: [
                `--model_path=${this.source}`,
                `--checkpoint_path=${this.dest}/model.ckpt`
            ]
        }
    }
}