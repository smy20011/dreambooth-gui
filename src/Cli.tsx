import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from 'react';
import { resolveResource } from '@tauri-apps/api/path';
import { readTextFile } from '@tauri-apps/api/fs';
import { GooeyConfig, FieldGroup, Field } from "./gooey";
import Form from 'react-bootstrap/Form';
import { Col, InputGroup, Row, Tab, Tabs } from "react-bootstrap";



async function load_schema(): Promise<FieldGroup[]> {
    const path = await resolveResource("gooey_config.json");
    const data = JSON.parse(await readTextFile(path)) as GooeyConfig;
    console.log(data);
    return data.widgets.dreambooth.contents!;
}

function create_docker_command(data): string[] {
    const { training_folder, instance_data_dir, auth_token, ...rest } = data;
    rest.instance_data_dir = "/instance";
    rest.class_data_dir = "class";
    rest.output_dir = "model";
    rest.use_auth_token = true;

    const accelrate_commands = ["accelerate", "launch", "/train_dreambooth.py"];
    for (const [key, value] of Object.entries(rest)) {
        if (value != null && value != false) {
            if (typeof value == "boolean") {
                accelrate_commands.push(`--${key}`);
            } else {
                accelrate_commands.push(`--${key}=${value}`)
            }
        }
    }

    const docker_commands = [
        "docker", "run", '-v', `${training_folder}:/train`, "-v", `${instance_data_dir}:/instance`, "--gpus=all", "--pull=always",
        "-e", `HUGGING_FACE_HUB_TOKEN=${auth_token}`, "smy20011/dreambooth:latest"
    ]
    return docker_commands.concat(accelrate_commands);
}

interface CliProps {
    setCliCommand?: (data: string) => void
}

function CliFormControl(props) {
    const { field, register, name } = props;
    switch (field.type) {
        case "TextField":
            return (
                <div>
                    <Form.Control {...register(name)} defaultValue={field.data.default} />
                    <Form.Text className="text-muted">
                        {field.data.help}
                    </Form.Text>
                </div>
            );
        case "CheckBox":
            return (
                <Form.Check type="switch" >
                    <Form.Check.Input type='checkbox' isValid  {...register(name)} />
                    <Form.Check.Label className="text-muted small">{field.data.help}</Form.Check.Label>
                </Form.Check >
            );
    }
    return <span>Cannot find field type {field.type}</span>
}

function Cli({ setCliCommand = (_) => { } }: CliProps) {
    const { register, watch } = useForm({ mode: "onChange" });
    const [schema, setSchema] = useState<FieldGroup[]>([]);

    useEffect(() => {
        load_schema().then(setSchema);
        watch(data => {
            console.log(create_docker_command(data).join(' '));
        });
    }, []);


    return (
        <Form>
            <div>
                {create_docker_command(watch()).join(' ')}
            </div>
            <Tabs className="xs-3">
                {
                    schema.map(schema => (
                        <Tab eventKey={schema.name} title={schema.name} >
                            <Row>
                                {
                                    schema.items!.map(field => {
                                        const name = field.id.substring(2);
                                        return (
                                            <Col className="col-6">
                                                <Form.Group controlId={name}>
                                                    <Form.Label className="fw-bold">{name}</Form.Label>
                                                    <CliFormControl field={field} register={register} name={name} />
                                                </Form.Group>
                                            </Col>
                                        )
                                    })
                                }
                            </Row>
                        </Tab>
                    ))
                }
            </Tabs>
        </Form>
    );
}

export default Cli;