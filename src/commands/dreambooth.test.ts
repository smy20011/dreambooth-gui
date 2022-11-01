import { expect, test, describe, beforeEach } from 'vitest'
import Dreambooth from './dreambooth';
describe('Dreambooth Test', () => {
    let dreambooth: Dreambooth;
    beforeEach(() => {
        dreambooth = new Dreambooth("sks");
        dreambooth.instanceDir = "/instance";
        dreambooth.classDir = "/class";
        dreambooth.outputDir = "/output"
        dreambooth.token = "abc";
    });

    test('Instance prompt only training', () => {
        const command = dreambooth.getTrainingCommand();
        expect(command.arguments).toEqual([
            "/train_dreambooth.py",
            "--pretrained_model_name_or_path=CompVis/stable-diffusion-v1-4",
            "--instance_prompt=sks",
            "--instance_data_dir=/instance",
            "--max_train_steps=600",
            "--learning_rate=1e-5",
            "--lr_scheduler=constant",
            "--lr_warmup_steps=0",
            "--resolution=512",
            "--output_dir=/output",
        ]);
        expect(command.environment).toEqual({
            "HUGGING_FACE_HUB_TOKEN": "abc"
        })
    });
    test('Class training', () => {
        dreambooth.classPrompt = "class"
        const command = dreambooth.getTrainingCommand();
        expect(command.arguments).toEqual([
            "/train_dreambooth.py",
            "--pretrained_model_name_or_path=CompVis/stable-diffusion-v1-4",
            "--instance_prompt=sks",
            "--instance_data_dir=/instance",
            "--class_data_dir=/class",
            "--with_prior_preservation",
            "--prior_loss_weight=1.0",
            "--class_prompt=class",
            "--max_train_steps=600",
            "--learning_rate=1e-5",
            "--lr_scheduler=constant",
            "--lr_warmup_steps=0",
            "--resolution=512",
            "--output_dir=/output",
        ]);
        expect(command.environment).toEqual({
            "HUGGING_FACE_HUB_TOKEN": "abc"
        })
    });

});