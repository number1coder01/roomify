import puter from "@heyputer/puter.js";
import {
  createHostingSlug,
  fetchBlobFromUrl,
  getHostedUrl,
  getImageExtension,
  HOSTING_CONFIG_KEY,
  imageUrlToPngBlob,
  isHostedUrl,
} from "./utils";
// yeh subdomain contain karega -> subdomain is a space inside the
// KV jaha humara yeh roomify ka imagae data store hoga
type HostingConfig = { subdomain: string };
// image ka url
type HostedAsset = { url: string };
export const getOrCreateHostingConfig =
  async (): Promise<HostingConfig | null> => {
    // chain of KV pair(existing db) associated with the config_KEY
    const existing = (await puter.kv.get(
      HOSTING_CONFIG_KEY,
    )) as HostingConfig | null;
    // check if subdomain exist in the existing
    if (existing?.subdomain) return { subdomain: existing.subdomain };
    // HostingSlug jaakr dekh
    const subdomain = createHostingSlug();

    try {
      // if subdomain milgyi then Create a hosted site on Puter using this
      // subdomain and deploy the current directory(.).”
      const created = await puter.hosting.create(subdomain, ".");
      // created wala ya existing wala ?
      const record = { subdomain: created.subdomain };

      await puter.kv.set(HOSTING_CONFIG_KEY, record);

      return record;
    } catch (e) {
      console.warn(`Could not find subdomain: ${e}`);
      return null;
    }
  };

// This function takes an existing image (via URL or base64) and:
// Downloads it
// Converts it to a blob
// Uploads it to your hosting
// Returns a new hosted URL

// base 64 strings -> blob lega and uploads them to this subdomain
export const uploadImageToHosting = async ({
  hosting,
  url,
  projectId,
  label,
}: StoreHostedImageParams): Promise<HostedAsset | null> => {
  //If hosting or image URL is missing → stop immediately.
  if (!hosting || !url) return null;
  if (isHostedUrl(url)) return { url };

  try {
    // resolve the transformation 
    // of the image from png to url

    // STEP 1 -> Converts image to PNG blob
    const resolved =
      label === "rendered"
        ? await imageUrlToPngBlob(url).then((blob) =>
            blob ? { blob, contentType: "image/png" } : null,
          )
        : await fetchBlobFromUrl(url);
    // For normal images: UPAR WALA CASE
    //  Fetch image from URL
    //  Convert to blob
    if (!resolved) return null;

    const contentType = resolved.contentType || resolved.blob.type || "";
    // contentType and url laga to extract the actual extension
    const ext = getImageExtension(contentType, url);
    // dir where image will be stored
    const dir = `projects/${projectId}`;
    //full path
    const filePath = `${dir}/${label}.${ext}`;
    // blobs(data bits) , fileNAME , addnal opns
    const uploadFile = new File([resolved.blob], `${label}.${ext}`, {
      type: contentType,
    });
    // UPLOADING THE WHOLE STRUCTURE WE CREATED
    await puter.fs.mkdir(dir, { createMissingParents: true });
    await puter.fs.write(filePath, uploadFile);

    const hostedUrl = getHostedUrl({ subdomain: hosting.subdomain }, filePath);

    return hostedUrl ? { url: hostedUrl } : null;
  } catch (e) {
    console.warn(`Failed to store hosted image: ${e}`);
    return null;
  }
};
