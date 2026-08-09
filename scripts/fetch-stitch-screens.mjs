import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { StitchToolClient } from "@google/stitch-sdk";

const execFileAsync = promisify(execFile);

const API_KEY = process.env.STITCH_API_KEY;
if (!API_KEY) {
  console.error("Set STITCH_API_KEY before running this script.");
  process.exit(1);
}

const PROJECT_ID = "18213223677131290523";
const OUTPUT_DIR = join(process.cwd(), "stitch", "action-deck");

const REQUESTED_SCREENS = [
  { name: "Welcome - Slide 1", id: "458b80da02914343ba6f10f2c7519df7" },
  { name: "Splash Screen (Dark)", id: "f7675de7721f4b999b205a7d502bef0a" },
  { name: "Welcome - Slide 2", id: "f687b007b1664ca7b97596d3089ddf12" },
  { name: "Welcome - Slide 3", id: "9f16e7c601a34b05bb50daa309c97331" },
  { name: "Sign In Options", id: "ff1151b47cb14ee6a247b14d253287e0" },
  { name: "Verification Code Entry", id: "e50bbc2adef64491873442877a29640c" },
  { name: "Discover Activities", id: "a0c1b0841cb2440d9d1c53b0f434a7aa" },
  { name: "Activity Details", id: "fc3f87fd28d3409789e381045874bd5d" },
  { name: "New Activity - Review", id: "c008bd5265ea4bb6b064b90c6f5b0cd2" },
  { name: "New Activity - Describe", id: "b57850eebc25401599d27f07ee1f72e9" },
  { name: "Interests Onboarding", id: "d6828d53a10c4780a0c4f2c384248955" },
  { name: "My Plans", id: "1ae914ce14754761b01384950087375f" },
  { name: "Availability Onboarding", id: "674c2216b46445cab61dd5331f9b8b47" },
  { name: "Tuesday Board Games Group", id: "2b0ffad1b7e7443e9d6bcb35762a76e7" },
  { name: "Profile", id: "1cbb98ed4aec43dd965e9850ffb72abf" },
  { name: "Shared Activity Web View", id: "98b907efe93b4966a0479f137230a6f6" },
  { name: "Filter Activities", id: "92f498b6f5c44dfc8abb1bc1bdc92bd6" },
  { name: "Post-Activity Feedback", id: "e514937ed70d4ad29c77143a63369f72" },
  { name: "Waitlist Claim", id: "2a6b482d5a084bd5b02807cdee94eb19" },
  { name: "End of Feed", id: "1f12d30f134747489cd4f5e0ffdf9e54" },
  { name: "Join Requests", id: "e9bcaa3edd914c179b132e8654de5aa3" },
  { name: "Activity Chat", id: "89513428ea7f4add913509a7831e48a8" },
  { name: "Mark Attendance (Host)", id: "135f84fa3be74d6f908bdb9b8972ff1a" },
  { name: "Post-activity Feedback (Participant)", id: "30f6ed5c340848189ec2084f49bed296" },
  { name: "Attendance Saved Confirmation", id: "41d9b5fa2c8e46039efe3e8439980661" },
  { name: "Attendance Outcome Notice", id: "c4fbfd0012634fd596cabd964b3a2beb" },
  { name: "Profile Reliability Panel States", id: "07e7b84f3ada4225b921b0432c1a3020" },
  { name: "Past Activity Detail", id: "0891aebac83144f3babf1963a4bbfb90" },
  { name: "Chats List", id: "3e0c3ba2df9743aeafc3676cb5232122" },
  { name: "Group Chat - Active Activity", id: "fe0bdac4ade249f09f96b067f2b8f90b" },
  { name: "Group Chat with Poll", id: "759780b0c9c54f8b80172a2fe7566408" },
  { name: "Archived Chat (Read-only)", id: "930ba1076238404a9b5c481d7e1bb242" },
];

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function screenIdFromName(name) {
  return name.split("/").pop();
}

async function download(url, outputPath) {
  await execFileAsync("curl.exe", ["-L", "-s", "-o", outputPath, url], {
    maxBuffer: 50 * 1024 * 1024,
  });
}

async function loadExistingManifest() {
  try {
    const raw = await readFile(join(OUTPUT_DIR, "manifest.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function resolveScreen(client, byId, screenId) {
  const listed = byId.get(screenId);
  if (listed) return listed;

  try {
    const screen = await client.callTool("get_screen", {
      projectId: PROJECT_ID,
      screenId,
    });
    return screen;
  } catch (error) {
    console.log(`  get_screen failed: ${error.message}`);
    return null;
  }
}

async function main() {
  const onlyIds = process.argv.slice(2);
  const requestedScreens = onlyIds.length
    ? REQUESTED_SCREENS.filter((screen) => onlyIds.includes(screen.id))
    : REQUESTED_SCREENS;

  if (!requestedScreens.length) {
    console.error("No matching screen IDs in REQUESTED_SCREENS.");
    process.exit(1);
  }

  const client = new StitchToolClient({ apiKey: API_KEY });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const { screens } = await client.callTool("list_screens", {
    projectId: PROJECT_ID,
  });

  const byId = new Map(
    screens.map((screen) => [screenIdFromName(screen.name), screen]),
  );

  const existingManifest = await loadExistingManifest();
  const mergedById = new Map(
    (existingManifest?.screens ?? []).map((screen) => [screen.id, screen]),
  );

  for (const requested of requestedScreens) {
    const slug = slugify(requested.name);
    const screenDir = join(OUTPUT_DIR, slug);
    await mkdir(screenDir, { recursive: true });

    console.log(`Exporting ${requested.name} (${requested.id})...`);

    const screen = await resolveScreen(client, byId, requested.id);
    if (!screen) {
      console.log("  Screen not found");
      mergedById.set(requested.id, {
        title: requested.name,
        id: requested.id,
        slug,
        error: "Screen not found in project",
      });
      continue;
    }

    const htmlUrl = screen.htmlCode?.downloadUrl ?? null;
    const imageUrl = screen.screenshot?.downloadUrl ?? null;
    const htmlPath = join(screenDir, "index.html");
    const imagePath = join(screenDir, "screenshot.png");

    if (htmlUrl) {
      await download(htmlUrl, htmlPath);
      console.log("  HTML downloaded");
    } else {
      console.log("  No HTML URL");
    }

    if (imageUrl) {
      await download(imageUrl, imagePath);
      console.log("  Screenshot downloaded");
    } else {
      console.log("  No screenshot URL");
    }

    mergedById.set(requested.id, {
      title: requested.name,
      stitchTitle: screen.title ?? requested.name,
      id: requested.id,
      slug,
      deviceType: screen.deviceType ?? null,
      width: screen.width ?? null,
      height: screen.height ?? null,
      htmlUrl,
      imageUrl,
      paths: {
        html: htmlUrl ? join("stitch", "action-deck", slug, "index.html") : null,
        screenshot: imageUrl
          ? join("stitch", "action-deck", slug, "screenshot.png")
          : null,
      },
    });
  }

  const manifest = {
    project: { title: "Action Deck", id: PROJECT_ID },
    exportedAt: new Date().toISOString(),
    screens: [...mergedById.values()],
  };

  await writeFile(
    join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  await client.close();
  console.log(`\nExported ${requestedScreens.length} screen(s). Manifest has ${manifest.screens.length} total.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
