import puter from "@heyputer/puter.js";
import {ROOMIFY_RENDER_PROMPT} from "./constants";
//takes a url string returns a promise string , s.t. 1st use fetch to get the image
// then convert the image to blob then finally create a new promise that uses a file reader 
// to read the blob as a data url and resolves with a result or rejects on error
export const fetchAsDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
 
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// this will use the source image we extracted 
// above send it to AI and returns rendered result
export const generate3DView = async ({ sourceImage }: Generate3DViewParams) => {
    // If image is already base64 → use it
    // Else → convert it using fetchAsDataUrl
    const dataUrl = sourceImage.startsWith('data:')
        ? sourceImage
        : await fetchAsDataUrl(sourceImage);

    const base64Data = dataUrl.split(',')[1];
    const mimeType = dataUrl.split(';')[0].split(':')[1];

    if(!mimeType || !base64Data) throw new Error('Invalid source image payload');
    
    const response = await puter.ai.txt2img(ROOMIFY_RENDER_PROMPT, {
        provider: "gemini",
        model: "gemini-2.5-flash-image-preview",
        input_image: base64Data,
        input_image_mime_type: mimeType,
        ratio: { w: 1024, h: 1024 },
    });

    // Puter returns an <img> element.
    // You extract its .src.
    const rawImageUrl = (response as HTMLImageElement).src ?? null;

    if (!rawImageUrl) return { renderedImage: null, renderedPath: undefined };
    // now convert the rendered image back to blob 
    const renderedImage = rawImageUrl.startsWith('data:')
    ? rawImageUrl : await fetchAsDataUrl(rawImageUrl);

    return { renderedImage, renderedPath: undefined };
}
