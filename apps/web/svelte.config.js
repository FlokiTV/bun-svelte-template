import adapter from "@sveltejs/adapter-static";

const config = {
  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: "200.html",
      precompress: false,
      strict: true,
    }),
  },
};

export default config;
