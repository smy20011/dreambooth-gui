import { dialog } from "@tauri-apps/api";
import { useAtom } from "jotai";
import _ from "lodash";
import { Col, Button, Row } from "react-bootstrap";
import { dreamboothAtom } from "../state";
import Gallery from "./Gallery";
import { useAtomForm } from "./utils";

export default function ImagePicker() {
    const [state, setState, bind] = useAtomForm(dreamboothAtom);
    const showDialog = async () => {
        const result = await dialog.open({
            directory: true,
        });
        if (result != null && typeof result === 'string') {
            setState(_.assign(_.clone(state), { "instanceDir": result }));
        }
    }
    return (
        <Col className="d-flex flex-column min-vh-100 justify-content-center align-items-center">
            <Row className="mt-2">
                <Button className="btn-primary" onClick={showDialog}>Select Training Image Folder</Button>
            </Row>
            <Row>
                <Gallery imageDir={state.instanceDir} />
            </Row>
        </Col>
    );
}

