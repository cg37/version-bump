import * as childProcess from "child_process";
import * as util from "util";
import { Logger, LogLevel } from "../logger";

const exec = util.promisify(childProcess.exec);

/** Classify a stderr line: npm deprecation / pnpm warnings are "warn",
 *  lines containing "error" / "fatal" are "error", everything else is "info". */
function classifyStderr(line: string): LogLevel {
    const lower = line.toLowerCase();
    if (lower.includes("error") || lower.includes("fatal")) return "error";
    if (
        lower.includes("deprecated") ||
        lower.includes("warning") ||
        lower.includes("warn") ||
        lower.includes("ignore")
    )
        return "warn";
    return "info";
}

export interface BumpResult {
    success: boolean;
    error?: string;
    /** Hint for the user to manually recover when push fails after version was bumped. */
    recoveryHint?: string;
}

export async function bumpAndPush(
    cwd: string,
    versionType: string,
    logger: Logger
): Promise<BumpResult> {
    try {
        // Step 1: npm version <type>
        const versionCmd = `npm version ${versionType}`;
        logger.log(`Executing: ${versionCmd}`);
        const { stdout: versionOut, stderr: versionErr } = await exec(versionCmd, { cwd });
        if (versionOut) logger.log(versionOut.trim());
        if (versionErr) {
            versionErr.split("\n").forEach((line) => {
                if (line.trim()) logger.log(line.trim(), classifyStderr(line));
            });
        }

        // Step 2: push the new tag AND any associated commits
        const pushCmd = "git push origin --follow-tags";
        logger.log(`Executing: ${pushCmd}`);
        const { stdout: pushOut, stderr: pushErr } = await exec(pushCmd, {
            cwd
        });
        if (pushOut) logger.log(pushOut.trim());
        if (pushErr) logger.log(pushErr.trim());

        logger.log("Done! Version bump and push completed successfully.");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.log(`Error: ${message}`);

        // Provide a recovery hint so the user can undo a partial bump
        const recoveryHint =
            "To undo: run `git tag -d v<new-version>` and `git reset --hard HEAD~1` to revert the version bump and tag.";

        return { success: false, error: message, recoveryHint };
    }
}
