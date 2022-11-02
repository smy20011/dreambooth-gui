import { readDir } from "@tauri-apps/api/fs";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { useEffect, useState } from "react";
import { Col } from "react-bootstrap";

async function getImageUrisInForlder(folder: string): Promise<string[]> {
    if (!folder) {
        return [];
    }
    const files = await readDir(folder);
    return Promise.all(files.map(f => convertFileSrc(f.path)));
}

export default function Gallery({ imageDir }: { imageDir: string }) {
    const [imageUri, setImageUri] = useState<string[]>([]);
    useEffect(() => {
        getImageUrisInForlder(imageDir).then(setImageUri);
    }, [imageDir]);
    return <>
        {imageUri.slice(0, 50).map(uri => <Col className="col-4 mt-1 p-1">
            <img src={uri} className="img-thumbnail" />
        </Col>)}
    </>
}