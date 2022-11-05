import { Command } from "./runner";

export default class Converter {
    constructor(
        public source: string,
        public dest: string,
        public diffuserToOriginScript = "/diffusers/scripts/convert_diffusers_to_original_stable_diffusion.py",
        public originToDiffuerScript = "/diffusers/scripts/convert_original_stable_diffusion_to_diffusers.py",
    ) { }

    public getDiffuserToCkptCommand(): Command {
        return {
            executable: "python",
            arguments: [
                this.diffuserToOriginScript,
                `--model_path=${this.source}`,
                `--checkpoint_path=${this.dest}/model.ckpt`
            ]
        }
    }

    public getCkptToDiffuserCommand(): Command {
        return {
            executable: "python",
            arguments: [
                this.originToDiffuerScript,
                `--checkpoint_path=${this.source}`,
                `--dump_path=${this.dest}/model.ckpt`
            ]
        };
    }
}