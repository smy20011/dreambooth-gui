import Converter from "./convert";
import Dreambooth from "./dreambooth";
import { Command } from "./runner";
import _ from "lodash";

// Run a command within docker.
export class DockerCommand {
    constructor(
        private subCommand: Command,
        private volumeMapping: Record<string, string> = {},
        private additionalArguments: string[] = [],
        private image = "smy20011/dreambooth:latest"
    ) { }

    public getCommand(): Command {
        return {
            executable: "docker",
            arguments: [
                "run",
                "-t",
                ...this.additionalArguments,
                ...Object.entries(this.volumeMapping).sort().map(it => `-v=${it[0]}:${it[1]}`),
                ...Object.entries(this.subCommand.environment ?? {}).sort().flatMap(it => ['-e', `${it[0]}=${it[1]}`]),
                this.image,
                this.subCommand.executable,
                ...this.subCommand.arguments
            ]
        }
    }

    private static rewrite<T>(mapping: Record<string, string>, obj: T, key: keyof T, newFolder: string) {
        mapping[obj[key] as string] = newFolder;
        obj[key] = newFolder as T[keyof T];
    }

    private static forceNewLine(command: Command): Command {
        return {
            executable: '/start_training',
            arguments: [
                command.executable,
                ...command.arguments
            ],
            environment: command.environment
        }
    }

    public static runDreambooth(dreambooth: Dreambooth, cacheDir: string): DockerCommand {
        let mapping: Record<string, string> = {};
        dreambooth = _.clone(dreambooth);
        this.rewrite(mapping, dreambooth, "instanceDir", "/instance");
        if (dreambooth.classPrompt) {
            this.rewrite(mapping, dreambooth, "classDir", "/class");
        }
        this.rewrite(mapping, dreambooth, "outputDir", "/output");
        mapping[cacheDir] = '/train';
        return new DockerCommand(
            this.forceNewLine(dreambooth.getTrainingCommand()),
            mapping,
            [
                '--gpus=all',
            ]
        );
    }

    public static runDiffusersToCkpt(converter: Converter): DockerCommand {
        let mapping: Record<string, string> = {};
        converter = _.clone(converter);
        this.rewrite(mapping, converter, "source", "/source");
        this.rewrite(mapping, converter, "dest", "/dest");
        return new DockerCommand(
            converter.getDiffuserToCkptCommand(),
            mapping,
            ['--gpus=all'],
        );
    }
}