import { dialog } from "@tauri-apps/api";
import { message } from "@tauri-apps/api/dialog";
import { writeTextFile } from "@tauri-apps/api/fs";
import { appDir, join } from "@tauri-apps/api/path";
import { appWindow } from "@tauri-apps/api/window";
import { useAtom, useAtomValue } from "jotai";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import Converter from "../commands/convert";
import { DockerCommand } from "../commands/docker";
import { run } from "../commands/runner";
import { killDocker } from "../docker";
import { appDirAtom, dreamboothAtom } from "../state";
import { getClassDir, ensureDir, bind, updateStateField, useAtomForm } from "./utils";


export function Training() {
    const [running, setRunning] = useState<boolean>(false);
    const [genCkpt, setGenCkpt] = useState<boolean>(true);
    const [lines, setLines] = useState<string[]>([]);
    const [state, setState, bind] = useAtomForm(dreamboothAtom);
    const appDir = useAtomValue(appDirAtom);

    const dockerTrainCommand = DockerCommand.runDreambooth(state, appDir).getCommand();

    const outputRef = useRef<any>();

    useEffect(() => {
        const area = outputRef.current!!;
        area.scrollTop = area.scrollHeight;
    }, [lines]);

    useEffect(() => {
        const unlisten = appWindow.onCloseRequested(async () => {
            try {
                await killDocker();
            } catch {
            }
        });
    }, []);

    const onSubmit = async (e: FormEvent<any>) => {
        e.preventDefault();
        if (running) {
            await killDocker();
            setRunning(false);
        } else {
            const verificationMessage = state.verifyState();
            if (verificationMessage) {
                await message(`Cannot start training: ${verificationMessage}`);
                return;
            }
            const dirs = [
                await getClassDir(state.classPrompt),
                appDir,
                state.outputDir,
            ];

            for (const dir of dirs) {
                try {
                    if (dir) {
                        ensureDir(dir);
                    }
                } catch (e) {
                    await message(`Failed to create dir ${dir}, ${e}`);
                    return;
                }
            }

            try {
                setRunning(true);
                setLines([]);
                const ret = await run(
                    dockerTrainCommand,
                    line => setLines(list => list.concat(line)));
                if (ret != 0) {
                    await message(`Failed to train model, see output for detailed error.`);
                    setRunning(false);
                    return;
                }
                await writeTextFile(await join(state.outputDir, "trainer_config"), JSON.stringify(state));
                if (genCkpt) {
                    let genCkptOuput: string[] = [];
                    const ret = await run(
                        DockerCommand.runDiffusersToCkpt(new Converter(state.outputDir, state.outputDir)).getCommand(),
                        l => genCkptOuput.push(l));
                    if (ret != 0) {
                        await message(`Failed to convert model, output: ${genCkptOuput.join("\n")}`);
                    }
                }
                setRunning(false);
            } catch (e) {
                await message(`Failed to start docker ${e}`);
            }
            await message(`Training finished, check ${state.outputDir} for model output.`, 'Finished!');
        }
    };

    const selectOutputFolder = async () => {
        const result = await dialog.open({
            directory: true,
        });
        if (result != null && typeof result === 'string') {
            bind("outputDir").onChange(result);
        }
    };

    return (
        <Form onSubmit={onSubmit}>
            <Form.Group className="mb-3" controlId="token">
                <Form.Label>Hugging Face Token</Form.Label>
                <Form.Control type="text" {...bind("token")} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="token">
                <Form.Label>Output Dir</Form.Label>
                <InputGroup>
                    <Form.Control type="text" {...bind("outputDir")} />
                    <Button variant="primary" onClick={selectOutputFolder}>
                        Select
                    </Button>
                </InputGroup>
            </Form.Group>
            <Form.Group className="mb-3" controlId="genCkpt">
                <Form.Check label="Generate model checkpoint (.ckpt file) in the output directory" checked={genCkpt} onChange={(t) => setGenCkpt(t.target.checked)} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="args">
                <div><Form.Label>Training Command</Form.Label></div>
                <Form.Control as="textarea" rows={1}
                    value={`${dockerTrainCommand.executable} ${dockerTrainCommand.arguments.join(" ")}`} disabled />
            </Form.Group>
            <Form.Group className="mb-3" controlId="args">
                <div><Form.Label>Training Output</Form.Label></div>
                <Form.Control as="textarea" rows={10} value={lines.join("\n")} ref={outputRef} disabled />
            </Form.Group>
            {!running ?
                <Button variant="primary" type="submit">
                    Start
                </Button> :
                <Button variant="danger" type="submit">
                    Stop
                </Button>}
        </Form>
    );
}
