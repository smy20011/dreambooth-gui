import { dialog, shell } from "@tauri-apps/api";
import { message } from "@tauri-apps/api/dialog";
import { exists, createDir } from "@tauri-apps/api/fs";
import { appDir, join } from "@tauri-apps/api/path";
import { appWindow } from "@tauri-apps/api/window";
import { useAtom } from "jotai";
import { FormEvent, SetStateAction, Suspense, useEffect, useRef, useState } from "react";
import { Button, Col, Form, InputGroup, Tab, Tabs } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { killDocker, runDocker } from "./docker";
import { GetGpuInfo, GpuInfo } from "./Gpu";
import { State, stateAtom, trainingArgsAtom, trainingDockerCommandAtom, verificationMessageAtom } from "./state";


function ImagePicker() {
    const [state, setState] = useAtom(stateAtom);
    const showDialog = async () => {
        const result = await dialog.open({
            directory: true,
        });
        if (result != null && typeof result === 'string') {
            setState({ ...state, instanceDir: result })
        }
    }
    return (
        <Col className="d-flex flex-column min-vh-100 justify-content-center align-items-center">
            <Button className="btn-primary" onClick={showDialog}>Select Training Image Folder</Button>
        </Col>
    );
}

type StateKey = keyof State;

function updateStateField(setState: (update: SetStateAction<State>) => void, name: StateKey, value: any) {
    setState(s => ({ ...s, [name]: value }));
}

function bind(state: State, setState: (update: SetStateAction<State>) => void, name: StateKey) {
    return {
        value: state[name] as any,
        onChange: (t: any) => updateStateField(setState, name, t.target.value)
    }
}

function ConfigTrainer() {
    const GIB = 1024 * 1024 * 1024;
    const [state, setState] = useAtom(stateAtom);
    const [trainingArgs] = useAtom(trainingArgsAtom);

    if (!state.gpuInfo) {
        return <div>Cannot find your GPU infomation.</div>
    }

    return (
        <Form>
            <p>Run dreambooth on {state.gpuInfo!.name}, {(state.gpuInfo!.meminfo.free / GIB).toFixed(2)}gb free</p>
            <Form.Group className="mb-3" controlId="model">
                <Form.Label>Model name</Form.Label>
                <Form.Control type="text" {...bind(state, setState, "model")} />
                <Form.Text className="text-muted">
                    Name of the base model, (eg, CompVis/stable-diffusion-v1-4)
                </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3" controlId="instance">
                <Form.Label>Instance prompt</Form.Label>
                <Form.Control type="text" {...bind(state, setState, "instancePrompt")} />
                <Form.Text className="text-muted">
                    Name of the instance, use a rare word if possible. (Eg, sks)
                </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3" controlId="class">
                <Form.Label>Class prompt</Form.Label>
                <Form.Control type="text" {...bind(state, setState, "classPrompt")} />
                <Form.Text className="text-muted">
                    If you want training with prior-preservation loss, set the class prompt. (Eg, a person)
                </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3" controlId="class">
                <Form.Label>Training Steps</Form.Label>
                <Form.Control type="number" {...bind(state, setState, "steps")} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="args">
                <div><Form.Label>Training arguments</Form.Label></div>
                <Form.Text className="text-muted">
                    Add your custom arguments here.
                </Form.Text>
                <Form.Control
                    as="textarea"
                    rows={8}
                    value={(state.additionalArguments || trainingArgs).join("\n")}
                    onChange={t => {
                        updateStateField(setState, "additionalArguments", t.target.value.split("\n"));
                    }}
                />
            </Form.Group>
        </Form>
    );
}

async function getClassDir(prompt: string | undefined) {
    if (!prompt) {
        return "";
    }
    return await join(await appDir(), prompt);
}

async function ensureDir(dir: string) {
    if (dir && !(await exists(dir) as unknown as boolean)) {
        await createDir(dir, { recursive: true });
    }
}

function Training() {
    const [running, setRunning] = useState<boolean>(false);
    const [lines, setLines] = useState<string[]>([]);
    const [verificationMessage] = useAtom(verificationMessageAtom);
    const [state, setState] = useAtom(stateAtom);
    const [trainingDockerCommand] = useAtom(trainingDockerCommandAtom);

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
                await appDir()
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
                runDocker(trainingDockerCommand.data, line => setLines(list => list.concat(line)));
            } catch (e) {
                await message(`Failed to start docker ${e}`);
            }
        }
    }

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
            <Form.Group className="mb-3" controlId="args">
                <div><Form.Label>Training Process</Form.Label></div>
                <Form.Control as="textarea" rows={1}
                    value={
                        trainingDockerCommand.state === "hasData" && trainingDockerCommand.data.length > 0 ?
                            `docker ${trainingDockerCommand.data.slice(0, -1).join(" ")} "${trainingDockerCommand.data.at(-1)}"` :
                            ""
                    } disabled />
            </Form.Group>
            <Form.Group className="mb-3" controlId="args">
                <div><Form.Label>Training Output</Form.Label></div>
                <Form.Control as="textarea" rows={10} value={lines.slice(-10).join("\n")} ref={outputRef} disabled />
            </Form.Group>
            {!running ?
                <Button variant="primary" type="submit">
                    Start
                </Button> :
                <Button variant="danger" type="submit">
                    Stop
                </Button>
            }
        </Form>
    );
}

function Trainer() {
    const [error, setError] = useState<string>("");
    const [state, setState] = useAtom(stateAtom);

    useEffect(() => {
        const timerId = setTimeout(() => {
            GetGpuInfo().then(info => updateStateField(setState, "gpuInfo", info)).catch(err => setError(`Failed to fetch GPU info ${error}`));
        }, 1000);
        const command = new shell.Command("docker", "version");
        command.execute()
            .catch(err => setError("Failed to execute docker command, make sure docker is installed in your system.\n\nOpen the docker GUI and make sure it's running."))
            .then(res => {
                if (res && res.code != 0) {
                    setError(`Docker command returns error, make sure you run this program as admin/root user. \n\n'docker version' output: ${res.stderr}\n\nOpen the docker GUI and make sure it's running.`);
                }
            });
        return () => {
            clearTimeout(timerId);
        };
    }, []);

    return (
        error ? <div className="h-100 trainer-error">{error}</div> :
            <Tabs defaultActiveKey="pick_image" activeKey={state.tab} onSelect={e => updateStateField(setState, "tab", e!)}>
                <Tab eventKey="pick_image" title="Pick Image">
                    <ImagePicker />
                </Tab>
                <Tab eventKey="trainer_config" title="Config Trainer">
                    <ConfigTrainer />
                </Tab>
                <Tab eventKey="train" title="Train">
                    <Training />
                </Tab>
            </Tabs>
    )
}

export default Trainer;