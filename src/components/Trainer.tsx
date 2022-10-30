import { shell } from "@tauri-apps/api";
import { useAtom, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { Tab, Tabs } from "react-bootstrap";
import { GetGpuInfo } from "../Gpu";
import { gpuAtom } from "../state";
import ConfigTrainer from "./ConfigTrainer";
import ImagePicker from "./ImagePicker";
import { Training } from "./Training";




function Trainer() {
    const [error, setError] = useState<string>("");
    const setGpuInfo = useSetAtom(gpuAtom);

    useEffect(() => {
        GetGpuInfo().then(setGpuInfo).catch(err => setError(`Failed to fetch GPU info ${error}`));
        const command = new shell.Command("docker", "version");
        command.execute()
            .catch(err => setError("Failed to execute docker command, make sure docker is installed in your system.\n\nOpen the docker GUI and make sure it's running."))
            .then(res => {
                if (res && res.code != 0) {
                    setError(`Docker command returns error, make sure you run this program as admin/root user. \n\n'docker version' output: ${res.stderr}\n\nOpen the docker GUI and make sure it's running.`);
                }
            });
    }, []);

    return (
        error ? <div className="h-100 trainer-error">{error}</div> :
            <Tabs defaultActiveKey="pick_image">
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