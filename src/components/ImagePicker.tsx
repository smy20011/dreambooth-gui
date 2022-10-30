import { dialog } from "@tauri-apps/api";
import { useAtom } from "jotai";
import { Col, Button } from "react-bootstrap";
import { stateAtom } from "../state";

export default function ImagePicker() {
    const [state, setState] = useAtom(stateAtom);
    const showDialog = async () => {
        const result = await dialog.open({
            directory: true,
        });
        if (result != null && typeof result === 'string') {
            setState({ ...state, instanceDir: result, tab: "trainer_config" })
        }
    }
    return (
        <Col className="d-flex flex-column min-vh-100 justify-content-center align-items-center">
            <Button className="btn-primary" onClick={showDialog}>Select Training Image Folder</Button>
        </Col>
    );
}

