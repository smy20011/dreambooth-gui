import { dialog, event, shell } from "@tauri-apps/api";
import { message } from "@tauri-apps/api/dialog";
import { appDir, join } from "@tauri-apps/api/path";
import { appWindow } from "@tauri-apps/api/window";
import { createRef, useEffect, useRef, useState } from "react";
import { Button, Col, Form, InputGroup, Row, Tab, Tabs } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { GetGpuInfo, GpuInfo } from "./Gpu";

interface CommonProps {
    setStage?: (arg0: string) => void;
}

interface ImagePickerPropos extends CommonProps {
    setImageFolder?: (arg0: string) => void;
}

function ImagePicker(props: ImagePickerPropos) {
    const showDialog = async () => {
        const result = await dialog.open({
            directory: true,
        });
        if (result != null && typeof result === 'string') {
            props.setImageFolder!(result);
            props.setStage!("trainer_config");
        }
    }
    return (
        <Col className="d-flex flex-column min-vh-100 justify-content-center align-items-center">
            <Button className="btn-primary" onClick={showDialog}>Select Training Image Folder</Button>
        </Col>
    );
}

interface TrainerArguments {
    instancePrompt: string;
    classPrompt: string;
    model: string;
    arguments: string[];
    steps: number;
}

interface ConfigTrainerProps extends CommonProps {
    setArgument?: (args: TrainerArguments) => void;
    gpuInfo: GpuInfo;
}

function RecordToArgs(obj: Record<string, any>): string[] {
    return Object.entries(obj)
        .map(([key, value]) => {
            if (typeof value == "boolean") {
                return value ? `--${key}` : null;
            }
            return `--${key}=${value}`;
        })
        .filter(v => v !== null) as string[];
}

function ConfigTrainer({ gpuInfo, setArgument }: ConfigTrainerProps) {
    const GIB = 1024 * 1024 * 1024;
    const getTrainingArgs = () => {
        if (gpuInfo.name == "unknown") {
            return "";
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
        return RecordToArgs(config).join("\n");
    }
    const { register, watch, setValue } = useForm();
    useEffect(() => {
        const sub = watch(value => {
            value.arguments = value.arguments.split("\n");
            setArgument!(value as TrainerArguments);
        });
        return () => sub.unsubscribe();
    }, [watch]);

    useEffect(() => {
        const value = watch("arguments");
        if (!value && gpuInfo.name != "unknown") {
            setValue("arguments", getTrainingArgs());
        }
    }, [gpuInfo])
    return (
        <Form>
            <p>Run dreambooth on {gpuInfo.name}, {(gpuInfo.meminfo.free / GIB).toFixed(2)}gb free</p>
            <Form.Group className="mb-3" controlId="model">
                <Form.Label>Model name</Form.Label>
                <Form.Control type="text" {...register("model")} required defaultValue="CompVis/stable-diffusion-v1-4" />
                <Form.Text className="text-muted">
                    Name of the base model, (eg, CompVis/stable-diffusion-v1-4)
                </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3" controlId="instance">
                <Form.Label>Instance prompt</Form.Label>
                <Form.Control type="text" {...register("instancePrompt")} required defaultValue="sks" />
                <Form.Text className="text-muted">
                    Name of the instance, use a rare word if possible. (Eg, sks)
                </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3" controlId="class">
                <Form.Label>Class prompt</Form.Label>
                <Form.Control type="text" {...register("classPrompt")} />
                <Form.Text className="text-muted">
                    If you want training with prior-preservation loss, set the class prompt. (Eg, a person)
                </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3" controlId="class">
                <Form.Label>Training Steps</Form.Label>
                <Form.Control type="number" {...register("steps")} defaultValue={600} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="args">
                <div><Form.Label>Training arguments</Form.Label></div>
                <Form.Text className="text-muted">
                    Add your custom arguments here.
                </Form.Text>
                <Form.Control as="textarea" rows={8} {...register("arguments")} />
            </Form.Group>
        </Form>
    );
}

interface TrainingArguments {
    args: TrainerArguments | null
    instanceDir: string
}

async function GenTrainingCommandLine(args: TrainerArguments | null, token: string, instanceDir: string, outputDir: string): Promise<string[]> {
    if (!args) {
        return [];
    }
    const currentDir = await appDir();
    const classPromptDir = args.classPrompt ? await join(currentDir, args.classPrompt) : "";
    const accelerateCommand = `
python -u /train_dreambooth.py
--pretrained_model_name_or_path='${args.model}'
--instance_prompt='${args.instancePrompt}'
--instance_data_dir=/instance
${args.classPrompt ? "--instance_data_dir=/class --with_prior_preservation --prior_loss_weight=1.0" : ""}
${args.classPrompt ? "--class_prompt='" + args.classPrompt + "'" : ""}
--output_dir=/output
--resolution=512
--max_train_steps=${args.steps}
--learning_rate=5e-6
--lr_scheduler='constant'
--lr_warmup_steps=0
${args.arguments.join("\n")}
`.replaceAll("\n", " ");
    let dockerCommand = [
        "run", "-t", "--gpus=all", `-v=${currentDir}:/train`,
        `-v=${instanceDir}:/instance`,
        `-v=${outputDir}:/output`,
        '-e', `HUGGING_FACE_HUB_TOKEN=${token}`
    ]
    if (classPromptDir) {
        dockerCommand.push(`-v='${classPromptDir}':/class`);
    }
    dockerCommand = dockerCommand.concat([
        "smy20011/dreambooth:latest",
        "bash",
        "-c",
        `${accelerateCommand} 2>&1 | tr '\\\\r' '\\\\n'`
    ]);
    return dockerCommand;
}

async function killDocker() {
    const process = new shell.Command("docker", ["ps", "-f", "ancestor=smy20011/dreambooth", "-q"]);
    const dockerIds = (await process.execute()).stdout;
    const futures = dockerIds.split("\n").map(async (id) => {
        const killProcess = new shell.Command("docker", ["kill", id]);
        const ret = await killProcess.execute();
        console.log(`Killed docker image ${id}, retcode=${ret.code}`);
    });
    await Promise.all(futures);
}

function Training(props: TrainingArguments) {
    const { register, watch, handleSubmit, setValue, formState: { errors } } = useForm();
    const [running, setRunning] = useState<boolean>(false);
    const [command, setCommand] = useState<string[]>([]);
    const [lines, setLines] = useState<string[]>([]);
    const outputRef = useRef<any>();

    watch(data => {
        GenTrainingCommandLine(props.args, data.token, props.instanceDir, data.output_dir).then(setCommand);
    });

    useEffect(() => {
        GenTrainingCommandLine(props.args, watch("token"), props.instanceDir, watch("output_dir")).then(setCommand);
    }, [props.args, props.instanceDir]);

    useEffect(() => {
        const area = outputRef.current!!;
        area.scrollTop = area.scrollHeight;
    }, [lines]);

    useEffect(() => {
        const unlisten = appWindow.onCloseRequested(async () => {
            await killDocker();
        });
    }, []);

    const onSubmit = async () => {
        if (!props.instanceDir) {
            await message("Please select instace dir in the pick image tab.", { title: 'Dreambooth', type: 'error' });
            return;
        }
        if (running) {
            killDocker();
            setRunning(false);
        } else {
            const process = new shell.Command("docker", command);
            setLines([]);
            process.stdout.on("data", line => setLines(l => l.concat(line)));
            process.stderr.on("data", line => setLines(l => l.concat(line)));
            await process.spawn();
            setRunning(true);
        }
    }

    const selectOutputFolder = async () => {
        const result = await dialog.open({
            directory: true,
        });
        if (result != null && typeof result === 'string') {
            setValue("output_dir", result);
        }
    };

    return (
        <Form onSubmit={handleSubmit(onSubmit)}>
            <Form.Group className="mb-3" controlId="token">
                <Form.Label>Hugging Face Token</Form.Label>
                <Form.Control type="text" {...register("token", { required: true })} />
                {errors?.token?.type == "required" && <Form.Text className="text-danger">Please set your hugging face token.</Form.Text>}
            </Form.Group>
            <Form.Group className="mb-3" controlId="token">
                <Form.Label>Output Dir</Form.Label>
                <InputGroup>
                    <Form.Control type="text" {...register("output_dir", { required: true })} />
                    <Button variant="primary" onClick={selectOutputFolder}>
                        Select
                    </Button>
                </InputGroup>
                {errors?.output_dir?.type == "required" && <Form.Text className="text-danger">Please select a output dir</Form.Text>}
            </Form.Group>
            <Form.Group className="mb-3" controlId="args">
                <div><Form.Label>Training Process</Form.Label></div>
                <Form.Control as="textarea" rows={1} value={`docker ${command.slice(0, -1).join(" ")} "${command[command.length - 1]}"`} disabled />
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
                </Button>
            }

        </Form>
    );
}

function Trainer() {
    const [stage, setStage] = useState<string>("pick_image");
    const [imageFolder, setImageFolder] = useState<string>("");
    const [argument, setArgument] = useState<TrainerArguments | null>(null);
    const [gpuInfo, setGpuInfo] = useState<GpuInfo>({ name: "unknown", meminfo: { free: 0, total: 0, used: 0 } });
    const [error, setError] = useState<string>("");

    useEffect(() => {
        const timerId = setTimeout(() => {
            GetGpuInfo().then(setGpuInfo).catch(err => setError(`Failed to fetch GPU info ${error}`));
        }, 1000);
        const command = new shell.Command("docker", "version");
        command.execute()
            .catch(err => setError("Failed to execute docker command, make sure docker is install in your system."))
            .then(res => {
                if (res && res.code != 0) {
                    setError(`Docker command returns error, make sure you run this program as admin/root user. \n\n'docker version' output: ${res.stderr}`);
                }
            });
        return () => {
            clearTimeout(timerId);
        };
    }, []);

    return (
        error ? <div className="h-100 trainer-error">{error}</div> :
            <Tabs defaultActiveKey="pick_image" activeKey={stage} onSelect={e => setStage(e!)}>
                <Tab eventKey="pick_image" title="Pick Image">
                    <ImagePicker setStage={setStage} setImageFolder={setImageFolder} />
                </Tab>
                <Tab eventKey="trainer_config" title="Config Trainer">
                    <ConfigTrainer gpuInfo={gpuInfo} setArgument={setArgument} />
                </Tab>
                <Tab eventKey="train" title="Train">
                    <Training instanceDir={imageFolder} args={argument} />
                </Tab>
            </Tabs>
    )
}

export default Trainer;