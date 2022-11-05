
import { shell } from "@tauri-apps/api";

// Kill all running instance of docker.
export async function killDocker() {
    const process = new shell.Command("docker", ["ps", "--format", "{{.Image}} {{.ID}}"]);
    const dockerIds = (await process.execute()).stdout;
    const futures = dockerIds.split("\n").map(async (s) => {
        const [image, id] = s.split(" ");
        if (image.startsWith("smy20011")) {
            const killProcess = new shell.Command("docker", ["kill", id]);
            const ret = await killProcess.execute();
            console.log(`Killed docker image ${id}, retcode=${ret.code}`);
        }
    });
    await Promise.all(futures);
}