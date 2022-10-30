import { dialog } from "@tauri-apps/api";
import { message } from "@tauri-apps/api/dialog";
import { writeTextFile } from "@tauri-apps/api/fs";
import { appDir, join } from "@tauri-apps/api/path";
import { appWindow } from "@tauri-apps/api/window";
import { useAtom, useAtomValue } from "jotai";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import { killDocker, runDocker } from "../docker";
import { stateAtom, trainingArgsAtom, trainingDockerCommandAtom, verificationMessageAtom } from "../state";
import { getClassDir, ensureDir, bind, updateStateField } from "./utils";


export function Training() {
    const [running, setRunning] = useState<boolean>(false);
    const [lines, setLines] = useState<string[]>([]);
    const [verificationMessage] = useAtom(verificationMessageAtom);
    const [state, setState] = useAtom(stateAtom);
    const [trainingDockerCommand] = useAtom(trainingDockerCommandAtom);
    const trainingArgs = useAtomValue(trainingArgsAtom);

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
        if (trainingDockerCommand.state != 'hasData') {
            await message(`Still waiting for GPU data, please wait a sec and try again.`);
            return;
        }
        if (running) {
            await killDocker();
            setRunning(false);
        } else {
            if (verificationMessage) {
                await message(`Cannot start training: ${verificationMessage}`);
                return;
            }
            const dirs = [
                await getClassDir(state.classPrompt),
                await appDir(),
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
                const ret = await runDocker(trainingDockerCommand.data, line => setLines(list => list.concat(line)));
                if (ret != 0) {
                    await message(`Failed to train model, see output for detailed error.`);
                    setRunning(false);
                    return;
                }
                await writeTextFile(await join(state.outputDir, "trainer_config"), JSON.stringify({
                    instancePrompt: state.instancePrompt,
                    classPrompt: state.classPrompt,
                    trainingArguments: trainingArgs,
                    genCkpt: state.genCkpt,
                }));
                if (state.genCkpt) {
                    let genCkptOuput: string[] = [];
                    const ret = await runDocker([
                        "run", "-t", `-v=${state.outputDir}:/model`,
                        "smy20011/dreambooth:gpu_debug",
                        "python",
                        "/diffusers/scripts/convert_diffusers_to_original_stable_diffusion.py",
                        "--model_path=/model",
                        "--checkpoint_path=/model/model.ckpt"
                    ], l => genCkptOuput.push(l));
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
            setState({ ...state, outputDir: result });
        }
    };

    return (
        <Form onSubmit={onSubmit}>
            <Form.Group className="mb-3" controlId="token">
                <Form.Label>Hugging Face Token</Form.Label>
                <Form.Control type="text" {...bind(state, setState, "token")} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="token">
                <Form.Label>Output Dir</Form.Label>
                <InputGroup>
                    <Form.Control type="text" {...bind(state, setState, "outputDir")} />
                    <Button variant="primary" onClick={selectOutputFolder}>
                        Select
                    </Button>
                </InputGroup>
            </Form.Group>
            <Form.Group className="mb-3" controlId="genCkpt">
                <Form.Check label="Generate model checkpoint (.ckpt file) in the output directory" checked={state.genCkpt} onChange={(t) => updateStateField(setState, "genCkpt", t.target.checked)} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="args">
                <div><Form.Label>Training Command</Form.Label></div>
                <Form.Control as="textarea" rows={1}
                    value={trainingDockerCommand.state === "hasData" && trainingDockerCommand.data.length > 0 ?
                        `docker ${trainingDockerCommand.data.join(" ")}` :
                        ""} disabled />
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
