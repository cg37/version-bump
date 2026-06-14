import * as childProcess from "child_process";
import * as util from "util";
import { Logger } from "../logger";

const exec = util.promisify(childProcess.exec);

export interface BumpResult {
    success: boolean;
    error?: string;
}

export async function bumpAndPush(
    cwd: string,
    versionType: string,
    logger: Logger,
): Promise<BumpResult> {
    try {
        // Step 1: npm version <type>
        const versionCmd = `npm version ${versionType}`;
        logger.log(`Executing: ${versionCmd}`);
        const { stdout: versionOut, stderr: versionErr } = await exec(
            versionCmd,
            { cwd },
        );
        if (versionOut) logger.log(versionOut.trim());
        if (versionErr) logger.log(versionErr.trim());

        // Step 2: git push --follow-tags
        const pushCmd = "git push --follow-tags";
        logger.log(`Executing: ${pushCmd}`);
        const { stdout: pushOut, stderr: pushErr } = await exec(pushCmd, {
            cwd,
        });
        if (pushOut) logger.log(pushOut.trim());
        if (pushErr) logger.log(pushErr.trim());

        logger.log("Done! Version bump and push completed successfully.");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.log(`Error: ${message}`);
        return { success: false, error: message };
    }
}
