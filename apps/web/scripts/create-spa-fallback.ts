const indexFile = Bun.file(new URL("../build/index.html", import.meta.url));
if (!(await indexFile.exists())) throw new Error("build/index.html was not generated");

await Bun.write(new URL("../build/200.html", import.meta.url), await indexFile.text());
