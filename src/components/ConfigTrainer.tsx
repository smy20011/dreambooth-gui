import { dialog } from "@tauri-apps/api";
import { useAtom, useAtomValue } from "jotai";
import _ from "lodash";
import { Form, InputGroup, Button, Row, Col } from "react-bootstrap";
import { dreamboothAtom, gpuAtom } from "../state";
import { bind, updateStateField, useAtomForm } from "./utils";

export default function ConfigTrainer() {
    const GIB = 1024 * 1024 * 1024;
    const [state, setState, bind] = useAtomForm(dreamboothAtom);
    const gpuInfo = useAtomValue(gpuAtom);

    if (!gpuInfo) {
        return <div>Cannot find your GPU infomation.</div>
    }
    const selectModelFolder = async () => {
        const result = await dialog.open({
            directory: true,
        });
        if (result != null && typeof result === 'string') {
            setState(s => _.assign(_.clone(s), { model: result }));
        }
    };

    return (
        <Form>
            <p>Run dreambooth on {gpuInfo.name}, {(gpuInfo.meminfo.free / GIB).toFixed(2)}gb free</p>
            <Form.Group className="mb-3" controlId="model">
                <Form.Label>Model</Form.Label>
                <InputGroup>
                    <Form.Control type="text" {...bind("model")} />
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
                <Form.Control type="text" {...bind("instancePrompt")} />
                <Form.Text className="text-muted">
                    Name of the instance, use a rare word if possible. (Eg, sks)
                </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3" controlId="class">
                <Form.Label>Class prompt</Form.Label>
                <Form.Control type="text" {...bind("classPrompt")} />
                <Form.Text className="text-muted">
                    If you want training with prior-preservation loss, set the class prompt. (Eg, a person)
                </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3" controlId="class">
                <Form.Label>Training Steps</Form.Label>
                <Form.Control type="number" {...bind("steps")} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="class">
                <Row>
                    <Col className="sm-6">
                        <Form.Label>Save Every # Steps</Form.Label>
                        <Form.Control type="number" {...bind("saveInterval")} />
                    </Col>
                    <Col className="sm-6">
                        <Form.Label>Start saving at # Steps</Form.Label>
                        <Form.Control type="number" {...bind("saveMinSteps")} />
                    </Col>
                </Row>
            </Form.Group>
            <Form.Group className="mb-3" controlId="class">
                <Form.Label>Learning Rate</Form.Label>
                <Form.Control type="text" {...bind("learningRate")} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="args">
                <div><Form.Label>Training arguments</Form.Label></div>
                <Form.Text className="text-muted">
                    Add your custom arguments here.
                </Form.Text>
                <Form.Control
                    as="textarea"
                    rows={8}
                    value={state.additionalArguments.join("\n")}
                    onChange={t => {
                        setState(_.assign(_.clone(state), { "additionalArguments": t.target.value.split("\n") }));
                    }}
                />
            </Form.Group>
        </Form>
    );
}
