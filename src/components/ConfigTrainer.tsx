import { dialog } from "@tauri-apps/api";
import { useAtom } from "jotai";
import { Form, InputGroup, Button } from "react-bootstrap";
import { stateAtom, trainingArgsAtom } from "../state";
import { bind, updateStateField } from "./utils";

export default function ConfigTrainer() {
    const GIB = 1024 * 1024 * 1024;
    const [state, setState] = useAtom(stateAtom);
    const [trainingArgs] = useAtom(trainingArgsAtom);

    if (!state.gpuInfo) {
        return <div>Cannot find your GPU infomation.</div>
    }
    const selectModelFolder = async () => {
        const result = await dialog.open({
            directory: true,
        });
        if (result != null && typeof result === 'string') {
            setState({ ...state, model: result });
        }
    };

    return (
        <Form>
            <p>Run dreambooth on {state.gpuInfo!.name}, {(state.gpuInfo!.meminfo.free / GIB).toFixed(2)}gb free</p>
            <Form.Group className="mb-3" controlId="model">
                <Form.Label>Model</Form.Label>
                <InputGroup>
                    <Form.Control type="text" {...bind(state, setState, "model")} />
                    <Button variant="primary" onClick={selectModelFolder}>
                        Choose Local Model
                    </Button>
                </InputGroup>
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
            <Form.Group className="mb-3" controlId="class">
                <Form.Label>Training Steps</Form.Label>
                <Form.Control type="text" {...bind(state, setState, "learningRate")} />
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
