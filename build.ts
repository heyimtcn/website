// deno-lint-ignore-file no-import-prefix
import * as fs from "jsr:@std/fs@1.0.23";
import * as path from "jsr:@std/path@1.1.4";

if (!import.meta.dirname) {
    throw Error("dirname not found");
}
Deno.chdir(import.meta.dirname);

const app_dir_name = "app";

const encoder = new TextEncoder();

async function execute(
	cmd: string,
	...args: string[]
): Promise<Deno.CommandOutput> {
	return await new Deno.Command(cmd, {
		args,
	}).output();
}

function print_raw(str: string) {
	Deno.stdout.writeSync(encoder.encode(str));
}

const lessc_version_res = await execute("lessc", "-v");
if (lessc_version_res.code != 0) {
	throw new Error("lessc missing or faulty");
}

if (fs.existsSync(app_dir_name)) {
	Deno.removeSync(app_dir_name, { recursive: true });
}
fs.copySync("src", app_dir_name);

for await (const entry of fs.walk(app_dir_name, { exts: ["less"] })) {
	print_raw(`\x1b[90m${entry.path}\x1b[39m\n`);
	const new_path = path.join(
		path.dirname(entry.path),
		entry.name.split(".")[0] + ".css",
	);
	const res = await execute("lessc", entry.path, new_path);
	if (res.code !== 0) {
		throw new Error(`lessc failed: ${res}`);
	}
	Deno.removeSync(entry.path);
	print_raw(`\r\x1b[1A\x1b[2K`);
	print_raw(`\x1b[92m${entry.path}\x1b[39m\n`);
}