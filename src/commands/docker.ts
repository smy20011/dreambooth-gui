import Converter from "./convert";
import Dreambooth from "./dreambooth";
import { Command } from "./runner";
import _ from "lodash";

// Run a command within docker.
export class DockerCommand {
    constructor(
        private subCommand: Command,
        private volumeMapping: [string, string][] = [],
        private additionalArguments: string[] = [],
        private image = "smy20011/dreambooth:v0.1.10",
        private alwaysPull = true,
    ) { }

    public getCommand(): Command {
        return {
            executable: "docker",
            arguments: [
                "run",
                "--rm",
                "-t",
                ...this.getPullingArguments(),
                ...this.additionalArguments,
                ...this.volumeMapping.map(it => `-v=${it[0]}:${it[1]}`),
                ...Object.entries(this.subCommand.environment ?? {}).sort().flatMap(it => ['-e', `${it[0]}=${it[1]}`]),
                this.image,
                this.subCommand.executable,
                ...this.subCommand.arguments
            ]
        }
    }

    private getPullingArguments(): string[] {
        if (this.alwaysPull) {
            return ["--pull", "always"];
        }
        return [];
    }

    private static rewrite<T>(mapping: [string, string][], obj: T, key: keyof T, newFolder: string) {
        mapping.push([obj[key] as string, newFolder]);
        obj[key] = newFolder as T[keyof T];
    }

    private static forceNewLine(command: Command): Command {
        return {
            executable: '/start_training',
            arguments: [
                ...command.arguments
            ],
            environment: command.environment
        }
    }

    public static runDreambooth(dreambooth: Dreambooth, cacheDir: string, classDir?: string, isLocalModel = false): DockerCommand {
        let mapping: [string, string][] = [];
        dreambooth = _.clone(dreambooth);
        this.rewrite(mapping, dreambooth, "instanceDir", "/instance");
        if (dreambooth.classPrompt && classDir) {
            dreambooth.classDir = classDir;
            this.rewrite(mapping, dreambooth, "classDir", "/class");
        }
        this.rewrite(mapping, dreambooth, "outputDir", "/output");
        if (isLocalModel) {
            this.rewrite(mapping, dreambooth, "model", "/input_model");
        }
        mapping.push([cacheDir, '/train']);
        return new DockerCommand(
            this.forceNewLine(dreambooth.getTrainingCommand()),
            mapping,
            [
                '--gpus=all',
            ]
        );
    }

    public static runDiffusersToCkpt(converter: Converter): DockerCommand {
        let mapping: [string, string][] = [];
        converter = _.clone(converter);
        this.rewrite(mapping, converter, "source", "/source");
        this.rewrite(mapping, converter, "dest", "/dest");
        return new DockerCommand(
            converter.getDiffuserToCkptCommand(),
            mapping,
            ['--gpus=all'],
        );
    }

    public static runCkptToDiffusers(converter: Converter, cacheDir: string): DockerCommand {
        let mapping: [string, string][] = [];
        converter = _.clone(converter);
        this.rewrite(mapping, converter, "dest", "/dest");
        mapping.push([cacheDir, '/train']);
        let source = converter.source;
        converter.source = "/source.ckpt";
        return new DockerCommand(
            converter.getCkptToDiffuserCommand(),
            mapping,
            ['--gpus=all', "--mount", `type=bind,source=${source},target=/source.ckpt`],
        );
    }

}