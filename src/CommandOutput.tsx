import { Command } from "@tauri-apps/api/shell";
import { useEffect, useRef, useState } from "react";

interface CommandOutputProps {
    command?: Command;
}

function CommandOutput({ command }: CommandOutputProps) {
    const [output, setOutput] = useState<string[]>([]);
    const addOutput = (s: string) => setOutput(output.concat([s]));
    const textArea = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (command) {
            command.stdout.on("data", addOutput);
            command.stderr.on("data", addOutput);
            return () => {
                command.stdout.off("data", addOutput);
                command.stderr.off("data", addOutput);
            };
        }
    }, [command]);

    useEffect(() => {
        const area = textArea.current;
        if (area) {
            area.scrollTop = area.scrollHeight;
        }
    });

    return <textarea value={output.join("\n")} readOnly={true} ref={textArea} />
}

export default CommandOutput;