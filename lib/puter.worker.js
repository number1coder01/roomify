// here we define the worker routes that call puter KV storage to save the project
// paste this file inside : puter -> roomify.js , then publish that file as a worker by right clicking
// THIS IS OUR BACKEND API Done
const PROJECT_PREFIX = "roomify_project_";

const jsonError = (status, message, extra = {}) => {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

const getUserId = async (userPuter) => {
  try {
    const user = await userPuter.auth.getUser();

    return user?.uuid || null;
  } catch {
    return null;
  }
};

//REST API like
router.post("/api/projects/save", async ({ request, user }) => {
  try {
    const userPuter = user.puter;

    if (!userPuter) return jsonError(401, "Authentication failed");

    const body = await request.json();
    const project = body?.project;

    if (!project?.id || !project?.sourceImage)
      return jsonError(400, "Project ID and source image are required");

    const payload = {
      ...project,
      updatedAt: new Date().toISOString(),
    };

    const userId = await getUserId(userPuter);
    if (!userId) return jsonError(401, "Authentication failed");

    // CRAFT A KEY SO THAT WE CAN STORE IN KV DATABASE
    const safeId = String(project.id).trim();
    const key = `${PROJECT_PREFIX}${safeId}`;
    await userPuter.kv.set(key, payload);

    return { saved: true, id: safeId, project: payload };
  } catch (e) {
    return jsonError(500, "Failed to save project", {
      message: e.message || "Unknown error",
    });
  }
});

router.get("/api/projects/list", async ({ user }) => {
  try {
    const userPuter = user.puter;
    if (!userPuter) return jsonError(401, "Authentication failed");

    const userId = await getUserId(userPuter);
    if (!userId) return jsonError(401, "Authentication failed");

    const projects = (await userPuter.kv.list(PROJECT_PREFIX, true)).map(
      ({ value }) => ({ ...value, isPublic: true }),
    );

    return { projects };
  } catch (e) {
    return jsonError(500, "Failed to list projects", {
      message: e.message || "Unknown error",
    });
  }
});

router.get("/api/projects/get", async ({ request, user }) => {
  try {
    const userPuter = user.puter;
    if (!userPuter) return jsonError(401, "Authentication failed");

    const userId = await getUserId(userPuter);
    if (!userId) return jsonError(401, "Authentication failed");

    const url = new URL(request.url);
    const rawId = url.searchParams.get("id");

    if (!rawId) return jsonError(400, "Project ID is required");

    const id = String(rawId).trim();
    const key = `${PROJECT_PREFIX}${id}`;

    // Try direct KV lookup first
    let project = await userPuter.kv.get(key);

    // Fallback: If not found by direct key, search by listing
    if (!project) {
      console.log(`Direct lookup failed for ${key}, trying fallback search...`);
      const allProjects = await userPuter.kv.list(PROJECT_PREFIX, true);
      const match = allProjects.find(p => String(p.value?.id).trim() === id);
      if (match) {
        project = match.value;
      }
    }

    if (!project) {
      return jsonError(404, "Project not found", { searchedKey: key, idRequested: id });
    }

    return { project };
  } catch (e) {
    return jsonError(500, "Failed to get project", {
      message: e.message || "Unknown error",
    });
  }
});
