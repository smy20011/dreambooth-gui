import { dialog } from "@tauri-apps/api";
import { useAtom } from "jotai";
import { Col, Button } from "react-bootstrap";
import { dreamboothAtom } from "../state";
import { useAtomForm } from "./utils";

export default function ImagePicker() {
    const [state, setState, bind] = useAtomForm(dreamboothAtom);
    const showDialog = async () => {
        const result = await dialog.open({
            directory: true,
        });
        if (result != null && typeof result === 'string') {
            bind("instanceDir").onChange(result);
        }
    }
    return (
        <Col className="d-flex flex-column min-vh-100 justify-content-center align-items-center">
            <Button className="btn-primary" onClick={showDialog}>Select Training Image Folder</Button>
        </Col>
    );
}

