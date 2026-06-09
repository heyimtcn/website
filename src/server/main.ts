// deno-lint-ignore-file no-import-prefix
import { Hono } from "jsr:@hono/hono@^4.12.12";
import { serveStatic } from "jsr:@hono/hono@^4.12.12/deno";
import { createClient } from "jsr:@supabase/supabase-js@^2.103.0";
import * as path from "jsr:@std/path@^1.1.4";
import * as fs from "jsr:@std/fs@1.0.23";
import * as toml from "jsr:@std/toml@^1.0.11";
import * as mime from "jsr:@std/media-types@^1.1.0"
import { marked } from "npm:marked@18.0.0";
import { format as formatDate } from "npm:date-fns@4.1.0";
import { Database } from "./database.types.ts";

type ProjectInfo = {
	created_at: Date;
	date: Date;
	description: string;
	id: number;
	redirect: string;
	thumbnail: string;
	title: string;
};

type BlogInfo = {
	url_path: string;
	file_name: string;
	title: string;
	description: string;
	date: Date;
	thumbnail: string;
	content: string;
    parsed_content: string;
};

const encoder = new TextEncoder();

function print_raw(str: string) {
	Deno.stdout.writeSync(encoder.encode(str));
}

function replace_multi(str:string,replace_map:Record<string,string>) {
    let new_str = str;
    for (const [key, value] of Object.entries(replace_map)) {
        new_str = new_str.replaceAll(`$$${key}`,value);
    }
    return new_str;
}

const date_format = "do 'of' MMMM yyyy";

const card_template = `<a href="$$url" class="$$card_type card">
    <img class="banner" src="$$banner">
    <h1 class="title">$$title</h1>
    <p class="description">$$description</p>
    <p class="date">$$date</p>
</a>`;

if (!import.meta.dirname) {
    throw Error("dirname not found");
}
Deno.chdir(path.dirname(import.meta.dirname));

const supabase_url = Deno.env.get("supabase_url");
if (!supabase_url) {
	throw new Error("supabase url missing");
}
const supabase_key = Deno.env.get("supabase_key");
if (!supabase_key) {
	throw new Error("supabase key missing");
}
const local_api_key = Deno.env.get("local_api_key");
if (!local_api_key) {
	throw new Error("local api key missing");
}

const supabase = createClient<Database>(supabase_url, supabase_key);

const app = new Hono();

const projects_info: ProjectInfo[] = [];
const project_cards:string[] = [];
const blogs_info: BlogInfo[] = [];
const blog_cards:string[] = [];

const blog_posts:Map<string,BlogInfo> = new Map()

async function download_dynamic_folder(path_str: string) {
	const { data: dynamic_files, error: dynamic_files_error } = await supabase
		.storage
		.from("website_dynamic")
		.list(path_str.replace("\\", "/"));
	if (dynamic_files_error) {
		throw dynamic_files_error;
	}
	const real_path = path.join("dynamic", path_str);
	Deno.mkdirSync(real_path, { recursive: true });
	for (const item of dynamic_files) {
		const item_path = path.join(path_str, item.name);
		if (item.id) {
			const { data: file_data, error: file_error } = await supabase
				.storage
				.from("website_dynamic")
				.download(item_path);
			if (file_error) {
				throw file_error;
			}
			Deno.writeFileSync(
				path.join(real_path, item.name),
				await file_data.bytes(),
			);
		} else {
			await download_dynamic_folder(item_path);
		}
	}
}

async function reload_dynamic() {
	const start_time = performance.now()
	print_raw("\x1b[94mReloading dynamic assets...\x1b[39m\n")
	projects_info.splice(0);
	const { data: projects_info_data, error: projects_info_error } =
		await supabase.from("website_projects_info").select();
	if (projects_info_error) {
		throw projects_info_error;
	}
    const formatted_projects_info_data = projects_info_data.map((info) => {
        return {
            ...info,
            created_at: new Date(info.created_at),
            date: new Date(info.date)
        }
    })
	projects_info.push(...formatted_projects_info_data);
    project_cards.splice(0);
    for (const project_info of projects_info) {
        project_cards.push(replace_multi(card_template,{
			url: project_info.redirect,
            card_type: "project_card",
            banner: `/dynamic/thumbnails/${project_info.thumbnail}`,
            title: project_info.title,
            description: project_info.description,
            date: formatDate(project_info.date,date_format)
        }));
    }
	blogs_info.splice(0);
	const { data: raw_blog_files, error: raw_blog_files_error } = await supabase
		.storage
		.from("blog")
		.list("posts", {
			sortBy: { column: "created_at", order: "asc" },
		});
	if (raw_blog_files_error) {
		throw raw_blog_files_error;
	}
	const blog_file_names = raw_blog_files.map((x) => x.name).filter((x) =>
		x.endsWith(".md")
	);
	for (const blog_file_name of blog_file_names) {
		const { data: file_data, error: file_error } = await supabase
			.storage
			.from("blog")
			.download(`posts/${blog_file_name}`);
		if (file_error) {
			throw file_error;
		}
		const file_contents = await file_data.text();
		let [toml_str, content] = file_contents.split("==========");
		toml_str = toml_str.trim();
		content = content.trim();
		const toml_obj = toml.parse(toml_str);
		const dot_split_name = blog_file_name.split(".");
		const url_path = `${dot_split_name[1]}/${dot_split_name[0]}`;
		blogs_info.push({
			url_path: url_path,
			file_name: blog_file_name,
			title: toml_obj.title as string,
			description: toml_obj.description as string,
			date: toml_obj.date as Date,
			thumbnail: toml_obj.thumbnail as string,
			content: content,
            parsed_content: await marked.parse(content)
		});
	}
	blog_cards.splice(0);
	blog_posts.clear();
    for (const blog_info of blogs_info) {
        blog_cards.push(replace_multi(card_template,{
			url: `blog/${blog_info.url_path}`,
            card_type: "blog_card",
            banner: `/dynamic/thumbnails/${blog_info.thumbnail}`,
            title: blog_info.title,
            description: blog_info.description,
            date: formatDate(blog_info.date,"do 'of' MMMM yyyy")
        }));
		blog_posts.set(blog_info.url_path,blog_info);
    }
	if (fs.existsSync("dynamic")) {
		Deno.removeSync("dynamic", { recursive: true });
	}
	download_dynamic_folder("");
	print_raw(`\x1b[94mDynamic assets reloaded in ${Math.floor(performance.now() - start_time)}ms\x1b[39m\n`)
}

app.get("/thefutureofvideogaming", (c) => {
	return c.redirect("/thefutureofvideogaming/")
})
app.get("/dynamic/*", (c) => {
    const url_path = c.req.url.substring(c.req.url.indexOf("/dynamic") + "/dyanmic".length);
    const file_path = path.join("dynamic",url_path);
    if (!fs.existsSync(file_path)) {
        return c.notFound();
    }
    return c.body(Deno.readFileSync(file_path),200,{ "Content-Type": mime.contentType(path.extname(url_path)) || "text/plain" });
});

app.get("/", (c) => c.html(Deno.readTextFileSync("pages/index.html")));
app.get("/about_me",(c) => c.html(Deno.readTextFileSync("pages/about_me.html")));
app.get("/blog", (c) => {
	return c.html(replace_multi(
		Deno.readTextFileSync("pages/blog.html"),
		{
			cards: blog_cards.join("\n")
		}
	));
});
app.get("/projects", (c) => {
	return c.html(replace_multi(
		Deno.readTextFileSync("pages/projects.html"),
		{
			cards: project_cards.join("\n")
		}
	));
});
app.get("/blog/*", (c) => {
	const url_path = c.req.url.substring(c.req.url.indexOf("/blog") + "/blog".length + 1);
	if (!blog_posts.has(url_path)) {
		return c.notFound();
	}
	const blog_post = blog_posts.get(url_path) as BlogInfo;
	return c.html(replace_multi(
		Deno.readTextFileSync("pages/blog_post.html"),
		{
			title: blog_post.title,
			thumbnail: `/dynamic/thumbnails/${blog_post.thumbnail}`,
			description: blog_post.description,
			date: formatDate(blog_post.date,date_format),
			content: blog_post.parsed_content
		}
	))
});

app.use("*", serveStatic({ root: "static" }));

app.post("/reload_dynamic", async (c) => {
	if (c.req.header("Authorization") != local_api_key) {
		return c.body("Unauthorized", 401, {
			Authenticate: 'error="invalid_token"',
		});
	}
	await reload_dynamic();
	return c.text("OK");
});

const circus_links = Deno.readTextFileSync("static/misc/circus_links.txt").split(/\r?\n/);

app.get("/circus", (c) => {
	return c.redirect(circus_links[Math.floor(Math.random() * circus_links.length)]);
})

await reload_dynamic();

Deno.serve({ port: 8080 }, app.fetch);